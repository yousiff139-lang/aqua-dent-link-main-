"""
Database connection and query functions
"""
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.ext.declarative import declarative_base
from typing import Optional, List, Dict, Any
from datetime import datetime
import logging
from config import settings

# Setup logging
logger = logging.getLogger(__name__)

# Create database engine
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=3600,
    echo=settings.DEBUG
)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for models
Base = declarative_base()


def get_db() -> Session:
    """Get database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_user_by_id(user_id: str) -> Optional[Dict[str, Any]]:
    """Get user information by ID"""
    try:
        with SessionLocal() as db:
            query = text("""
                SELECT 
                    u.id,
                    u.email,
                    p.full_name as name,
                    p.phone,
                    ur.role
                FROM auth.users u
                LEFT JOIN public.profiles p ON u.id = p.user_id
                LEFT JOIN public.user_roles ur ON u.id = ur.user_id
                WHERE u.id = :user_id
            """)
            result = db.execute(query, {"user_id": user_id}).fetchone()
            
            if result:
                return {
                    "id": result.id,
                    "email": result.email,
                    "name": result.name or "User",
                    "phone": result.phone,
                    "role": result.role or "patient"
                }
            return None
    except Exception as e:
        logger.error(f"Error fetching user: {e}")
        return None


def get_user_appointments(user_id: str, limit: int = 3) -> List[Dict[str, Any]]:
    """Get user's recent appointments"""
    try:
        with SessionLocal() as db:
            query = text("""
                SELECT 
                    a.id,
                    a.appointment_date,
                    a.appointment_time,
                    a.status,
                    a.appointment_type,
                    a.dentist_name,
                    a.symptoms,
                    a.patient_notes
                FROM public.appointments a
                WHERE a.patient_id = :user_id
                ORDER BY a.appointment_date DESC, a.appointment_time DESC
                LIMIT :limit
            """)
            results = db.execute(query, {"user_id": user_id, "limit": limit}).fetchall()
            
            appointments = []
            for row in results:
                appointments.append({
                    "id": row.id,
                    "date": row.appointment_date.isoformat() if row.appointment_date else None,
                    "time": str(row.appointment_time) if row.appointment_time else None,
                    "status": row.status,
                    "type": row.appointment_type,
                    "dentist": row.dentist_name,
                    "symptoms": row.symptoms,
                    "notes": row.patient_notes
                })
            return appointments
    except Exception as e:
        logger.error(f"Error fetching appointments: {e}")
        return []


def get_available_dentists(specialization: Optional[str] = None) -> List[Dict[str, Any]]:
    """Get available dentists, optionally filtered by specialization"""
    try:
        with SessionLocal() as db:
            if specialization:
                query = text("""
                    SELECT 
                        id,
                        name,
                        email,
                        specialization,
                        bio,
                        rating,
                        reviews_count
                    FROM public.dentists
                    WHERE LOWER(specialization) LIKE LOWER(:spec)
                    ORDER BY rating DESC
                    LIMIT 10
                """)
                results = db.execute(query, {"spec": f"%{specialization}%"}).fetchall()
            else:
                query = text("""
                    SELECT 
                        id,
                        name,
                        email,
                        specialization,
                        bio,
                        rating,
                        reviews_count
                    FROM public.dentists
                    ORDER BY rating DESC
                    LIMIT 10
                """)
                results = db.execute(query).fetchall()
            
            dentists = []
            for row in results:
                dentists.append({
                    "id": row.id,
                    "name": row.name,
                    "email": row.email,
                    "specialization": row.specialization,
                    "bio": row.bio,
                    "rating": float(row.rating) if row.rating else 0.0,
                    "reviews": row.reviews_count or 0
                })
            return dentists
    except Exception as e:
        logger.error(f"Error fetching dentists: {e}")
        return []


def save_chat_log(user_id: str, message: str, role: str, metadata: Optional[Dict] = None) -> bool:
    """Save chat message to database"""
    try:
        with SessionLocal() as db:
            query = text("""
                INSERT INTO public.chatbot_conversations 
                (patient_id, messages, status, booking_data, created_at, updated_at)
                VALUES (:user_id, :messages, 'active', :metadata, NOW(), NOW())
                ON CONFLICT (patient_id) 
                DO UPDATE SET 
                    messages = chatbot_conversations.messages || :messages::jsonb,
                    updated_at = NOW()
            """)
            
            message_obj = {
                "role": role,
                "content": message,
                "timestamp": datetime.utcnow().isoformat()
            }
            
            db.execute(query, {
                "user_id": user_id,
                "messages": f'[{message_obj}]',
                "metadata": metadata or {}
            })
            db.commit()
            return True
    except Exception as e:
        logger.error(f"Error saving chat log: {e}")
        return False


def save_xray_upload(user_id: str, file_path: str, analysis: Optional[str] = None) -> Optional[str]:
    """Save X-ray upload metadata"""
    try:
        with SessionLocal() as db:
            query = text("""
                INSERT INTO public.xray_uploads 
                (user_id, file_path, analysis, analyzed, created_at)
                VALUES (:user_id, :file_path, :analysis, :analyzed, NOW())
                RETURNING id
            """)
            
            result = db.execute(query, {
                "user_id": user_id,
                "file_path": file_path,
                "analysis": analysis,
                "analyzed": analysis is not None
            })
            db.commit()
            
            row = result.fetchone()
            return str(row.id) if row else None
    except Exception as e:
        logger.error(f"Error saving X-ray upload: {e}")
        return None


def get_dentist_availability(dentist_id: str, date: str) -> List[Dict[str, Any]]:
    """Get dentist availability for a specific date"""
    try:
        with SessionLocal() as db:
            query = text("""
                SELECT 
                    da.id,
                    da.day_of_week,
                    da.start_time,
                    da.end_time,
                    da.is_available
                FROM public.dentist_availability da
                WHERE da.dentist_id = :dentist_id
                AND da.is_available = true
                ORDER BY da.start_time
            """)
            results = db.execute(query, {"dentist_id": dentist_id}).fetchall()
            
            slots = []
            for row in results:
                slots.append({
                    "id": row.id,
                    "day": row.day_of_week,
                    "start": str(row.start_time),
                    "end": str(row.end_time),
                    "available": row.is_available
                })
            return slots
    except Exception as e:
        logger.error(f"Error fetching availability: {e}")
        return []
