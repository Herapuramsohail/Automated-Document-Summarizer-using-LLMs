import React, { useState, useEffect } from 'react';
import { Box, Paper, Typography, Slider, Button, CircularProgress, Skeleton, IconButton, Tooltip } from '@mui/material';
import { Sparkles, Copy, FileDown, ThumbsUp, ThumbsDown, Clock, HelpCircle, Check } from 'lucide-react';
import axios from 'axios';

export default function SummaryDashboard({ selectedDoc, backendUrl, onNewSummaryGenerated }) {
  const [summaryType, setSummaryType] = useState('abstractive');
  const [format, setFormat] = useState('bullets');
  const [length, setLength] = useState(150);
  
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState(null);
  const [copied, setCopied] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  // Reset summary state when document changes
  useEffect(() => {
    setSummary(null);
    setFeedbackSubmitted(false);
    // Fetch latest summary if exists
    if (selectedDoc) {
      fetchLatestSummary();
    }
  }, [selectedDoc]);

  const fetchLatestSummary = async () => {
    try {
      const response = await axios.get(`${backendUrl}/api/v1/summaries/document/${selectedDoc.id}`);
      if (response.data && response.data.length > 0) {
        setSummary(response.data[0]); // Load the newest summary
      }
    } catch (e) {
      console.error("Could not fetch summaries: ", e);
    }
  };

  const handleGenerate = async () => {
    setLoading(true);
    setSummary(null);
    setFeedbackSubmitted(false);
    
    try {
      const response = await axios.post(`${backendUrl}/api/v1/summaries/generate`, {
        document_id: selectedDoc.id,
        summary_type: summaryType,
        format: format,
        target_length: length
      });
      setSummary(response.data);
      if (onNewSummaryGenerated) {
        onNewSummaryGenerated(response.data);
      }
    } catch (e) {
      console.error(e);
      // Fallback display
      setSummary({
        content: "Error: Failed to communicate with the summarization engine. Please make sure your backend server and Gemini API keys are configured correctly.",
        summary_type: summaryType,
        format: format,
        target_length: length,
        metrics: { latency_seconds: 0 }
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (summary?.content) {
      navigator.clipboard.writeText(summary.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    if (summary?.id) {
      window.open(`${backendUrl}/api/v1/summaries/${summary.id}/download`, '_blank');
    }
  };

  const handleFeedback = async (rating) => {
    if (feedbackSubmitted) return;
    try {
      await axios.post(`${backendUrl}/api/v1/summaries/${summary.id}/feedback`, {
        rating: rating,
        comment: `User marked feedback as ${rating === 1 ? 'Thumbs Up' : 'Thumbs Down'}`
      });
      setFeedbackSubmitted(true);
    } catch (e) {
      console.error("Could not submit feedback: ", e);
    }
  };

  return (
    <Box className="h-full flex p-6 gap-6 overflow-hidden bg-[#000000]">
      {/* Parameter Controls Panel */}
      <Paper className="w-80 flex-shrink-0 p-6 flex flex-col justify-between rounded-2xl border border-slate-800/80 shadow-2xl bg-[#000000]/80 glass-panel overflow-y-auto">
        <div className="space-y-6">
          <Typography className="font-extrabold text-slate-100 border-b border-slate-800/60 pb-3" style={{ fontSize: '0.95rem' }}>
            Summarization Setup
          </Typography>

          {/* Summarization Engine Type */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Typography className="text-3xs font-extrabold text-slate-500 uppercase tracking-wider">
                Summarizer Engine
              </Typography>
              <Tooltip title="Abstractive generates natural, paraphrased text. Extractive pulls key verbatim sentences from the source document.">
                <HelpCircle size={13} className="text-slate-500 cursor-pointer hover:text-slate-300" />
              </Tooltip>
            </div>
            
            <div className="flex bg-[#000000]/80 p-1 rounded-xl border border-slate-800/80">
              <button 
                onClick={() => setSummaryType('abstractive')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all duration-200 active:scale-95 ${
                  summaryType === 'abstractive' 
                    ? 'gradient-bg-accent text-white shadow-md shadow-indigo-500/10' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Abstractive
              </button>
              <button 
                onClick={() => setSummaryType('extractive')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all duration-200 active:scale-95 ${
                  summaryType === 'extractive' 
                    ? 'gradient-bg-accent text-white shadow-md shadow-indigo-500/10' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Extractive
              </button>
            </div>
          </div>

          {/* Format Layout Selection */}
          <div className="space-y-2">
            <Typography className="text-3xs font-extrabold text-slate-500 uppercase tracking-wider">
              Output Format Layout
            </Typography>
            <div className="flex flex-col gap-1.5">
              {[
                { value: 'bullets', label: 'Bullet-Point List' },
                { value: 'short', label: 'Short Paragraph' },
                { value: 'detailed', label: 'Detailed Summary' },
                { value: 'executive', label: 'Executive Summary' }
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setFormat(opt.value)}
                  className={`w-full rounded-xl text-left px-4 py-3 text-xs font-bold transition-all duration-200 border active:scale-[0.99] ${
                    format === opt.value
                      ? 'border-indigo-500/40 bg-indigo-500/10 text-indigo-400'
                      : 'border-slate-800 bg-[#000000]/30 text-slate-400 hover:text-slate-200 hover:bg-[#0a0a0a]/50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Word Length Slider */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Typography className="text-3xs font-extrabold text-slate-500 uppercase tracking-wider">
                Target Length
              </Typography>
              <span className="text-2xs bg-indigo-500/10 text-indigo-400 border border-indigo-500/25 px-2 py-0.5 rounded font-extrabold">
                {length} words
              </span>
            </div>
            <Slider
              value={length}
              onChange={(e, val) => setLength(val)}
              min={50}
              max={500}
              step={25}
              classes={{
                rail: 'bg-slate-800',
                track: 'bg-indigo-500 border-none',
                thumb: 'bg-indigo-400 border-2 border-indigo-500 shadow-md shadow-indigo-500/30'
              }}
            />
            <div className="flex justify-between text-4xs text-slate-500 font-bold uppercase tracking-wider">
              <span>Short (50)</span>
              <span>Long (500)</span>
            </div>
          </div>
        </div>

        <Button
          variant="contained"
          disabled={loading || !selectedDoc}
          onClick={handleGenerate}
          className={`w-full mt-8 text-white font-bold tracking-tight capitalize py-3 rounded-xl flex gap-2 items-center justify-center shadow-lg transition-all duration-200 ${
            loading 
              ? 'bg-slate-800 text-slate-500' 
              : 'gradient-bg-accent hover:gradient-bg-hover shadow-indigo-600/20 active:scale-[0.97]'
          }`}
        >
          {loading ? (
            <CircularProgress size={18} className="text-indigo-400" />
          ) : (
            <>
              <Sparkles size={14} /> Generate Summary
            </>
          )}
        </Button>
      </Paper>

      {/* Summary View Panel */}
      <Paper className="flex-1 p-8 flex flex-col justify-between rounded-2xl border border-slate-800/80 shadow-2xl bg-[#000000]/60 glass-panel overflow-hidden">
        {/* Header Actions */}
        <Box className="flex justify-between items-center border-b border-slate-800/60 pb-4 flex-shrink-0">
          <Typography className="font-extrabold text-slate-100 font-sans" style={{ fontSize: '0.95rem' }}>
            Summary Content
          </Typography>
          {summary && !loading && (
            <div className="flex items-center gap-1.5">
              <Tooltip title={copied ? "Copied!" : "Copy Summary"}>
                <IconButton size="small" onClick={handleCopy} className="text-slate-400 hover:text-slate-100 bg-[#000000]/50 border border-slate-800/80 hover:border-slate-700 rounded-lg p-2 transition-all">
                  {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                </IconButton>
              </Tooltip>
              <Tooltip title="Download PDF Report">
                <IconButton size="small" onClick={handleDownload} className="text-slate-400 hover:text-slate-100 bg-[#000000]/50 border border-slate-800/80 hover:border-slate-700 rounded-lg p-2 transition-all">
                  <FileDown size={14} />
                </IconButton>
              </Tooltip>
            </div>
          )}
        </Box>

        {/* Core Content Area */}
        <Box className="flex-1 overflow-y-auto py-6 pr-2">
          {loading ? (
            <div className="space-y-4">
              <Skeleton variant="text" width="40%" height={24} className="bg-slate-800/50" />
              <Skeleton variant="rectangular" width="100%" height={120} className="rounded-xl bg-slate-800/50" />
              <Skeleton variant="text" width="95%" className="bg-slate-800/50" />
              <Skeleton variant="text" width="98%" className="bg-slate-800/50" />
              <Skeleton variant="text" width="85%" className="bg-slate-800/50" />
            </div>
          ) : summary ? (
            <div className="text-slate-300 leading-relaxed font-sans space-y-4">
              {summary.content.split('\n').map((line, idx) => {
                const trimmed = line.trim();
                if (!trimmed) return <div key={idx} className="h-2" />;
                
                // Format Bullet Lists
                if (trimmed.startsWith('•') || trimmed.startsWith('-') || trimmed.startsWith('*')) {
                  const content = trimmed.replace(/^[•\-\*]\s*/, '');
                  return (
                    <div key={idx} className="flex gap-2 pl-4 text-sm md:text-[0.95rem] font-medium tracking-wide">
                      <span className="text-indigo-400 select-none">•</span>
                      <span>{content}</span>
                    </div>
                  );
                }

                // Format Headings
                if (trimmed.startsWith('###')) {
                  return (
                    <Typography key={idx} variant="h6" className="font-extrabold text-slate-100 mt-6 mb-3 font-sans tracking-tight">
                      {trimmed.replace(/^###\s*/, '')}
                    </Typography>
                  );
                }
                if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
                  return (
                    <Typography key={idx} className="font-bold text-slate-100 mt-5 mb-2 font-sans tracking-tight text-sm">
                      {trimmed.replace(/\*\*/g, '')}
                    </Typography>
                  );
                }

                return <Typography key={idx} className="text-sm md:text-[0.95rem] font-medium tracking-wide leading-relaxed">{trimmed}</Typography>;
              })}
            </div>
          ) : (
            <Box className="h-full flex flex-col items-center justify-center text-center p-8 bg-[#000000]/20 border border-dashed border-slate-800/80 rounded-2xl">
              <Sparkles size={32} className="text-indigo-400/90 mb-3 shadow-inner" />
              <Typography className="text-sm font-bold text-slate-200 mb-1 font-sans">
                Generate your first summary
              </Typography>
              <Typography className="text-xs text-slate-500 max-w-sm font-medium leading-relaxed">
                Select your parameters on the left and click Generate to see the summarizing capability of Gemini LLM.
              </Typography>
            </Box>
          )}
        </Box>

        {/* Footer Metrics / Ratings */}
        {summary && !loading && (
          <Box className="border-t border-slate-800/60 pt-4 flex items-center justify-between flex-shrink-0">
            {summary.metrics ? (
              <div className="flex items-center gap-1.5 text-slate-400 text-xs font-semibold">
                <Clock size={13} className="text-indigo-400" />
                <span>Latency: <strong className="text-slate-200">{summary.metrics.latency_seconds}s</strong></span>
              </div>
            ) : (
              <div />
            )}

            {/* Ratings */}
            <div className="flex items-center gap-3">
              <Typography className="text-xs text-slate-400 font-semibold font-sans">
                Was this summary useful?
              </Typography>
              <div className="flex items-center gap-1">
                <IconButton
                  size="small"
                  onClick={() => handleFeedback(1)}
                  disabled={feedbackSubmitted}
                  className={`border border-slate-800 rounded-lg p-1.5 transition-colors ${
                    feedbackSubmitted 
                      ? 'bg-slate-800/20 text-slate-600 border-slate-900' 
                      : 'bg-[#000000]/30 text-slate-400 hover:bg-emerald-500/10 hover:text-emerald-400 hover:border-emerald-500/20 border-slate-800'
                  }`}
                >
                  <ThumbsUp size={13} />
                </IconButton>
                <IconButton
                  size="small"
                  onClick={() => handleFeedback(-1)}
                  disabled={feedbackSubmitted}
                  className={`border border-slate-800 rounded-lg p-1.5 transition-colors ${
                    feedbackSubmitted 
                      ? 'bg-slate-800/20 text-slate-600 border-slate-900' 
                      : 'bg-[#000000]/30 text-slate-400 hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/20 border-slate-800'
                  }`}
                >
                  <ThumbsDown size={13} />
                </IconButton>
              </div>
              {feedbackSubmitted && (
                <span className="text-xs font-bold text-emerald-400 animate-fade-in">Feedback recorded!</span>
              )}
            </div>
          </Box>
        )}
      </Paper>
    </Box>
  );
}
