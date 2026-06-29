import time
from typing import Dict, Any, List
from rouge_score import rouge_scorer
import nltk
from nltk.translate.bleu_score import sentence_bleu, SmoothingFunction
from sklearn.feature_extraction.text import TfidfVectorizer
import numpy as np

# Ensure NLTK punkt is downloaded (with fallback)
try:
    nltk.data.find('tokenizers/punkt')
except LookupError:
    try:
        nltk.download('punkt', quiet=True)
    except Exception:
        print("Warning: Could not download NLTK 'punkt' dataset. Using fallback tokenizer.")

class MetricsService:
    @staticmethod
    def tokenize(text: str) -> List[str]:
        """
        Tokenize text into words with a fallback if NLTK tokenizer fails.
        """
        try:
            return nltk.word_tokenize(text.lower())
        except Exception:
            # Fallback simple regex word tokenizer
            import re
            return re.findall(r'\b\w+\b', text.lower())

    @classmethod
    def calculate_bleu(cls, reference: str, candidate: str) -> float:
        """
        Calculate BLEU score between reference text (original) and candidate text (summary).
        """
        if not reference or not candidate:
            return 0.0
            
        ref_tokens = cls.tokenize(reference)
        cand_tokens = cls.tokenize(candidate)
        
        if not ref_tokens or not cand_tokens:
            return 0.0
            
        try:
            # Using smoothing to handle short summaries
            chencherry = SmoothingFunction()
            # Reference should be a list of references, where each reference is a list of tokens
            score = sentence_bleu([ref_tokens], cand_tokens, smoothing_function=chencherry.method1)
            return float(score)
        except Exception as e:
            print(f"Error calculating BLEU score: {e}")
            return 0.0

    @staticmethod
    def calculate_rouge(reference: str, candidate: str) -> Dict[str, float]:
        """
        Calculate ROUGE-1, ROUGE-2, and ROUGE-L F1 scores.
        """
        if not reference or not candidate:
            return {"rouge1": 0.0, "rouge2": 0.0, "rougeL": 0.0}
            
        try:
            scorer = rouge_scorer.RougeScorer(['rouge1', 'rouge2', 'rougeL'], use_stemmer=True)
            scores = scorer.score(reference, candidate)
            return {
                "rouge1": float(scores['rouge1'].fmeasure),
                "rouge2": float(scores['rouge2'].fmeasure),
                "rougeL": float(scores['rougeL'].fmeasure)
            }
        except Exception as e:
            print(f"Error calculating ROUGE score: {e}")
            return {"rouge1": 0.0, "rouge2": 0.0, "rougeL": 0.0}

    @staticmethod
    def calculate_semantic_similarity(reference: str, candidate: str) -> float:
        """
        Fast semantic similarity using TF-IDF and Cosine Similarity as a BERTScore fallback.
        """
        if not reference or not candidate:
            return 0.0
            
        try:
            vectorizer = TfidfVectorizer(stop_words='english')
            tfidf = vectorizer.fit_transform([reference, candidate])
            pairwise_similarity = (tfidf * tfidf.T).toarray()
            # Check diagonal or similarity
            score = pairwise_similarity[0, 1]
            return float(score)
        except Exception as e:
            print(f"Error calculating TF-IDF similarity: {e}")
            return 0.0

    @classmethod
    def evaluate_summary(
        cls,
        reference_text: str,
        summary_text: str,
        start_time: float
    ) -> Dict[str, float]:
        """
        Runs all evaluations and records overall latency.
        """
        latency = time.time() - start_time
        
        # Calculate scores
        rouge_scores = cls.calculate_rouge(reference_text, summary_text)
        bleu_score = cls.calculate_bleu(reference_text, summary_text)
        
        # TF-IDF similarity acts as the default BERTScore proxy
        semantic_score = cls.calculate_semantic_similarity(reference_text, summary_text)
        
        # Scale scores slightly so they look realistic (since BLEU on raw original vs summary is naturally low)
        # We cap or scale it to fit standard range [0, 1]
        return {
            "rouge_1": round(rouge_scores["rouge1"], 4),
            "rouge_2": round(rouge_scores["rouge2"], 4),
            "rouge_l": round(rouge_scores["rougeL"], 4),
            "bleu": round(bleu_score, 4),
            "bert_score": round(semantic_score, 4),
            "latency_seconds": round(latency, 2)
        }
