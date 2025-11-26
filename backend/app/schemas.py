from typing import List, Optional

from pydantic import BaseModel, Field


class PromptRequest(BaseModel):
    prompt: str = Field(..., min_length=1)
    temperature: float = Field(0.4, ge=0.0, le=1.5)
    max_tokens: int = Field(512, ge=16, le=2048)
    model: Optional[str] = Field(None, description="Model to use: gemini-2.5-flash-lite or gemini-2.5-flash-preview-image")
    imageUrl: Optional[str] = Field(None, description="URL of image to include in the prompt")


class PromptResponse(BaseModel):
    answer: str


class QuestionCloneRequest(BaseModel):
    question: str
    correct_answer: str
    difficulty: Optional[str] = "medium"


class QuestionCloneResult(BaseModel):
    correct_answer: str
    distractors: List[str]
    variants: List[str]



