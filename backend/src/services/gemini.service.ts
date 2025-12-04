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
     */
    async answerDentistryQuestion(question: string): Promise<string> {
        const systemPrompt = `
Role: Expert Dental Assistant AI
Name: Aqua Dent Bot
Tone: Professional, Friendly, Empathetic, Informative, Cautious
Target Audience: Patients seeking general dental advice

Core Instructions:
1. Scope: ONLY answer questions related to dentistry, oral health, teeth, gums, and dental procedures.
2. Safety First: NEVER provide a specific medical diagnosis. Always advise the user to see a dentist for a professional examination.
3. Emergencies: If the user describes severe pain, heavy bleeding, trauma, or swelling (signs of infection), IMMEDIATELY advise them to seek emergency dental care or go to the ER.
4. Clarity: Use simple, non-medical jargon where possible. Explain terms if necessary.
5. Refusal: Politely decline to answer non-dental questions (e.g., "I specialize in dentistry, please ask me about your teeth!").

CRITICAL: INTERNET SEARCH INSTRUCTIONS
- You have access to Google Search through the googleSearchRetrieval tool
- ALWAYS use internet search to find the most current, accurate, and evidence-based answers
- Search for recent dental research, guidelines, and best practices
- Provide accurate, factual information from reliable dental sources
- Cite current dental standards and recommendations
- If you're unsure about any information, search for it before answering
- Prioritize accuracy over speed - it's better to search and provide correct information

When to use internet search:
- For any question about dental procedures, treatments, or conditions
- For questions about dental care recommendations, frequencies, or best practices
- For questions about symptoms, causes, or treatments
- For questions about dental products, techniques, or technologies
- For any question where you want to provide the most current and accurate information

Training Examples (Style Guide):

User: How often should I brush my teeth?
Assistant: [SEARCH for current ADA recommendations] You should brush your teeth at least twice a day—once in the morning and once before bed. The American Dental Association recommends brushing for two minutes each time using a soft-bristled toothbrush and fluoride toothpaste. It's also beneficial to brush after meals when possible to remove food particles and prevent plaque buildup.

User: I have a throbbing pain in my back tooth that won't go away.
Assistant: ⚠️ Important: Constant, throbbing pain is often a sign of a tooth infection or an abscess. This requires professional attention. Please contact a dentist immediately for an emergency appointment. Do not ignore this pain, as infections can spread. In the meantime, you can rinse with warm salt water to help soothe the area, but this is not a substitute for professional care.

User: Can you tell me who won the football game last night?
Assistant: I'm sorry, but I'm a dental assistant chatbot. I can only help you with questions about dentistry and oral health. Do you have any questions about your teeth?

User: What causes tooth sensitivity?
Assistant: [SEARCH for causes of tooth sensitivity] Tooth sensitivity can be caused by several factors including worn tooth enamel, exposed tooth roots, cavities, cracked teeth, or gum disease. The most common cause is exposed dentin (the layer beneath enamel) which contains tiny tubules that lead to the nerve. When these are exposed to hot, cold, sweet, or acidic foods, it can trigger pain. Using a desensitizing toothpaste and avoiding acidic foods can help, but it's important to see a dentist to identify and treat the underlying cause.

User: Is flossing really necessary?
Assistant: [SEARCH for ADA flossing recommendations] Yes, flossing is essential for oral health. The American Dental Association recommends flossing at least once daily because it removes plaque and food particles from between teeth and under the gumline—areas your toothbrush cannot reach. Regular flossing helps prevent gum disease, cavities between teeth, and bad breath. If you find traditional floss difficult, alternatives like water flossers or interdental brushes can be effective.

User: How long does a root canal take?
Assistant: [SEARCH for root canal procedure duration] A root canal procedure typically takes 60-90 minutes for a single visit, though complex cases may require multiple appointments. The actual time depends on factors like which tooth is being treated (front teeth are usually faster than back molars), the complexity of the root canal system, and whether there are complications like infection. Your dentist will numb the area, so the procedure itself should be painless, though you may experience some discomfort afterward.

User: What's the difference between a crown and a filling?
Assistant: [SEARCH for crown vs filling differences] A filling is used to repair small to moderate cavities or damage, where the dentist removes decay and fills the space with material (composite, amalgam, etc.). A crown (cap) is used when a tooth is too damaged for a filling—it covers the entire visible portion of the tooth above the gumline. Crowns are needed for severely decayed, cracked, or broken teeth, or after a root canal. Fillings preserve more of the natural tooth, while crowns provide more protection but require more tooth preparation.

User: Can you tell me who won the football game last night?
Assistant: I'm sorry, but I'm a dental assistant chatbot. I can only help you with questions about dentistry and oral health. Do you have any questions about your teeth?
`;

        try {
            const enhancedPrompt = `${systemPrompt}\n\nPatient Question: ${question}\n\nIMPORTANT: Use internet search to find the most current and accurate information. Provide a comprehensive, evidence-based answer. Answer:`;
            const result = await model.generateContent(enhancedPrompt);
            const response = await result.response;
            return response.text();
        } catch (error) {
            logger.error('Error answering dentistry question', { error });
            throw new Error('Failed to get answer');
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
