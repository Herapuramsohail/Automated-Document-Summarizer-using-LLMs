import React, { useState, useEffect, useRef } from 'react';
import { Box, Paper, TextField, IconButton, Typography, CircularProgress, Tooltip } from '@mui/material';
import { Send, Bot, User, CornerDownLeft, Sparkles, MessageSquare } from 'lucide-react';
import axios from 'axios';

export default function QAInterface({ selectedDoc, backendUrl }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    setMessages([]);
    if (selectedDoc) {
      fetchChatHistory();
    }
  }, [selectedDoc]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const fetchChatHistory = async () => {
    try {
      const response = await axios.get(`${backendUrl}/api/v1/qa/document/${selectedDoc.id}/chat-history`);
      setMessages(response.data);
    } catch (e) {
      console.error("Could not fetch chat history: ", e);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userText = input.trim();
    setInput('');
    setLoading(true);

    // Optimistically add user message to list
    setMessages(prev => [...prev, { id: 'temp-user', role: 'user', content: userText, created_at: new Date() }]);

    try {
      const response = await axios.post(`${backendUrl}/api/v1/qa/document/${selectedDoc.id}/query`, {
        content: userText
      });
      
      // Replace optimistic messages with actual saved DB messages by refetching or appending
      setMessages(prev => {
        // Filter out temp user msg and append true user + assistant msgs from server
        const filtered = prev.filter(m => m.id !== 'temp-user');
        return [...filtered, { id: 'user-' + Date.now(), role: 'user', content: userText, created_at: new Date() }, response.data];
      });
    } catch (error) {
      console.error(error);
      setMessages(prev => [
        ...prev,
        {
          id: 'error-' + Date.now(),
          role: 'assistant',
          content: "Sorry, I had trouble connecting to the QA engine. Please verify the backend is running and your API keys are valid.",
          created_at: new Date()
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box className="h-full flex p-6 gap-6 overflow-hidden bg-[#000000]">
      {/* Instructions Side panel */}
      <Paper className="w-80 flex-shrink-0 p-6 flex flex-col justify-between rounded-2xl border border-slate-800/80 shadow-2xl bg-[#000000]/80 glass-panel overflow-y-auto">
        <div className="space-y-4">
          <Typography className="font-extrabold text-slate-100 border-b border-slate-800/60 pb-3" style={{ fontSize: '0.95rem' }}>
            Document RAG Q&A
          </Typography>
          <Typography className="text-xs text-slate-400 leading-relaxed font-medium">
            This module uses **Retrieval-Augmented Generation (RAG)** to query the document content. 
          </Typography>
          <div className="space-y-3 pt-2">
            <div className="flex gap-2.5 items-start">
              <span className="w-5 h-5 rounded bg-indigo-500/10 border border-indigo-500/25 text-indigo-400 flex items-center justify-center font-bold text-2xs select-none">1</span>
              <Typography className="text-3xs text-slate-400 font-bold leading-normal">
                The document is divided into overlapping semantic text chunks.
              </Typography>
            </div>
            <div className="flex gap-2.5 items-start">
              <span className="w-5 h-5 rounded bg-indigo-500/10 border border-indigo-500/25 text-indigo-400 flex items-center justify-center font-bold text-2xs select-none">2</span>
              <Typography className="text-3xs text-slate-400 font-bold leading-normal">
                Your question is vectorized and matched against chunks in FAISS using cosine similarity.
              </Typography>
            </div>
            <div className="flex gap-2.5 items-start">
              <span className="w-5 h-5 rounded bg-indigo-500/10 border border-indigo-500/25 text-indigo-400 flex items-center justify-center font-bold text-2xs select-none">3</span>
              <Typography className="text-3xs text-slate-400 font-bold leading-normal">
                The most relevant context chunks are fed to Gemini to formulate a precise answer grounded in your document.
              </Typography>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/10 flex gap-3 items-center">
          <Sparkles size={16} className="text-indigo-450 flex-shrink-0" />
          <Typography className="text-3xs text-indigo-300 leading-normal font-bold">
            Ask details about formulas, conclusions, tables, or specific dates in the file.
          </Typography>
        </div>
      </Paper>

      {/* Chat Window Panel */}
      <Paper className="flex-1 flex flex-col justify-between rounded-2xl border border-slate-800/80 shadow-2xl bg-[#000000]/60 glass-panel overflow-hidden">
        {/* Chat History */}
        <Box className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 && !loading ? (
            <Box className="h-full flex flex-col items-center justify-center text-center p-8 bg-[#000000]/20 border border-dashed border-slate-800/80 rounded-2xl">
              <MessageSquare size={32} className="text-indigo-400/90 mb-3" />
              <Typography className="text-sm font-bold text-slate-200 mb-1 font-sans">
                Start a conversation
              </Typography>
              <Typography className="text-xs text-slate-500 max-w-sm font-medium leading-relaxed">
                Ask a question about the document content (e.g. "What are the key conclusions?" or "Summarize section 3").
              </Typography>
            </Box>
          ) : (
            messages.map((msg, index) => {
              const isUser = msg.role === 'user';
              return (
                <Box
                  key={msg.id || index}
                  className={`flex gap-3 max-w-[85%] ${isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
                >
                  <Box
                    className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border ${
                      isUser 
                        ? 'gradient-bg-accent text-white border-indigo-500/10 shadow-md shadow-indigo-500/10' 
                        : 'bg-[#0a0a0a] text-slate-400 border-slate-800/80'
                    }`}
                  >
                    {isUser ? <User size={13} /> : <Bot size={13} />}
                  </Box>
                  <Box
                    className={`p-4 rounded-2xl border ${
                      isUser
                        ? 'gradient-bg-accent text-white border-indigo-500/10 shadow-lg'
                        : 'bg-[#0a0a0a]/60 text-slate-200 border-slate-800/70 shadow-sm'
                    }`}
                  >
                    <Typography className="text-sm leading-relaxed whitespace-pre-wrap font-medium tracking-wide">{msg.content}</Typography>
                  </Box>
                </Box>
              );
            })
          )}
          {loading && (
            <Box className="flex gap-3 max-w-[85%] mr-auto">
              <Box className="w-8 h-8 rounded-full bg-[#0a0a0a] text-slate-400 border border-slate-800/80 flex items-center justify-center">
                <Bot size={13} />
              </Box>
              <Box className="p-4 rounded-2xl bg-[#0a0a0a]/60 border border-slate-800/70 shadow-sm flex items-center gap-2.5">
                <CircularProgress size={12} className="text-indigo-400" />
                <Typography className="text-xs text-slate-400 font-bold italic">Assistant is drafting response...</Typography>
              </Box>
            </Box>
          )}
          <div ref={messagesEndRef} />
        </Box>

        {/* Input Bar */}
        <Box className="p-4 border-t border-slate-800/50 bg-[#000000]/30 flex-shrink-0">
          <form onSubmit={handleSend} className="flex gap-3 items-center">
            <TextField
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question about the document..."
              variant="outlined"
              fullWidth
              size="small"
              disabled={loading || !selectedDoc}
              InputProps={{
                className: "bg-[#000000]/40 text-slate-100 rounded-xl border border-slate-800 hover:border-slate-700/80 transition-all font-medium text-sm focus-within:border-indigo-500/30",
                endAdornment: (
                  <span className="text-4xs text-slate-500 font-bold hidden md:flex items-center gap-0.5 border border-slate-800 rounded px-1.5 py-0.5 bg-[#0a0a0a]">
                    Enter <CornerDownLeft size={8} />
                  </span>
                )
              }}
            />
            <IconButton
              type="submit"
              disabled={!input.trim() || loading || !selectedDoc}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-xl p-2.5 transition-all shadow-md shadow-indigo-600/10 active:scale-95"
            >
              <Send size={15} />
            </IconButton>
          </form>
        </Box>
      </Paper>
    </Box>
  );
}
