import os
from typing import List
from pypdf import PdfReader
import docx
from langchain_text_splitters import RecursiveCharacterTextSplitter

class DocumentProcessor:
    @staticmethod
    def extract_text(file_path: str, file_type: str) -> str:
        """
        Extract text from PDF, DOCX, or TXT files.
        """
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found at {file_path}")
            
        file_type = file_type.lower()
        text = ""
        
        if file_type == "pdf":
            reader = PdfReader(file_path)
            pages_text = []
            for page in reader.pages:
                page_content = page.extract_text()
                if page_content:
                    pages_text.append(page_content)
            text = "\n".join(pages_text)
            
        elif file_type in ["docx", "doc"]:
            doc = docx.Document(file_path)
            paragraphs = [p.text for p in doc.paragraphs]
            text = "\n".join(paragraphs)
            
        elif file_type == "txt":
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                text = f.read()
                
        else:
            raise ValueError(f"Unsupported file type: {file_type}")
            
        # Clean extracted text: normalize white space
        cleaned_text = "\n".join([line.strip() for line in text.splitlines() if line.strip()])
        return cleaned_text

    @staticmethod
    def chunk_text(text: str, chunk_size: int = 1000, chunk_overlap: int = 200) -> List[str]:
        """
        Split raw text into semantic chunks for vector database indexing.
        """
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            length_function=len,
            separators=["\n\n", "\n", " ", ""]
        )
        return text_splitter.split_text(text)
