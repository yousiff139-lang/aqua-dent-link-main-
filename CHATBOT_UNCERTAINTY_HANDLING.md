# Chatbot Uncertainty Handling Feature

## Overview

The chatbot is powered by **Gemini AI** and uses a hybrid approach:
- **Intelligent Q&A**: Answers any dental/medical questions naturally using Gemini's full capabilities
- **Structured Booking**: Guides appointment booking with clear options
- **Uncertainty Handling**: Gracefully handles patients who don't know the cause of their symptoms
- **Image Analysis**: Can analyze medical documents and X-rays

This ensures patients get helpful answers to any question while still having a smooth booking experience.

## Hybrid Approach: Intelligence + Structure

The chatbot combines two modes:

### 1. **Intelligent Q&A Mode** (Gemini AI)
When patients ask questions, the chatbot uses Gemini's full AI capabilities:

**Examples:**
- "What causes tooth sensitivity?" → Detailed, intelligent answer
- "How often should I visit the dentist?" → Professional advice
- "Can you look at this X-ray?" → Image analysis and insights
- "Is this normal?" → Contextual response based on conversation

### 2. **Structured Booking Mode** (Options)
When booking appointments, the chatbot provides clear choices:

**Examples:**
- "What brings you in? Toothache | Cleaning | Check-up | Emergency"
- "Which dentist? Dr. Smith - General | Dr. Jones - Orthodontics"
- "Available times? 9:00 AM | 11:00 AM | 2:00 PM"

### Seamless Switching
The chatbot intelligently switches between modes:
- Patient asks question → Intelligent answer → Suggest booking
- Patient starts booking → Structured options → Complete booking
- Patient asks question mid-booking → Answer question → Resume booking

## How It Works

### 1. Patient Describes Symptoms

When a patient describes a symptom (e.g., "My tooth hurts"), the chatbot:
- Acknowledges the symptom
- Suggests 2-3 possible causes (e.g., cavity, infection, gum problem)
- Asks if any of these sound familiar

### 2. Uncertainty Detection

If the patient responds with uncertainty indicators such as:
- "I don't know"
- "Not sure"
- "No idea"
- "Maybe"
- "Could be"
- "IDK"
- "Unsure"

The chatbot will:
- **NOT** loop back or ask again
- Record an uncertainty note
- Respond empathetically
- Proceed to the next step

### 3. Empathetic Response

Example response:
> "It's okay not to know, the dentist can help find the cause. Would you like to book an appointment?"

### 4. Data Storage

The system stores:
- `cause_identified`: `false` (boolean flag)
- `uncertainty_note`: "Patient reports tooth pain but is unsure of the cause."
- `symptoms`: The original symptom description

### 5. Dentist Dashboard Display

When dentists view the appointment:
- The uncertainty note is displayed prominently
- A visual indicator (e.g., warning icon) highlights uncertain cases
- This helps dentists prepare for diagnostic consultations

## Technical Implementation

### Database Schema

```sql
ALTER TABLE appointments ADD COLUMN:
  - cause_identified BOOLEAN DEFAULT true
  - uncertainty_note TEXT
```

### TypeScript Types

```typescript
interface BookingData {
  symptoms: string;
  causeIdentified: boolean;
  uncertaintyNote?: string;
  // ... other fields
}
```

### Uncertainty Detection Function

```typescript
const UNCERTAINTY_INDICATORS = [
  'i don\'t know', 'not sure', 'no idea', 'unsure',
  'don\'t know', 'idk', 'dunno', 'maybe', 'could be',
  'not certain', 'uncertain', 'no clue'
];

function detectUncertainty(message: string): boolean {
  const lowerMessage = message.toLowerCase();
  return UNCERTAINTY_INDICATORS.some(indicator => 
    lowerMessage.includes(indicator)
  );
}
```

### AI Integration (Gemini)

The chatbot uses **Gemini 2.0 Flash** with a hybrid approach:

**Intelligent Response Mode:**
- Answers ANY dental/medical questions using Gemini's full AI capabilities
- Analyzes medical images and documents
- Provides natural, conversational responses
- Never ignores or rejects questions
- Temperature: 0.7 for balanced creativity and accuracy

**Structured Booking Mode:**
- Provides clear options during appointment booking
- Format: "Option 1 | Option 2 | Option 3"
- Guides step-by-step through the booking process
- Uses tools (get_dentists, get_availability, book_appointment)

**Uncertainty Handling:**
```
- When patient says "I don't know" about symptom cause
- Response: "No problem! The dentist will diagnose it."
- Set causeIdentified = false
- Record uncertainty_note
- Continue booking flow smoothly
```

**Key Features:**
- Bilingual support (Arabic & English)
- Context-aware throughout conversation
- Can switch between Q&A and booking seamlessly
- Powered by Gemini's advanced language understanding

## Benefits

### For Patients
- No frustration from repeated questions
- Empathetic, supportive experience
- Can still book appointments without knowing exact cause

### For Dentists
- Clear visibility into patient uncertainty
- Better preparation for diagnostic consultations
- Valuable context for appointment planning

## Example Flow (Option-Based)

**Chatbot:** "Welcome! How can I help you today?
Book an appointment | View dentists | Ask a question"

**Patient:** *[Clicks "Book an appointment"]*

**Chatbot:** "What brings you in today?
Toothache | Cleaning | Check-up | Emergency | Other"

**Patient:** *[Clicks "Toothache"]*

**Chatbot:** "I understand. What do you think might be causing it?
Cavity | Infection | Gum problem | Sensitivity | I don't know"

**Patient:** *[Clicks "I don't know"]*

**Chatbot:** "No problem! The dentist will diagnose it during your appointment. Let's continue booking. What's your phone number?"

**Patient:** "555-1234"

**Chatbot:** "Great! Which dentist would you like to see?
Dr. Smith - General Dentistry | Dr. Jones - Orthodontics"

*[System records: cause_identified = false, uncertainty_note = "Patient reports toothache but is unsure of the cause"]*

## Files Modified

1. **Database Migration**: `supabase/migrations/20251024120000_add_chatbot_uncertainty_fields.sql`
2. **TypeScript Types**: `src/types/chatbot.ts`
3. **Chat Bot Function**: `supabase/functions/chat-bot/index.ts`
4. **Execute Tool Function**: `supabase/functions/execute-tool/index.ts`

## Testing

To test the uncertainty handling:

1. Start a booking conversation
2. Describe a symptom (e.g., "my tooth hurts")
3. When asked about the cause, respond with "I don't know"
4. Verify the chatbot doesn't loop back
5. Complete the booking
6. Check the dentist dashboard to see the uncertainty note

## Future Enhancements

- Add more sophisticated NLP for uncertainty detection
- Provide symptom-specific follow-up questions
- Generate AI-powered preliminary assessments
- Track uncertainty patterns for system improvement
