# 🦷 DentalCare Connect

AI-powered dental practice management platform with patient booking, dentist portal, admin dashboard, and X-ray analysis

## ✨ Features

- 🗓️ **Smart Booking** - Patients book appointments with real-time dentist availability
- 👨‍⚕️ **Dentist Portal** - Dashboard for managing patients, appointments, and X-ray analysis
- 🛡️ **Admin Panel** - Manage dentists, view statistics, and system administration
- 🔍 **AI X-Ray Analysis** - Detects cavities and periapical lesions using Roboflow AI
- 📝 **Diagnostic Reports** - AI-generated reports with treatment recommendations
- 💬 **Smart Chatbot** - Answers dental questions using Google Gemini
- 📄 **PDF Export** - Download appointment summaries and diagnostic reports
- 🎨 **Modern UI** - Beautiful glassmorphism design with smooth animations

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
│   ├── src/
│   │   ├── pages/                # Admin pages
│   │   └── components/           # Admin components
│   └── package.json
│
├── dentist-portal/               # Dentist Dashboard (React + Vite)
│   ├── src/
│   │   ├── pages/                # Portal pages
│   │   └── components/           # Portal components
│   └── package.json
│
├── dental-conditions-detection/  # AI Detection (FastAPI + Python)
│   ├── backend/
│   │   ├── app/
│   │   │   ├── api/              # FastAPI routes
│   │   │   └── services/         # AI inference
│   │   └── pyproject.toml
│   └── docs/
│
├── supabase/                     # Database & Edge Functions
│   ├── functions/
│   └── migrations/
│
└── package.json                  # Root config (runs all services)
```

## 🛠️ Tech Stack

### Frontend
- React 18 with TypeScript
- Vite 5 for fast builds
- TailwindCSS for styling
- shadcn/ui components
- React Query for data fetching

### Backend
- Node.js + Express
- Supabase (Database + Auth + Storage)
- Stripe for payments

### AI Detection
- FastAPI - High-performance Python API
- Roboflow - Computer vision detection
- OpenAI/Gemini - Diagnostic reports
- LangChain - AI orchestration

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

## 🔐 Getting API Keys

### Supabase (Required)
1. Create project at [supabase.com](https://supabase.com)
2. Go to Project Settings → API
3. Copy URL and anon/service_role keys

### Roboflow (Required for AI)
1. Create account at [roboflow.com](https://roboflow.com)
2. Go to Settings → API Keys
3. Copy your API key

### Stripe (Optional - Payments)
1. Create account at [stripe.com](https://stripe.com)
2. Go to Developers → API Keys
3. Copy publishable and secret keys

## 👥 Authors

- **Karrar Al-Mayaly**
- **Mohammed Majed**

## 📄 License

This project is for educational purposes.

---

Made with ❤️ for better dental healthcare