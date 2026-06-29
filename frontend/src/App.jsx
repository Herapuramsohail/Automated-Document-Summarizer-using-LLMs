import React, { useState, useEffect } from 'react';
import { ThemeProvider, Box, Typography } from '@mui/material';
import theme from './theme';
import Layout from './components/Layout';
import DocumentUpload from './components/DocumentUpload';
import SummaryDashboard from './components/SummaryDashboard';
import QAInterface from './components/QAInterface';
import MetricsAnalytics from './components/MetricsAnalytics';
import { FileText, UploadCloud } from 'lucide-react';
import axios from 'axios';

// During local dev, Vite proxies /api requests to http://localhost:8000 or http://backend:8000.
// In docker/production, we serve backend and frontend on standard host configurations.
const backendUrl = ""; 

export default function App() {
  const [documents, setDocuments] = useState([]);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [activeTab, setActiveTab] = useState('summarizer');
  
  const [uploadOpen, setUploadOpen] = useState(false);
  const [activeSummary, setActiveSummary] = useState(null);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const response = await axios.get(`${backendUrl}/api/v1/documents/`);
      setDocuments(response.data);
      if (response.data.length > 0 && !selectedDoc) {
        setSelectedDoc(response.data[0]);
      }
    } catch (e) {
      console.error("Could not fetch documents: ", e);
    }
  };

  const handleDeleteDocument = async (docId) => {
    if (!window.confirm("Are you sure you want to delete this document and all its summaries/chats?")) return;
    try {
      await axios.delete(`${backendUrl}/api/v1/documents/${docId}`);
      if (selectedDoc && selectedDoc.id === docId) {
        setSelectedDoc(null);
      }
      fetchDocuments();
    } catch (e) {
      console.error("Could not delete document: ", e);
    }
  };

  const handleUploadSuccess = (newDoc) => {
    fetchDocuments();
    setSelectedDoc(newDoc);
    setActiveTab('summarizer');
  };

  return (
    <ThemeProvider theme={theme}>
      <Layout
        documents={documents}
        selectedDoc={selectedDoc}
        onSelectDoc={(doc) => {
          setSelectedDoc(doc);
          setActiveSummary(null); // Reset active summary when document selection shifts
        }}
        onDeleteDoc={handleDeleteDocument}
        onOpenUpload={() => setUploadOpen(true)}
        activeTab={activeTab}
        onChangeTab={(e, val) => val && setActiveTab(val)}
      >
        {selectedDoc ? (
          <>
            {activeTab === 'summarizer' && (
              <SummaryDashboard
                selectedDoc={selectedDoc}
                backendUrl={backendUrl}
                onNewSummaryGenerated={(summary) => setActiveSummary(summary)}
              />
            )}
            {activeTab === 'qa' && (
              <QAInterface
                selectedDoc={selectedDoc}
                backendUrl={backendUrl}
              />
            )}
            {activeTab === 'metrics' && (
              <MetricsAnalytics
                activeSummary={activeSummary}
                backendUrl={backendUrl}
              />
            )}
          </>
        ) : (
          <Box className="h-full flex flex-col items-center justify-center bg-[#000000] text-center p-8">
            <Box className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-6 text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.1)] animate-pulse">
              <FileText size={32} />
            </Box>
            <Typography variant="h5" className="font-extrabold text-slate-100 tracking-tight mb-2 font-sans">
              Select or Upload a Document
            </Typography>
            <Typography className="text-sm text-slate-400 max-w-sm mb-6">
              To begin, upload a text, PDF, or DOCX document. You can then summarize it, ask questions, and review response metrics.
            </Typography>
            <button
              onClick={() => setUploadOpen(true)}
              className="flex items-center gap-2 px-6 py-3 rounded-xl gradient-bg-accent hover:gradient-bg-hover text-white font-bold text-sm tracking-tight transition-all shadow-lg shadow-indigo-600/20 active:scale-[0.98]"
            >
              <UploadCloud size={16} /> Upload Document
            </button>
          </Box>
        )}

        <DocumentUpload
          open={uploadOpen}
          onClose={() => setUploadOpen(false)}
          onUploadSuccess={handleUploadSuccess}
          backendUrl={backendUrl}
        />
      </Layout>
    </ThemeProvider>
  );
}
