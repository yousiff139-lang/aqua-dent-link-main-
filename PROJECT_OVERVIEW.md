# Aqua Dent Link - UML Documentation

## System Components

**3 Applications:**
1. User Web App (Patient-facing)
2. Dentist Portal (Dentist-facing)
3. Admin Panel (Administrator-facing)

**Central Database:** Supabase (PostgreSQL)

---

## ACTORS (UML Members/Users)

### 1. Patient
- Regular user seeking dental care
- Uses: User Web App
- Authentication: Email/Password

### 2. Dentist
- Healthcare provider
- Uses: Dentist Portal
- Authentication: Email/Password
- Has specialty (e.g., Orthodontist, Endodontist)

### 3. Administrator
- Clinic manager/staff
- Uses: Admin Panel
- Authentication: Email/Password
- Full system access

### 4. Payment System (External)
- Stripe API
- Processes online payments

---

## USE CASES / INTERACTIONS

### Patient Interactions (User Web App)

**UC1: Browse Dentists**
- Input: None
- Process: View all active dentists
- Output: List of dentists with specialty, rating, experience

**UC2: Browse Services**
- Input: None
- Process: View dental services catalog
- Output: Services with price, duration, specialty required

**UC3: Book Appointment (Direct)**
- Input: Dentist selection, date preference
- Process: 
  1. System fetches dentist availability
  2. Shows only available time slots
  3. Patient fills medical form
  4. Selects payment method
- Output: Appointment created
- Triggers: Notification to dentist, appears in admin panel

**UC4: Book Appointment (Service-Based)**
- Input: Service selection
- Process:
  1. System filters dentists by service specialty
  2. Patient selects dentist
  3. Shows dentist's available times
  4. Patient fills medical form
- Output: Appointment with service details
- Triggers: Same as UC3

**UC5: View My Appointments**
- Input: Patient login
- Process: Fetch appointments for logged-in patient
- Output: List of upcoming and past appointments with status

**UC6: Make Payment**
- Input: Appointment ID, payment method choice
- Process: 
  - If Stripe: Redirect to Stripe checkout
  - If Cash: Mark as pending
- Output: Payment status updated

**UC7: Upload Medical Documents**
- Input: X-rays, reports (PDF/images)
- Process: Upload to cloud storage
- Output: Files linked to appointment

---

### Dentist Interactions (Dentist Portal)

**UC8: View Appointments**
- Input: Dentist login
- Process: Fetch appointments for logged-in dentist
- Output: List with patient details, medical history, time

**UC9: Set Availability**
- Input: Day of week, start time, end time, slot duration
- Process: Update dentist_availability table
- Output: Availability saved
- Triggers: User Web App booking slots update automatically

**UC10: Mark Appointment Complete**
- Input: Appointment ID
- Precondition: Current time >= Appointment time
- Process: Update appointment status to 'completed'
- Output: Status updated everywhere
- Constraint: Button disabled if appointment is in future

**UC11: Download Appointment PDF**
- Input: Appointment ID
- Process: Generate PDF with patient info, symptoms, medical history
- Output: PDF file download

**UC12: View Patient Medical History**
- Input: Appointment selection
- Process: Display patient's symptoms, medications, allergies
- Output: Complete medical profile for that appointment

**UC13: Cancel/Reschedule Appointment**
- Input: Appointment ID, new date/time (if rescheduling)
- Process: Update appointment or cancel
- Output: Status updated, patient notified

---

### Administrator Interactions (Admin Panel)

**UC14: Add Doctor**
- Input: Name, email, specialty, phone, bio
- Process: 
  1. Create dentist profile in database
  2. Create auth credentials
- Output: Dentist account created
- Triggers: Dentist appears in User Web App, can access Dentist Portal

**UC15: Remove Doctor**
- Input: Dentist ID
- Process: Deactivate dentist account
- Output: Dentist removed from User Web App
- Constraint: Reversible action

**UC16: View All Appointments**
- Input: None (or filter by date/dentist)
- Process: Fetch all appointments system-wide
- Output: Complete appointment list with filters

**UC17: View All Patients**
- Input: None
- Process: Fetch all registered patients
- Output: Patient database with contact info

**UC18: View Statistics**
- Input: None
- Process: Calculate metrics from database
- Output: 
  - Total patients count
  - Today's appointments count
  - Pending appointments count
  - Completed appointments count

**UC19: Manage Patient Accounts**
- Input: Patient ID
- Process: View/edit patient information
- Output: Updated patient record

---

## SYSTEM INTERACTIONS (Background Processes)

**SI1: Availability Synchronization**
- Trigger: Dentist updates availability (UC9)
- Process: 
  1. Save to dentist_availability table
  2. User Web App queries this table when showing time slots
- Effect: Patients only see actual available times

**SI2: Appointment Propagation**
- Trigger: Patient books appointment (UC3 or UC4)
- Process: Single appointment record created
- Effect: Appears in:
  - Patient's appointments list
  - Dentist's appointments list
  - Admin's appointments view

**SI3: Real-time Status Updates**
- Trigger: Dentist marks complete (UC10)
- Process: Update appointment status field
- Effect: Status changes visible to patient and admin immediately

**SI4: Time-Based Button State**
- Trigger: Every minute (or on page load)
- Process: Compare current time with appointment time
- Effect: "Mark Complete" button enables/disables automatically

---

## DATA ENTITIES

### Appointment
```
- id
- patient_id → Patient
- dentist_id → Dentist
- service_id → Service (optional)
- appointment_date
- appointment_time
- status (upcoming/completed/cancelled)
- payment_status (pending/paid)
- payment_method (stripe/cash)
- chief_complaint
- symptoms
- medical_history
- medications
- allergies
- notes
```

### Dentist
```
- id
- name
- email
- specialization
- phone
- rating
- years_of_experience
- bio
- status (active/inactive)
```

### Patient (Profile)
```
- id
- email
- full_name
- phone
- created_at
```

### Dentist Availability
```
- id
- dentist_id → Dentist
- day_of_week (0-6, Sunday-Saturday)
- start_time
- end_time
- slot_duration_minutes
- is_available
```

### Dental Service
```
- id
- name
- description
- specialty (required dentist type)
- duration_minutes
- price_min
- price_max
- is_active
```

### User Role
```
- user_id → Profile
- role (patient/dentist/admin)
```

---

## RELATIONSHIPS

```
Patient --(books)--> Appointment
Dentist --(assigned to)--> Appointment
Service --(optional for)--> Appointment
Dentist --(has)--> Dentist Availability
Dentist --(specializes in)--> Specialty
Service --(requires)--> Specialty
Profile --(has)--> User Role
Payment System --(processes)--> Appointment Payment
```

---

## KEY WORKFLOWS (Sequence Diagrams)

### Workflow 1: Patient Books Appointment
```
Patient → User Web App: Select dentist
User Web App → Database: Get dentist availability
Database → User Web App: Return available time slots
User Web App → Patient: Display time slots
Patient → User Web App: Choose time + fill form
User Web App → Database: Create appointment
Database → Dentist Portal: Trigger notification
Database → Admin Panel: Update appointment list
```

### Workflow 2: Dentist Sets Availability
```
Dentist → Dentist Portal: Set Mon 9AM-5PM
Dentist Portal → Database: Save availability
Database → User Web App: Update booking slots
User Web App → Patient: Show new available times
```

### Workflow 3: Admin Adds Doctor
```
Admin → Admin Panel: Enter doctor details
Admin Panel → Database: Create dentist + auth
Database → User Web App: Add to dentist list
Database → Dentist Portal: Enable access
Dentist → Dentist Portal: Can now log in
```

---

## UML DIAGRAM SUGGESTIONS

### Use Case Diagram
- **Actors**: Patient, Dentist, Administrator, Payment System
- **Main Use Cases**: All UC1-UC19
- **System Boundary**: Aqua Dent Link System
- **Relationships**: Include/Extend where applicable

### Class Diagram  
- **Classes**: Appointment, Dentist, Patient, Service, Availability
- **Relationships**: As listed in Relationships section
- **Attributes**: As listed in Data Entities section

### Sequence Diagrams
- Use the 3 key workflows provided
- Add more for complex interactions

### Component Diagram
- **Components**: User Web App, Dentist Portal, Admin Panel, Database, Payment System
- **Interfaces**: REST APIs, Authentication Service

---

## SUMMARY FOR DIAGRAM

**3 Actors → 3 Applications → 1 Database**

**Core Interactions:**
- Patient: Browse → Book → Pay → View
- Dentist: View → Manage Availability → Mark Complete → Download
- Admin: Add/Remove Doctors → View All → Statistics

**Key Feature:** Real-time synchronization across all applications through shared database.
