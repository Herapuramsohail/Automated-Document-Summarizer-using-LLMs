import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

def generate_uuid():
    return str(uuid.uuid4())

class Document(Base):
    __tablename__ = "documents"

    id = Column(String, primary_key=True, default=generate_uuid)
    filename = Column(String, nullable=False)
    file_type = Column(String, nullable=False)
    file_size = Column(Integer, nullable=False)
    raw_text = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    summaries = relationship("Summary", back_populates="document", cascade="all, delete-orphan")
    chat_messages = relationship("ChatMessage", back_populates="document", cascade="all, delete-orphan")

class Summary(Base):
    __tablename__ = "summaries"

    id = Column(String, primary_key=True, default=generate_uuid)
    document_id = Column(String, ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    summary_type = Column(String, nullable=False)  # abstractive, extractive
    format = Column(String, nullable=False)        # short, detailed, executive, bullets
    target_length = Column(Integer, nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    document = relationship("Document", back_populates="summaries")
    metrics = relationship("Metric", back_populates="summary", uselist=False, cascade="all, delete-orphan")
    feedbacks = relationship("Feedback", back_populates="summary", cascade="all, delete-orphan")

class Metric(Base):
    __tablename__ = "metrics"

    id = Column(String, primary_key=True, default=generate_uuid)
    summary_id = Column(String, ForeignKey("summaries.id", ondelete="CASCADE"), nullable=False)
    rouge_1 = Column(Float, nullable=True)
    rouge_2 = Column(Float, nullable=True)
    rouge_l = Column(Float, nullable=True)
    bleu = Column(Float, nullable=True)
    bert_score = Column(Float, nullable=True)
    latency_seconds = Column(Float, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    summary = relationship("Summary", back_populates="metrics")

class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(String, primary_key=True, default=generate_uuid)
    document_id = Column(String, ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    role = Column(String, nullable=False)  # user, assistant
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    document = relationship("Document", back_populates="chat_messages")

class Feedback(Base):
    __tablename__ = "feedbacks"

    id = Column(String, primary_key=True, default=generate_uuid)
    summary_id = Column(String, ForeignKey("summaries.id", ondelete="CASCADE"), nullable=False)
    rating = Column(Integer, nullable=False)  # 1-5 rating or 1/-1 (thumbs up/down)
    comment = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    summary = relationship("Summary", back_populates="feedbacks")
