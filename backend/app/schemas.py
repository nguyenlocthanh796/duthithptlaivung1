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


class ExamGenerateRequest(BaseModel):
    topic: str = Field(..., min_length=1, description="Chủ đề bài thi")
    difficulty: str = Field("TB", description="Độ khó: De, TB, Kho, SieuKho")
    count: int = Field(10, ge=1, le=50, description="Số lượng câu hỏi")


class ExamQuestion(BaseModel):
    text: str
    options: List[str]
    correct: int


class ExamGenerateResponse(BaseModel):
    questions: List[ExamQuestion]


class ExamFullGenerateRequest(BaseModel):
    topic: str = Field(..., min_length=1, description="Chủ đề bài thi")
    difficulty: str = Field("Trung bình", description="Độ khó: Dễ, Trung bình, Khó")
    quantity: int = Field(5, ge=1, le=50, description="Số lượng câu hỏi")
    type: str = Field("multiple_choice", description="Loại câu hỏi: multiple_choice, essay, mix")


class ExamFullGenerateResponse(BaseModel):
    title: str
    questions: List[dict]  # Flexible format for questions with explanation, points, etc.


class QuestionCompleteRequest(BaseModel):
    draftText: str = Field(..., min_length=1, description="Nội dung câu hỏi nháp")
    type: str = Field("multiple_choice", description="Loại câu hỏi: multiple_choice, essay")


class QuestionCompleteResponse(BaseModel):
    text: str
    options: Optional[List[str]] = None
    correctIndex: Optional[int] = None
    explanation: Optional[str] = None



