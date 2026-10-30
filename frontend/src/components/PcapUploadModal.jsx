import React, { useState, useRef } from 'react';
import axios from 'axios';
import { UploadCloud, FileText, CheckCircle2, AlertTriangle, X, ShieldAlert, Cpu, Sparkles, Play } from 'lucide-react';

// Test payloads the backend can generate. `level` is sent as ?level=... alongside demo=true.
const DEMO_LEVELS = [
  {
    level: 'low',
    label: 'Low Threat PCAP',
    idle: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20',
    icon: 'text-emerald-400',
  },
  {
    level: 'medium',
    label: 'Medium Threat PCAP',
    idle: 'border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20',
    icon: 'text-amber-400',
  },
  {
    level: 'high',
    label: 'High Threat PCAP',
    idle: 'border-rose-500/30 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20',
    icon: 'text-rose-400',
  },
];

const PcapUploadModal = ({ isOpen, onClose, onPcapProcessed }) => {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [activeLevel, setActiveLevel] = useState(null); // which demo button is running: 'low' | 'medium' | 'high' | null
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

  if (!isOpen) return null;

  // Helper function to build headers
  const getAuthHeaders = () => {
    const token = sessionStorage.getItem('soc_session_token');
    const tenantKey = sessionStorage.getItem('soc_tenant_key');
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (tenantKey) headers['X-Tenant-Key'] = tenantKey;
    return headers;
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelected(e.target.files[0]);
    }
  };

  const handleFileSelected = (selectedFile) => {
    setError(null);
    setResults(null);
    setFile(selectedFile);
  };

  /**
   * Runs an analysis.
   *  - runAnalysis('low' | 'medium' | 'high') -> uploads a built-in demo PCAP of that threat level.
   *  - runAnalysis()                          -> uploads the file the user selected.
   */
  const runAnalysis = async (threatLevel = null) => {
    const isDemo = ['low', 'medium', 'high'].includes(threatLevel);
    if (!isDemo && !file) return;

    setAnalyzing(true);
    setActiveLevel(isDemo ? threatLevel : null);
    setError(null);
    setResults(null);

    try {
      const headers = getAuthHeaders();
      let res;

      if (isDemo) {
        res = await axios.post(
          `${API_URL}/pcap/upload`,
          {},
          { headers, params: { demo: true, level: threatLevel } }
        );
      } else {
        const formData = new FormData();
        formData.append('file', file);
        // Add content type to the headers object
        headers['Content-Type'] = 'multipart/form-data';
        res = await axios.post(`${API_URL}/pcap/upload`, formData, { headers });
      }

      setResults(res.data);
      if (onPcapProcessed) {
        onPcapProcessed(res.data);
      }
    } catch (err) {
      console.error("PCAP analysis error:", err);
      setError(err.response?.data?.detail || "Failed to process PCAP file. Please verify file format.");
    } finally {
      setAnalyzing(false);
      setActiveLevel(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-6 relative flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <span>Direct PCAP Ingestion & Flow Classifier</span>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-sky-950/60 text-sky-400 border border-sky-500/20">
                  Zero Dependency
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Drop raw binary packet captures (.pcap, .cap) to reconstruct bidirectional network flows and execute AI threat classification.
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          
          {/* Drag & Drop Zone */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 ${
              dragActive 
                ? 'border-sky-500 bg-sky-950/20 scale-[0.99]' 
                : 'border-slate-800 hover:border-slate-700 bg-slate-950/30'
            }`}
          >
            <input 
              ref={fileInputRef}
              type="file" 
              accept=".pcap,.cap" 
              onChange={handleFileChange} 
              className="hidden" 
            />
            <div className="w-12 h-12 rounded-full bg-slate-800/80 flex items-center justify-center text-slate-400">
              <UploadCloud className="w-6 h-6 text-sky-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-200">
                {file ? file.name : "Drag & drop packet capture (.pcap) here"}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {file ? `${(file.size / 1024).toFixed(1)} KB ready for AI flow analysis` : "or click to browse local files"}
              </p>
            </div>
          </div>

          {/* Demo PCAPs: one button per threat level */}
          <div className="space-y-2 pt-1">
            <p className="text-[11px] font-semibold text-slate-500">Or run a built-in test capture</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {DEMO_LEVELS.map(({ level, label, idle, icon }) => {
                const isRunning = analyzing && activeLevel === level;
                return (
                  <button
                    key={level}
                    type="button"
                    disabled={analyzing}
                    onClick={() => runAnalysis(level)}
                    className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer shadow disabled:cursor-not-allowed disabled:opacity-50 ${idle}`}
                  >
                    {isRunning ? (
                      <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Play className={`w-3.5 h-3.5 ${icon}`} />
                    )}
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Classify the uploaded file */}
          {file && (
            <div className="flex justify-end">
              <button
                type="button"
                disabled={analyzing}
                onClick={() => runAnalysis()}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition-all cursor-pointer shadow disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Cpu className="w-3.5 h-3.5" />
                <span>Classify {file.name}</span>
              </button>
            </div>
          )}

          {/* Analyzing Spinner */}
          {analyzing && (
            <div className="p-6 rounded-xl bg-slate-950/40 border border-slate-800 text-center space-y-3 animate-fade-in">
              <div className="w-7 h-7 border-2 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-sm font-semibold text-slate-200">Reconstructing Bidirectional Flow Conversations...</p>
              <p className="text-xs text-slate-400">Extracting 22 statistical features and running Random Forest inference.</p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-3.5 rounded-lg bg-rose-950/30 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Results Display */}
          {results && (
            <div className="space-y-3 animate-fade-in">
              <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-500/20 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Successfully Analyzed {results.filename}</span>
                </div>
                <div className="flex items-center gap-3 text-slate-400 font-mono text-[11px]">
                  <span>Flows: {results.flows_analyzed}</span>
                  <span className="text-rose-400 font-bold">Threats Logged: {results.threats_detected}</span>
                </div>
              </div>

              <div className="border border-slate-800 rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800 text-[10px] uppercase">
                    <tr>
                      <th className="py-2 px-3">Adversary Source</th>
                      <th className="py-2 px-3">Classification</th>
                      <th className="py-2 px-3">MITRE ID</th>
                      <th className="py-2 px-3">Confidence</th>
                      <th className="py-2 px-3">Severity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {results.threats?.map((t, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-2 px-3 text-sky-400 font-semibold">{t.source_ip}</td>
                        <td className="py-2 px-3 font-semibold">{t.attack_type}</td>
                        <td className="py-2 px-3 text-slate-400">{t.mitre_id || 'N/A'}</td>
                        <td className="py-2 px-3">{(t.confidence * 100).toFixed(1)}%</td>
                        <td className="py-2 px-3">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                            t.severity === 'critical' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                            t.severity === 'high' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' :
                            'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}>
                            {t.severity}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3 mt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-all cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};

export default PcapUploadModal;