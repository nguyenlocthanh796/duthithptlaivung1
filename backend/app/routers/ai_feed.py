"""
AI Feed Analysis API endpoints using Gemini
Phân tích nội dung bài viết để tối ưu hóa feed distribution
"""
from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
import os
import requests
import json

from app.config import settings

router = APIRouter(prefix="/api/ai-feed", tags=["ai-feed"])


class PostAnalysisRequest(BaseModel):
    content: str
    author_role: Optional[str] = None
    subject: Optional[str] = None
    has_question: Optional[bool] = False


class BatchPostAnalysisRequest(BaseModel):
    posts: List[Dict[str, Any]]


class UserProfileRequest(BaseModel):
    user_id: str
    favorite_subjects: Optional[List[str]] = []
    interaction_history: Optional[Dict[str, Any]] = {}


def get_gemini_api_key():
    """Get Gemini API key from settings"""
    if settings.GEMINI_API_KEY:
        return settings.GEMINI_API_KEY
    
    api_key = os.getenv("GEMINI_API_KEY")
    if api_key:
        return api_key
    
    return None


@router.post("/analyze-post", response_model=Dict[str, Any])
async def analyze_post(request: PostAnalysisRequest):
    """
    Phân tích một bài viết để xác định:
    - Loại nội dung (câu hỏi, chia sẻ, thảo luận)
    - Độ liên quan đến các môn học
    - Sentiment (tích cực, trung tính, tiêu cực)
    - Độ ưu tiên hiển thị
    """
    api_key = get_gemini_api_key()
    
    if not api_key:
        # Fallback: return basic analysis without AI
        return {
            "content_type": "discussion" if not request.has_question else "question",
            "relevance_score": 0.5,
            "sentiment": "neutral",
            "priority_score": 0.5,
            "topics": [request.subject] if request.subject else [],
            "ai_available": False
        }
    
    try:
        model_name = settings.GEMINI_MODEL or "gemini-2.5-flash-lite"
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"
        
        prompt = f"""Phân tích bài viết sau và trả về JSON với các thông tin:
1. content_type: "question" (câu hỏi), "share" (chia sẻ), "discussion" (thảo luận), "announcement" (thông báo)
2. relevance_score: số từ 0-1, độ liên quan đến học tập
3. sentiment: "positive", "neutral", "negative"
4. priority_score: số từ 0-1, độ ưu tiên hiển thị (cao hơn nếu có câu hỏi, nội dung hữu ích)
5. topics: danh sách các chủ đề/môn học liên quan
6. keywords: danh sách từ khóa quan trọng (tối đa 5)

Bài viết:
"{request.content}"

Môn học: {request.subject or "Không xác định"}
Có câu hỏi: {request.has_question}

Trả về CHỈ JSON, không có text khác. Format:
{{
  "content_type": "...",
  "relevance_score": 0.0-1.0,
  "sentiment": "...",
  "priority_score": 0.0-1.0,
  "topics": ["..."],
  "keywords": ["..."]
}}
"""
        
        payload = {
            "contents": [{
                "role": "user",
                "parts": [{"text": prompt}]
            }],
            "generationConfig": {
                "temperature": 0.3,  # Lower temperature for more consistent analysis
                "topK": 20,
                "topP": 0.8,
                "maxOutputTokens": 500,
            }
        }
        
        response = requests.post(url, json=payload, timeout=10)
        response.raise_for_status()
        
        data = response.json()
        
        if "candidates" in data and len(data["candidates"]) > 0:
            ai_response = data["candidates"][0]["content"]["parts"][0]["text"]
            
            # Extract JSON from response
            try:
                # Remove markdown code blocks if present
                ai_response = ai_response.strip()
                if ai_response.startswith("```"):
                    ai_response = ai_response.split("```")[1]
                    if ai_response.startswith("json"):
                        ai_response = ai_response[4:]
                ai_response = ai_response.strip()
                
                analysis = json.loads(ai_response)
                
                return {
                    **analysis,
                    "ai_available": True
                }
            except json.JSONDecodeError:
                # Fallback if JSON parsing fails
                return {
                    "content_type": "discussion",
                    "relevance_score": 0.5,
                    "sentiment": "neutral",
                    "priority_score": 0.5,
                    "topics": [],
                    "keywords": [],
                    "ai_available": True,
                    "error": "Failed to parse AI response"
                }
        else:
            raise HTTPException(status_code=500, detail="No response from Gemini API")
            
    except requests.exceptions.Timeout:
        # Timeout fallback
        return {
            "content_type": "discussion" if not request.has_question else "question",
            "relevance_score": 0.5,
            "sentiment": "neutral",
            "priority_score": 0.5,
            "topics": [request.subject] if request.subject else [],
            "keywords": [],
            "ai_available": False,
            "error": "AI service timeout"
        }
    except Exception as e:
        # Error fallback
        return {
            "content_type": "discussion" if not request.has_question else "question",
            "relevance_score": 0.5,
            "sentiment": "neutral",
            "priority_score": 0.5,
            "topics": [request.subject] if request.subject else [],
            "keywords": [],
            "ai_available": False,
            "error": str(e)
        }


@router.post("/analyze-batch", response_model=Dict[str, Any])
async def analyze_batch_posts(request: BatchPostAnalysisRequest):
    """
    Phân tích hàng loạt bài viết để tối ưu hóa feed
    Trả về điểm số và đề xuất thứ tự hiển thị
    """
    api_key = get_gemini_api_key()
    
    if not api_key or len(request.posts) == 0:
        return {
            "rankings": [],
            "ai_available": False
        }
    
    try:
        # Analyze each post (limit to 20 posts per batch for performance)
        posts_to_analyze = request.posts[:20]
        rankings = []
        
        for post in posts_to_analyze:
            analysis_request = PostAnalysisRequest(
                content=post.get("content", ""),
                author_role=post.get("author_role"),
                subject=post.get("subject"),
                has_question=post.get("has_question", False)
            )
            
            analysis = await analyze_post(analysis_request)
            
            # Calculate final score combining AI analysis with engagement
            engagement = post.get("likes", 0) + post.get("comments", 0) * 2
            time_factor = 1.0  # Can be calculated based on post age
            
            final_score = (
                analysis.get("priority_score", 0.5) * 0.4 +
                analysis.get("relevance_score", 0.5) * 0.3 +
                min(engagement / 100, 1.0) * 0.2 +
                time_factor * 0.1
            )
            
            rankings.append({
                "post_id": post.get("id"),
                "score": final_score,
                "analysis": analysis,
                "recommended_order": 0  # Will be set after sorting
            })
        
        # Sort by score
        rankings.sort(key=lambda x: x["score"], reverse=True)
        for i, ranking in enumerate(rankings):
            ranking["recommended_order"] = i + 1
        
        return {
            "rankings": rankings,
            "ai_available": True
        }
        
    except Exception as e:
        return {
            "rankings": [],
            "ai_available": False,
            "error": str(e)
        }


@router.post("/recommend", response_model=Dict[str, Any])
async def recommend_posts(request: UserProfileRequest):
    """
    Đề xuất bài viết phù hợp với user dựa trên profile và lịch sử tương tác
    """
    # This would typically analyze user preferences and match with posts
    # For now, return basic recommendations based on favorite subjects
    
    recommendations = {
        "recommended_subjects": request.favorite_subjects,
        "priority_factors": {
            "favorite_subjects": 0.4,
            "interaction_history": 0.3,
            "trending": 0.2,
            "recent": 0.1
        },
        "ai_available": get_gemini_api_key() is not None
    }
    
    return recommendations


@router.get("/health")
async def ai_feed_health():
    """Check if AI feed analysis is available"""
    api_key = get_gemini_api_key()
    model_name = settings.GEMINI_MODEL or "gemini-2.5-flash-lite"
    
    return {
        "available": api_key is not None,
        "model": model_name if api_key else None
    }

