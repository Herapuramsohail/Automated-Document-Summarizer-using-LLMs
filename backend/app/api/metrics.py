from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models import Document, Summary, Metric, Feedback
from app.schemas import AnalyticsResponse

router = APIRouter()

@router.get("/analytics", response_model=AnalyticsResponse)
def get_analytics(db: Session = Depends(get_db)):
    """
    Calculate and return system analytics including document counts, average latency, and ratings.
    """
    total_docs = db.query(Document).count()
    total_sums = db.query(Summary).count()
    
    # Calculate average metric values
    avg_metrics = db.query(
        func.avg(Metric.latency_seconds).label('avg_latency'),
        func.avg(Metric.rouge_1).label('avg_rouge_1'),
        func.avg(Metric.rouge_l).label('avg_rouge_l'),
        func.avg(Metric.bleu).label('avg_bleu')
    ).first()
    
    # Feedback counts
    thumbs_up = db.query(Feedback).filter(Feedback.rating == 1).count()
    thumbs_down = db.query(Feedback).filter(Feedback.rating == -1).count()
    
    # Extract values with fallbacks
    avg_latency = float(avg_metrics.avg_latency) if avg_metrics and avg_metrics.avg_latency else 0.0
    avg_rouge_1 = float(avg_metrics.avg_rouge_1) if avg_metrics and avg_metrics.avg_rouge_1 else 0.0
    avg_rouge_l = float(avg_metrics.avg_rouge_l) if avg_metrics and avg_metrics.avg_rouge_l else 0.0
    avg_bleu = float(avg_metrics.avg_bleu) if avg_metrics and avg_metrics.avg_bleu else 0.0

    return AnalyticsResponse(
        total_documents=total_docs,
        total_summaries=total_sums,
        avg_latency=round(avg_latency, 2),
        avg_rouge_1=round(avg_rouge_1, 4),
        avg_rouge_l=round(avg_rouge_l, 4),
        avg_bleu=round(avg_bleu, 4),
        thumbs_up_count=thumbs_up,
        thumbs_down_count=thumbs_down
    )
