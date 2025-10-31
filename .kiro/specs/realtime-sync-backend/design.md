# Real-Time Synchronization Backend Design

## Overview

This design document outlines the architecture for a real-time data synchronization backend system that ensures instant bidirectional communication between the admin dashboard, patient dashboard, and AI chatbot. The system leverages Supabase's PostgreSQL real-time capabilities, implements a modular RESTful API architecture, and provides secure, scalable data synchronization across all client interfaces.

### Key Design Principles

1. **Real-Time First**: All data mutations trigger immediate broadcasts to connected clients
2. **Security by Default**: Row-level security and JWT authentication on every request
3. **Modular Architecture**: Clear separation between controllers, services, and repositories
4. **Scalability**: Connection pooling, caching, and optimized queries for high concurrency
5. **Resilience**: Error handling, retry logic, and graceful degradation

## Architecture

### High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │   Admin      │  │   Patient    │  │  AI Chatbot  │              │
│  │  Dashboard   │  │  Dashboard   │  │              │              │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘              │
│         │                  │                  │                      │
│         └──────────────────┴──────────────────┘                      │
│                            │                                         │
└────────────────────────────┼─────────────────────────────────────────┘
                             │
                             │ WebSocket + HTTP
                             │
┌────────────────────────────┼─────────────────────────────────────────┐
│                    API GATEWAY LAYER                                 │
│                            │                                         │
│  ┌─────────────────────────▼──────────────────────────┐             │
│  │         Authentication Middleware                   │             │
│  │  - JWT Verification                                 │             │
│  │  - Role-Based Access Control                        │             │
│  └─────────────────────────┬──────────────────────────┘             │
└────────────────────────────┼─────────────────────────────────────────┘
                             │
┌────────────────────────────┼─────────────────────────────────────────┐
│                    CONTROLLER LAYER                                  │
│  ┌─────────────────────────▼──────────────────────────┐             │
│  │  AppointmentsController  │  AvailabilityController │             │
│  │  ProfilesController      │  NotificationsController│             │
│  └─────────────────────────┬──────────────────────────┘             │
└────────────────────────────┼─────────────────────────────────────────┘
                             │
┌────────────────────────────┼─────────────────────────────────────────┐
│                     SERVICE LAYER                                    │
│  ┌─────────────────────────▼──────────────────────────┐             │
│  │  AppointmentsService     │  AvailabilityService    │             │
│  │  ProfilesService         │  RealtimeService        │             │
│  │  ValidationService       │  NotificationService    │             │
│  └─────────────────────────┬──────────────────────────┘             │
└────────────────────────────┼─────────────────────────────────────────┘
                             │
┌────────────────────────────┼─────────────────────────────────────────┐
│                   REPOSITORY LAYER                                   │
│  ┌─────────────────────────▼──────────────────────────┐             │
│  │  AppointmentsRepository  │  DentistsRepository     │             │
│  │  ProfilesRepository      │  CacheRepository        │             │
│  └─────────────────────────┬──────────────────────────┘             │
└────────────────────────────┼─────────────────────────────────────────┘
                             │
┌────────────────────────────┼─────────────────────────────────────────┐
│                    DATA LAYER                                        │
│  ┌─────────────────────────▼──────────────────────────┐             │
│  │         Supabase PostgreSQL Database                │             │
│  │  - appointments  - dentists  - profiles             │             │
│  │  - user_roles    - appointment_documents            │             │
│  │                                                     │             │
│  │  Real-Time Engine (PostgreSQL + WebSockets)        │             │
│  │  - Database Triggers                                │             │
│  │  - Change Data Capture                              │             │
│  │  - Broadcast to Subscribed Clients                  │             │
│  └─────────────────────────────────────────────────────┘             │
└──────────────────────────────────────────────────────────────────────┘
```

### Real-Time Data Flow

```
┌──────────────────────────────────────────────────────────────────────┐
│  APPOINTMENT BOOKING FLOW (Patient → Chatbot → Admin)               │
└──────────────────────────────────────────────────────────────────────┘

1. Patient books via Chatbot
   │
   ▼
2. POST /api/appointments
   │
   ▼
3. AppointmentsController.create()
   │
   ▼
4. AppointmentsService.createAppointment()
   - Validate time slot availability
   - Check for conflicts
   - Create appointment record
   │
   ▼
5. AppointmentsRepository.insert()
   - INSERT INTO appointments
   │
   ▼
6. PostgreSQL Trigger fires
   - on_appointment_created()
   │
   ▼
7. Supabase Real-Time broadcasts
   - Channel: "appointments:dentist_id={dentist_id}"
   - Payload: { event: 'INSERT', new: {...} }
   │
   ▼
8. Connected clients receive update
   - Admin Dashboard: Shows new appointment
   - Patient Dashboard: Shows confirmation
   - Chatbot: Updates available slots
```


```
┌──────────────────────────────────────────────────────────────────────┐
│  AVAILABILITY UPDATE FLOW (Admin → Patient/Chatbot)                 │
└──────────────────────────────────────────────────────────────────────┘

1. Admin updates dentist availability
   │
   ▼
2. PUT /api/availability/:dentistId
   │
   ▼
3. AvailabilityController.update()
   │
   ▼
4. AvailabilityService.updateSchedule()
   - Validate time slots
   - Check for conflicts with existing appointments
   - Update available_times JSONB
   │
   ▼
5. DentistsRepository.updateAvailability()
   - UPDATE dentists SET available_times = {...}
   │
   ▼
6. PostgreSQL Trigger fires
   - on_availability_updated()
   │
   ▼
7. Supabase Real-Time broadcasts
   - Channel: "availability:dentist_id={dentist_id}"
   - Payload: { event: 'UPDATE', new: {...} }
   │
   ▼
8. Connected clients receive update
   - Patient Dashboard: Refreshes available slots
   - Chatbot: Updates booking options
   - Admin Dashboard: Shows confirmation
```

## Components and Interfaces

### 1. Controller Layer

Controllers handle HTTP requests, validate input, and coordinate with services.

#### AppointmentsController

```typescript
interface AppointmentsController {
  // GET /api/appointments
  list(req: AuthenticatedRequest): Promise<Response<Appointment[]>>
  
  // GET /api/appointments/:id
  getById(req: AuthenticatedRequest): Promise<Response<Appointment>>
  
  // POST /api/appointments
  create(req: AuthenticatedRequest): Promise<Response<Appointment>>
  
  // PUT /api/appointments/:id
  update(req: AuthenticatedRequest): Promise<Response<Appointment>>
  
  // DELETE /api/appointments/:id
  cancel(req: AuthenticatedRequest): Promise<Response<void>>
}
```

#### AvailabilityController

```typescript
interface AvailabilityController {
  // GET /api/availability/:dentistId
  getByDentist(req: AuthenticatedRequest): Promise<Response<AvailabilitySchedule>>
  
  // PUT /api/availability/:dentistId
  update(req: AuthenticatedRequest): Promise<Response<AvailabilitySchedule>>
  
  // GET /api/availability/:dentistId/slots?date=YYYY-MM-DD
  getAvailableSlots(req: AuthenticatedRequest): Promise<Response<TimeSlot[]>>
}
```

#### ProfilesController

```typescript
interface ProfilesController {
  // GET /api/profiles/me
  getCurrentUser(req: AuthenticatedRequest): Promise<Response<Profile>>
  
  // PUT /api/profiles/me
  updateCurrentUser(req: AuthenticatedRequest): Promise<Response<Profile>>
  
  // GET /api/profiles/dentists
  listDentists(req: AuthenticatedRequest): Promise<Response<DentistProfile[]>>
}
```

### 2. Service Layer

Services contain business logic and orchestrate data operations.

#### AppointmentsService

```typescript
interface AppointmentsService {
  createAppointment(data: CreateAppointmentDTO, userId: string): Promise<Appointment>
  
  updateAppointment(id: string, data: UpdateAppointmentDTO, userId: string): Promise<Appointment>
  
  cancelAppointment(id: string, userId: string): Promise<void>
  
  getAppointmentsByPatient(patientId: string): Promise<Appointment[]>
  
  getAppointmentsByDentist(dentistId: string, filters?: AppointmentFilters): Promise<Appointment[]>
  
  validateAppointmentTime(dentistId: string, dateTime: Date): Promise<boolean>
  
  checkConflicts(dentistId: string, dateTime: Date): Promise<boolean>
}
```


#### AvailabilityService

```typescript
interface AvailabilityService {
  getAvailability(dentistId: string): Promise<AvailabilitySchedule>
  
  updateAvailability(dentistId: string, schedule: AvailabilitySchedule): Promise<AvailabilitySchedule>
  
  getAvailableSlots(dentistId: string, date: Date): Promise<TimeSlot[]>
  
  reserveSlot(dentistId: string, dateTime: Date, patientId: string): Promise<SlotReservation>
  
  releaseSlot(reservationId: string): Promise<void>
}
```

#### RealtimeService

```typescript
interface RealtimeService {
  broadcastAppointmentChange(event: 'INSERT' | 'UPDATE' | 'DELETE', appointment: Appointment): Promise<void>
  
  broadcastAvailabilityChange(dentistId: string, availability: AvailabilitySchedule): Promise<void>
  
  subscribeToAppointments(userId: string, role: UserRole, callback: (event: RealtimeEvent) => void): Subscription
  
  subscribeToAvailability(dentistId: string, callback: (event: RealtimeEvent) => void): Subscription
  
  unsubscribe(subscription: Subscription): void
}
```

### 3. Repository Layer

Repositories handle direct database interactions.

#### AppointmentsRepository

```typescript
interface AppointmentsRepository {
  findById(id: string): Promise<Appointment | null>
  
  findByPatient(patientId: string, filters?: AppointmentFilters): Promise<Appointment[]>
  
  findByDentist(dentistId: string, filters?: AppointmentFilters): Promise<Appointment[]>
  
  create(data: CreateAppointmentData): Promise<Appointment>
  
  update(id: string, data: UpdateAppointmentData): Promise<Appointment>
  
  delete(id: string): Promise<void>
  
  findConflicts(dentistId: string, dateTime: Date, duration: number): Promise<Appointment[]>
}
```

#### DentistsRepository

```typescript
interface DentistsRepository {
  findById(id: string): Promise<Dentist | null>
  
  findAll(filters?: DentistFilters): Promise<Dentist[]>
  
  updateAvailability(id: string, availability: AvailabilitySchedule): Promise<Dentist>
  
  getAvailability(id: string): Promise<AvailabilitySchedule>
}
```

## Data Models

### Core Data Structures

#### Appointment

```typescript
interface Appointment {
  id: string
  patient_id: string
  dentist_id: string
  appointment_date: Date
  appointment_type: string
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled'
  notes?: string
  patient_notes?: string
  medical_history?: string
  documents: AppointmentDocument[]
  created_at: Date
  updated_at: Date
}

interface AppointmentDocument {
  id: string
  appointment_id: string
  file_name: string
  file_url: string
  file_type: string
  file_size: number
  uploaded_by: string
  created_at: Date
}
```

#### AvailabilitySchedule

```typescript
interface AvailabilitySchedule {
  monday?: string    // "09:00-17:00"
  tuesday?: string
  wednesday?: string
  thursday?: string
  friday?: string
  saturday?: string
  sunday?: string
}

interface TimeSlot {
  start: Date
  end: Date
  available: boolean
  dentist_id: string
}

interface SlotReservation {
  id: string
  dentist_id: string
  patient_id: string
  slot_time: Date
  expires_at: Date
  created_at: Date
}
```


#### DTOs (Data Transfer Objects)

```typescript
interface CreateAppointmentDTO {
  dentist_id: string
  appointment_date: string  // ISO 8601
  appointment_type: string
  notes?: string
  patient_notes?: string
  medical_history?: string
}

interface UpdateAppointmentDTO {
  appointment_date?: string
  appointment_type?: string
  status?: AppointmentStatus
  notes?: string
}

interface AppointmentFilters {
  status?: AppointmentStatus[]
  date_from?: Date
  date_to?: Date
  limit?: number
  offset?: number
}
```

### Database Schema Extensions

#### New Tables

```sql
-- Slot reservations for temporary holds during booking
CREATE TABLE public.slot_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dentist_id UUID REFERENCES public.dentists(id) ON DELETE CASCADE NOT NULL,
  patient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  slot_time TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(dentist_id, slot_time)
);

-- Index for efficient cleanup of expired reservations
CREATE INDEX idx_slot_reservations_expires_at ON public.slot_reservations(expires_at);

-- Real-time event log for debugging and monitoring
CREATE TABLE public.realtime_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  payload JSONB NOT NULL,
  broadcast_latency_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_realtime_events_created_at ON public.realtime_events(created_at DESC);
```

#### Database Triggers

```sql
-- Trigger for appointment changes
CREATE OR REPLACE FUNCTION notify_appointment_change()
RETURNS TRIGGER AS $
BEGIN
  -- Broadcast to dentist channel
  PERFORM pg_notify(
    'appointment_change',
    json_build_object(
      'event', TG_OP,
      'dentist_id', COALESCE(NEW.dentist_id, OLD.dentist_id),
      'patient_id', COALESCE(NEW.patient_id, OLD.patient_id),
      'appointment', row_to_json(NEW)
    )::text
  );
  
  -- Log event for monitoring
  INSERT INTO public.realtime_events (event_type, table_name, record_id, payload)
  VALUES (
    TG_OP,
    'appointments',
    COALESCE(NEW.id, OLD.id),
    row_to_json(NEW)
  );
  
  RETURN NEW;
END;
$ LANGUAGE plpgsql;

CREATE TRIGGER on_appointment_change
  AFTER INSERT OR UPDATE OR DELETE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION notify_appointment_change();

-- Trigger for availability changes
CREATE OR REPLACE FUNCTION notify_availability_change()
RETURNS TRIGGER AS $
BEGIN
  PERFORM pg_notify(
    'availability_change',
    json_build_object(
      'event', TG_OP,
      'dentist_id', NEW.id,
      'availability', NEW.available_times
    )::text
  );
  
  INSERT INTO public.realtime_events (event_type, table_name, record_id, payload)
  VALUES (
    TG_OP,
    'dentists',
    NEW.id,
    json_build_object('available_times', NEW.available_times)
  );
  
  RETURN NEW;
END;
$ LANGUAGE plpgsql;

CREATE TRIGGER on_availability_change
  AFTER UPDATE OF available_times ON public.dentists
  FOR EACH ROW EXECUTE FUNCTION notify_availability_change();

-- Function to clean up expired slot reservations
CREATE OR REPLACE FUNCTION cleanup_expired_reservations()
RETURNS void AS $
BEGIN
  DELETE FROM public.slot_reservations
  WHERE expires_at < now();
END;
$ LANGUAGE plpgsql;
```


## Error Handling

### Error Response Format

```typescript
interface ErrorResponse {
  error: {
    code: string
    message: string
    details?: Record<string, any>
    timestamp: string
  }
}

// Example error codes
enum ErrorCode {
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  CONFLICT = 'CONFLICT',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SLOT_UNAVAILABLE = 'SLOT_UNAVAILABLE',
  CANCELLATION_WINDOW_EXPIRED = 'CANCELLATION_WINDOW_EXPIRED'
}
```

### Error Handling Strategy

```typescript
class AppError extends Error {
  constructor(
    public code: ErrorCode,
    public message: string,
    public statusCode: number,
    public details?: Record<string, any>
  ) {
    super(message)
  }
}

// Global error handler middleware
function errorHandler(error: Error, req: Request, res: Response, next: NextFunction) {
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
        timestamp: new Date().toISOString()
      }
    })
  }
  
  // Log unexpected errors
  logger.error('Unexpected error:', error)
  
  return res.status(500).json({
    error: {
      code: ErrorCode.INTERNAL_ERROR,
      message: 'An unexpected error occurred',
      timestamp: new Date().toISOString()
    }
  })
}
```

### Retry Logic for Real-Time Broadcasts

```typescript
async function broadcastWithRetry(
  channel: string,
  payload: any,
  maxRetries: number = 3
): Promise<void> {
  let attempt = 0
  
  while (attempt < maxRetries) {
    try {
      await supabase.channel(channel).send({
        type: 'broadcast',
        event: 'update',
        payload
      })
      return
    } catch (error) {
      attempt++
      if (attempt >= maxRetries) {
        logger.error(`Failed to broadcast after ${maxRetries} attempts`, { channel, error })
        throw error
      }
      // Exponential backoff
      await sleep(Math.pow(2, attempt) * 100)
    }
  }
}
```

## Testing Strategy

### Unit Testing

Test individual services and repositories in isolation.

```typescript
describe('AppointmentsService', () => {
  describe('createAppointment', () => {
    it('should create appointment when slot is available', async () => {
      // Arrange
      const mockRepo = createMockRepository()
      const service = new AppointmentsService(mockRepo)
      
      // Act
      const result = await service.createAppointment(validDTO, userId)
      
      // Assert
      expect(result).toBeDefined()
      expect(mockRepo.create).toHaveBeenCalledWith(expect.objectContaining({
        patient_id: userId
      }))
    })
    
    it('should throw error when slot is unavailable', async () => {
      // Arrange
      const mockRepo = createMockRepository({ hasConflict: true })
      const service = new AppointmentsService(mockRepo)
      
      // Act & Assert
      await expect(
        service.createAppointment(validDTO, userId)
      ).rejects.toThrow('Slot unavailable')
    })
  })
})
```

### Integration Testing

Test API endpoints with real database connections.

```typescript
describe('POST /api/appointments', () => {
  it('should create appointment and broadcast to connected clients', async () => {
    // Arrange
    const authToken = await getTestAuthToken('patient')
    const realtimeListener = createRealtimeListener()
    
    // Act
    const response = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${authToken}`)
      .send(validAppointmentData)
    
    // Assert
    expect(response.status).toBe(201)
    expect(response.body).toHaveProperty('id')
    
    // Wait for real-time broadcast
    await waitFor(() => {
      expect(realtimeListener.events).toContainEqual(
        expect.objectContaining({
          event: 'INSERT',
          table: 'appointments'
        })
      )
    })
  })
})
```


### Real-Time Testing

Test WebSocket connections and real-time synchronization.

```typescript
describe('Real-Time Synchronization', () => {
  it('should sync appointment creation across all clients', async () => {
    // Arrange
    const adminClient = createRealtimeClient('admin')
    const patientClient = createRealtimeClient('patient')
    const chatbotClient = createRealtimeClient('chatbot')
    
    await Promise.all([
      adminClient.connect(),
      patientClient.connect(),
      chatbotClient.connect()
    ])
    
    // Act
    await createAppointmentViaAPI(validAppointmentData)
    
    // Assert
    await waitFor(() => {
      expect(adminClient.receivedEvents).toHaveLength(1)
      expect(patientClient.receivedEvents).toHaveLength(1)
      expect(chatbotClient.receivedEvents).toHaveLength(1)
    }, { timeout: 1000 })
  })
})
```

## Security Considerations

### Authentication Flow

```typescript
// JWT verification middleware
async function authenticateRequest(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace('Bearer ', '')
  
  if (!token) {
    throw new AppError(ErrorCode.UNAUTHORIZED, 'No token provided', 401)
  }
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token)
    
    if (error || !user) {
      throw new AppError(ErrorCode.UNAUTHORIZED, 'Invalid token', 401)
    }
    
    req.user = user
    next()
  } catch (error) {
    throw new AppError(ErrorCode.UNAUTHORIZED, 'Authentication failed', 401)
  }
}
```

### Authorization Checks

```typescript
// Role-based authorization
async function requireRole(role: UserRole) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const userRoles = await getUserRoles(req.user.id)
    
    if (!userRoles.includes(role)) {
      throw new AppError(
        ErrorCode.FORBIDDEN,
        `Requires ${role} role`,
        403
      )
    }
    
    next()
  }
}

// Resource ownership check
async function requireOwnership(resourceType: string) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const resourceId = req.params.id
    const resource = await getResource(resourceType, resourceId)
    
    if (!resource) {
      throw new AppError(ErrorCode.NOT_FOUND, 'Resource not found', 404)
    }
    
    if (resource.patient_id !== req.user.id && resource.dentist_id !== req.user.id) {
      throw new AppError(ErrorCode.FORBIDDEN, 'Access denied', 403)
    }
    
    next()
  }
}
```

### Row-Level Security Policies

```sql
-- Appointments: Patients can only see their own, dentists can see assigned
CREATE POLICY "appointments_select_policy"
  ON public.appointments FOR SELECT
  USING (
    auth.uid() = patient_id 
    OR (auth.uid() = dentist_id AND has_role(auth.uid(), 'dentist'))
    OR has_role(auth.uid(), 'admin')
  );

-- Slot reservations: Only the patient who reserved can see
CREATE POLICY "slot_reservations_select_policy"
  ON public.slot_reservations FOR SELECT
  USING (auth.uid() = patient_id);

-- Real-time channels: Filter by user permissions
CREATE POLICY "realtime_appointments_policy"
  ON public.appointments FOR SELECT
  TO authenticated
  USING (
    auth.uid() = patient_id 
    OR auth.uid() = dentist_id
  );
```

## Performance Optimization

### Caching Strategy

```typescript
interface CacheService {
  get<T>(key: string): Promise<T | null>
  set<T>(key: string, value: T, ttl?: number): Promise<void>
  invalidate(pattern: string): Promise<void>
}

// Cache dentist profiles (rarely change)
async function getDentistProfile(dentistId: string): Promise<Dentist> {
  const cacheKey = `dentist:${dentistId}`
  
  // Try cache first
  const cached = await cache.get<Dentist>(cacheKey)
  if (cached) return cached
  
  // Fetch from database
  const dentist = await dentistsRepository.findById(dentistId)
  
  // Cache for 1 hour
  await cache.set(cacheKey, dentist, 3600)
  
  return dentist
}

// Invalidate cache on update
async function updateDentistAvailability(dentistId: string, schedule: AvailabilitySchedule) {
  await dentistsRepository.updateAvailability(dentistId, schedule)
  await cache.invalidate(`dentist:${dentistId}`)
}
```


### Database Query Optimization

```typescript
// Use indexes for common queries
// Already created in migrations:
// - idx_appointments_dentist_id
// - idx_appointments_patient_id
// - idx_appointment_documents_appointment_id

// Batch loading to avoid N+1 queries
async function getAppointmentsWithDetails(dentistId: string): Promise<AppointmentWithDetails[]> {
  // Single query with joins instead of multiple queries
  const { data, error } = await supabase
    .from('appointments')
    .select(`
      *,
      patient:profiles!patient_id(full_name, email, phone),
      documents:appointment_documents(*)
    `)
    .eq('dentist_id', dentistId)
    .order('appointment_date', { ascending: true })
  
  if (error) throw error
  return data
}

// Pagination for large result sets
async function listAppointments(
  filters: AppointmentFilters
): Promise<PaginatedResponse<Appointment>> {
  const { limit = 20, offset = 0 } = filters
  
  const query = supabase
    .from('appointments')
    .select('*', { count: 'exact' })
    .range(offset, offset + limit - 1)
  
  // Apply filters
  if (filters.status) {
    query.in('status', filters.status)
  }
  if (filters.date_from) {
    query.gte('appointment_date', filters.date_from.toISOString())
  }
  if (filters.date_to) {
    query.lte('appointment_date', filters.date_to.toISOString())
  }
  
  const { data, error, count } = await query
  
  if (error) throw error
  
  return {
    data,
    pagination: {
      total: count || 0,
      limit,
      offset,
      hasMore: (offset + limit) < (count || 0)
    }
  }
}
```

### Connection Pooling

```typescript
// Supabase client with connection pooling
export const supabase = createClient<Database>(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: false
    },
    db: {
      schema: 'public'
    },
    global: {
      headers: {
        'x-application-name': 'realtime-sync-backend'
      }
    }
  }
)

// For high-concurrency scenarios, consider using pgBouncer
// Connection string: postgresql://user:pass@host:6543/db?pgbouncer=true
```

## Monitoring and Observability

### Metrics to Track

```typescript
interface Metrics {
  // Real-time performance
  broadcast_latency_ms: number
  active_websocket_connections: number
  messages_per_second: number
  
  // API performance
  api_request_duration_ms: number
  api_requests_per_second: number
  api_error_rate: number
  
  // Database performance
  db_query_duration_ms: number
  db_connection_pool_usage: number
  db_slow_queries_count: number
  
  // Business metrics
  appointments_created_per_hour: number
  appointment_cancellation_rate: number
  slot_reservation_timeout_rate: number
}
```

### Logging Strategy

```typescript
import winston from 'winston'

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'realtime-sync-backend' },
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
})

// Structured logging
logger.info('Appointment created', {
  appointment_id: appointment.id,
  dentist_id: appointment.dentist_id,
  patient_id: appointment.patient_id,
  timestamp: new Date().toISOString()
})

// Error logging with context
logger.error('Failed to broadcast appointment change', {
  error: error.message,
  stack: error.stack,
  appointment_id: appointment.id,
  retry_count: retryCount
})
```

### Health Check Endpoint

```typescript
// GET /health
async function healthCheck(req: Request, res: Response) {
  const checks = {
    database: await checkDatabaseConnection(),
    realtime: await checkRealtimeConnection(),
    cache: await checkCacheConnection()
  }
  
  const isHealthy = Object.values(checks).every(check => check.status === 'ok')
  
  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    checks
  })
}

async function checkDatabaseConnection(): Promise<HealthCheckResult> {
  try {
    const { error } = await supabase.from('profiles').select('id').limit(1)
    return { status: 'ok', latency_ms: 0 }
  } catch (error) {
    return { status: 'error', message: error.message }
  }
}
```

