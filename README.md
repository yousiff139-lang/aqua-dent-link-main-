# 🦷 DentalCare Connect

<p align="center">
  <img src="https://img.shields.io/badge/React-18.3-61DAFB?style=for-the-badge&logo=react&logoColor=white" alt="React">
  <img src="https://img.shields.io/badge/TypeScript-5.8-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/Vite-5.4-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite">
  <img src="https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js">
  <img src="https://img.shields.io/badge/Express-4.21-000000?style=for-the-badge&logo=express&logoColor=white" alt="Express">
  <img src="https://img.shields.io/badge/Python-3.12-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python">
  <img src="https://img.shields.io/badge/FastAPI-Latest-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI">
  <img src="https://img.shields.io/badge/TailwindCSS-3.4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="TailwindCSS">
  <img src="https://img.shields.io/badge/Supabase-2.75-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase">
  <img src="https://img.shields.io/badge/Stripe-Latest-635BFF?style=for-the-badge&logo=stripe&logoColor=white" alt="Stripe">
  <img src="https://img.shields.io/badge/Roboflow-AI-8B5CF6?style=for-the-badge&logo=roboflow&logoColor=white" alt="Roboflow">
</p>

AI-powered dental practice management platform with patient booking, dentist portal, admin dashboard, and X-ray analysis

---

## ✨ Features

- 🗓️ **Smart Booking** - Patients book appointments with real-time dentist availability
- 👨‍⚕️ **Dentist Portal** - Dashboard for managing patients, appointments, and X-ray analysis
- 🛡️ **Admin Panel** - Manage dentists, view statistics, and system administration
- 🔍 **AI X-Ray Analysis** - Detects cavities and periapical lesions using Roboflow AI
- 📝 **Diagnostic Reports** - AI-generated reports with treatment recommendations
- 💬 **Smart Chatbot** - Answers dental questions using Google Gemini
- 📄 **PDF Export** - Download appointment summaries and diagnostic reports
- 🎨 **Modern UI** - Beautiful glassmorphism design with smooth animations

---

## 📊 System Architecture

### Booking Flow Sequence Diagram

```mermaid
sequenceDiagram
    participant Patient
    participant UserWebApp as User Web App
    participant Supabase as Supabase Database
    participant DentistPortal as Dentist Portal

    Patient->>UserWebApp: Select Dentist & Date
    UserWebApp->>Supabase: Query Available Slots (dentist_id, date)
    Supabase-->>UserWebApp: Return Available Slots
    UserWebApp->>Patient: Display Slots
    Patient->>UserWebApp: Select Slot & Submit Form
    UserWebApp->>Supabase: Create Appointment (pending)
    Supabase-->>DentistPortal: Trigger Real-Time Event
    DentistPortal->>Supabase: Confirm Booking
    Supabase-->>UserWebApp: Update Status (confirmed)
    UserWebApp->>Patient: Show Confirmation Message
```

### Real-Time Availability Sync

```mermaid
sequenceDiagram
    participant Dentist
    participant DentistPortal as Dentist Portal
    participant Supabase as Supabase Database
    participant UserWebApp as User Web App

    Dentist->>DentistPortal: Login & Open Scheduler
    DentistPortal->>Supabase: Get Availability (dentist_id)
    Supabase-->>DentistPortal: Return Current Slots
    Dentist->>DentistPortal: Set Available Times (e.g. Mon 9-5)
    DentistPortal->>Supabase: Update Availability Table
    Supabase-->>DentistPortal: Confirm Save
    
    rect rgb(255, 240, 200)
        Note over Supabase,UserWebApp: Real-Time Sync (Broadcast)
        Supabase->>UserWebApp: Push New Availability Data
        UserWebApp->>UserWebApp: Fetch New Availability
    end
    
    UserWebApp->>Supabase: Query Updated Slots
    Supabase-->>UserWebApp: Return Fresh Data
```

### Class Diagram

```mermaid
classDiagram
    class Appointment {
        +UUID id
        +UUID dentist_id
        +UUID patient_id
        +String dentist_name
        +String patient_name
        +Date appointment_date
        +String appointment_time
        +String appointment_type
        +String status
        +String payment_method
        +String payment_status
        +DateTime created_at
        +DateTime updated_at
    }

    class Dentist {
        +UUID id
        +String name
        +String email
        +String specialization
        +String bio
        +Integer years_of_experience
        +String education
        +Decimal rating
        +String image_url
        +DateTime created_at
    }

    class DentistAvailability {
        +UUID id
        +UUID dentist_id
        +Integer day_of_week
        +Time start_time
        +Time end_time
        +Boolean is_available
        +DateTime created_at
    }

    class Profile {
        +UUID id
        +String full_name
        +String email
        +String phone
        +DateTime created_at
        +DateTime updated_at
    }

    Dentist "1" --> "*" Appointment : has
    Dentist "1" --> "*" DentistAvailability : has
    Profile "1" --> "*" Appointment : books
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js v18.0.0 or higher
- Python 3.12 or higher
- pnpm (recommended) or npm

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/yousiff139-lang/aqua-dent-link-main.git
cd aqua-dent-link-main
```

2. **Install dependencies**
```bash
npm install
cd backend && npm install && cd ..
cd admin-app && npm install && cd ..
cd dentist-portal && npm install && cd ..
cd dental-conditions-detection/backend && uv sync && cd ../..
```

3. **Configure environment variables**

Create `.env` in root:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
VITE_API_URL=http://localhost:3000
```

Create `backend/.env`:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
PORT=3000
```

Create `dental-conditions-detection/backend/.env`:
```env
ROBOFLOW_API_KEY=your_roboflow_api_key
OPENAI_API_KEY=your_openai_api_key
DEBUG=true
```

### Running the Application

Single command to start everything:
```bash
npm run dev
```

This starts:
- 🌐 **User Website**: http://localhost:8081
- 👨‍⚕️ **Dentist Portal**: http://localhost:5173
- 🛡️ **Admin Panel**: http://localhost:3010
- ⚙️ **Backend API**: http://localhost:3000
- 🤖 **AI Detection**: http://localhost:8000

---

## 🏗️ Project Structure

```
aqua-dent-link-main/
├── src/                          # User Website (React + Vite)
│   ├── components/               # UI components
│   ├── pages/                    # Page components
│   └── hooks/                    # Custom hooks
│
├── backend/                      # Node.js Backend API
│   ├── src/
│   │   ├── controllers/          # Route handlers
│   │   ├── routes/               # API routes
│   │   └── services/             # Business logic
│   └── package.json
│
├── admin-app/                    # Admin Panel (React + Vite)
├── dentist-portal/               # Dentist Dashboard (React + Vite)
├── dental-conditions-detection/  # AI Detection (FastAPI + Python)
├── supabase/                     # Database & Edge Functions
└── package.json                  # Root config (runs all services)
```

---

## 🛠️ Tech Stack

### Frontend
- React 18 with TypeScript
- Vite 5 for fast builds
- TailwindCSS for styling
- shadcn/ui components

### Backend
- Node.js + Express
- Supabase (Database + Auth + Storage)
- Stripe for payments

### AI Detection
- FastAPI - High-performance Python API
- Roboflow - Computer vision detection
- OpenAI/Gemini - Diagnostic reports

---

## 📝 API Endpoints

### Backend API (Port 3000)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Health check |
| `POST` | `/api/patients/register` | Patient registration |
| `POST` | `/api/patients/login` | Patient login |
| `GET` | `/api/dentists` | List dentists |
| `POST` | `/api/appointments` | Create appointment |

### AI Detection API (Port 8000)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/health` | Health check |
| `POST` | `/api/v1/detect` | Detect conditions in image |
| `POST` | `/api/v1/detect-dicom` | Process DICOM files |
| `POST` | `/api/v1/generate-diagnostic-report` | Generate AI report |

---

## 👥 Authors

- **Karrar Al-Mayaly**
- **Mohammed Majed**

## 📄 License

This project is for educational purposes.

---

<p align="center">Made with ❤️ for better dental healthcare</p>