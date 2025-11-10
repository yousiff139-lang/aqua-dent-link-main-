"""
Intent classification using transformers
"""
from transformers import pipeline
from typing import Dict, List
import logging
from config import settings

# Setup logging
logger = logging.getLogger(__name__)


class IntentClassifier:
    """Classify user intent using NLP"""
    
    # Define intents and their labels
    INTENTS = {
        "book_appointment": [
            "I want to book an appointment",
            "Schedule a visit",
            "Make an appointment"
        ],
        "payment_help": [
            "Payment information",
            "How much does it cost",
            "Billing question"
        ],
        "dentist_suggestion": [
            "Recommend a dentist",
            "Which dentist should I see",
            "Find a specialist"
        ],
        "view_appointments": [
            "Show my appointments",
            "View my bookings",
            "Check my schedule"
        ],
        "xray_analysis": [
            "Analyze my X-ray",
            "Look at this image",
            "Check this scan"
        ],
        "dental_advice": [
            "Dental health question",
            "How to care for teeth",
            "Tooth pain advice"
        ],
        "general_query": [
            "General question",
            "Information request",
            "Help me understand"
        ]
    }
    
    def __init__(self):
        """Initialize intent classifier"""
        try:
            self.classifier = pipeline(
                "zero-shot-classification",
                model=settings.INTENT_MODEL
            )
            logger.info("Intent classifier initialized successfully")
        except Exception as e:
            logger.error(f"Error initializing intent classifier: {e}")
            self.classifier = None
    
    def classify(self, user_message: str) -> Dict[str, any]:
        """Classify user intent"""
        if not self.classifier:
            return {
                "intent": "general_query",
                "confidence": 0.5,
                "all_scores": {}
            }
        
        try:
            # Get all intent labels
            candidate_labels = list(self.INTENTS.keys())
            
            # Classify
            result = self.classifier(
                user_message,
                candidate_labels,
                multi_label=False
            )
            
            # Get top intent
            top_intent = result['labels'][0]
            top_score = result['scores'][0]
            
            # Build scores dict
            all_scores = {
                label: score 
                for label, score in zip(result['labels'], result['scores'])
            }
            
            return {
                "intent": top_intent,
                "confidence": top_score,
                "all_scores": all_scores
            }
        except Exception as e:
            logger.error(f"Error classifying intent: {e}")
            return {
                "intent": "general_query",
                "confidence": 0.5,
                "all_scores": {}
            }
    
    def get_intent_description(self, intent: str) -> str:
        """Get description of intent"""
        descriptions = {
            "book_appointment": "User wants to book a dental appointment",
            "payment_help": "User needs help with payment or billing",
            "dentist_suggestion": "User wants dentist recommendation",
            "view_appointments": "User wants to see their appointments",
            "xray_analysis": "User wants X-ray or document analysis",
            "dental_advice": "User has dental health questions",
            "general_query": "General question or conversation"
        }
        return descriptions.get(intent, "Unknown intent")


# Create classifier instance
intent_classifier = IntentClassifier()
