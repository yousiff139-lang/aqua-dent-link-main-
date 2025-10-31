# 🚀 DentalCare Connect Backend - Complete Setup Guide

## ✅ Phase 1 - Backend Foundation COMPLETE!

---

## 📁 Backend Structure Created

```
backend/
├── config/
│   ├── Database.php          ✅ MySQL PDO connection
│   └── env.php               ✅ Environment loader
├── controllers/
│   ├── PatientController.php ✅ Patient operations
│   ├── DentistController.php ✅ Dentist operations
│   ├── AdminController.php   ✅ Admin operations
│   └── AppointmentController.php ✅ Appointment booking
├── models/
│   ├── Patient.php           ✅ Patient model
│   ├── Dentist.php           ✅ Dentist model
│   ├── Admin.php             ✅ Admin model
│   └── Appointment.php       ✅ Appointment model
├── utils/
│   ├── Response.php          ✅ JSON response helper
│   └── JWT.php               ✅ JWT authentication
├── database/
│   └── schema.sql            ✅ Complete database schema
├── .env                      ✅ Environment variables
├── .htaccess                 ✅ Apache rewrite rules
├── index.php                 ✅ Main API router
└── README.md                 ✅ API documentation
```

---

## 🗄️ Database Setup

### Step 1: Create Database

```sql
CREATE DATABASE dentalcare_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### Step 2: Import Schema

```bash
mysql -u root -p dentalcare_db < backend/database/schema.sql
```

Or using phpMyAdmin:
1. Open phpMyAdmin
2. Create database `dentalcare_db`
3. Import `backend/database/schema.sql`

### Step 3: Verify Tables

```sql
USE dentalcare_db;
SHOW TABLES;
```

You should see:
- `patients`
- `dentists`
- `admins`
- `appointments`
- `payments`

---

## ⚙️ Environment Configuration

### Update `.env` file:

```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=dentalcare_db
DB_USER=root
DB_PASS=your_mysql_password

JWT_SECRET=your_super_secret_key_change_this
JWT_EXPIRY=86400

APP_ENV=development
APP_URL=http://localhost:8000
FRONTEND_URL=http://localhost:8081
```

---

## 🚀 Start Backend Server

### Option 1: PHP Built-in Server (Recommended for Testing)

```bash
cd backend
php -S localhost:8000
```

Backend will be available at: `http://localhost:8000`

### Option 2: XAMPP/WAMP

1. Copy `backend` folder to `htdocs` (XAMPP) or `www` (WAMP)
2. Start Apache and MySQL
3. Access via: `http://localhost/backend/api/...`

---

## 🧪 Test API Endpoints

### 1. Test Patient Registration

```bash
curl -X POST http://localhost:8000/api/patient/register \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "Test Patient",
    "email": "test@example.com",
    "password": "password123",
    "phone": "+1-555-9999"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Patient registered successfully",
  "data": {
    "patient_id": 2
  }
}
```

### 2. Test Patient Login

```bash
curl -X POST http://localhost:8000/api/patient/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Patient logged in successfully",
  "data": {
    "token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
    "patient": {
      "id": 2,
      "full_name": "Test Patient",
      "email": "test@example.com",
      "phone": "+1-555-9999"
    }
  }
}
```

### 3. Test Get Patient Info

```bash
curl -X GET http://localhost:8000/api/patient/info/1
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Success",
  "data": {
    "id": 1,
    "full_name": "John Doe",
    "email": "john@example.com",
    "phone": "+1-555-1234"
  }
}
```

### 4. Test Admin Login

```bash
curl -X POST http://localhost:8000/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@clinic.com",
    "password": "password123"
  }'
```

### 5. Test Dentist Login

```bash
curl -X POST http://localhost:8000/api/dentist/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "sarah@clinic.com",
    "password": "password123"
  }'
```

### 6. Test Book Appointment

```bash
curl -X POST http://localhost:8000/api/patient/appointment/book \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE" \
  -d '{
    "dentist_id": 1,
    "appointment_date": "2025-11-05",
    "time_slot": "10:00 AM",
    "symptoms": "Tooth pain"
  }'
```

### 7. Test Get Patient Appointments

```bash
curl -X GET http://localhost:8000/api/patient/appointments/1
```

---

## 📊 Default Test Credentials

### Admin
- **Email:** `admin@clinic.com`
- **Password:** `password123`

### Dentists
- **Dr. Sarah Malik (Orthodontist)**
  - Email: `sarah@clinic.com`
  - Password: `password123`

- **Dr. Ahmed Ali (Endodontist)**
  - Email: `ahmed@clinic.com`
  - Password: `password123`

- **Dr. Aisha Karim (Periodontist)**
  - Email: `aisha@clinic.com`
  - Password: `password123`

### Patient
- **Email:** `john@example.com`
- **Password:** `password123`

---

## ✅ Verification Checklist

- [ ] Database created and schema imported
- [ ] `.env` file configured with correct credentials
- [ ] PHP server running on port 8000
- [ ] Patient registration works
- [ ] Patient login returns JWT token
- [ ] Admin login works
- [ ] Dentist login works
- [ ] Get patient info works
- [ ] Book appointment works (with JWT token)
- [ ] Get appointments works

---

## 🔧 Troubleshooting

### Database Connection Error
```
Error: Database connection failed
```
**Solution:**
- Check MySQL is running
- Verify `.env` credentials
- Ensure database `dentalcare_db` exists

### CORS Error
```
Access to fetch blocked by CORS policy
```
**Solution:**
- Ensure `.htaccess` file exists
- Check Apache `mod_rewrite` is enabled
- Verify CORS headers in `index.php`

### JWT Token Invalid
```
Error: Invalid token
```
**Solution:**
- Check `JWT_SECRET` in `.env`
- Ensure token is sent in `Authorization: Bearer {token}` header
- Token expires after 24 hours (default)

### 404 Not Found
```
Error: API resource not found
```
**Solution:**
- Check URL format: `http://localhost:8000/api/...`
- Verify `.htaccess` is working
- Check Apache rewrite module is enabled

---

## 📡 Complete API Endpoints List

### Patient Endpoints
- `POST /api/patient/register` - Register new patient
- `POST /api/patient/login` - Login patient
- `GET /api/patient/info/{id}` - Get patient info
- `PUT /api/patient/profile` - Update profile (requires JWT)
- `POST /api/patient/appointment/book` - Book appointment (requires JWT)
- `GET /api/patient/appointments/{id}` - Get patient appointments

### Dentist Endpoints
- `POST /api/dentist/login` - Login dentist
- `GET /api/dentists` - Get all dentists
- `GET /api/dentist/{id}` - Get dentist by ID
- `GET /api/dentists/specialization/{name}` - Get by specialization
- `GET /api/dentist/appointments/{id}` - Get dentist appointments

### Admin Endpoints
- `POST /api/admin/login` - Login admin
- `GET /api/admin/overview` - Get statistics (requires JWT)
- `GET /api/admin/patients` - Get all patients (requires JWT)
- `GET /api/admin/appointments` - Get all appointments (requires JWT)

### Appointment Endpoints
- `PUT /api/appointment/cancel/{id}` - Cancel appointment (requires JWT)

---

## 🎯 Next Steps

### Phase 2 - Chatbot & Frontend Integration
- [ ] Create chatbot API endpoint
- [ ] Update TypeScript frontend to use PHP APIs
- [ ] Replace Supabase calls with fetch/axios to PHP backend

### Phase 3 - Payments & Advanced Features
- [ ] Implement payment checkout endpoint
- [ ] Add payment status tracking
- [ ] Create admin dashboard endpoints

---

## ✅ Phase 1 Status: COMPLETE!

All core backend endpoints are working and ready for testing!

**Test the backend now using Postman or curl commands above.** 🚀
