import React, { useState } from 'react';
import { Dialog, DialogContent, DialogTitle, Box, Typography, Button, LinearProgress, IconButton } from '@mui/material';
import { UploadCloud, CheckCircle2, AlertCircle, X } from 'lucide-react';
import axios from 'axios';

export default function DocumentUpload({ open, onClose, onUploadSuccess, backendUrl }) {
  const [dragActive, setDragActive] = useState(false);
  const [status, setStatus] = useState('idle'); // idle, uploading, success, error
  const [errorMessage, setErrorMessage] = useState('');
  const [progress, setProgress] = useState(0);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const processFile = async (file) => {
    // Validate file type
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['pdf', 'docx', 'txt'].includes(ext)) {
      setStatus('error');
      setErrorMessage('Unsupported file format. Please upload PDF, DOCX or TXT files.');
      return;
    }

    setStatus('uploading');
    setProgress(10);
    setErrorMessage('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post(`${backendUrl}/api/v1/documents/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 90) / progressEvent.total);
          setProgress(10 + percentCompleted);
        }
      });
      setProgress(100);
      setStatus('success');
      setTimeout(() => {
        onUploadSuccess(response.data);
        handleClose();
      }, 1000);
    } catch (error) {
      console.error(error);
      setStatus('error');
      const errorDetail = error.response?.data?.detail || 'An error occurred during file upload. Please try again.';
      setErrorMessage(errorDetail);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleClose = () => {
    setStatus('idle');
    setProgress(0);
    setErrorMessage('');
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        className: "rounded-2xl border border-slate-800 shadow-[0_0_50px_rgba(0,0,0,0.6)] overflow-hidden bg-[#0a0a0a]"
      }}
    >
      <DialogTitle className="flex justify-between items-center bg-[#000000] border-b border-slate-800/80 px-6 py-4 flex-shrink-0">
        <Typography className="font-extrabold text-slate-100 font-sans" style={{ fontSize: '1.05rem' }}>
          Upload Source Document
        </Typography>
        <IconButton size="small" onClick={handleClose} className="text-slate-500 hover:text-slate-300">
          <X size={16} />
        </IconButton>
      </DialogTitle>
      
      <DialogContent className="p-8 bg-[#0a0a0a]">
        <input
          id="file-upload-input"
          type="file"
          accept=".pdf,.docx,.txt"
          className="hidden"
          onChange={handleFileInput}
          disabled={status === 'uploading'}
        />

        {status === 'idle' && (
          <label
            htmlFor="file-upload-input"
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            className={`flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-10 cursor-pointer transition-all duration-200 ${
              dragActive
                ? 'border-indigo-500 bg-indigo-500/10 scale-[0.99]'
                : 'border-slate-800 hover:border-indigo-500/50 hover:bg-indigo-500/5 bg-[#000000]/30'
            }`}
          >
            <Box className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-4 text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.1)]">
              <UploadCloud size={26} />
            </Box>
            <Typography className="text-sm font-bold text-slate-200 mb-1 font-sans">
              Drag & Drop file here, or browse
            </Typography>
            <Typography className="text-xs text-slate-500 mb-5 font-medium">
              Supports PDF, DOCX, and TXT (Max 50MB)
            </Typography>
            <Button
              variant="outlined"
              size="small"
              className="border-slate-800 text-slate-300 hover:text-slate-100 hover:border-slate-700 bg-[#000000]/40 hover:bg-[#0a0a0a] font-bold capitalize"
              style={{ pointerEvents: 'none' }} // Let label handle click
            >
              Browse Files
            </Button>
          </label>
        )}

        {status === 'uploading' && (
          <Box className="text-center py-6">
            <Box className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-4 mx-auto text-indigo-400 pulse-indicator">
              <UploadCloud size={26} />
            </Box>
            <Typography className="text-sm font-bold text-slate-200 mb-1 font-sans">
              Extracting Text & Indexing...
            </Typography>
            <Typography className="text-xs text-slate-500 mb-6 font-medium">
              Structuring contents for summarization and semantic Q&A.
            </Typography>
            <Box className="w-full max-w-xs mx-auto">
              <LinearProgress 
                variant="determinate" 
                value={progress} 
                className="rounded-full h-1.5 bg-slate-800" 
                classes={{ bar: 'gradient-bg-accent' }} 
              />
              <Typography className="text-3xs text-right text-indigo-400 mt-2 font-extrabold">{progress}%</Typography>
            </Box>
          </Box>
        )}

        {status === 'success' && (
          <Box className="text-center py-6">
            <Box className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4 mx-auto text-emerald-400 animate-bounce">
              <CheckCircle2 size={26} />
            </Box>
            <Typography className="text-sm font-bold text-slate-100 mb-1 font-sans">
              Document Processed Successfully!
            </Typography>
            <Typography className="text-xs text-slate-500 font-medium">
              Initializing summarization console...
            </Typography>
          </Box>
        )}

        {status === 'error' && (
          <Box className="text-center py-6">
            <Box className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mb-4 mx-auto text-rose-400">
              <AlertCircle size={26} />
            </Box>
            <Typography className="text-sm font-bold text-slate-200 mb-1 font-sans">
              Processing Failed
            </Typography>
            <Typography className="text-xs text-rose-400 max-w-xs mx-auto mb-6 font-medium leading-relaxed">
              {errorMessage}
            </Typography>
            <Button
              variant="contained"
              size="small"
              onClick={() => setStatus('idle')}
              className="bg-[#1e293b] hover:bg-[#334155] text-slate-200 font-bold capitalize py-2 px-5 rounded-lg"
            >
              Try Again
            </Button>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}
