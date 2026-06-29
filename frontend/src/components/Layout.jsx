import React from 'react';
import { Box, Typography, IconButton, Badge, Tooltip } from '@mui/material';
import { FileText, MessageSquare, BarChart3, UploadCloud, Trash2, ShieldAlert } from 'lucide-react';

export default function Layout({
  children,
  documents,
  selectedDoc,
  onSelectDoc,
  onDeleteDoc,
  onOpenUpload,
  activeTab,
  onChangeTab
}) {
  return (
    <Box className="flex h-screen w-screen overflow-hidden bg-[#000000] font-sans text-slate-100">
      {/* Sidebar */}
      <Box className="w-80 flex-shrink-0 bg-[#000000] border-r border-slate-900 flex flex-col justify-between shadow-2xl relative z-10">
        
        {/* Sidebar Header */}
        <Box className="p-6 border-b border-slate-800/60 flex items-center justify-between">
          <Box className="flex items-center gap-2.5">
            <Box className="w-8 h-8 rounded-lg gradient-bg-accent flex items-center justify-center font-extrabold text-base text-white shadow-lg shadow-indigo-500/20">
              S
            </Box>
            <Typography variant="h6" className="font-extrabold tracking-tight text-slate-100" style={{ fontSize: '1.1rem' }}>
              SummAI
            </Typography>
          </Box>
          <Tooltip title="Secure Workspace">
            <ShieldAlert size={15} className="text-emerald-500" />
          </Tooltip>
        </Box>

        {/* Document List */}
        <Box className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
          <Box className="flex items-center justify-between mb-4 px-2">
            <Typography className="text-3xs font-extrabold uppercase tracking-wider text-slate-500">
              Documents ({documents.length})
            </Typography>
            <button
              onClick={onOpenUpload}
              className="p-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-indigo-400 hover:text-indigo-300 transition-all border border-slate-800 hover:border-slate-700 active:scale-95"
            >
              <UploadCloud size={14} />
            </button>
          </Box>

          {documents.length === 0 ? (
            <Box className="text-center py-8 px-4 rounded-xl border border-dashed border-slate-800 bg-[#000000]/30">
              <Typography className="text-xs text-slate-500 mb-2 font-medium">No documents uploaded yet</Typography>
              <button
                onClick={onOpenUpload}
                className="text-xs text-indigo-400 font-semibold hover:underline"
              >
                Upload one now
              </button>
            </Box>
          ) : (
            documents.map((doc) => {
              const isSelected = selectedDoc && selectedDoc.id === doc.id;
              return (
                <Box
                  key={doc.id}
                  onClick={() => onSelectDoc(doc)}
                  className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all duration-200 active:scale-[0.99] border ${
                    isSelected
                      ? 'gradient-bg-accent text-white border-indigo-500/20 shadow-lg shadow-indigo-500/10'
                      : 'bg-[#0a0a0a]/40 hover:bg-[#0a0a0a]/90 text-slate-300 hover:text-slate-100 border-slate-800/30 hover:border-slate-800'
                  }`}
                >
                  <Box className="flex items-center gap-3 overflow-hidden pr-2">
                    <FileText size={16} className={isSelected ? 'text-white' : 'text-indigo-400'} />
                    <Box className="truncate">
                      <Typography className="text-sm font-semibold truncate block tracking-tight">
                        {doc.filename}
                      </Typography>
                      <Typography className={`text-3xs block font-medium mt-0.5 ${isSelected ? 'text-indigo-200' : 'text-slate-500'}`}>
                        {(doc.file_size / 1024).toFixed(1)} KB • {doc.file_type.toUpperCase()}
                      </Typography>
                    </Box>
                  </Box>
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteDoc(doc.id);
                    }}
                    className={`rounded-md p-1 ${
                      isSelected ? 'text-indigo-200 hover:text-white hover:bg-white/10' : 'text-slate-600 hover:text-rose-400 hover:bg-slate-800/60'
                    }`}
                  >
                    <Trash2 size={13} />
                  </IconButton>
                </Box>
              );
            })
          )}
        </Box>

        {/* Sidebar Footer */}
        <Box className="p-4 bg-[#000000] border-t border-slate-900">
          <Box className="flex items-center gap-3">
            <Box className="w-8.5 h-8.5 rounded-lg bg-slate-800/60 border border-slate-700/50 flex items-center justify-center text-3xs font-extrabold text-slate-400">
              API
            </Box>
            <Box>
              <Typography className="text-3xs font-extrabold uppercase tracking-wider text-slate-400">Gemini LLM Engine</Typography>
              <span className="inline-flex items-center gap-1.5 mt-0.5 py-0.5 px-2 rounded-full text-4xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 pulse-indicator" />
                Active
              </span>
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Main Workspace */}
      <Box className="flex-1 flex flex-col overflow-hidden">
        {/* Main Header */}
        <Box className="h-16 px-8 border-b border-slate-900 bg-[#000000]/75 backdrop-blur-xl flex items-center justify-between flex-shrink-0 relative z-10">
          <Box className="flex items-center gap-3">
            <Typography variant="h6" className="text-slate-200 font-extrabold tracking-tight" style={{ fontSize: '0.95rem' }}>
              {selectedDoc ? selectedDoc.filename : "Select a Document"}
            </Typography>
            {selectedDoc && (
              <Badge color="primary" variant="dot" className="text-slate-500">
                <span className="text-4xs bg-[#0a0a0a] px-2 py-0.5 rounded-md font-bold text-indigo-400 border border-slate-800">
                  {selectedDoc.file_type.toUpperCase()}
                </span>
              </Badge>
            )}
          </Box>

          {/* Sleek Custom Navigation Tabs */}
          {selectedDoc && (
            <Box className="flex items-center gap-1 bg-[#050505]/60 border border-slate-800/80 p-1.5 rounded-xl">
              {[
                { id: 'summarizer', icon: FileText, label: 'Summarizer' },
                { id: 'qa', icon: MessageSquare, label: 'Document Q&A' },
                { id: 'metrics', icon: BarChart3, label: 'Metrics' }
              ].map((tab) => {
                const isActive = activeTab === tab.id;
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={(e) => onChangeTab(e, tab.id)}
                    className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold tracking-tight transition-all duration-200 active:scale-95 ${
                      isActive
                        ? 'gradient-bg-accent text-white shadow-md shadow-indigo-500/10'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-[#0a0a0a]/40'
                    }`}
                  >
                    <Icon size={14} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </Box>
          )}
        </Box>

        {/* Content Container */}
        <Box className="flex-1 overflow-hidden relative">
          {children}
        </Box>
      </Box>
    </Box>
  );
}
