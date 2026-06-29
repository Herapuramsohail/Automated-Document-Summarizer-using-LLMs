import os
import numpy as np
from typing import List, Dict, Any
from langchain_core.embeddings import Embeddings
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.messages import HumanMessage, SystemMessage
from app.config import settings


# A fallback lightweight embedding class for offline or mock mode
class LocalMockEmbeddings(Embeddings):
    def __init__(self, dimension: int = 768):
        self.dimension = dimension

    def _hash_text(self, text: str) -> List[float]:
        # A deterministic mock vector based on the string hash
        state = np.random.RandomState(abs(hash(text)) % (2**32))
        vec = state.randn(self.dimension)
        norm = np.linalg.norm(vec)
        if norm > 0:
            vec = vec / norm
        return vec.tolist()

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        return [self._hash_text(t) for t in texts]

    def embed_query(self, text: str) -> List[float]:
        return self._hash_text(text)


class QAService:
    def __init__(self):
        self.vector_db_dir = settings.VECTOR_DB_DIR

        # Configure Gemini Embeddings if API key is provided
        if settings.GEMINI_API_KEY and not settings.GEMINI_API_KEY.startswith("MOCK_"):
            os.environ["GOOGLE_API_KEY"] = settings.GEMINI_API_KEY
            try:
                self.embeddings = GoogleGenerativeAIEmbeddings(model="models/gemini-embedding-001")
                # Test connection
                self.embeddings.embed_query("test")
                self.is_mock = False
                print("Google GenAI Embeddings initialized successfully.")
            except Exception as e:
                print(f"Warning: Failed to initialize Google GenAI Embeddings: {e}. Falling back to Mock Embeddings.")
                self.embeddings = LocalMockEmbeddings()
                self.is_mock = True
        else:
            print("No Gemini API key found. Using Mock Embeddings.")
            self.embeddings = LocalMockEmbeddings()
            self.is_mock = True

    def _get_index_path(self, document_id: str) -> str:
        return os.path.join(self.vector_db_dir, f"doc_{document_id}")

    def index_document(self, document_id: str, chunks: List[str]) -> None:
        """
        Embed and index document chunks using FAISS.
        """
        if not chunks:
            return

        index_path = self._get_index_path(document_id)
        metadatas = [{"document_id": document_id, "chunk_index": i} for i in range(len(chunks))]

        db = FAISS.from_texts(
            texts=chunks,
            embedding=self.embeddings,
            metadatas=metadatas
        )
        db.save_local(index_path)
        print(f"Successfully indexed document {document_id} with {len(chunks)} chunks.")

    def delete_index(self, document_id: str) -> None:
        """
        Delete the local FAISS index for a document.
        """
        index_path = self._get_index_path(document_id)
        if os.path.exists(index_path):
            import shutil
            shutil.rmtree(index_path)
            print(f"Deleted index for document {document_id}")

    def query_document(
        self,
        document_id: str,
        question: str,
        chat_history: List[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """
        Perform RAG to answer user questions using the FAISS index and Gemini LLM.
        """
        index_path = self._get_index_path(document_id)
        if not os.path.exists(index_path):
            return {
                "answer": "I don't see any processed index for this document. Please re-upload the document.",
                "source_nodes": []
            }

        # Load FAISS index
        try:
            db = FAISS.load_local(index_path, self.embeddings, allow_dangerous_deserialization=True)
        except Exception as e:
            return {
                "answer": f"Error loading vector index: {str(e)}",
                "source_nodes": []
            }

        # Retrieve relevant chunks via similarity search
        retriever = db.as_retriever(search_kwargs={"k": 4})
        try:
            retrieved_docs = retriever.invoke(question)
        except Exception as e:
            return {
                "answer": f"Error retrieving context chunks: {str(e)}",
                "source_nodes": []
            }

        sources = [doc.page_content for doc in retrieved_docs]
        context = "\n---\n".join(sources)

        # Mock mode
        if self.is_mock:
            answer = (
                f"[Mock Q&A Mode] You asked: '{question}'.\n"
                f"Mock answer based on retrieved context:\n\n\"{sources[0][:300] if sources else 'No source found.'}\""
            )
            return {"answer": answer, "source_nodes": sources}

        # Direct LLM call (no chain dependency)
        try:
            llm = ChatGoogleGenerativeAI(
                model="gemini-2.5-flash",
                google_api_key=settings.GEMINI_API_KEY,
                temperature=0.2,
            )

            system_prompt = (
                "You are an expert assistant for question-answering over documents. "
                "Use only the provided context to answer the question. "
                "If the answer is not in the context, say you don't know. "
                "Be concise and accurate.\n\n"
                f"Context:\n{context}"
            )

            messages = [
                SystemMessage(content=system_prompt),
                HumanMessage(content=question)
            ]

            response = llm.invoke(messages)
            return {
                "answer": response.content.strip(),
                "source_nodes": sources
            }
        except Exception as e:
            return {
                "answer": f"Error querying LLM: {str(e)}",
                "source_nodes": sources
            }


qa_service = QAService()
