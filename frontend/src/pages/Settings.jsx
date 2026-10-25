import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Settings as SettingsIcon, Sliders, Shield, Save, ShieldAlert, Trash2 } from 'lucide-react';

const Settings = () => {
  // Existing Local Storage Settings
  const [threshold, setThreshold] = useState(() => {
    return parseInt(localStorage.getItem('soc_threshold') || '85', 10);
  });
  const [interval, setIntervalVal] = useState(() => {
    return parseInt(localStorage.getItem('soc_polling_interval') || '10', 10);
  });
  const [apiUrl, setApiUrl] = useState(() => {
    return localStorage.getItem('soc_api_url') || (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000');
  });
  const [saved, setSaved] = useState(false);

  // New IPS Auto-Containment Settings
  const [ipsActive, setIpsActive] = useState(false);
  const [ipsLoading, setIpsLoading] = useState(true);
  
  // State for hard reset functionality
  const [resetting, setResetting] = useState(false);
  const [resetMessage, setResetMessage] = useState(null);

  // Helper function to build headers for API calls
  const getAuthHeaders = () => {
    const token = sessionStorage.getItem('soc_session_token');
    const tenantKey = sessionStorage.getItem('soc_tenant_key');
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (tenantKey) headers['X-Tenant-Key'] = tenantKey;
    return headers;
  };

  // Fetch initial IPS state from the FastAPI backend when the page loads
  useEffect(() => {
    const headers = getAuthHeaders();
    axios.get(`${apiUrl}/config/ips`, { headers })
      .then(res => {
        setIpsActive(res.data.ips_mode_active);
        setIpsLoading(false);
      })
      .catch(err => {
        console.error("Failed to fetch IPS settings", err);
        setIpsLoading(false);
      });
  }, [apiUrl]);

  // Handle saving the local UI settings (threshold, polling, api)
  const handleSave = (e) => {
    e.preventDefault();
    localStorage.setItem('soc_threshold', threshold.toString());
    localStorage.setItem('soc_polling_interval', interval.toString());
    localStorage.setItem('soc_api_url', apiUrl.trim());
    
    // Broadcast event across app tabs / windows
    window.dispatchEvent(new Event('soc-settings-updated'));
    
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  // Handle toggling the IPS automation engine on the backend server
  const toggleIpsMode = async () => {
    setIpsLoading(true);
    const newState = !ipsActive;
    try {
      const headers = getAuthHeaders();
      await axios.post(`${apiUrl}/config/ips?active=${newState}`, {}, { headers });
      setIpsActive(newState);
    } catch (error) {
      console.error("Error updating IPS settings", error);
    } finally {
      setIpsLoading(false);
    }
  };

  // Handle completely resetting the tenant's statistics and data
  const handleResetData = async () => {
    const confirmDelete = window.confirm(
      "WARNING: This will permanently delete all your generated network logs, PCAP analysis results, and threat statistics. Are you absolutely sure?"
    );
    
    if (!confirmDelete) return;

    setResetting(true);
    setResetMessage(null);

    try {
      const headers = getAuthHeaders();
      const res = await axios.post(`${apiUrl}/statistics/reset`, {}, { headers });
      setResetMessage({ type: 'success', text: res.data.message || 'All statistics have been cleared.' });
      
      // Trigger a dashboard refresh
      window.dispatchEvent(new Event('soc-settings-updated'));
    } catch (error) {
      console.error("Failed to reset statistics", error);
      setResetMessage({ type: 'error', text: 'Failed to reset statistics. Please check your connection.' });
    } finally {
      setResetting(false);
      // Clear message after 4 seconds
      setTimeout(() => setResetMessage(null), 4000);
    }
  };

  return (
    <div className="space-y-8 max-w-2xl">
      
      {/* Title */}
      <div>
        <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
          <SettingsIcon className="w-5 h-5 text-slate-400" />
          <span>System Settings</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">Configure threat containment rules, threshold bounds, and backend endpoints.</p>
      </div>

      {/* NEW: IPS Auto-Containment Toggle Block */}
      <div className="glass-panel p-6 bg-slate-900 border border-slate-800 rounded-xl relative overflow-hidden">
        <div className="flex justify-between items-start mb-5">
          <div>
            <h3 className="text-lg font-semibold text-slate-200">Defense Operations Mode</h3>
            <p className="text-xs text-slate-400 mt-1">Configure automated firewall response and active threat containment.</p>
          </div>
          <div className={`p-2.5 rounded-lg ${ipsActive ? 'bg-rose-500/20' : 'bg-emerald-500/20'}`}>
            {ipsActive ? <ShieldAlert className="w-6 h-6 text-rose-500" /> : <Shield className="w-6 h-6 text-emerald-500" />}
          </div>
        </div>

        <div className="flex items-center justify-between p-4 bg-slate-950 rounded-lg border border-slate-800 shadow-inner">
          <div>
            <p className="font-semibold text-sm text-slate-200">IPS Auto-Containment</p>
            <p className="text-[10px] text-slate-500 mt-1">Automatically execute firewall blocks for critical/high severity threats without human intervention.</p>
          </div>
          
          <button 
            onClick={toggleIpsMode}
            disabled={ipsLoading}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none shrink-0 ${ipsActive ? 'bg-rose-500' : 'bg-slate-700'} ${ipsLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${ipsActive ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>

        {ipsActive && (
          <div className="mt-4 p-3 bg-rose-950/30 border border-rose-900/50 rounded-lg flex items-start gap-2 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-rose-500 mt-1 shrink-0"></span>
            <span className="text-xs text-rose-300 leading-tight">
              <strong>WARNING:</strong> Active Defense Mode enabled. The AI engine is authorized to instantly drop incoming packets from network IP addresses categorized as highly malicious.
            </span>
          </div>
        )}
      </div>

      {/* EXISTING: Dashboard UI Settings Block */}
      <div className="glass-panel p-6 bg-slate-900/40 rounded-xl border border-slate-800/50">
        <h3 className="text-sm font-semibold text-slate-200 mb-5 border-b border-slate-800 pb-2">Dashboard Interface Parameters</h3>
        
        <form onSubmit={handleSave} className="space-y-6">
          
          {/* Threshold slider */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-sky-400" />
              <span>Anomaly Alarm Threshold ({threshold}%)</span>
            </label>
            <input
              type="range"
              min="50"
              max="99"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              className="w-full bg-slate-850 h-1.5 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
            <span className="text-[10px] text-slate-500 block">Threat alerts with classification confidence below this value will not trigger high severity notifications.</span>
          </div>

          {/* Refresh Interval */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span>Log Polling Interval (Seconds)</span>
            </label>
            <input
              type="number"
              min="1"
              max="60"
              value={interval}
              onChange={(e) => setIntervalVal(parseInt(e.target.value || '1', 10))}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-slate-700 transition-colors"
            />
            <span className="text-[10px] text-slate-500 block">Rate at which the dashboard pulls active logs from the server database (default is 10s).</span>
          </div>

          {/* API URL */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
              <span>Backend API Server URL</span>
            </label>
            <input
              type="text"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-slate-700 font-mono transition-colors"
            />
            <span className="text-[10px] text-slate-500 block">Target server endpoint where threat logs are hosted.</span>
          </div>

          {/* Save Button */}
          <div className="pt-2 border-t border-slate-800/80">
            <button
              type="submit"
              className="w-full mt-4 bg-emerald-600 hover:bg-emerald-500 text-slate-100 px-4 py-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-md"
            >
              <Save className="w-4 h-4" />
              <span>{saved ? "Settings Applied!" : "Save Dashboard Modifications"}</span>
            </button>
          </div>
        </form>
      </div>

      {/* DATA MANAGEMENT (HARD RESET) BLOCK */}
      <div className="glass-panel p-6 bg-rose-950/20 border border-rose-900/30 rounded-xl">
        <div className="mb-4 border-b border-rose-900/30 pb-3">
          <h3 className="text-sm font-semibold text-rose-400 flex items-center gap-2">
            <Trash2 className="w-4 h-4" />
            Danger Zone
          </h3>
          <p className="text-[11px] text-slate-400 mt-1">Permanently wipe all network telemetry data and analysis statistics for your account.</p>
        </div>
        
        <div className="flex flex-col gap-3">
          <button
            onClick={handleResetData}
            disabled={resetting}
            className="w-full bg-rose-900/60 hover:bg-rose-800 text-rose-100 px-4 py-3 rounded-lg text-xs font-bold transition-all border border-rose-700/50 shadow-sm flex justify-center items-center gap-2"
          >
            {resetting ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full"></span>
                Wiping Data...
              </span>
            ) : (
              "Hard Reset Account Statistics"
            )}
          </button>
          
          {resetMessage && (
            <div className={`text-[11px] p-2 rounded text-center font-medium ${resetMessage.type === 'success' ? 'bg-emerald-900/50 text-emerald-400' : 'bg-rose-900/50 text-rose-400'}`}>
              {resetMessage.text}
            </div>
          )}
        </div>
      </div>

    </div>
  );
};

export default Settings;