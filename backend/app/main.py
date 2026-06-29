import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import engine, Base
from app.api import documents, summaries, qa, metrics

# Create all database tables on application startup
Base.metadata.create_all(bind=engine)

# Map GEMINI_API_KEY to GOOGLE_API_KEY so standard LangChain/Google modules resolve it
if settings.GEMINI_API_KEY:
    os.environ["GOOGLE_API_KEY"] = settings.GEMINI_API_KEY
    # Log safety message (mask key)
    masked_key = settings.GEMINI_API_KEY[:6] + "..." + settings.GEMINI_API_KEY[-4:] if len(settings.GEMINI_API_KEY) > 10 else "SET"
    print(f"Gemini API key loaded: {masked_key}")
else:
    print("Warning: GEMINI_API_KEY not configured. Running in Mock/Offline mode.")

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Backend API for LLM-Based Automated Document Summarizer and RAG Q&A",
    version="1.0.0"
)

# Enable CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify actual domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers
app.include_router(documents.router, prefix=f"{settings.API_V1_STR}/documents", tags=["Documents"])
app.include_router(summaries.router, prefix=f"{settings.API_V1_STR}/summaries", tags=["Summaries"])
app.include_router(qa.router, prefix=f"{settings.API_V1_STR}/qa", tags=["Q&A"])
app.include_router(metrics.router, prefix=f"{settings.API_V1_STR}/metrics", tags=["Metrics"])

@app.get("/")
def read_root():
    return {
        "project": settings.PROJECT_NAME,
        "status": "healthy",
        "api_docs": "/docs",
        "version": "1.0.0"
    }

@app.get("/health")
def health_check():
    return {"status": "ok"}
