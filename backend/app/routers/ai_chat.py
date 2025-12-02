"""
AI Chat API endpoints using Gemini
"""
from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
import os
import requests

from app.config import settings

router = APIRouter(prefix="/api/ai-chat", tags=["ai-chat"])


class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str


class ChatRequest(BaseModel):
    message: str
    conversation_id: Optional[str] = None
    history: Optional[List[ChatMessage]] = []


class ChatResponse(BaseModel):
    response: str
    conversation_id: str


def get_gemini_api_key():
    """Get Gemini API key from settings"""
    if settings.GEMINI_API_KEY:
        return settings.GEMINI_API_KEY
    
    # Try to get from environment variable
    api_key = os.getenv("GEMINI_API_KEY")
    if api_key:
        return api_key
    
    return None


@router.post("/chat", response_model=Dict[str, Any])
async def chat_with_ai(request: ChatRequest):
    """Chat with AI using Gemini API"""
    api_key = get_gemini_api_key()
    
    if not api_key:
        raise HTTPException(
            status_code=503,
            detail="Gemini API key not configured. Please set GEMINI_API_KEY in environment variables."
        )
    
    try:
        # Prepare messages for Gemini API
        # Gemini API format: https://ai.google.dev/api/generate-content
        model_name = settings.GEMINI_MODEL or "gemini-2.5-flash-lite"
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"
        
        # Build conversation history
        contents = []
        for msg in request.history[-10:]:  # Last 10 messages for context
            contents.append({
                "role": msg.role,
                "parts": [{"text": msg.content}]
            })
        
        # Add current user message
        contents.append({
            "role": "user",
            "parts": [{"text": request.message}]
        })
        
        payload = {
            "contents": contents,
            "generationConfig": {
                "temperature": 0.7,
                "topK": 40,
                "topP": 0.95,
                "maxOutputTokens": 2048,
            }
        }
        
        response = requests.post(url, json=payload, timeout=30)
        response.raise_for_status()
        
        data = response.json()
        
        # Extract response text
        if "candidates" in data and len(data["candidates"]) > 0:
            ai_response = data["candidates"][0]["content"]["parts"][0]["text"]
        else:
            raise HTTPException(status_code=500, detail="No response from Gemini API")
        
        # Generate conversation ID if not provided
        conversation_id = request.conversation_id or f"conv_{hash(request.message) % 1000000}"
        
        model_name = settings.GEMINI_MODEL or "gemini-2.5-flash-lite"
        return {
            "response": ai_response,
            "conversation_id": conversation_id,
            "model": model_name
        }
        
    except requests.exceptions.RequestException as e:
        raise HTTPException(
            status_code=503,
            detail=f"Error calling Gemini API: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )


@router.get("/health")
async def ai_chat_health():
    """Check if AI chat is available"""
    api_key = get_gemini_api_key()
    
    model_name = settings.GEMINI_MODEL or "gemini-2.5-flash-lite"
    return {
        "available": api_key is not None,
        "model": model_name if api_key else None
    }

