# DentalCare Chatbot Service

AI-powered conversational chatbot for dental appointment booking with Supabase integration.

## Features

- 🤖 Stateful conversation management
- 🏥 Intelligent symptom-to-specialization mapping
- 👨‍⚕️ Dentist recommendation based on symptoms and ratings
- 📅 Time slot selection and booking
- 💾 Supabase PostgreSQL integration
- 🔄 Redis support for session storage (optional)
- ⚡ Retry logic with exponential backoff
- 🛡️ Comprehensive error handling
- 🔍 Uncertainty handling for patients unsure of their condition

## Prerequisites

- Java 17 or higher
- Maven 3.6+
- Supabase account with project setup
- Redis (optional, for session storage)

## Quick Start

### 1. Clone and Navigate

```bash
cd chatbot-service
```

### 2. Configure Environment

Copy `.env.example` to `.env` and fill in your Supabase credentials:

```bash
cp .env.example .env
```

Edit `.env`:
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 3. Build the Project

```bash
mvn clean install
```

### 4. Run the Application

```bash
mvn spring-boot:run
```

The service will start on `http://localhost:8080`

## API Endpoints

### Start Conversation

```http
POST /api/chatbot/start
```

Response:
```json
{
  "sessionId": "uuid",
  "message": "Hi! Welcome to DentalCareConnect...",
  "options": ["Book an Appointment", "Ask About Dentists", ...],
  "state": "START"
}
```

### Send Message

```http
POST /api/chatbot/message
Content-Type: application/json

{
  "sessionId": "uuid",
  "text": "I want to book an appointment"
}
```

Response:
```json
{
  "sessionId": "uuid",
  "message": "Great! Let's book your appointment. What's your full name?",
  "state": "COLLECT_NAME"
}
```

## Project Structure

```
chatbot-service/
├── src/
│   ├── main/
│   │   ├── java/com/dentalcare/chatbot/
│   │   │   ├── adapter/          # Supabase adapter
│   │   │   ├── config/           # Configuration classes
│   │   │   ├── controller/       # REST controllers
│   │   │   ├── dto/              # Data Transfer Objects
│   │   │   ├── exception/        # Custom exceptions
│   │   │   ├── model/            # Domain models
│   │   │   ├── repository/       # Data repositories
│   │   │   ├── service/          # Business logic
│   │   │   └── ChatbotApplication.java
│   │   └── resources/
│   │       ├── application.yml
│   │       ├── application-dev.yml
│   │       ├── application-prod.yml
│   │       └── symptom-mapping.yml
│   └── test/
│       └── java/com/dentalcare/chatbot/
├── pom.xml
└── README.md
```

## Configuration

### Application Properties

Key configuration in `application.yml`:

```yaml
supabase:
  url: ${SUPABASE_URL}
  service-role-key: ${SUPABASE_SERVICE_ROLE_KEY}

chatbot:
  session-timeout-minutes: 30
  symptom-mapping-config: classpath:symptom-mapping.yml
  max-retry-attempts: 3
  retry-backoff-ms: 1000
```

### Symptom Mapping

Edit `symptom-mapping.yml` to customize symptom-to-specialization mappings without code changes.

## Development

### Run Tests

```bash
mvn test
```

### Run with Dev Profile

```bash
mvn spring-boot:run -Dspring-boot.run.profiles=dev
```

### Build for Production

```bash
mvn clean package -Pprod
java -jar target/chatbot-service-1.0.0.jar
```

## Docker Deployment

### Build Image

```bash
docker build -t dentalcare-chatbot .
```

### Run with Docker Compose

```bash
docker-compose up
```

## Architecture

The chatbot uses a modular architecture with clear separation of concerns:

- **Controller Layer**: REST API endpoints
- **Service Layer**: Business logic and orchestration
- **Adapter Layer**: External service integration (Supabase)
- **Repository Layer**: Data access
- **Model Layer**: Domain entities and DTOs

### Conversation Flow

1. User starts conversation → Greeting with options
2. User selects "Book Appointment" → Intent detected
3. Collect patient information (name, email, phone)
4. Collect symptoms → Map to specialization
5. Recommend dentists → User selects
6. Show available time slots → User selects
7. Confirm booking details → User confirms
8. Save to database → Return confirmation

## Extension Points

- **Intent Detection**: Replace `KeywordIntentDetector` with ML model
- **Symptom Mapping**: Update `symptom-mapping.yml` for new specializations
- **State Storage**: Switch between Redis and database via Spring profiles
- **Payment Integration**: Implement Stripe in `PAYMENT_OFFER` state

## Troubleshooting

### Connection Issues

Check Supabase credentials in `.env` file and ensure service role key is correct.

### Session Expiration

Sessions expire after 30 minutes. Adjust in `application.yml`:
```yaml
chatbot:
  session-timeout-minutes: 60
```

### Redis Connection

If using Redis, ensure it's running:
```bash
redis-cli ping
```

## License

MIT

## Support

For issues and questions, please open an issue on GitHub.
