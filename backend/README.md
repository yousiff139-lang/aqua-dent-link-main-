# 🚀 DentalCare Connect - Node.js + Express + MySQL Backend

## Complete Backend Rebuild with TypeScript

---

## 📦 Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MySQL
- **Language:** TypeScript
- **Authentication:** JWT (jsonwebtoken)
- **Password Hashing:** bcrypt
- **Validation:** express-validator
- **Security:** helmet, cors
- **Logging:** morgan

---

## 🏗️ Project Structure

```
backend/
├── src/
│   ├── config/
│   │   ├── database.ts       # MySQL connection pool
│   │   └── migrate.ts        # Database migration script
│   ├── controllers/
│   │   └── patientController.ts
│   ├── models/
│   │   ├── Patient.ts
│   │   ├── Dentist.ts
│   │   └── Appointment.ts
│   ├── middlewares/
│   │   └── auth.ts           # JWT authentication
│   ├── routes/
│   │   └── patientRoutes.ts
│   └── server.ts             # Main application
├── database/
│   └── schema.sql            # Database schema
├── .env                      # Environment variables
├── package.json
└── tsconfig.json
```

---

## ⚙️ Setup Instructions

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Environment

Update `.env` file:

```env
PORT=5000
NODE_ENV=development

DB_HOST=localhost
DB_PORT=3306
DB_NAME=dentalcare_db
DB_USER=root
DB_PASSWORD=your_password

JWT_SECRET=your_super_secret_key
JWT_EXPIRES_IN=24h

FRONTEND_URL=http://localhost:8081
```

### 3. Create Database

```sql
CREATE DATABASE dentalcare_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 4. Run Migration

```bash
mysql -u root -p dentalcare_db < database/schema.sql
```

Or use the migration script:

```bash
npm run migrate
```

### 5. Start Server

**Development mode (with auto-reload):**
```bash
npm run dev
```

**Production mode:**
```bash
npm run build
npm start
```

Server will run on: `http://localhost:5000`

---

## 📡 API Endpoints

### Health Check
```http
GET /health
```

### Test Database Connection
```http
GET /api/test/connection
```

### Patient Endpoints

#### Register
```http
POST /api/patients/register
Content-Type: application/json

{
  "full_name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "phone": "+1-555-1234"
}
```

#### Login
```http
POST /api/patients/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "patient": {
      "id": 1,
      "full_name": "John Doe",
      "email": "john@example.com",
      "phone": "+1-555-1234"
    }
  }
}
```

#### Get Patient Info
```http
GET /api/patients/:id
```

---

## 🧪 Testing

### Test Database Connection

```bash
curl http://localhost:5000/api/test/connection
```

### Test Patient Registration

```bash
curl -X POST http://localhost:5000/api/patients/register \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "Test User",
    "email": "test@test.com",
    "password": "test123",
    "phone": "+1-555-0000"
  }'
```

### Test Patient Login

```bash
curl -X POST http://localhost:5000/api/patients/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "patient123"
  }'
```

---

## 🔐 Authentication

Protected routes require JWT token in Authorization header:

```http
Authorization: Bearer {your_jwt_token}
```

---

## 📊 Database Schema

### Tables:
- `patients` - Patient information
- `dentists` - Dentist profiles
- `appointments` - Appointment bookings
- `payments` - Payment records
- `admin` - Admin users

### Sample Data Included:
- 1 Admin user
- 3 Dentists
- 1 Patient

**Default Passwords:** All sample users have password `password123` (hashed)

---

## 🚀 Development

### Watch Mode
```bash
npm run dev
```

### Build TypeScript
```bash
npm run build
```

### Run Tests
```bash
npm test
```

---

## 📝 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| PORT | Server port | 5000 |
| NODE_ENV | Environment | development |
| DB_HOST | MySQL host | localhost |
| DB_PORT | MySQL port | 3306 |
| DB_NAME | Database name | dentalcare_db |
| DB_USER | Database user | root |
| DB_PASSWORD | Database password | (empty) |
| JWT_SECRET | JWT secret key | (required) |
| JWT_EXPIRES_IN | Token expiry | 24h |
| FRONTEND_URL | Frontend URL | http://localhost:8081 |

---

## ✅ Status

**Phase 1 Complete:**
- ✅ Node.js + Express setup
- ✅ TypeScript configuration
- ✅ MySQL database connection
- ✅ Patient model & controller
- ✅ JWT authentication
- ✅ Input validation
- ✅ Error handling
- ✅ CORS configuration

**Next Steps:**
- [ ] Add Dentist endpoints
- [ ] Add Admin endpoints
- [ ] Add Appointment endpoints
- [ ] Add Payment endpoints
- [ ] Add Chatbot endpoints
- [ ] Frontend integration

---

## 🐛 Troubleshooting

### Database Connection Error
- Check MySQL is running
- Verify `.env` credentials
- Ensure database exists

### Port Already in Use
- Change PORT in `.env`
- Or kill process: `lsof -ti:5000 | xargs kill`

### TypeScript Errors
- Run `npm install`
- Check `tsconfig.json`

---

Built with ❤️ for DentalCare Connect
