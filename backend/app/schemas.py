from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional

# --- Metric Schemas ---
class MetricResponse(BaseModel):
    id: str
    summary_id: str
    rouge_1: Optional[float] = None
    rouge_2: Optional[float] = None
    rouge_l: Optional[float] = None
    bleu: Optional[float] = None
    bert_score: Optional[float] = None
    latency_seconds: float
    created_at: datetime

    class Config:
        from_attributes = True

# --- Feedback Schemas ---
class FeedbackCreate(BaseModel):
    rating: int  # 1 to 5, or 1 for positive, -1 for negative
    comment: Optional[str] = None

class FeedbackResponse(BaseModel):
    id: str
    summary_id: str
    rating: int
    comment: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

# --- Summary Schemas ---
class SummaryCreate(BaseModel):
    document_id: str
    summary_type: str  # abstractive, extractive
    format: str        # short, detailed, executive, bullets
    target_length: int

class SummaryResponse(BaseModel):
    id: str
    document_id: str
    summary_type: str
    format: str
    target_length: int
    content: str
    created_at: datetime
    metrics: Optional[MetricResponse] = None

    class Config:
        from_attributes = True

# --- Document Schemas ---
class DocumentResponse(BaseModel):
    id: str
    filename: str
    file_type: str
    file_size: int
    created_at: datetime

    class Config:
        from_attributes = True

class DocumentDetailResponse(DocumentResponse):
    raw_text: str

    class Config:
        from_attributes = True

# --- ChatMessage Schemas ---
class ChatMessageCreate(BaseModel):
    content: str

class ChatMessageResponse(BaseModel):
    id: str
    document_id: str
    role: str  # user, assistant
    content: str
    created_at: datetime

    class Config:
        from_attributes = True

# --- Analytics / Dashboard Schemas ---
class AnalyticsResponse(BaseModel):
    total_documents: int
    total_summaries: int
    avg_latency: float
    avg_rouge_1: Optional[float] = None
    avg_rouge_l: Optional[float] = None
    avg_bleu: Optional[float] = None
    thumbs_up_count: int
    thumbs_down_count: int
