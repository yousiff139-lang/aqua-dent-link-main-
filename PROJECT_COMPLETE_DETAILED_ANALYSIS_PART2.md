# AQUA DENT LINK - PART 2: BACKEND & IMPLEMENTATION DETAILS

## 🔧 BACKEND SERVICES

### 1. NODE.JS API - Port 3000

**Purpose:** RESTful API for appointments, payments, and data management

**Project Structure:**
```
backend/
├── src/
│   ├── config/
│   │   ├── database.ts          # Supabase connection
│   │   ├── env.ts               # Environment variables
│   │   ├── logger.ts            # Winston logger setup
│   │   └── supabase.ts          # Supabase client
│   ├── controllers/
│   │   ├── appointments.controller.ts
│   │   ├── availability.controller.ts
│   │   ├── chatbot.controller.ts
│   │   ├── dentist.controller.ts
│   │   ├── payments.controller.ts
│   │   ├── profiles.controller.ts
│   │   └── realtime.controller.ts
│   ├── middleware/
│   │   ├── auth.ts              # JWT authentication
│   │   ├── authorization.ts     # Role-based access
│   │   ├── error-handler.ts     # Global error handler
│   │   ├── rate-limiter.ts      # Rate limiting
│   │   ├── raw-body.ts          # Stripe webhook body
│   │   └── request-logger.ts    # HTTP request logging
│   ├── repositories/
│   │   ├── appointments.repository.ts
│   │   ├── dentists.repository.ts
│   │   ├── payment.repository.ts
│   │   └── slot-reservations.repository.ts
│   ├── routes/
│   │   ├── appointments.routes.ts
│   │   ├── availability.routes.ts
│   │   ├── chatbot.routes.ts
│   │   ├── dentist.routes.ts
│   │   ├── payments.routes.ts
│   │   ├── profiles.routes.ts
│   │   ├── realtime.routes.ts
│   │   └── index.ts             # Route aggregator
│   ├── services/
│   │   ├── appointments.service.ts
│   │   ├── availability.service.ts
│   │   ├── chatbot.service.ts
│   │   ├── dentist.service.ts
│   │   ├── payment.service.ts
│   │   ├── realtime.service.ts
│   │   └── validation.service.ts
│   ├── types/
│   │   └── index.ts             # TypeScript types
│   ├── utils/
│   │   ├── async-handler.ts     # Async error wrapper
│   │   └── errors.ts            # Custom error classes
│   ├── app.ts                   # Express app setup
│   ├── index.ts                 # Entry point
│   └── server.ts                # Server startup
├── .env
├── package.json
└── tsconfig.json
```

**API Endpoints:**

**Appointments**
```
POST   /api/appointments              Create appointment
GET    /api/appointments/:id          Get appointment by ID
GET    /api/appointments/patient/:id  Get patient appointments
GET    /api/appointments/dentist/:id  Get dentist appointments
PUT    /api/appointments/:id          Update appointment
DELETE /api/appointments/:id          Cancel appointment
PATCH  /api/appointments/:id/complete Mark as completed
```

**Dentists**
```
GET    /api/dentists                  Get all dentists
GET    /api/dentists/:id              Get dentist by ID
POST   /api/dentists                  Create dentist (admin)
PUT    /api/dentists/:id              Update dentist (admin)
DELETE /api/dentists/:id              Delete dentist (admin)
GET    /api/dentists/:id/availability Get availability
PUT    /api/dentists/:id/availability Update availability
```

**Payments**
```
POST   /api/payments/create-checkout-session  Create Stripe session
POST   /api/payments/webhook                  Stripe webhook handler
GET    /api/payments/:appointmentId           Get payment details
```

**Availability**
```
GET    /api/availability/:dentistId/slots     Get available slots
POST   /api/availability/check                Check slot availability
GET    /api/availability/:dentistId/dates     Get available dates
```

**Chatbot**
```
POST   /api/chatbot/message                   Send message
POST   /api/chatbot/intent                    Classify intent
GET    /api/chatbot/conversations/:userId     Get conversations
POST   /api/chatbot/xray                      Upload X-ray
```

**Real-time**
```
GET    /api/realtime/subscriptions            Get active subscriptions
POST   /api/realtime/broadcast                Broadcast event
```

**Key Implementation Details:**

1. **appointments.service.ts**
```typescript
export class AppointmentsService {
  async createAppointment(data: AppointmentCreateData): Promise<Appointment> {
    // 1. Validate appointment data
    const validation = validateAppointmentData(data);
    if (!validation.success) {
      throw new ValidationError(validation.errors);
    }

    // 2. Check slot availability
    const isAvailable = await this.checkSlotAvailability(
      data.dentist_id,
      data.appointment_date,
      data.appointment_time
    );
    if (!isAvailable) {
      throw new ConflictError('Slot not available');
    }

    // 3. Generate booking reference
    const bookingReference = generateBookingReference();

    // 4. Create appointment in database
    const { data: appointment, error } = await supabase
      .from('appointments')
      .insert({
        ...data,
        booking_reference: bookingReference,
        status: 'pending',
      })
      .select()
      .single();

    if (error) throw new DatabaseError(error.message);

    // 5. Send confirmation email
    await this.sendConfirmationEmail(appointment);

    // 6. Broadcast real-time event
    await realtimeService.broadcast('appointment_created', appointment);

    return appointment;
  }

  async checkSlotAvailability(
    dentistId: string,
    date: string,
    time: string
  ): Promise<boolean> {
    // Check if slot is within working hours
    const availability = await this.getDentistAvailability(dentistId, date);
    if (!availability) return false;

    // Check if slot is already booked
    const { data: existingAppointments } = await supabase
      .from('appointments')
      .select('id')
      .eq('dentist_id', dentistId)
      .eq('appointment_date', date)
      .eq('appointment_time', time)
      .in('status', ['pending', 'confirmed', 'upcoming']);

    return existingAppointments.length === 0;
  }

  async markComplete(id: string, dentistId: string): Promise<Appointment> {
    // Verify dentist owns this appointment
    const appointment = await this.getById(id);
    if (appointment.dentist_id !== dentistId) {
      throw new ForbiddenError('Not authorized');
    }

    // Update status
    const { data, error } = await supabase
      .from('appointments')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new DatabaseError(error.message);

    // Broadcast update
    await realtimeService.broadcast('appointment_completed', data);

    return data;
  }
}
```

2. **payment.service.ts**
```typescript
export class PaymentService {
  private stripe: Stripe;

  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2023-10-16',
    });
  }

  async createCheckoutSession(
    appointmentId: string,
    amount: number,
    successUrl: string,
    cancelUrl: string
  ): Promise<string> {
    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Dental Appointment',
              description: `Appointment ID: ${appointmentId}`,
            },
            unit_amount: amount, // Amount in cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        appointment_id: appointmentId,
      },
    });

    // Store session ID in appointment
    await supabase
      .from('appointments')
      .update({ stripe_session_id: session.id })
      .eq('id', appointmentId);

    return session.url!;
  }

  async handleWebhook(
    payload: Buffer,
    signature: string
  ): Promise<void> {
    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!
      );
    } catch (err) {
      throw new Error(`Webhook signature verification failed: ${err.message}`);
    }

    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutCompleted(event.data.object);
        break;
      case 'payment_intent.succeeded':
        await this.handlePaymentSucceeded(event.data.object);
        break;
      case 'payment_intent.payment_failed':
        await this.handlePaymentFailed(event.data.object);
        break;
    }
  }

  private async handleCheckoutCompleted(
    session: Stripe.Checkout.Session
  ): Promise<void> {
    const appointmentId = session.metadata?.appointment_id;
    if (!appointmentId) return;

    await supabase
      .from('appointments')
      .update({
        payment_status: 'paid',
        stripe_payment_intent_id: session.payment_intent as string,
      })
      .eq('id', appointmentId);

    // Send confirmation email
    await this.sendPaymentConfirmation(appointmentId);
  }
}
```

3. **availability.service.ts**
```typescript
export class AvailabilityService {
  async getAvailableSlots(
    dentistId: string,
    fromDate: Date,
    toDate: Date
  ): Promise<TimeSlot[]> {
    // Call database function
    const { data, error } = await supabase.rpc('get_available_slots', {
      p_dentist_id: dentistId,
      p_from_date: fromDate.toISOString().split('T')[0],
      p_to_date: toDate.toISOString().split('T')[0],
    });

    if (error) throw new DatabaseError(error.message);

    return data.map((slot: any) => ({
      start: new Date(slot.slot_start),
      end: new Date(slot.slot_end),
      isBooked: slot.is_booked,
    }));
  }

  async updateDentistAvailability(
    dentistId: string,
    schedule: WeeklySchedule
  ): Promise<void> {
    // Delete existing availability
    await supabase
      .from('dentist_availability')
      .delete()
      .eq('dentist_id', dentistId);

    // Insert new schedule
    const records = Object.entries(schedule).flatMap(([day, times]) =>
      times.map(({ start, end }) => ({
        dentist_id: dentistId,
        day_of_week: parseInt(day),
        start_time: start,
        end_time: end,
        slot_duration_minutes: 30,
      }))
    );

    const { error } = await supabase
      .from('dentist_availability')
      .insert(records);

    if (error) throw new DatabaseError(error.message);
  }
}
```

**Middleware:**

1. **auth.ts**
```typescript
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      throw new UnauthorizedError('No token provided');
    }

    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      throw new UnauthorizedError('Invalid token');
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};
```

2. **authorization.ts**
```typescript
export const requireRole = (roles: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new UnauthorizedError('Not authenticated');
      }

      const { data: userRole } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .single();

      if (!userRole || !roles.includes(userRole.role)) {
        throw new ForbiddenError('Insufficient permissions');
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
```

3. **error-handler.ts**
```typescript
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  logger.error('Error:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  if (err instanceof ValidationError) {
    return res.status(400).json({
      error: 'Validation Error',
      details: err.errors,
    });
  }

  if (err instanceof UnauthorizedError) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: err.message,
    });
  }

  if (err instanceof ForbiddenError) {
    return res.status(403).json({
      error: 'Forbidden',
      message: err.message,
    });
  }

  if (err instanceof ConflictError) {
    return res.status(409).json({
      error: 'Conflict',
      message: err.message,
    });
  }

  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
  });
};
```

**Environment Variables:**
```env
# Server
PORT=3000
NODE_ENV=development

# Supabase
SUPABASE_URL=https://ypbklvrerxikktkbswad.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
DEFAULT_APPOINTMENT_AMOUNT=5000

# CORS
CORS_ORIGIN=http://localhost:5174,http://localhost:3010,http://localhost:5175

# JWT
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=24h
```

---

### 2. PYTHON CHATBOT - Port 8000

**Purpose:** AI-powered chatbot for patient assistance and appointment booking

**Project Structure:**
```
chatbot-backend/
├── main.py                  # FastAPI app
├── config.py                # Configuration
├── database.py              # PostgreSQL connection
├── gemini_service.py        # Gemini AI integration
├── intent_classifier.py     # Intent detection
├── requirements.txt         # Python dependencies
├── .env                     # Environment variables
├── Dockerfile               # Docker configuration
└── README.md
```

**Key Files:**

1. **main.py**
```python
from fastapi import FastAPI, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

app = FastAPI(title="DentalCare Chatbot API")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5174", "http://localhost:3010"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/chat")
async def chat(
    user_id: str = Form(...),
    message: str = Form(...),
    context: str = Form(None)
):
    """Handle chat messages"""
    # 1. Classify intent
    intent = intent_classifier.classify(message)
    
    # 2. Get user context from database
    user_context = await get_user_context(user_id)
    
    # 3. Generate AI response
    response = await gemini_service.generate_response(
        message=message,
        intent=intent,
        context=user_context
    )
    
    # 4. Log conversation
    await log_conversation(user_id, message, response, intent)
    
    return {
        "success": True,
        "reply": response,
        "intent": intent,
        "timestamp": datetime.now().isoformat()
    }

@app.post("/upload_xray")
async def upload_xray(
    file: UploadFile,
    user_id: str = Form(...),
    query: str = Form(None)
):
    """Analyze X-ray images"""
    # 1. Save file
    file_path = await save_upload(file, user_id)
    
    # 2. Analyze with Gemini Vision
    analysis = await gemini_service.analyze_image(
        file_path=file_path,
        query=query or "Analyze this dental X-ray"
    )
    
    # 3. Store in database
    upload_id = await store_xray_analysis(user_id, file_path, analysis)
    
    return {
        "success": True,
        "analysis": analysis,
        "file_path": file_path,
        "upload_id": upload_id
    }

@app.get("/appointments/{user_id}")
async def get_appointments(user_id: str, limit: int = 10):
    """Get user appointments"""
    appointments = await db.fetch_appointments(user_id, limit)
    return {
        "success": True,
        "appointments": appointments
    }

@app.get("/dentists")
async def get_dentists(specialization: str = None):
    """Get dentist list"""
    dentists = await db.fetch_dentists(specialization)
    return {
        "success": True,
        "dentists": dentists
    }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

2. **gemini_service.py**
```python
import google.generativeai as genai
from config import GEMINI_API_KEY

genai.configure(api_key=GEMINI_API_KEY)

class GeminiService:
    def __init__(self):
        self.flash_model = genai.GenerativeModel('gemini-2.0-flash-exp')
        self.pro_model = genai.GenerativeModel('gemini-2.0-flash-exp')
    
    async def generate_response(
        self,
        message: str,
        intent: str,
        context: dict
    ) -> str:
        """Generate AI response based on intent"""
        
        # Build prompt based on intent
        if intent == "book_appointment":
            prompt = self._build_booking_prompt(message, context)
        elif intent == "dental_advice":
            prompt = self._build_advice_prompt(message, context)
        elif intent == "dentist_suggestion":
            prompt = self._build_suggestion_prompt(message, context)
        else:
            prompt = self._build_general_prompt(message, context)
        
        # Generate response
        response = await self.flash_model.generate_content_async(prompt)
        return response.text
    
    async def analyze_image(
        self,
        file_path: str,
        query: str
    ) -> str:
        """Analyze dental X-ray or image"""
        
        # Load image
        image = Image.open(file_path)
        
        # Build prompt
        prompt = f"""
        You are a dental AI assistant analyzing a dental X-ray or image.
        
        Query: {query}
        
        Please provide:
        1. What you observe in the image
        2. Any potential dental issues
        3. Recommendations for the patient
        4. Whether they should see a dentist urgently
        
        Be professional, clear, and empathetic.
        """
        
        # Generate analysis
        response = await self.pro_model.generate_content_async([prompt, image])
        return response.text
    
    def _build_booking_prompt(self, message: str, context: dict) -> str:
        return f"""
        You are a dental appointment booking assistant.
        
        Patient message: {message}
        
        Current context:
        - Has selected dentist: {context.get('dentist_selected', False)}
        - Has selected date: {context.get('date_selected', False)}
        - Has selected time: {context.get('time_selected', False)}
        
        Guide the patient through the booking process step by step.
        Be friendly and professional.
        """
```

3. **intent_classifier.py**
```python
from transformers import pipeline

class IntentClassifier:
    def __init__(self):
        self.classifier = pipeline(
            "zero-shot-classification",
            model="facebook/bart-large-mnli"
        )
        
        self.intents = [
            "book_appointment",
            "payment_help",
            "dentist_suggestion",
            "view_appointments",
            "xray_analysis",
            "dental_advice",
            "general_query"
        ]
    
    def classify(self, message: str) -> str:
        """Classify user intent"""
        result = self.classifier(message, self.intents)
        
        # Get highest confidence intent
        intent = result['labels'][0]
        confidence = result['scores'][0]
        
        # Return intent if confidence > 0.7
        if confidence > 0.7:
            return intent
        else:
            return "general_query"
```

4. **database.py**
```python
import psycopg2
from psycopg2.extras import RealDictCursor
from config import DATABASE_URL

class Database:
    def __init__(self):
        self.conn = psycopg2.connect(DATABASE_URL)
    
    async def fetch_appointments(self, user_id: str, limit: int):
        """Fetch user appointments"""
        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT 
                    a.*,
                    d.name as dentist_name,
                    d.specialization
                FROM appointments a
                LEFT JOIN dentists d ON a.dentist_id = d.id
                WHERE a.patient_id = %s
                ORDER BY a.appointment_date DESC, a.appointment_time DESC
                LIMIT %s
            """, (user_id, limit))
            return cur.fetchall()
    
    async def fetch_dentists(self, specialization: str = None):
        """Fetch dentists"""
        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            if specialization:
                cur.execute("""
                    SELECT * FROM dentists
                    WHERE specialization = %s
                    ORDER BY rating DESC
                """, (specialization,))
            else:
                cur.execute("""
                    SELECT * FROM dentists
                    ORDER BY rating DESC
                """)
            return cur.fetchall()
    
    async def log_conversation(
        self,
        user_id: str,
        message: str,
        response: str,
        intent: str
    ):
        """Log chatbot conversation"""
        with self.conn.cursor() as cur:
            cur.execute("""
                INSERT INTO chatbot_logs
                (user_id, message, response, intent, created_at)
                VALUES (%s, %s, %s, %s, NOW())
            """, (user_id, message, response, intent))
            self.conn.commit()
```

**Environment Variables:**
```env
# Gemini AI
GEMINI_API_KEY=your_gemini_api_key

# Database
DATABASE_URL=postgresql://user:pass@host:5432/dbname
SUPABASE_URL=https://ypbklvrerxikktkbswad.supabase.co
SUPABASE_SERVICE_KEY=your_service_key

# Server
DEBUG=False
LOG_LEVEL=INFO
```

**Dependencies (requirements.txt):**
```
fastapi==0.104.1
uvicorn[standard]==0.24.0
python-multipart==0.0.6
google-generativeai==0.3.1
transformers==4.35.2
torch==2.1.1
psycopg2-binary==2.9.9
python-dotenv==1.0.0
Pillow==10.1.0
```

---
