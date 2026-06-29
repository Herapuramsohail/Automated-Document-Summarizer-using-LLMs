import os
import re
import numpy as np
from typing import List, Tuple
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import PromptTemplate
from app.config import settings

class SummarizerService:
    def __init__(self):
        self.is_mock = not settings.GEMINI_API_KEY or settings.GEMINI_API_KEY.startswith("MOCK_")
        if not self.is_mock:
            os.environ["GOOGLE_API_KEY"] = settings.GEMINI_API_KEY

    def generate_summary(
        self,
        text: str,
        summary_type: str = "abstractive",
        format_type: str = "short",
        target_length: int = 150
    ) -> str:
        """
        Generate a summary of the text based on type, format, and target length.
        """
        if not text or len(text.strip()) == 0:
            return "No text available to summarize."

        if summary_type == "extractive":
            return self._generate_extractive(text, format_type, target_length)
        else:
            return self._generate_abstractive(text, format_type, target_length)

    def _generate_extractive(self, text: str, format_type: str, target_length: int) -> str:
        """
        Pure extractive summarization using Sentence Centrality (TextRank variant).
        Uses simple sentence tokenization and TF-IDF overlap to select key sentences.
        """
        # Split text into sentences
        sentences = re.split(r'(?<!\w\.\w.)(?<![A-Z][a-z]\.)(?<=\.|\?)\s', text)
        sentences = [s.strip() for s in sentences if len(s.strip()) > 10]
        
        if not sentences:
            return text[:target_length * 6]  # Fallback

        # Compute TF-IDF matrix
        from sklearn.feature_extraction.text import TfidfVectorizer
        try:
            vectorizer = TfidfVectorizer(stop_words='english')
            tfidf_matrix = vectorizer.fit_transform(sentences)
            
            # Compute cosine similarity matrix
            similarity_matrix = (tfidf_matrix * tfidf_matrix.T).toarray()
            
            # Sentence scores (degree centrality)
            scores = similarity_matrix.sum(axis=1)
        except Exception:
            # Fallback if scikit-learn is not available or fails
            scores = np.array([len(s) for s in sentences])

        # Estimate number of sentences needed (assuming average 15 words per sentence)
        format_lower = format_type.lower()
        if format_lower == "short":
            # For short summary, 2-3 sentences max
            num_sentences = min(3, max(1, round(target_length / 15)))
        elif format_lower == "bullets":
            # For bullet points, 4-6 bullet points
            num_sentences = min(6, max(3, round(target_length / 15)))
        elif format_lower == "executive":
            # For executive summary, 3-5 sentences structured
            num_sentences = min(5, max(3, round(target_length / 15)))
        else:  # detailed
            # For detailed summary, more sentences
            num_sentences = min(8, max(4, round(target_length / 15)))

        num_sentences = min(num_sentences, len(sentences))

        # Get top sentences
        top_indices = np.argsort(scores)[-num_sentences:]
        
        # Sort indices chronologically to preserve document flow
        top_indices.sort()
        
        summary_sentences = [sentences[idx] for idx in top_indices]

        # Format output based on format_type
        if format_lower == "bullets":
            bullets = [f"• {s}" for s in summary_sentences]
            return "\n".join(bullets)
            
        elif format_lower == "executive":
            # Split summary_sentences into Background and Key Findings
            midpoint = max(1, len(summary_sentences) // 2)
            bg_sentences = summary_sentences[:midpoint]
            kf_sentences = summary_sentences[midpoint:]
            
            exec_summary = []
            exec_summary.append("**EXECUTIVE SUMMARY**")
            exec_summary.append(" ".join(bg_sentences))
            exec_summary.append("\n**KEY FINDINGS**")
            for s in kf_sentences:
                exec_summary.append(f"• {s}")
            return "\n".join(exec_summary)
            
        elif format_lower == "detailed":
            # Split sentences into 2 paragraphs
            midpoint = max(1, len(summary_sentences) // 2)
            para1 = " ".join(summary_sentences[:midpoint])
            para2 = " ".join(summary_sentences[midpoint:])
            return f"{para1}\n\n{para2}"
            
        else:  # short
            return " ".join(summary_sentences)

    def _generate_abstractive(self, text: str, format_type: str, target_length: int) -> str:
        """
        Abstractive summarization utilizing Google's Gemini API.
        Includes a map-reduce style logic for large documents.
        """
        if self.is_mock:
            return self._generate_mock_summary(text, format_type, target_length)

        try:
            llm = ChatGoogleGenerativeAI(
                model="gemini-2.5-flash",
                temperature=0.3,
                max_tokens=target_length * 2 + 100
            )

            # Determine prompt instruction based on format
            format_instructions = {
                "short": "Provide a concise summary of 1-3 sentences capturing the main takeaway.",
                "detailed": "Provide a detailed, comprehensive summary structured in 2-3 logical paragraphs covering background, core analysis, and outcomes.",
                "executive": "Provide an executive summary suitable for leadership. Break it down into sections: Executive Summary, Key Findings, and Strategic Recommendations.",
                "bullets": "Provide a bullet-pointed summary of the key points, highlighting the most important arguments or facts."
            }
            
            instruction = format_instructions.get(format_type.lower(), format_instructions["short"])

            # Map-Reduce for large documents
            max_char_len = 24000  # ~6000 tokens
            if len(text) > max_char_len:
                # Split text and summarize chunks first
                from langchain_text_splitters import RecursiveCharacterTextSplitter
                splitter = RecursiveCharacterTextSplitter(chunk_size=12000, chunk_overlap=1000)
                chunks = splitter.split_text(text)
                
                chunk_summaries = []
                for i, chunk in enumerate(chunks[:5]):  # Process up to 5 chunks to keep latency reasonable
                    chunk_prompt = f"Summarize the following section of a larger document. Capturing key technical details:\n\n{chunk}"
                    summary_resp = llm.invoke(chunk_prompt)
                    chunk_summaries.append(summary_resp.content)
                
                combined_text = "\n\n".join(chunk_summaries)
            else:
                combined_text = text

            # Final Summary Prompt
            prompt_template = PromptTemplate.from_template(
                "You are an expert abstractive summarizer. Your task is to summarize the text below.\n\n"
                "Constraints:\n"
                "1. Follow these layout instructions: {instruction}\n"
                "2. Maintain factual correctness. Do not extrapolate beyond the source text.\n"
                "3. Aim for approximately {target_length} words in length.\n\n"
                "Text:\n{text}\n\n"
                "Summary:"
            )
            
            chain = prompt_template | llm
            response = chain.invoke({
                "instruction": instruction,
                "target_length": target_length,
                "text": combined_text
            })
            
            return response.content.strip()

        except Exception as e:
            print(f"Error calling Gemini in SummarizerService: {e}")
            return self._generate_mock_summary(text, format_type, target_length) + f"\n\n(Note: Fallback summary generated due to error: {str(e)})"

    def _generate_mock_summary(self, text: str, format_type: str, target_length: int) -> str:
        """
        Generate a mock abstractive summary for testing.
        """
        words = text.split()
        sample_words = words[:min(len(words), target_length)]
        sample_text = " ".join(sample_words)
        
        if format_type == "bullets":
            bullets = [f"• Key point {i+1}: {phrase.strip()}." for i, phrase in enumerate(re.split(r'\.|\?|;', sample_text)[:5]) if len(phrase.strip()) > 5]
            return "[Mock Bullet Summary]\n" + "\n".join(bullets)
        elif format_type == "executive":
            return f"[Mock Executive Summary]\n\n**BACKGROUND & GOAL**\nSummarized source starting with: {sample_text[:150]}...\n\n**KEY FINDINGS**\n1. Automatically analyzed text content.\n2. Preserved factual relevance and token limit.\n\n**RECOMMENDATIONS**\nSet up full API keys to activate Gemini generative summarization."
        elif format_type == "detailed":
            return f"[Mock Detailed Summary]\n\nThis is a detailed mock analysis of the uploaded document. The document begins by discussing elements related to: '{sample_text[:200]}...'. It represents a structured overview designed for deep assessment.\n\nIn subsequent sections, the document references topics relevant to automated summarization systems, validating model latency and text segmentation methods. The findings are intended to assist in development and debugging."
        else:
            return f"[Mock Short Summary] This document discusses: '{sample_text[:150]}...'. It contains approximately {len(words)} words total."

summarizer_service = SummarizerService()
