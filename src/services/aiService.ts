import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini AI  
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || '');

interface PatientContext {
    patientName?: string;
    patientEmail?: string;
    patientPhone?: string;
    gender?: 'male' | 'female';
    isPregnant?: boolean;
    symptom?: string;
    medicalHistory?: string;
    chronicDiseases?: string;
    wantsDocuments?: boolean;
}

interface ExtractedInfo {
    gender?: 'male' | 'female' | null;
    isPregnant?: boolean | null;
    phone?: string | null;
    symptoms?: string | null;
    medicalHistory?: string | null;
    chronicDiseases?: string | null;
    wantsDocuments?: boolean | null;
    nextQuestion: string;
    allInfoCollected: boolean;
    nextStep?: string;
}

/**
 * Use Gemini AI to extract patient information - GUIDED FLOW
 */
export async function extractPatientInfo(
    userMessage: string,
    currentContext: PatientContext,
    currentStep: string
): Promise<ExtractedInfo> {
    try {
        const model = genAI.getGenerativeModel({
            model: "gemini-2.0-flash-exp",
            generationConfig: {
                responseMimeType: "application/json",
                temperature: 0.7,
            },
        });

        const prompt = `You are a dental chatbot following a SPECIFIC FLOW ORDER.

CURRENT STEP: ${currentStep}

PATIENT INFO SO FAR:
${JSON.stringify(currentContext, null, 2)}

USER: "${userMessage}"

REQUIRED FLOW:
1. Gender → 2. Pregnancy (if female) → 3. Phone → 4. Symptoms → 5. Chronic diseases → 6. Medical history (optional) → 7. Documents (optional)

Current step guidance: ${getStepGuidance(currentStep)}

Extract info and return JSON:
{
  "gender": "male" | "female" | null,
  "isPregnant": true | false | null,
  "phone": "extracted" | null,
  "symptoms": "extracted" | null,
  "chronicDiseases": "extracted" | null,
  "medicalHistory": "extracted" | null,
  "wantsDocuments": true | false | null,
  "nextQuestion": "Natural question for NEXT step",
  "allInfoCollected": false
}

Be natural and friendly!`;

        const result = await model.generateContent(prompt);
        const extracted: ExtractedInfo = JSON.parse(result.response.text());
        console.log('🤖 AI:', extracted);
        return extracted;
    } catch (error) {
        console.error('AI Error:', error);
        return {
            nextQuestion: getDefaultNextQuestion(currentStep),
            allInfoCollected: false,
        };
    }
}

function getStepGuidance(step: string): string {
    const guides: Record<string, string> = {
        'gender': 'Ask gender (male/female)',
        'pregnancy': 'Female - ask pregnancy status',
        'phone': 'Ask phone number',
        'symptoms': 'Ask dental concern/symptoms',
        'chronic_diseases': 'Ask chronic conditions (diabetes, etc.) - CRITICAL',
        'medical_history': 'Ask medical history (optional)',
        'documents': 'Offer document upload (optional)',
    };
    return guides[step] || 'Continue conversation';
}

function getDefaultNextQuestion(step: string): string {
    const questions: Record<string, string> = {
        'gender': "Could you tell me your gender? (Male/Female)",
        'pregnancy': "Are you currently pregnant?",
        'phone': "What's your phone number?",
        'symptoms': "What dental concern do you have?",
        'chronic_diseases': "Any chronic conditions like diabetes?",
        'medical_history': "Medical history from previous visits? (optional - can skip)",
        'documents': "Upload documents like X-rays? (optional)",
    };
    return questions[step] || "How can I help?";
}

export function getMissingInfo(context: PatientContext): string[] {
    const missing: string[] = [];
    if (!context.gender) missing.push('gender');
    if (context.gender === 'female' && context.isPregnant === undefined) missing.push('pregnancy');
    if (!context.patientPhone) missing.push('phone');
    if (!context.symptom) missing.push('symptoms');
    if (!context.chronicDiseases) missing.push('chronic diseases');
    return missing;
}
