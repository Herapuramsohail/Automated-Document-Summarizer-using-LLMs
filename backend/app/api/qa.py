from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models import Document, ChatMessage
from app.schemas import ChatMessageCreate, ChatMessageResponse
from app.services.qa_service import qa_service

router = APIRouter()

@router.post("/document/{doc_id}/query", response_model=ChatMessageResponse, status_code=status.HTTP_201_CREATED)
def query_document(doc_id: str, payload: ChatMessageCreate, db: Session = Depends(get_db)):
    """
    Perform a RAG query on the document, record chat message, and return answer.
    """
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found."
        )

    # 1. Store the user's question
    user_msg = ChatMessage(
        document_id=doc_id,
        role="user",
        content=payload.content
    )
    db.add(user_msg)
    db.commit()

    # 2. Retrieve history (optional context) and run QA Service
    history = db.query(ChatMessage).filter(ChatMessage.document_id == doc_id).order_by(ChatMessage.created_at.asc()).all()
    history_dicts = [{"role": h.role, "content": h.content} for h in history]

    try:
        qa_result = qa_service.query_document(
            document_id=doc_id,
            question=payload.content,
            chat_history=history_dicts
        )
        
        # 3. Store the assistant's answer
        assistant_msg = ChatMessage(
            document_id=doc_id,
            role="assistant",
            content=qa_result["answer"]
        )
        db.add(assistant_msg)
        db.commit()
        db.refresh(assistant_msg)
        
        return assistant_msg

    except Exception as e:
        # Fallback if QA fails
        error_msg = ChatMessage(
            document_id=doc_id,
            role="assistant",
            content=f"An error occurred while answering your question: {str(e)}"
        )
        db.add(error_msg)
        db.commit()
        db.refresh(error_msg)
        return error_msg

@router.get("/document/{doc_id}/chat-history", response_model=List[ChatMessageResponse])
def get_chat_history(doc_id: str, db: Session = Depends(get_db)):
    """
    Fetch all chat messages related to a specific document.
    """
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found."
        )
    return db.query(ChatMessage).filter(ChatMessage.document_id == doc_id).order_by(ChatMessage.created_at.asc()).all()
