# Dentist Portal

A standalone React + Vite application for dentists to manage their profile, availability, and patient appointments.

## Features

- ✅ Email-based authentication
- ✅ Protected routes
- ✅ Profile management
- 🚧 Availability scheduling (coming soon)
- 🚧 Patient appointment management (coming soon)

## Tech Stack

- React 18 + TypeScript
- Vite 5
- TailwindCSS
- React Router DOM v6
- Axios for API calls
- Radix UI components
- Sonner for toast notifications

## Getting Started

### Prerequisites

- Node.js 18+ installed
- Backend API running on port 3000

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

The app will run on http://localhost:5173

### Build

```bash
npm run build
```

## Project Structure

```
dentist-portal/
├── src/
│   ├── components/      # Reusable UI components
│   │   ├── layout/      # Layout components (Sidebar, DashboardLayout)
│   │   ├── profile/     # Profile-specific components
│   │   └── ui/          # Base UI components
│   ├── contexts/        # React contexts (AuthContext)
│   ├── hooks/           # Custom hooks
│   ├── pages/           # Page components
│   ├── services/        # API services
│   ├── types/           # TypeScript type definitions
│   ├── utils/           # Utility functions
│   ├── App.tsx          # Main app component
│   └── main.tsx         # Entry point
├── public/              # Static assets
└── package.json
```

## Environment Variables

Create a `.env` file in the root directory:

```env
VITE_API_URL=http://localhost:3000/api
VITE_APP_NAME=Dentist Portal
```

## API Endpoints Required

The following backend endpoints need to be implemented:

- `POST /api/auth/dentist/login` - Dentist authentication
- `GET /api/dentists/:email` - Get dentist profile
- `GET /api/dentists/:email/patients` - Get dentist's patients
- `PUT /api/appointments/:id` - Update appointment status
- `GET /api/availability/:dentistId` - Get availability slots
- `PUT /api/availability/:dentistId` - Update availability slots

## Development Status

### Completed (Tasks 1-10)
- ✅ Project setup and configuration
- ✅ TypeScript type definitions
- ✅ Utility functions (storage, date formatting)
- ✅ API service layer with Axios
- ✅ Authentication system (context, hooks, login page)
- ✅ Protected routes
- ✅ Dashboard layout with responsive sidebar
- ✅ Routing structure
- ✅ Profile section with loading states

### In Progress (Tasks 11-18)
- 🚧 Available Times section
- 🚧 Patient List section
- 🚧 Backend API endpoints
- 🚧 Error boundaries
- 🚧 Form validation
- 🚧 UI polish and accessibility

## License

MIT
