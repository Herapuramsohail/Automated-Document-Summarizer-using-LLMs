import React, { useState, useEffect } from 'react';
import { Box, Paper, Typography, CircularProgress, LinearProgress } from '@mui/material';
import { Clock, TrendingUp, ThumbsUp, BarChart3, Activity, Zap } from 'lucide-react';
import axios from 'axios';
import { Line, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
} from 'chart.js';

// Register ChartJS elements
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
);

const StatCard = ({ icon: Icon, iconColor, iconBg, label, value }) => (
  <Paper className="p-5 rounded-2xl border border-slate-800/80 bg-[#000000]/80 glass-panel flex items-center gap-4">
    <Box className={`w-10 h-10 rounded-xl ${iconBg} border ${iconColor.replace('text-', 'border-').replace('-400', '-500/20')} flex items-center justify-center ${iconColor}`}>
      <Icon size={18} />
    </Box>
    <div>
      <Typography className="text-2xs font-extrabold text-slate-500 uppercase tracking-wider">{label}</Typography>
      <Typography variant="h5" className="font-extrabold text-slate-100 font-sans tracking-tight">{value}</Typography>
    </div>
  </Paper>
);

export default function MetricsAnalytics({ activeSummary, backendUrl }) {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, [activeSummary]);

  const fetchAnalytics = async () => {
    try {
      const response = await axios.get(`${backendUrl}/api/v1/metrics/analytics`);
      setAnalytics(response.data);
    } catch (e) {
      console.error("Could not fetch analytics data: ", e);
    } finally {
      setLoading(false);
    }
  };

  const getMetricPercentage = (val) => {
    if (!val) return 0;
    return Math.min(100, Math.round(val * 100));
  };

  // Dark-mode Chart configs
  const doughnutData = {
    labels: ['Positive Feedback', 'Negative Feedback'],
    datasets: [
      {
        data: [analytics?.thumbs_up_count || 0, analytics?.thumbs_down_count || 0],
        backgroundColor: ['rgba(99, 102, 241, 0.7)', 'rgba(244, 63, 94, 0.7)'],
        borderColor: ['rgba(99, 102, 241, 0.9)', 'rgba(244, 63, 94, 0.9)'],
        borderWidth: 1,
        hoverOffset: 8,
      },
    ],
  };

  const lineData = {
    labels: ['Run 1', 'Run 2', 'Run 3', 'Run 4', 'Run 5'],
    datasets: [
      {
        label: 'LLM Response Latency (s)',
        data: [1.2, 2.5, 1.8, 3.1, activeSummary?.metrics?.latency_seconds || 2.1],
        borderColor: 'rgba(99, 102, 241, 0.85)',
        backgroundColor: 'rgba(99, 102, 241, 0.08)',
        pointBackgroundColor: '#6366f1',
        pointBorderColor: 'rgba(99, 102, 241, 0.4)',
        pointHoverBackgroundColor: '#818cf8',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        tension: 0.4,
        fill: true,
        borderWidth: 2,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: '#94a3b8',
          font: { family: 'Inter', size: 11, weight: '600' },
          padding: 16,
          boxWidth: 10,
          boxHeight: 10,
        },
      },
      tooltip: {
        backgroundColor: '#0a0a0a',
        borderColor: 'rgba(255,255,255,0.08)',
        borderWidth: 1,
        titleColor: '#f8fafc',
        bodyColor: '#94a3b8',
        padding: 12,
        cornerRadius: 10,
      },
    },
    scales: {
      x: {
        ticks: { color: '#475569', font: { family: 'Inter', size: 10 } },
        grid: { color: 'rgba(255,255,255,0.04)' },
        border: { color: 'rgba(255,255,255,0.06)' },
      },
      y: {
        ticks: { color: '#475569', font: { family: 'Inter', size: 10 } },
        grid: { color: 'rgba(255,255,255,0.04)' },
        border: { color: 'rgba(255,255,255,0.06)' },
      },
    },
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '72%',
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: '#94a3b8',
          font: { family: 'Inter', size: 10, weight: '600' },
          padding: 12,
          boxWidth: 8,
          boxHeight: 8,
        },
      },
      tooltip: {
        backgroundColor: '#0a0a0a',
        borderColor: 'rgba(255,255,255,0.08)',
        borderWidth: 1,
        titleColor: '#f8fafc',
        bodyColor: '#94a3b8',
        padding: 10,
        cornerRadius: 10,
      },
    },
  };

  const MetricBar = ({ label, value }) => (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs font-semibold text-slate-400">
        <span>{label}</span>
        <span className="font-extrabold text-indigo-400">{value?.toFixed(4) || '—'}</span>
      </div>
      <div className="w-full h-1.5 rounded-full bg-slate-800/80 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${getMetricPercentage(value)}%`,
            background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
          }}
        />
      </div>
    </div>
  );

  if (loading) {
    return (
      <Box className="h-full flex items-center justify-center bg-[#000000]">
        <CircularProgress className="text-indigo-500" size={32} />
      </Box>
    );
  }

  return (
    <Box className="h-full overflow-y-auto p-6 bg-[#000000] space-y-6">

      {/* Active Summary Evaluation Panel */}
      <Paper className="p-6 rounded-2xl border border-slate-800/80 bg-[#000000]/80 glass-panel">
        <Typography className="font-extrabold text-slate-100 border-b border-slate-800/60 pb-3 mb-6 font-sans" style={{ fontSize: '0.95rem' }}>
          Active Run Accuracy Metrics
        </Typography>

        {activeSummary?.metrics ? (
          <div className="flex flex-col md:flex-row gap-8">
            {/* ROUGE Scores */}
            <div className="flex-1 space-y-4">
              <Typography className="text-3xs font-extrabold text-slate-500 uppercase tracking-wider mb-3">
                ROUGE Evaluation (N-Gram Overlap)
              </Typography>
              <MetricBar label="ROUGE-1 (Unigram)" value={activeSummary.metrics.rouge_1} />
              <MetricBar label="ROUGE-2 (Bigram)" value={activeSummary.metrics.rouge_2} />
              <MetricBar label="ROUGE-L (Longest Common Subsequence)" value={activeSummary.metrics.rouge_l} />
            </div>

            {/* Divider */}
            <div className="hidden md:block w-px bg-slate-800/60 self-stretch" />

            {/* BLEU & BERTScore Gauges */}
            <div className="flex-1 flex justify-around items-center gap-6">
              {[
                { label: 'BLEU Score', sub: 'Precision vs. source', val: activeSummary.metrics.bleu, color: 'rgba(99,102,241,0.8)' },
                { label: 'Semantic Cosine', sub: 'Embedding similarity', val: activeSummary.metrics.bert_score, color: 'rgba(139,92,246,0.8)' },
              ].map(({ label, sub, val, color }) => (
                <div key={label} className="text-center">
                  <Box className="relative w-20 h-20 mx-auto mb-3 flex items-center justify-center">
                    <CircularProgress
                      variant="determinate"
                      value={getMetricPercentage(val)}
                      size={80}
                      thickness={4}
                      style={{ color }}
                    />
                    <Box className="absolute inset-0 flex items-center justify-center">
                      <Typography className="font-extrabold text-slate-100 text-sm font-sans">
                        {val?.toFixed(2) || '0.00'}
                      </Typography>
                    </Box>
                  </Box>
                  <Typography className="text-xs font-extrabold text-slate-300 font-sans">{label}</Typography>
                  <Typography className="text-3xs text-slate-500 mt-0.5 font-medium">{sub}</Typography>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <Box className="py-10 text-center bg-[#000000]/30 border border-dashed border-slate-800 rounded-xl">
            <Zap size={24} className="text-indigo-500/40 mx-auto mb-2" />
            <Typography className="text-xs text-slate-500 font-medium">
              No active summarization run selected. Go to Summarizer tab to generate.
            </Typography>
          </Box>
        )}
      </Paper>

      {/* Aggregate System Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">

        {/* Stat Cards */}
        <div className="md:col-span-3 flex flex-col gap-4">
          <StatCard
            icon={Activity}
            iconBg="bg-indigo-500/10"
            iconColor="text-indigo-400"
            label="Avg Response Time"
            value={`${analytics?.avg_latency?.toFixed(1) || 0}s`}
          />
          <StatCard
            icon={TrendingUp}
            iconBg="bg-emerald-500/10"
            iconColor="text-emerald-400"
            label="Total Summaries"
            value={analytics?.total_summaries || 0}
          />
          <StatCard
            icon={BarChart3}
            iconBg="bg-violet-500/10"
            iconColor="text-violet-400"
            label="Avg ROUGE-1"
            value={analytics?.avg_rouge_1 ? analytics.avg_rouge_1.toFixed(3) : '0.000'}
          />
        </div>

        {/* Latency History Line Chart */}
        <Paper className="md:col-span-6 p-6 rounded-2xl border border-slate-800/80 bg-[#000000]/80 glass-panel flex flex-col">
          <div className="flex items-center gap-2 border-b border-slate-800/60 pb-3 mb-4">
            <Clock size={14} className="text-slate-500" />
            <Typography className="text-2xs font-extrabold uppercase tracking-wider text-slate-400">
              Latency Analysis
            </Typography>
          </div>
          <Box className="flex-1 min-h-[160px]">
            <Line data={lineData} options={chartOptions} />
          </Box>
        </Paper>

        {/* User Satisfaction Doughnut */}
        <Paper className="md:col-span-3 p-6 rounded-2xl border border-slate-800/80 bg-[#000000]/80 glass-panel flex flex-col">
          <div className="flex items-center gap-2 border-b border-slate-800/60 pb-3 mb-4">
            <ThumbsUp size={14} className="text-slate-500" />
            <Typography className="text-2xs font-extrabold uppercase tracking-wider text-slate-400">
              User Satisfaction
            </Typography>
          </div>
          <Box className="flex-1 min-h-[160px] flex items-center justify-center">
            {analytics?.thumbs_up_count === 0 && analytics?.thumbs_down_count === 0 ? (
              <div className="text-center">
                <ThumbsUp size={24} className="text-slate-700 mx-auto mb-2" />
                <Typography className="text-xs text-slate-500 font-medium">No feedback yet</Typography>
              </div>
            ) : (
              <Doughnut data={doughnutData} options={doughnutOptions} />
            )}
          </Box>
        </Paper>
      </div>
    </Box>
  );
}
