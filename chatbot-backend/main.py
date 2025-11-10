"""
Main FastAPI application for chatbot backend
"""
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from typing import Optional, List
import logging
import os
from datetime import datetime
import aiofiles

from config import settings
from database import (
    get_user_by_id,
    get_user_appointments,
    get_available_dentists,
    save_chat_log,
    save_xray_upload,
    get_dentist_availability
)
from gemini_service import gemini_service
from intent_classifier import intent_classifier

# Setup logging
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(settings.LOG_FILE),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="DentalCareConnect Chatbot API",
    description="AI-powered chatbot backend with Gemini 2.5",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "DentalCareConnect Chatbot API",
        "version": "1.0.0",
        "status": "running"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "gemini_configured": bool(settings.GEMINI_API_KEY),
        "database_configured": bool(settings.DATABASE_URL)
    }


@app.post("/chat")
async def chat_with_ai(
    user_id: str = Form(...),
    message: str = Form(...),
    context: Optional[str] = Form(None)
):
    """
    Main chat endpoint
    
    Args:
        user_id: User ID from authentication
        message: User's message
        context: Optional conversation context (JSON string)
    
    Returns:
        AI response with intent classification
    """
    try:
        logger.info(f"Chat request from user {user_id}: {message[:50]}...")
        
        # Get user information
        user = get_user_by_id(user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Classify intent
        intent_result = intent_classifier.classify(message)
        logger.info(f"Classified intent: {intent_result['intent']} (confidence: {intent_result['confidence']:.2f})")
        
        # Build context
        chat_context = {
            "user_name": user["name"],
            "user_role": user["role"]
        }
        
        # Handle different intents
        if intent_result["intent"] == "view_appointments":
            appointments = get_user_appointments(user_id)
            chat_context["recent_appointments"] = appointments
            
            if appointments:
                response_text = f"Hello {user['name']}! Here are your recent appointments:\n\n"
                for apt in appointments:
                    response_text += f"• {apt['date']} at {apt['time']} - {apt['type']} with {apt['dentist']} (Status: {apt['status']})\n"
            else:
                response_text = f"Hello {user['name']}! You don't have any appointments yet. Would you like to book one?"
        
        elif intent_result["intent"] == "dentist_suggestion":
            dentists = get_available_dentists()
            suggestion = gemini_service.suggest_dentist(message, dentists)
            response_text = suggestion["recommendation"]
        
        elif intent_result["intent"] == "book_appointment":
            response_text = gemini_service.generate_response(
                f"User wants to book an appointment. Their message: {message}",
                chat_context
            )
        
        else:
            # General query - use Gemini
            response_text = gemini_service.generate_response(message, chat_context)
        
        # Save chat log
        save_chat_log(user_id, message, "user")
        save_chat_log(user_id, response_text, "assistant")
        
        return {
            "success": True,
            "reply": response_text,
            "user_name": user["name"],
            "intent": intent_result["intent"],
            "confidence": intent_result["confidence"],
            "timestamp": datetime.utcnow().isoformat()
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in chat endpoint: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/upload_xray")
async def upload_xray(
    file: UploadFile = File(...),
    user_id: str = Form(...),
    query: Optional[str] = Form(None)
):
    """
    Upload and analyze dental X-ray or document
    
    Args:
        file: Uploaded file (image or PDF)
        user_id: User ID
        query: Optional specific question about the file
    
    Returns:
        Analysis results
    """
    try:
        logger.info(f"File upload from user {user_id}: {file.filename}")
        
        # Validate file extension
        file_ext = os.path.splitext(file.filename)[1].lower()
        if file_ext not in settings.allowed_extensions_list:
            raise HTTPException(
                status_code=400,
                detail=f"File type not allowed. Allowed types: {settings.ALLOWED_EXTENSIONS}"
            )
        
        # Validate file size
        file_content = await file.read()
        if len(file_content) > settings.MAX_FILE_SIZE:
            raise HTTPException(
                status_code=400,
                detail=f"File too large. Maximum size: {settings.MAX_FILE_SIZE / 1024 / 1024}MB"
            )
        
        # Save file
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        safe_filename = f"{user_id}_{timestamp}_{file.filename}"
        file_path = os.path.join(settings.UPLOAD_DIR, safe_filename)
        
        async with aiofiles.open(file_path, 'wb') as f:
            await f.write(file_content)
        
        logger.info(f"File saved: {file_path}")
        
        # Analyze file
        if file_ext in ['.png', '.jpg', '.jpeg']:
            analysis = gemini_service.analyze_xray(file_path, query)
        elif file_ext == '.pdf':
            analysis = gemini_service.analyze_pdf(file_path, query)
        else:
            analysis = "File type not supported for analysis"
        
        # Save to database
        upload_id = save_xray_upload(user_id, file_path, analysis)
        
        # Save chat log
        save_chat_log(user_id, f"Uploaded file: {file.filename}", "user")
        save_chat_log(user_id, f"Analysis: {analysis}", "assistant")
        
        return {
            "success": True,
            "analysis": analysis,
            "file_path": file_path,
            "upload_id": upload_id,
            "timestamp": datetime.utcnow().isoformat()
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in upload endpoint: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/appointments/{user_id}")
async def get_appointments(user_id: str, limit: int = 10):
    """Get user's appointments"""
    try:
        appointments = get_user_appointments(user_id, limit)
        return {
            "success": True,
            "appointments": appointments,
            "count": len(appointments)
        }
    except Exception as e:
        logger.error(f"Error fetching appointments: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/dentists")
async def get_dentists(specialization: Optional[str] = None):
    """Get available dentists"""
    try:
        dentists = get_available_dentists(specialization)
        return {
            "success": True,
            "dentists": dentists,
            "count": len(dentists)
        }
    except Exception as e:
        logger.error(f"Error fetching dentists: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/dentist/{dentist_id}/availability")
async def get_availability(dentist_id: str, date: str):
    """Get dentist availability"""
    try:
        slots = get_dentist_availability(dentist_id, date)
        return {
            "success": True,
            "dentist_id": dentist_id,
            "date": date,
            "slots": slots,
            "count": len(slots)
        }
    except Exception as e:
        logger.error(f"Error fetching availability: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/intent/classify")
async def classify_intent(message: str = Form(...)):
    """Classify user intent"""
    try:
        result = intent_classifier.classify(message)
        return {
            "success": True,
            "intent": result["intent"],
            "confidence": result["confidence"],
            "all_scores": result["all_scores"],
            "description": intent_classifier.get_intent_description(result["intent"])
        }
    except Exception as e:
        logger.error(f"Error classifying intent: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level=settings.LOG_LEVEL.lower()
    )
