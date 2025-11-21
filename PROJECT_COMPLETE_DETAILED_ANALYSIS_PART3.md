# AQUA DENT LINK - PART 3: FEATURES, ERRORS & TESTING

## ✨ FEATURES IMPLEMENTED

### 1. USER AUTHENTICATION & AUTHORIZATION

**Sign Up**
- Email/password registration
- Email verification required
- Password strength validation
- Duplicate email prevention
- Auto-login after signup

**Sign In**
- Email/password authentication
- Remember me option
- Session management
- Auto-redirect to dashboard

**Password Reset**
- Email-based reset flow
- Secure token generation
- Password update form
- Confirmation email

**Role-Based Access**
- Patient role (default)
- Dentist role (for dentist portal)
- Admin role (for admin dashboard)
- Protected routes per role

**Implementation:**
```typescript
// src/contexts/AuthContext.tsx
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email, password, fullName) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName }
      }
    });
    if (error) throw error;
    return data;
  };

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    if (error) throw error;
    return data;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return (
    <AuthContext.Provider value={{ user, signUp, signIn, signOut, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
```

---

### 2. DENTIST BROWSING & PROFILES

**Dentist List**
- Grid/card view
- Filter by specialization
- Sort by rating/experience
- Search by name
- Pagination
- Loading skeletons

**Dentist Profile**
- Professional photo
- Bio and education
- Specialization
- Years of experience
- Rating display (stars)
- Expertise tags
- Availability calendar
- Booking form
- Reviews section

**Implementation:**
```typescript
// src/hooks/useDentists.ts
export const useDentists = () => {
  return useQuery({
    queryKey: ['dentists'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dentists')
        .select('*')
        .order('rating', { ascending: false });
      
      if (error) throw error;
      return data as Dentist[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// src/hooks/useDentist.ts
export const useDentist = (id: string) => {
  return useQuery({
    queryKey: ['dentist', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dentists')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data as Dentist;
    },
    enabled: !!id,
  });
};
```

---

### 3. APPOINTMENT BOOKING SYSTEM

**Booking Form**
- Patient information (name, email, phone)
- Date picker (past dates disabled)
- Time slot selector (shows availability)
- Symptoms/reason textarea
- Payment method selection (Stripe/Cash)
- Form validation (Zod schema)
- Loading states
- Error handling

**Slot Availability**
- Real-time availability check
- Shows booked/available slots
- Respects dentist working hours
- Handles days off
- 30-minute slot duration
- No slots beyond working hours

**Booking Confirmation**
- Success message
- Booking reference number
- Appointment details
- Payment status
- Next steps
- Add to calendar button
- Email confirmation

**Implementation:**
```typescript
// src/components/BookingForm.tsx
const bookingSchema = z.object({
  patientName: z.string().min(2, 'Name must be at least 2 characters'),
  patientEmail: z.string().email('Invalid email address'),
  patientPhone: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number'),
  appointmentDate: z.string().refine(
    (date) => new Date(date) > new Date(),
    'Date must be in the future'
  ),
  appointmentTime: z.string(),
  symptoms: z.string().min(10, 'Please describe your symptoms'),
  paymentMethod: z.enum(['stripe', 'cash']),
});

export const BookingForm = ({ dentist }) => {
  const form = useForm({
    resolver: zodResolver(bookingSchema),
  });

  const createAppointment = useMutation({
    mutationFn: async (data) => {
      const { data: appointment, error } = await supabase
        .from('appointments')
        .insert({
          patient_id: user.id,
          dentist_id: dentist.id,
          patient_name: data.patientName,
          patient_email: data.patientEmail,
          patient_phone: data.patientPhone,
          appointment_date: data.appointmentDate,
          appointment_time: data.appointmentTime,
          symptoms: data.symptoms,
          payment_method: data.paymentMethod,
          payment_status: data.paymentMethod === 'stripe' ? 'pending' : 'pending',
          status: 'pending',
          booking_reference: generateBookingReference(),
        })
        .select()
        .single();

      if (error) throw error;
      return appointment;
    },
    onSuccess: (appointment) => {
      if (appointment.payment_method === 'stripe') {
        // Redirect to Stripe checkout
        handleStripeCheckout(appointment.id);
      } else {
        // Show confirmation
        setShowConfirmation(true);
      }
    },
  });

  const onSubmit = (data) => {
    createAppointment.mutate(data);
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      {/* Form fields */}
    </form>
  );
};
```

---

### 4. PAYMENT INTEGRATION (STRIPE)

**Stripe Checkout**
- Secure payment processing
- Card payment support
- Redirect to Stripe hosted page
- Success/cancel URLs
- Session metadata

**Webhook Handling**
- Payment confirmation
- Status updates
- Email notifications
- Idempotency

**Cash Payment**
- Mark as pending
- Reminder to pay at appointment
- Manual confirmation by dentist

**Implementation:**
```typescript
// src/hooks/useStripeCheckout.ts
export const useStripeCheckout = () => {
  const createCheckoutSession = async (appointmentId: string) => {
    const response = await axios.post(
      `${API_URL}/payments/create-checkout-session`,
      {
        appointmentId,
        amount: 5000, // $50.00
        successUrl: `${window.location.origin}/payment-success?appointment_id=${appointmentId}`,
        cancelUrl: `${window.location.origin}/payment-cancel?appointment_id=${appointmentId}`,
      }
    );

    const { url } = response.data;
    window.location.href = url;
  };

  return { createCheckoutSession };
};

// backend/src/services/payment.service.ts
async handleWebhook(payload: Buffer, signature: string) {
  const event = this.stripe.webhooks.constructEvent(
    payload,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET!
  );

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const appointmentId = session.metadata.appointment_id;

    await supabase
      .from('appointments')
      .update({
        payment_status: 'paid',
        stripe_payment_intent_id: session.payment_intent,
      })
      .eq('id', appointmentId);

    await this.sendPaymentConfirmation(appointmentId);
  }
}
```

---

### 5. AI CHATBOT SYSTEM

**Chatbot Widget**
- Floating chat button
- Expandable chat window
- Message history
- Typing indicators
- Auto-scroll

**Intent Classification**
- Book appointment
- Payment help
- Dentist suggestion
- View appointments
- X-ray analysis
- Dental advice
- General query

**Conversation Flow**
- Multi-turn conversations
- Context awareness
- State management
- Booking data extraction

**X-ray Analysis**
- Image upload
- AI-powered analysis
- Dental issue detection
- Recommendations

**Implementation:**
```typescript
// src/services/chatbotService.ts
export class ChatbotService {
  async sendMessage(message: string, userId: string, context?: any) {
    const formData = new FormData();
    formData.append('user_id', userId);
    formData.append('message', message);
    if (context) {
      formData.append('context', JSON.stringify(context));
    }

    const response = await axios.post(
      'http://localhost:8000/chat',
      formData
    );

    return response.data;
  }

  async uploadXray(file: File, userId: string, query?: string) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('user_id', userId);
    if (query) {
      formData.append('query', query);
    }

    const response = await axios.post(
      'http://localhost:8000/upload_xray',
      formData
    );

    return response.data;
  }

  async classifyIntent(message: string) {
    const formData = new FormData();
    formData.append('message', message);

    const response = await axios.post(
      'http://localhost:8000/intent/classify',
      formData
    );

    return response.data.intent;
  }
}

// src/components/ChatbotWidget.tsx
export const ChatbotWidget = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const sendMessage = async () => {
    const userMessage = { role: 'user', content: input };
    setMessages([...messages, userMessage]);
    setInput('');

    const response = await chatbotService.sendMessage(
      input,
      user.id,
      { messages }
    );

    const botMessage = { role: 'assistant', content: response.reply };
    setMessages([...messages, userMessage, botMessage]);
  };

  return (
    <div className="chatbot-widget">
      {isOpen && (
        <div className="chat-window">
          <div className="messages">
            {messages.map((msg, i) => (
              <div key={i} className={`message ${msg.role}`}>
                {msg.content}
              </div>
            ))}
          </div>
          <div className="input-area">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            />
            <button onClick={sendMessage}>Send</button>
          </div>
        </div>
      )}
      <button onClick={() => setIsOpen(!isOpen)}>
        💬
      </button>
    </div>
  );
};
```

---

### 6. REAL-TIME SYNCHRONIZATION

**Features**
- WebSocket connections
- Table-level subscriptions
- Automatic UI updates
- Cross-portal sync
- No page reload needed

**Subscribed Tables**
- appointments
- dentists
- dentist_availability
- notifications

**Implementation:**
```typescript
// src/hooks/useRealtimeSync.ts
export const useRealtimeSync = (table: string, callback: (payload: any) => void) => {
  useEffect(() => {
    const channel = supabase
      .channel(`${table}_changes`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: table,
        },
        (payload) => {
          console.log('Real-time update:', payload);
          callback(payload);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, callback]);
};

// Usage in component
const MyAppointments = () => {
  const { data: appointments, refetch } = useQuery(['appointments']);

  useRealtimeSync('appointments', (payload) => {
    if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
      refetch();
    }
  });

  return <div>{/* Render appointments */}</div>;
};
```

---

### 7. ADMIN DASHBOARD

**Features**
- View all dentists
- Add/edit/delete dentists
- View all appointments
- Manage dentist availability
- View patient details
- Statistics dashboard

**Admin Authentication**
- Email whitelist (karrarmayaly@gmail.com, bingo@gmail.com)
- Protected routes
- Auto-redirect if not admin

**Implementation:**
```typescript
// src/lib/auth.ts
export const ADMIN_EMAILS = [
  'karrarmayaly@gmail.com',
  'bingo@gmail.com',
];

export const isAdmin = (email: string) => {
  return ADMIN_EMAILS.includes(email.toLowerCase());
};

// src/pages/EnhancedAdmin.tsx
export const EnhancedAdmin = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (!user || !isAdmin(user.email)) {
      navigate('/');
    }
  }, [user]);

  const { data: dentists } = useQuery(['dentists']);
  const { data: appointments } = useQuery(['all-appointments']);

  const createDentist = useMutation({
    mutationFn: async (data) => {
      const { data: dentist, error } = await supabase
        .from('dentists')
        .insert(data)
        .select()
        .single();
      if (error) throw error;
      return dentist;
    },
  });

  return (
    <div className="admin-dashboard">
      <h1>Admin Dashboard</h1>
      <DentistList dentists={dentists} />
      <AppointmentTable appointments={appointments} />
    </div>
  );
};
```

---

### 8. DENTIST PORTAL

**Features**
- View appointments
- Mark appointments complete
- Add dentist notes
- Manage availability
- View patient information
- Download PDF summaries

**Implementation:**
```typescript
// dentist-portal/src/pages/Dashboard.tsx
export const Dashboard = () => {
  const { user } = useAuth();
  const dentistEmail = user?.email;

  const { data: appointments } = useQuery({
    queryKey: ['dentist-appointments', dentistEmail],
    queryFn: async () => {
      const response = await axios.get(
        `${API_URL}/appointments/dentist/${dentistEmail}`
      );
      return response.data;
    },
  });

  const markComplete = useMutation({
    mutationFn: async (appointmentId: string) => {
      await axios.patch(
        `${API_URL}/appointments/${appointmentId}/complete`
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['dentist-appointments']);
    },
  });

  return (
    <div className="dentist-dashboard">
      <h1>My Appointments</h1>
      {appointments?.map((apt) => (
        <AppointmentCard
          key={apt.id}
          appointment={apt}
          onComplete={() => markComplete.mutate(apt.id)}
        />
      ))}
    </div>
  );
};
```

---

### 9. DENTIST AVAILABILITY MANAGEMENT

**Features**
- Weekly schedule editor
- Set working hours per day
- Mark days off
- 30-minute slot duration
- Strict slot boundaries
- No slots beyond working hours

**Database Functions**
- `get_available_slots(dentist_id, from_date, to_date)`
- `is_slot_available(dentist_id, date, time, duration)`

**Triggers**
- `validate_appointment_slot` - Prevents double-booking

**Implementation:**
```sql
-- Database function
CREATE OR REPLACE FUNCTION get_available_slots(
  p_dentist_id UUID,
  p_from_date DATE,
  p_to_date DATE
)
RETURNS TABLE (
  slot_start TIMESTAMPTZ,
  slot_end TIMESTAMPTZ,
  is_booked BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE date_series AS (
    SELECT p_from_date::DATE AS date
    UNION ALL
    SELECT (date + INTERVAL '1 day')::DATE
    FROM date_series
    WHERE date < p_to_date
  ),
  time_slots AS (
    SELECT
      ds.date,
      da.start_time,
      da.end_time,
      da.slot_duration_minutes,
      EXTRACT(DOW FROM ds.date)::INTEGER AS day_of_week
    FROM date_series ds
    CROSS JOIN dentist_availability da
    WHERE da.dentist_id = p_dentist_id
      AND da.day_of_week = EXTRACT(DOW FROM ds.date)::INTEGER
      AND da.is_available = TRUE
  ),
  generated_slots AS (
    SELECT
      (ts.date + ts.start_time)::TIMESTAMPTZ AS slot_start,
      (ts.date + ts.start_time + (ts.slot_duration_minutes || ' minutes')::INTERVAL)::TIMESTAMPTZ AS slot_end
    FROM time_slots ts
    CROSS JOIN LATERAL generate_series(
      ts.start_time,
      ts.end_time - (ts.slot_duration_minutes || ' minutes')::INTERVAL,
      (ts.slot_duration_minutes || ' minutes')::INTERVAL
    ) AS slot_time
  )
  SELECT
    gs.slot_start,
    gs.slot_end,
    EXISTS (
      SELECT 1
      FROM appointments a
      WHERE a.dentist_id = p_dentist_id
        AND a.appointment_date = gs.slot_start::DATE
        AND a.appointment_time = gs.slot_start::TIME
        AND a.status IN ('pending', 'confirmed', 'upcoming')
    ) AS is_booked
  FROM generated_slots gs
  ORDER BY gs.slot_start;
END;
$$ LANGUAGE plpgsql;
```

---

### 10. NOTIFICATION SYSTEM

**Features**
- Email notifications
- In-app notifications
- Notification preferences
- Read/unread status

**Notification Types**
- Appointment confirmation
- Appointment reminder (24h before)
- Appointment completed
- Appointment cancelled
- Payment confirmation
- Payment reminder

**Implementation:**
```typescript
// src/services/notificationService.ts
export class NotificationService {
  async sendAppointmentConfirmation(appointmentId: string) {
    const appointment = await this.getAppointment(appointmentId);
    
    await this.sendEmail({
      to: appointment.patient_email,
      subject: 'Appointment Confirmation',
      template: 'appointment-confirmation',
      data: {
        patientName: appointment.patient_name,
        dentistName: appointment.dentist_name,
        date: appointment.appointment_date,
        time: appointment.appointment_time,
        bookingReference: appointment.booking_reference,
      },
    });

    await this.createNotification({
      user_id: appointment.patient_id,
      type: 'appointment_confirmation',
      title: 'Appointment Confirmed',
      message: `Your appointment with ${appointment.dentist_name} is confirmed`,
      data: { appointment_id: appointmentId },
    });
  }

  async sendAppointmentReminder(appointmentId: string) {
    // Send 24 hours before appointment
    const appointment = await this.getAppointment(appointmentId);
    
    await this.sendEmail({
      to: appointment.patient_email,
      subject: 'Appointment Reminder',
      template: 'appointment-reminder',
      data: appointment,
    });
  }
}
```

---
