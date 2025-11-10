# 🚀 Server URLs - All Portals Running

## Access Your Applications

The development servers are now running! Access them at:

### 1. **User Portal (Main App)**
- **URL**: http://localhost:8080
- **Purpose**: Patient-facing application
- **Features**: Browse dentists, book appointments, chatbot, dashboard

### 2. **Admin Portal**
- **URL**: http://localhost:3010
- **Purpose**: Administrative dashboard
- **Features**: Manage dentists, view all appointments, manage availability

### 3. **Dentist Portal**
- **URL**: http://localhost:5174
- **Purpose**: Dentist management dashboard
- **Features**: View appointments, manage availability, patient notes

### 4. **Backend API**
- **URL**: http://localhost:3000
- **Purpose**: REST API server
- **Endpoints**: `/api/appointments`, `/api/dentists`, `/api/availability`, etc.

---

## Quick Start Guide

### For Testing:

1. **Test User Portal**:
   - Open: http://localhost:8080
   - Sign up or log in as a patient
   - Browse dentists and book appointments
   - Use the chatbot to book appointments

2. **Test Admin Portal**:
   - Open: http://localhost:3010
   - Log in with admin email (e.g., karrarmayaly@gmail.com)
   - Manage dentists and view all appointments

3. **Test Dentist Portal**:
   - Open: http://localhost:5174
   - Log in with dentist email
   - View appointments and manage availability

---

## Stopping the Servers

To stop all servers, press `Ctrl+C` in the terminal where `npm run dev` is running.

Or stop individual services:
- User Portal: Stop the process on port 8080
- Admin Portal: Stop the process on port 3010
- Dentist Portal: Stop the process on port 5174
- Backend: Stop the process on port 3000

---

## Troubleshooting

If a server doesn't start:
1. Check if the port is already in use
2. Verify environment variables are set
3. Check console for error messages
4. Ensure dependencies are installed (`npm install` in each directory)

---

**Status**: All servers should be running now! 🎉

