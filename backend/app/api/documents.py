import os
import shutil
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.config import settings
from app.models import Document
from app.schemas import DocumentResponse, DocumentDetailResponse
from app.services.document_processor import DocumentProcessor
from app.services.qa_service import qa_service

router = APIRouter()

@router.post("/upload", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
def upload_document(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """
    Upload a document (PDF, DOCX, TXT), extract text, chunk, and index in FAISS vector store.
    """
    # Validate extension
    filename = file.filename
    ext = filename.split(".")[-1].lower() if "." in filename else ""
    if ext not in ["pdf", "docx", "txt"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported file format. Please upload a PDF, DOCX, or TXT file."
        )

    # Generate a unique path to temporarily store the file
    import uuid
    doc_id = str(uuid.uuid4())
    temp_filename = f"{doc_id}_{filename}"
    file_path = os.path.join(settings.UPLOAD_DIR, temp_filename)

    try:
        # Save file to disk
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        file_size = os.path.getsize(file_path)

        # Extract raw text
        raw_text = DocumentProcessor.extract_text(file_path, ext)
        if not raw_text.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Extracted text is empty. The document may be scanned or empty."
            )

        # Save to database
        db_doc = Document(
            id=doc_id,
            filename=filename,
            file_type=ext,
            file_size=file_size,
            raw_text=raw_text
        )
        db.add(db_doc)
        db.commit()
        db.refresh(db_doc)

        # Chunk and Index in FAISS
        chunks = DocumentProcessor.chunk_text(raw_text)
        qa_service.index_document(doc_id, chunks)

        return db_doc

    except Exception as e:
        # Clean up file on failure
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred during document processing: {str(e)}"
        )

@router.get("/", response_model=List[DocumentResponse])
def list_documents(db: Session = Depends(get_db)):
    """
    List all uploaded documents.
    """
    return db.query(Document).order_by(Document.created_at.desc()).all()

@router.get("/{doc_id}", response_model=DocumentDetailResponse)
def get_document(doc_id: str, db: Session = Depends(get_db)):
    """
    Get details and raw text of a specific document.
    """
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    return doc

@router.delete("/{doc_id}", status_code=status.HTTP_200_OK)
def delete_document(doc_id: str, db: Session = Depends(get_db)):
    """
    Delete a document, its database entries, and its FAISS index.
    """
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )

    try:
        # Delete FAISS vector index
        qa_service.delete_index(doc_id)
        
        # Delete database entry (cascades to summaries, messages, metrics, feedback)
        db.delete(doc)
        db.commit()
        return {"status": "success", "message": f"Document {doc_id} and associated data successfully deleted."}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete document: {str(e)}"
        )
