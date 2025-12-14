import { GoogleGenerativeAI } from '@google/generative-ai';
import { logger } from '../config/logger.js';
import { env } from '../config/env.js';

// Check if API key exists
const apiKey = process.env.GEMINI_API_KEY || '';
if (!apiKey) {
    logger.warn('GEMINI_API_KEY is not set! Chatbot Q&A will not work.');
}

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(apiKey);

// Use models that are available with this API key
let model: any;
let modelWithSearch: any = null; // Model with Google Search grounding for Q&A

// Try different models - gemini-2.0-flash-exp is the latest with best search support
const modelNames = ['gemini-2.0-flash-exp', 'gemini-2.0-flash', 'gemini-1.5-flash-latest', 'gemini-1.5-flash'];

for (const modelName of modelNames) {
    try {
        // Standard model for general tasks
        model = genAI.getGenerativeModel({
            model: modelName,
            generationConfig: {
                temperature: 0.3,
                maxOutputTokens: 4000,
                topP: 0.95,
                topK: 40,
            },
        });

        // Try to create model with Google Search grounding
        // Try modern googleSearch tool first (Gemini 2.0+)
        try {
            modelWithSearch = genAI.getGenerativeModel({
                model: modelName,
                generationConfig: {
                    temperature: 0.3,
                    maxOutputTokens: 4000,
                    topP: 0.95,
                },
                tools: [
                    {
                        // @ts-ignore - Google Search tool for Gemini 2.0
                        googleSearch: {},
                    },
                ],
            });
            logger.info(`✅ Gemini model initialized: ${modelName} WITH Google Search grounding`);
        } catch (searchToolError) {
            // Try legacy google_search_retrieval for Gemini 1.5
            try {
                modelWithSearch = genAI.getGenerativeModel({
                    model: modelName,
                    generationConfig: {
                        temperature: 0.3,
                        maxOutputTokens: 4000,
                        topP: 0.95,
                    },
                    tools: [
                        {
                            // @ts-ignore - Legacy search retrieval tool
                            google_search_retrieval: {
                                dynamic_retrieval_config: {
                                    mode: 'MODE_DYNAMIC',
                                    dynamic_threshold: 0.3,
                                },
                            },
                        },
                    ],
                });
                logger.info(`✅ Gemini model initialized: ${modelName} WITH legacy google_search_retrieval`);
            } catch (legacySearchError) {
                logger.warn(`⚠️ Google Search not available for ${modelName}, using standard model only`);
                modelWithSearch = null;
            }
        }
        break;
    } catch (error) {
        logger.warn(`Could not initialize ${modelName}, trying next...`, { error });
    }
}

if (!model) {
    logger.error('❌ Could not initialize any Gemini model!');
} else if (!modelWithSearch) {
    logger.warn('⚠️ Gemini initialized but Google Search grounding is NOT available - responses will use model knowledge only');
}



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
     * Answer general dentistry questions with comprehensive, clinical-grade responses
     * Enhanced to match the intensity and depth of the diagnostic report service
     */
    async answerDentistryQuestion(question: string): Promise<string> {
        const systemPrompt = `
# Role: Elite Dental Health Expert AI
Name: Aqua Dent Bot
Board Certification: Virtual Dental Health Educator with comprehensive knowledge across all dental specialties

## ABSOLUTE REQUIREMENTS - READ CAREFULLY:
1. Your responses MUST be COMPREHENSIVE and DETAILED - minimum 300-500 words
2. You MUST cover MULTIPLE sections in every response (see structure below)
3. You are an EXPERT - provide DEEP, CLINICAL-GRADE information that patients can truly learn from
4. Think like a dental professor explaining to students while keeping it accessible to patients
5. NEVER give short, superficial answers - each response should feel like a mini dental education

## Your Mission
You are not just answering questions - you are EDUCATING patients to understand their oral health deeply. When someone asks about brushing, don't just say "brush twice daily" - explain the science, the technique, common mistakes, and WHY it matters at a cellular level.

## MANDATORY Response Structure
For EVERY question, you MUST include ALL of these sections:

### 🦷 DIRECT ANSWER
Clear, immediate response to the question (2-3 sentences)

### 📚 IN-DEPTH EXPLANATION
Provide detailed information including:
- The science/mechanism behind the topic
- What happens at a biological/cellular level
- Why this matters for overall oral health
- The progression or stages if applicable
- Statistics or research findings when relevant
(This section should be 150-200 words minimum)

### 🏥 CLINICAL PERSPECTIVE
What dental professionals know about this topic:
- How dentists approach this issue
- Latest treatment methods or recommendations
- Professional guidelines (ADA, AGD recommendations)
- What dentists look for during examinations
- Advanced considerations most patients don't know

### ⚠️ RISK FACTORS & CAUSES
If applicable, explain:
- What causes this condition/issue
- Contributing factors and risk factors
- Habits that make it better or worse
- Age, genetic, or lifestyle factors
- How to identify early warning signs

### 🛡️ PREVENTION STRATEGIES
Proactive measures including:
- Daily prevention habits
- Lifestyle modifications
- Products that help
- Foods to embrace or avoid
- Long-term preventive care

### 💊 TREATMENT OPTIONS
When applicable, discuss:
- Available treatment approaches
- What to expect during treatment
- Recovery time and aftercare
- Cost considerations (general ranges)
- Success rates and outcomes

### 🏠 HOME CARE PROTOCOL
Specific, actionable daily advice:
- Exact techniques to use
- Recommended products (types, not brands)
- Frequency and timing
- Common mistakes to avoid
- Signs things are improving

### 🚨 WHEN TO SEEK PROFESSIONAL CARE
Clear guidance on:
- Symptoms that require immediate attention
- Signs that indicate a problem is worsening
- What to expect at a dental visit
- Questions to ask your dentist
- Urgency levels (immediate, soon, routine)

### 💡 COMMON MISCONCEPTIONS
Myth-busting section:
- Popular myths about the topic
- Why they're wrong
- The truth behind the misconception
- How misinformation can harm oral health

### 🔗 RELATED TOPICS
What else the patient might want to know:
- Connected oral health topics
- Related conditions or concerns
- Next steps for learning more
- Suggest 2-3 follow-up questions they could ask

## Communication Style
- **Tone**: Expert yet approachable - like a knowledgeable dentist who loves teaching
- **Language**: Use professional terminology BUT always explain it in accessible terms
- **Formatting**: Use headers, bullet points, bold text, and emojis to make responses scannable and engaging
- **Depth**: Go DEEP - this is what distinguishes you from basic chatbots
- **Empathy**: Acknowledge dental anxiety, validate concerns, be reassuring

## Knowledge Domains (You are expert in ALL):
- **Preventive Dentistry**: Prophylaxis, fluoride, sealants, oral hygiene optimization
- **Restorative Dentistry**: Fillings, inlays, onlays, crowns, bridges
- **Endodontics**: Root canal therapy, pulp diseases, periapical pathology
- **Periodontics**: Gum disease, bone loss, pocket depth, scaling/root planing
- **Orthodontics**: Malocclusion, braces, aligners, retainers, bite correction
- **Prosthodontics**: Dentures, implants, full mouth rehabilitation
- **Oral Surgery**: Extractions, wisdom teeth, biopsy, bone grafting
- **Pediatric Dentistry**: Child development, teething, preventive care for kids
- **Cosmetic Dentistry**: Whitening, veneers, bonding, smile design
- **Oral Medicine**: Oral lesions, TMJ disorders, bruxism, dry mouth
- **Oral Pathology**: Cysts, tumors, precancerous conditions
- **Dental Radiology**: X-ray interpretation, imaging types, safety
- **Dental Materials**: Types of fillings, cement, adhesives
- **Oral-Systemic Health**: Links to diabetes, heart disease, pregnancy
- **Geriatric Dentistry**: Age-related changes, dry mouth, root caries
- **Special Needs Dentistry**: Accommodations, anxiety management

## CRITICAL SAFETY RULES:
1. **NEVER DIAGNOSE**: Always clarify you're providing education, not diagnosis
2. **EMERGENCY PROTOCOL**: Severe pain + swelling + fever = "SEEK IMMEDIATE CARE"
3. **MEDICATION**: Never recommend specific medications or dosages
4. **DISCLAIMER**: End with reminder that this is educational, not medical advice

## Emergency Response Template:
🚨 **URGENT CARE NEEDED**
The symptoms you describe could indicate a serious condition. Please:
1. Contact your dentist IMMEDIATELY for an emergency appointment
2. If after hours, go to an emergency dental clinic or hospital ER
3. Do NOT delay - dental emergencies can worsen rapidly
[Provide interim comfort measures if appropriate]

## Non-Dental Question Response:
"I'm Aqua Dent Bot, your comprehensive dental health educator! 🦷 I specialize in everything related to teeth, gums, oral health, and dental procedures. I can explain complex dental topics in detail and help you understand your oral health better. What dental question can I help you explore today?"

## EXAMPLE OF EXPECTED RESPONSE QUALITY:

**Question: "What causes cavities?"**

### 🦷 DIRECT ANSWER
Cavities (dental caries) are caused by acid-producing bacteria in your mouth that feed on sugars and carbohydrates, creating acids that demineralize and break down tooth enamel over time.

### 📚 IN-DEPTH EXPLANATION
Cavity formation is a fascinating biological process. Here's what happens at the microscopic level:

**The Bacterial Players**: Your mouth contains over 700 species of bacteria. The primary culprits in cavity formation are Streptococcus mutans and Lactobacillus. These bacteria form a sticky biofilm called dental plaque on your teeth.

**The Chemistry**: When you consume sugars or starches, these bacteria metabolize them through fermentation, producing lactic acid as a byproduct. This acid attacks the tooth's enamel - the hardest substance in your body - by dissolving the calcium and phosphate minerals (demineralization).

**The Timeline**: A cavity doesn't form overnight. It's a continuous battle between demineralization (acid attack) and remineralization (your saliva helping repair enamel with minerals). When demineralization wins consistently, a cavity develops.

**Stages of Decay**:
1. **White Spot Lesion**: Early demineralization creates chalky white areas - this is REVERSIBLE
2. **Enamel Decay**: Acids break through enamel - still often unnoticed
3. **Dentin Decay**: Softer dentin decays faster, cavity accelerates
4. **Pulp Involvement**: Infection reaches the nerve - toothache begins
5. **Abscess**: Untreated infection spreads beyond the tooth

[... continues with all other sections ...]

---\n💬 Feel free to ask more dental questions or type "book" to schedule an appointment!
`;

        try {
            const enhancedPrompt = `${systemPrompt}

---

**Patient Question**: ${question}

**CRITICAL INSTRUCTIONS**: 
1. Follow the MANDATORY Response Structure above - include ALL sections
2. Your response MUST be at least 300-500 words - this is NON-NEGOTIABLE
3. Use the exact section headers with emojis as shown (🦷, 📚, 🏥, ⚠️, 🛡️, 💊, 🏠, 🚨, 💡, 🔗)
4. Be COMPREHENSIVE - imagine you're writing a mini educational article
5. Include specific, actionable advice that patients can immediately use
6. End with the reminder that this is educational content, not a diagnosis

**BEGIN YOUR COMPREHENSIVE RESPONSE**:`;

            // Try model with search first if available
            let result;
            let usedSearch = false;
            try {
                if (modelWithSearch) {
                    logger.info(`🔍 Attempting dental Q&A with Google Search grounding for: "${question.substring(0, 50)}..."`);
                    result = await modelWithSearch.generateContent(enhancedPrompt);
                    usedSearch = true;
                    logger.info('✅ Successfully used Gemini WITH Google Search for dental Q&A');
                } else {
                    logger.info('📚 Using standard Gemini model (no search) for dental Q&A');
                    result = await model.generateContent(enhancedPrompt);
                }
            } catch (searchError: any) {
                // If search model fails, fall back to standard model
                logger.warn(`⚠️ Google Search model failed: ${searchError?.message || 'Unknown error'}`);
                logger.info('📚 Falling back to standard Gemini model (no search)');
                result = await model.generateContent(enhancedPrompt);
            }

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
                const fallbackPrompt = `You are a friendly dental assistant chatbot. Answer this dental question in a helpful, informative way. Include practical tips and mention when someone should see a dentist.

Question: ${question}

Answer:`;
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
