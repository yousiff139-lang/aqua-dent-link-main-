"""
Gemini AI Service for chatbot intelligence
"""
import google.generativeai as genai
from typing import Optional, Dict, Any, List
import logging
from config import settings
from PIL import Image
import PyPDF2
import io

# Setup logging
logger = logging.getLogger(__name__)

# Configure Gemini
genai.configure(api_key=settings.GEMINI_API_KEY)

# Initialize models
model_pro = genai.GenerativeModel(settings.GEMINI_MODEL_PRO)
model_flash = genai.GenerativeModel(settings.GEMINI_MODEL_FLASH)


class GeminiService:
    """Service for interacting with Gemini AI"""
    
    def __init__(self):
        self.system_prompt = """You are a helpful dental assistant chatbot for DentalCareConnect. 
Your role is to:
1. Help patients book appointments
2. Answer dental health questions
3. Provide information about dentists and services
4. Analyze dental X-rays and documents when provided
5. Assist with payment and billing questions

Be professional, empathetic, and concise. Always prioritize patient safety and recommend 
seeing a dentist for serious concerns."""
    
    def generate_response(
        self, 
        user_message: str, 
        context: Optional[Dict[str, Any]] = None,
        use_pro: bool = False
    ) -> str:
        """Generate AI response to user message"""
        try:
            model = model_pro if use_pro else model_flash
            
            # Build prompt with context
            prompt = self._build_prompt(user_message, context)
            
            # Generate response
            response = model.generate_content(prompt)
            
            return response.text
        except Exception as e:
            logger.error(f"Error generating response: {e}")
            return "I apologize, but I'm having trouble processing your request. Please try again."
    
    def analyze_xray(self, image_path: str, user_query: Optional[str] = None) -> str:
        """Analyze dental X-ray image"""
        try:
            # Load image
            image = Image.open(image_path)
            
            # Build analysis prompt
            prompt = """Analyze this dental X-ray image and provide:
1. Visible dental structures
2. Any potential issues or abnormalities
3. Recommendations for the patient

Important: This is an AI analysis and should not replace professional dental examination.
Always recommend consulting with a dentist for accurate diagnosis."""
            
            if user_query:
                prompt += f"\n\nPatient's specific question: {user_query}"
            
            # Generate analysis using Pro model (better for images)
            response = model_pro.generate_content([prompt, image])
            
            return response.text
        except Exception as e:
            logger.error(f"Error analyzing X-ray: {e}")
            return "I apologize, but I couldn't analyze the X-ray image. Please ensure it's a valid image file."
    
    def analyze_pdf(self, pdf_path: str, user_query: Optional[str] = None) -> str:
        """Analyze dental PDF document"""
        try:
            # Extract text from PDF
            with open(pdf_path, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                text_content = ""
                for page in pdf_reader.pages:
                    text_content += page.extract_text()
            
            # Build analysis prompt
            prompt = f"""Analyze this dental document and provide a summary:

Document Content:
{text_content[:4000]}  # Limit to avoid token limits

Please provide:
1. Document type (e.g., treatment plan, medical history, prescription)
2. Key information and findings
3. Any recommendations or follow-up actions

Important: This is an AI analysis. Always verify with your dentist."""
            
            if user_query:
                prompt += f"\n\nPatient's specific question: {user_query}"
            
            # Generate analysis
            response = model_pro.generate_content(prompt)
            
            return response.text
        except Exception as e:
            logger.error(f"Error analyzing PDF: {e}")
            return "I apologize, but I couldn't analyze the PDF document. Please ensure it's a valid PDF file."
    
    def suggest_dentist(
        self, 
        symptoms: str, 
        dentists: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Suggest best dentist based on symptoms"""
        try:
            # Build prompt
            dentist_info = "\n".join([
                f"- {d['name']} ({d['specialization']}) - Rating: {d['rating']}/5"
                for d in dentists
            ])
            
            prompt = f"""Based on these symptoms: "{symptoms}"

Available dentists:
{dentist_info}

Which dentist would be most appropriate? Provide:
1. Recommended dentist name
2. Reason for recommendation
3. Brief explanation of why this specialization matches the symptoms

Format your response as JSON with keys: dentist_name, reason, explanation"""
            
            response = model_flash.generate_content(prompt)
            
            # Parse response (simplified - in production, use proper JSON parsing)
            return {
                "recommendation": response.text,
                "dentists": dentists
            }
        except Exception as e:
            logger.error(f"Error suggesting dentist: {e}")
            return {
                "recommendation": "I recommend consulting with a general dentist first.",
                "dentists": dentists
            }
    
    def extract_booking_info(self, conversation: List[Dict[str, str]]) -> Dict[str, Any]:
        """Extract booking information from conversation"""
        try:
            # Build conversation history
            conv_text = "\n".join([
                f"{msg['role']}: {msg['content']}"
                for msg in conversation[-10:]  # Last 10 messages
            ])
            
            prompt = f"""From this conversation, extract booking information:

{conv_text}

Extract and return as JSON:
{{
    "symptoms": "patient's symptoms or reason for visit",
    "preferred_date": "date if mentioned",
    "preferred_time": "time if mentioned",
    "dentist_preference": "any dentist preference",
    "urgency": "urgent/normal/routine"
}}

If information is not mentioned, use null."""
            
            response = model_flash.generate_content(prompt)
            
            # In production, properly parse JSON response
            return {"extracted_info": response.text}
        except Exception as e:
            logger.error(f"Error extracting booking info: {e}")
            return {}
    
    def _build_prompt(self, user_message: str, context: Optional[Dict[str, Any]] = None) -> str:
        """Build prompt with context"""
        prompt = f"{self.system_prompt}\n\n"
        
        if context:
            if context.get("user_name"):
                prompt += f"Patient Name: {context['user_name']}\n"
            
            if context.get("recent_appointments"):
                prompt += f"Recent Appointments: {len(context['recent_appointments'])}\n"
            
            if context.get("conversation_history"):
                prompt += "Recent Conversation:\n"
                for msg in context["conversation_history"][-5:]:
                    prompt += f"{msg['role']}: {msg['content']}\n"
                prompt += "\n"
        
        prompt += f"Patient: {user_message}\nAssistant:"
        
        return prompt


# Create service instance
gemini_service = GeminiService()
