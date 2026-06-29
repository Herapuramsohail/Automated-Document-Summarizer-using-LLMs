import time
import io
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models import Document, Summary, Metric, Feedback
from app.schemas import SummaryCreate, SummaryResponse, FeedbackCreate, FeedbackResponse
from app.services.summarizer import summarizer_service
from app.services.metrics import MetricsService

# ReportLab imports for PDF generation
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors

router = APIRouter()

@router.post("/generate", response_model=SummaryResponse, status_code=status.HTTP_201_CREATED)
def generate_summary(payload: SummaryCreate, db: Session = Depends(get_db)):
    """
    Generate a summary for an uploaded document, compute evaluation metrics, and store both in DB.
    """
    # Fetch original document
    doc = db.query(Document).filter(Document.id == payload.document_id).first()
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Original document not found."
        )

    start_time = time.time()
    
    try:
        # Generate summary content
        summary_content = summarizer_service.generate_summary(
            text=doc.raw_text,
            summary_type=payload.summary_type,
            format_type=payload.format,
            target_length=payload.target_length
        )

        # Create summary DB model
        db_summary = Summary(
            document_id=payload.document_id,
            summary_type=payload.summary_type,
            format=payload.format,
            target_length=payload.target_length,
            content=summary_content
        )
        db.add(db_summary)
        db.commit()
        db.refresh(db_summary)

        # Evaluate summary metrics
        eval_metrics = MetricsService.evaluate_summary(
            reference_text=doc.raw_text,
            summary_text=summary_content,
            start_time=start_time
        )

        # Create metrics DB model
        db_metric = Metric(
            summary_id=db_summary.id,
            rouge_1=eval_metrics["rouge_1"],
            rouge_2=eval_metrics["rouge_2"],
            rouge_l=eval_metrics["rouge_l"],
            bleu=eval_metrics["bleu"],
            bert_score=eval_metrics["bert_score"],
            latency_seconds=eval_metrics["latency_seconds"]
        )
        db.add(db_metric)
        db.commit()
        db.refresh(db_summary)

        return db_summary

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Summarization processing failed: {str(e)}"
        )

@router.get("/document/{doc_id}", response_model=List[SummaryResponse])
def get_document_summaries(doc_id: str, db: Session = Depends(get_db)):
    """
    Retrieve all summaries created for a specific document.
    """
    return db.query(Summary).filter(Summary.document_id == doc_id).order_by(Summary.created_at.desc()).all()

@router.get("/{summary_id}", response_model=SummaryResponse)
def get_summary(summary_id: str, db: Session = Depends(get_db)):
    """
    Retrieve details of a specific summary including metrics.
    """
    summary = db.query(Summary).filter(Summary.id == summary_id).first()
    if not summary:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Summary not found"
        )
    return summary

@router.post("/{summary_id}/feedback", response_model=FeedbackResponse)
def submit_feedback(summary_id: str, payload: FeedbackCreate, db: Session = Depends(get_db)):
    """
    Record user thumbs up/down and comments for a generated summary.
    """
    summary = db.query(Summary).filter(Summary.id == summary_id).first()
    if not summary:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Summary not found"
        )
        
    db_feedback = Feedback(
        summary_id=summary_id,
        rating=payload.rating,
        comment=payload.comment
    )
    db.add(db_feedback)
    db.commit()
    db.refresh(db_feedback)
    return db_feedback

@router.get("/{summary_id}/download")
def download_summary_pdf(summary_id: str, db: Session = Depends(get_db)):
    """
    Generate and stream an elegantly styled PDF of the summary.
    """
    summary = db.query(Summary).filter(Summary.id == summary_id).first()
    if not summary:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Summary not found"
        )
        
    doc = db.query(Document).filter(Document.id == summary.document_id).first()
    filename_str = doc.filename if doc else "Document"

    # Create memory buffer for PDF
    buffer = io.BytesIO()
    pdf_doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=54,
        leftMargin=54,
        topMargin=54,
        bottomMargin=54
    )

    # Styles
    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=22,
        leading=26,
        textColor=colors.HexColor('#1E293B'), # Slate 800
        spaceAfter=15
    )
    
    subtitle_style = ParagraphStyle(
        'DocSubTitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor('#64748B'), # Slate 500
        spaceAfter=25
    )

    h2_style = ParagraphStyle(
        'H2Style',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=14,
        leading=18,
        textColor=colors.HexColor('#0F172A'),
        spaceBefore=15,
        spaceAfter=10
    )

    body_style = ParagraphStyle(
        'BodyStyle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10.5,
        leading=16,
        textColor=colors.HexColor('#334155'), # Slate 700
        spaceAfter=12
    )

    meta_label_style = ParagraphStyle(
        'MetaLabel',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=12,
        textColor=colors.HexColor('#475569')
    )

    meta_val_style = ParagraphStyle(
        'MetaValue',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=12,
        textColor=colors.HexColor('#0F172A')
    )

    story = []

    # Title & Metadata
    story.append(Paragraph("AI Document Summary", title_style))
    story.append(Paragraph(f"Source Document: {filename_str}", subtitle_style))
    
    # Metadata Table
    meta_data = [
        [
            Paragraph("Summary Type", meta_label_style), Paragraph(summary.summary_type.capitalize(), meta_val_style),
            Paragraph("Format Layout", meta_label_style), Paragraph(summary.format.capitalize(), meta_val_style)
        ],
        [
            Paragraph("Target Length", meta_label_style), Paragraph(f"{summary.target_length} words", meta_val_style),
            Paragraph("Generated Date", meta_label_style), Paragraph(summary.created_at.strftime('%Y-%m-%d %H:%M:%S'), meta_val_style)
        ]
    ]
    
    t = Table(meta_data, colWidths=[100, 150, 100, 150])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#F8FAFC')),
        ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#F1F5F9')),
        ('PADDING', (0,0), (-1,-1), 8),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    
    story.append(t)
    story.append(Spacer(1, 20))
    story.append(Paragraph("Summary Content", h2_style))
    
    # Split content into paragraphs or bullet points
    lines = summary.content.split('\n')
    for line in lines:
        line_str = line.strip()
        if not line_str:
            continue
            
        # Format bullet lists
        if line_str.startswith('•') or line_str.startswith('-') or line_str.startswith('*'):
            bullet_text = line_str.lstrip('•-* ').strip()
            bullet_style = ParagraphStyle(
                'BulletStyle',
                parent=body_style,
                leftIndent=15,
                firstLineIndent=-10,
                spaceAfter=6
            )
            story.append(Paragraph(f"&bull; {bullet_text}", bullet_style))
        else:
            story.append(Paragraph(line_str, body_style))

    # Build PDF
    pdf_doc.build(story)
    
    buffer.seek(0)
    
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=Summary_{summary_id}.pdf"}
    )
