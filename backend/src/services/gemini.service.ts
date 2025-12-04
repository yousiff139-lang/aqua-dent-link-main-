import { GoogleGenerativeAI } from '@google/generative-ai';
import { logger } from '../config/logger.js';
import { env } from '../config/env.js';

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Get the model
const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    tools: [{ googleSearchRetrieval: {} }],
    generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1000,
        topP: 0.95,
        topK: 40,
    },
});

export class GeminiService {
    /**
     * Send a single message and get a response
     */
    async askQuestion(question: string, systemContext?: string): Promise<string> {
        try {
            const prompt = systemContext
                ? `${systemContext}\n\nUser Question: ${question}`
                : question;

            const result = await model.generateContent(prompt);
            const response = await result.response;
            return response.text();
        } catch (error) {
            logger.error('Error in Gemini askQuestion', { error });
            throw new Error('Failed to get response from AI');
        }
    }

    /**
     * Start a multi-turn conversation
     */
    async startChat(systemPrompt: string, history: Array<{ role: string; content: string }> = []) {
        try {
            const formattedHistory = history.map(msg => ({
                role: msg.role === 'user' ? 'user' : 'model',
                parts: [{ text: msg.content }],
            }));

            const chat = model.startChat({
                history: formattedHistory,
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 800,
                },
            });

            return {
                async sendMessage(message: string): Promise<string> {
                    try {
                        const result = await chat.sendMessage(message);
                        const response = await result.response;
                        return response.text();
                    } catch (error) {
                        logger.error('Error sending message in chat', { error });
                        throw new Error('Failed to send message');
                    }
                },

                async getHistory() {
                    return await chat.getHistory();
                }
            };
        } catch (error) {
            logger.error('Error starting Gemini chat', { error });
            throw new Error('Failed to start chat');
        }
    }

    /**
     * Analyze symptoms and suggest dentist specialty
     */
    async analyzeSymptoms(symptoms: string): Promise<{
        specialty: string;
        confidence: number;
        explanation: string;
    }> {
        const prompt = `
You are a dental symptoms analyzer. Analyze the following symptoms and determine the most appropriate dental specialty.

Dental Specialties:
- General Dentistry: routine care, cavities, cleanings, fillings
- Orthodontics: braces, alignment, bite issues, crooked teeth
- Periodontics: gum disease, gum bleeding, inflammation, periodontal issues
- Endodontics: root canals, nerve pain, tooth infection, pulp issues
- Prosthodontics: crowns, bridges, dentures, implants, tooth replacement
- Oral Surgery: extractions, wisdom teeth, surgical procedures
- Pediatric Dentistry: children's dental care, kids' teeth
- Cosmetic Dentistry: whitening, veneers, aesthetic improvements

Symptoms: ${symptoms}

Response format (JSON):
{
  "specialty": "exact specialty name from list",
  "confidence": 0.0-1.0,
  "explanation": "brief reason for this recommendation"
}
`;

        try {
            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            // Extract JSON from response
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                return {
                    specialty: parsed.specialty || 'General Dentistry',
                    confidence: parsed.confidence || 0.5,
                    explanation: parsed.explanation || 'Based on symptom analysis',
                };
            }

            // Fallback
            return {
                specialty: 'General Dentistry',
                confidence: 0.5,
                explanation: 'Unable to parse AI response, defaulting to General Dentistry',
            };
        } catch (error) {
            logger.error('Error analyzing symptoms', { error });
            return {
                specialty: 'General Dentistry',
                confidence: 0.3,
                explanation: 'Error during analysis, please consult available dentists',
            };
        }
    }


    /**
     * Answer general dentistry questions with internet search capability
     * Enhanced with comprehensive dental knowledge and structured responses
     */
    async answerDentistryQuestion(question: string): Promise<string> {
        const systemPrompt = `
# Role: Expert Dental Health Assistant AI
Name: Aqua Dent Bot
Specialty: Comprehensive Dental Health Education & Guidance

## Core Identity
You are an AI dental health assistant powered by the latest dental research and clinical guidelines. You provide accurate, evidence-based information about oral health while maintaining a warm, empathetic tone.

## Communication Style
- **Tone**: Professional yet friendly, like a knowledgeable dental hygienist explaining concepts
- **Language**: Clear and accessible, avoiding complex medical jargon unless necessary
- **Approach**: Empathetic to dental anxiety, informative without being overwhelming
- **Formatting**: Use emojis sparingly (🦷, ✅, ⚠️) to make responses engaging

## Response Structure
For each answer, provide:
1. **Direct Answer**: Clear, concise response to the question
2. **Context/Explanation**: Why this matters for oral health
3. **Practical Tips**: Actionable advice when relevant
4. **When to See a Dentist**: Clear guidance on professional care needs

## Knowledge Areas
You are an expert in:
- **Preventive Care**: Brushing, flossing, mouthwash, diet for dental health
- **Common Conditions**: Cavities, gum disease, sensitivity, bad breath, tooth decay
- **Dental Procedures**: Fillings, crowns, root canals, extractions, implants, braces
- **Oral Hygiene Products**: Toothbrushes, toothpaste types, floss, water flossers
- **Pediatric Dentistry**: Children's dental care, teething, first dental visits
- **Cosmetic Dentistry**: Whitening, veneers, bonding, smile improvements
- **Dental Emergencies**: Knocked-out teeth, severe pain, swelling, trauma
- **Oral-Systemic Health**: Connection between oral health and overall health
- **Dental Anxiety**: Coping strategies, sedation options, what to expect

## Safety Guidelines

### CRITICAL SAFETY RULES:
1. **Never Diagnose**: Always advise professional examination for specific conditions
2. **Emergency Protocol**: For severe pain, swelling, bleeding, or trauma → immediate emergency care
3. **Medication Caution**: Never recommend specific medications or dosages
4. **Disclaimer**: Remind users this is educational information, not medical advice

### Emergency Response Template:
For any emergency symptoms, respond with:
"⚠️ **Urgent Care Needed**: [Symptom] requires immediate professional attention. Please:
1. Contact your dentist immediately for an emergency appointment
2. If after hours, visit an emergency dental clinic or hospital ER
3. [Immediate self-care steps if applicable]
Do not delay seeking professional care."

### Non-Dental Question Response:
"I'm Aqua Dent Bot, your dental health assistant! 🦷 I specialize in questions about teeth, gums, and oral health. Is there anything about your dental health I can help with today?"

## INTERNET SEARCH INSTRUCTIONS
- You have access to Google Search through the googleSearchRetrieval tool
- ALWAYS search for current dental research, ADA guidelines, and evidence-based practices
- Prioritize information from:
  * American Dental Association (ADA)
  * Academy of General Dentistry (AGD)
  * Peer-reviewed dental journals
  * Established dental schools and institutions
- Provide accurate, up-to-date information based on search results
- If information conflicts, defer to ADA recommendations

## Example Responses

**Q: "How often should I replace my toothbrush?"**
A: Great question! 🦷 The American Dental Association recommends replacing your toothbrush every **3-4 months**, or sooner if the bristles become frayed.

**Why it matters**: Worn bristles are less effective at removing plaque and can harbor bacteria. A fresh toothbrush ensures optimal cleaning.

**Pro tips**:
✅ Replace after being sick to avoid reinfection
✅ Consider a soft-bristled brush to protect enamel and gums
✅ Store upright and let it air dry between uses

---

**Q: "Is teeth whitening safe?"**
A: Yes, when done correctly! 🦷 Professional teeth whitening is considered safe for most people.

**Key points**:
- **Professional treatments** (in-office or dentist-provided) are most effective and safest
- **Over-the-counter products** (whitening strips, toothpaste) are generally safe but less potent
- Temporary sensitivity is normal and usually resolves within a few days

**Cautions**:
⚠️ Not recommended during pregnancy
⚠️ May not work on all types of stains (tetracycline staining, etc.)
⚠️ Avoid overuse which can damage enamel

**Recommendation**: Consult your dentist before starting any whitening treatment to ensure it's right for your teeth.

---

**Q: "I have a toothache. What should I do?"**
A: I'm sorry you're in discomfort! Here's what you can do while arranging to see your dentist:

**Immediate relief steps**:
1. Rinse with warm salt water (1/2 tsp salt in 8oz water)
2. Apply a cold compress to the outside of your cheek (20 min on/off)
3. OTC pain relievers as directed on the package
4. Avoid very hot, cold, or sweet foods

**⚠️ See a dentist promptly if you experience**:
- Severe, persistent pain
- Swelling in your face or gums
- Fever
- Pain when biting down

**Note**: Toothaches often indicate cavities, infection, or other issues that need professional treatment. This advice is for temporary relief only.
`;

        try {
            const enhancedPrompt = `${systemPrompt}

---

**Patient Question**: ${question}

**Instructions**: 
1. Use internet search to find the most current and accurate dental information
2. Provide a comprehensive, evidence-based answer following the response structure above
3. Include practical advice and when to seek professional care
4. Keep the response friendly, informative, and appropriately concise (2-4 paragraphs usually sufficient)

**Your Response**:`;

            const result = await model.generateContent(enhancedPrompt);
            const response = await result.response;
            let answer = response.text();

            // Clean up any markdown code blocks that might interfere with display
            answer = answer.replace(/```/g, '').trim();

            // Add a helpful footer for continued conversation
            if (!answer.includes('anything else') && !answer.includes('other questions')) {
                answer += '\n\n---\n💬 Feel free to ask any other dental questions, or type "book" to schedule an appointment!';
            }

            return answer;
        } catch (error) {
            logger.error('Error answering dentistry question', { error, question });

            // Try a simpler fallback prompt
            try {
                const fallbackPrompt = `You are a dental assistant. Answer this dental question concisely and helpfully: ${question}`;
                const fallbackResult = await model.generateContent(fallbackPrompt);
                const fallbackResponse = await fallbackResult.response;
                return fallbackResponse.text() + '\n\n---\n💬 Ask me more dental questions or type "book" to schedule an appointment!';
            } catch (fallbackError) {
                logger.error('Fallback also failed', { fallbackError });
                throw new Error('Failed to get answer');
            }
        }
    }

    /**
     * Answer questions about a specific dentist
     */
    async answerDentistQuestion(
        question: string,
        dentistInfo: {
            name: string;
            specialization: string;
            education?: string;
            experience?: number;
            bio?: string;
            rating?: number;
        }
    ): Promise<string> {
        const context = `
Dentist Information:
- Name: ${dentistInfo.name}
- Specialization: ${dentistInfo.specialization}
- Education: ${dentistInfo.education || 'Not specified'}
- Years of Experience: ${dentistInfo.experience || 'Not specified'}
- Rating: ${dentistInfo.rating ? `${dentistInfo.rating}/5.0` : 'Not rated yet'}
- Bio: ${dentistInfo.bio || 'Dedicated dental professional'}

IMPORTANT: Answer ONLY based on the information provided above. If the answer is not in the context, say "I don't have that specific information about Dr. ${dentistInfo.name}. You can ask them directly or check their full profile."
`;

        const prompt = `${context}\n\nPatient Question: ${question}\n\nAnswer:`;

        try {
            const result = await model.generateContent(prompt);
            const response = await result.response;
            return response.text();
        } catch (error) {
            logger.error('Error answering dentist question', { error });
            throw new Error('Failed to get answer about dentist');
        }
    }
}

export const geminiService = new GeminiService();
