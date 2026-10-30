import React, { useState, useRef, useEffect } from 'react';
import { 
  CheckCircle2, 
  ChevronRight,
  ShieldCheck,
  Copy,
  Download,
  Terminal,
  X
} from 'lucide-react';
import { CyberCubeLogo } from './SplashScreen';
import { markSetupComplete } from '../utils/setupState';

// Your public repository download link
const AGENT_RELEASE_BASE = 'https://github.com/NartanNaik/Project-Releases/releases/download/cybercube-v1.0.0';

const SENSOR_PLATFORMS = {
  windows: {
    label: 'Windows',
    file: 'agent.exe',
    runIntro: 'Open PowerShell in the folder where you saved the file, then run:',
    command: (key) => `.\\agent.exe --key ${key}`,
    hint: 'If Windows SmartScreen appears, choose More info, then Run anyway. Run PowerShell as Administrator if the sensor asks for elevated access.'
  },
  macos: {
    label: 'macOS',
    file: 'agent-macos',
    runIntro: 'Open Terminal in the folder where you saved the file, then run:',
    command: (key) =>
      `xattr -d com.apple.quarantine ./agent-macos 2>/dev/null; chmod +x ./agent-macos && sudo ./agent-macos --key ${key}`,
    hint: 'macOS may block downloaded programs the first time. The first part of the command clears that block. You will be asked for your Mac password.'
  },
  linux: {
    label: 'Linux',
    file: 'agent-linux',
    runIntro: 'Open a terminal in the folder where you saved the file, then run:',
    command: (key) => `chmod +x ./agent-linux && sudo ./agent-linux --key ${key}`,
    hint: 'The command makes the file executable and starts it with sudo so it can read network traffic.'
  }
};

const detectPlatform = () => {
  const ua = (typeof navigator !== 'undefined' ? navigator.userAgent : '').toLowerCase();
  if (ua.includes('windows')) return 'windows';
  if (ua.includes('mac')) return 'macos';
  return 'linux';
};

const CommandBlock = ({ label, value, copied, onCopy }) => (
  <div>
    <span className="text-[11px] font-semibold text-slate-500">{label}</span>
    <div className="mt-1 flex items-start justify-between gap-3 rounded border border-slate-800 bg-slate-950 px-3 py-2.5">
      <code className="min-w-0 flex-1 break-all text-xs font-mono leading-relaxed text-emerald-300 select-all">{value}</code>
      <button
        type="button"
        onClick={onCopy}
        className="mt-0.5 shrink-0 text-slate-500 transition-colors hover:text-emerald-400"
        aria-label={`Copy ${label}`}
      >
        {copied ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
      </button>
    </div>
  </div>
);

/**
 * Props:
 *  - onComplete: called after first-time setup finishes (onboarding flow).
 *  - onClose:    when provided, the wizard runs in "re-open" mode (opened from the
 *                sidebar after setup is already done): it shows a close button,
 *                closes on Escape / backdrop click, and skips the "Workspace Ready" screen.
 */
const SetupWizard = ({ onComplete, onClose }) => {
  const isReopen = typeof onClose === 'function';

  // Grab the workspace key to inject into the terminal command
  const tenantKey = sessionStorage.getItem('soc_tenant_key') || 'soc_live_default_key';
  
  const [sensorPlatform, setSensorPlatform] = useState(detectPlatform);
  const [copiedField, setCopiedField] = useState(null);
  const [isFinishing, setIsFinishing] = useState(false);
  const copyTimer = useRef(null);
  const finishTimer = useRef(null);

  useEffect(() => () => {
    clearTimeout(copyTimer.current);
    clearTimeout(finishTimer.current);
  }, []);

  // Re-open mode: close on Escape
  useEffect(() => {
    if (!isReopen) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isReopen, onClose]);

  const copyText = (value, field) => {
    try { navigator.clipboard.writeText(value); } catch (e) {}
    setCopiedField(field);
    clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => setCopiedField(null), 2000);
  };

  const handleFinish = () => {
    // Re-open mode: setup is already complete, so just dismiss.
    if (isReopen) {
      onClose();
      return;
    }

    setIsFinishing(true);
    finishTimer.current = setTimeout(() => {
      markSetupComplete(); 
      if (typeof onComplete === 'function') onComplete();
    }, 1500);
  };

  const handleBackdropClick = (e) => {
    if (isReopen && e.target === e.currentTarget) onClose();
  };

  const platform = SENSOR_PLATFORMS[sensorPlatform];
  const sensorDownloadUrl = `${AGENT_RELEASE_BASE}/${platform.file}`;
  const sensorCommand = platform.command(tenantKey);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-sm p-4"
      onMouseDown={handleBackdropClick}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Deploy Security Sensor"
        className="relative w-full max-w-2xl max-h-[92vh] rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl flex flex-col overflow-hidden"
      >
        
        {/* Header */}
        <div className="border-b border-slate-800 bg-slate-950/50 px-8 py-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-800 border border-slate-700 text-emerald-400">
              <CyberCubeLogo className="h-7 w-7 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-100 tracking-tight">Deploy Security Sensor</h2>
              <p className="text-xs text-slate-400 font-mono mt-1">Download and start your cross-platform agent</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {!isReopen && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs font-semibold">
                <ShieldCheck className="h-4 w-4" />
                <span>Setup Phase</span>
              </div>
            )}
            {isReopen && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close setup guide"
                className="rounded-lg border border-slate-800 bg-slate-950/40 p-2 text-slate-400 transition-colors hover:border-slate-700 hover:text-emerald-400"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Success Overlay (first-time setup only) */}
        {isFinishing && !isReopen && (
          <div className="absolute inset-0 z-10 bg-slate-950/95 flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-200">
            <div className="h-20 w-20 rounded-full bg-emerald-500/10 flex items-center justify-center mb-6 border border-emerald-500/30">
              <CheckCircle2 className="h-10 w-10 text-emerald-500" />
            </div>
            <h3 className="text-2xl font-bold text-slate-100 mb-2">Workspace Ready</h3>
            <p className="text-slate-400 text-sm font-mono">Opening your SOC console...</p>
          </div>
        )}

        {/* Main Content Body - Only showing actionable steps now */}
        <div className="flex-1 overflow-y-auto p-8 flex flex-col gap-5">
          <section className="rounded-xl border border-slate-800 bg-slate-950/40 p-5">
            <div className="flex items-start gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Terminal className="h-4 w-4 text-emerald-400" />
                  <h3 className="text-sm font-semibold text-slate-200">Connect your local machine</h3>
                </div>
                <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                  Download the agent and run the command below to start sending live security telemetry to your private workspace.
                </p>

                {/* Platform tabs */}
                <div role="tablist" aria-label="Operating system" className="mt-4 inline-flex rounded-lg border border-slate-800 bg-slate-950 p-1">
                  {Object.entries(SENSOR_PLATFORMS).map(([id, p]) => {
                    const selected = sensorPlatform === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        role="tab"
                        aria-selected={selected}
                        onClick={() => setSensorPlatform(id)}
                        className={`rounded-md px-4 py-1.5 text-xs font-semibold transition-colors ${
                          selected
                            ? 'bg-slate-800 text-emerald-400 shadow shadow-slate-950/50'
                            : 'text-slate-500 hover:text-slate-300'
                        }`}
                      >
                        {p.label}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-5 flex flex-col gap-5" role="tabpanel">
                  <div>
                    <span className="text-[11px] font-semibold text-slate-500">1. Download the sensor</span>
                    <div className="mt-1">
                      <a
                        href={sensorDownloadUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-emerald-600/10 px-4 py-2.5 text-xs font-semibold text-emerald-400 transition-colors hover:bg-emerald-600/20"
                      >
                        <Download className="h-4 w-4" />
                        <span>Download {platform.file}</span>
                      </a>
                    </div>
                  </div>

                  <div>
                    <p className="text-[11px] font-semibold text-slate-500">2. Run it with your workspace key</p>
                    <p className="mt-1 text-xs text-slate-400">{platform.runIntro}</p>
                    <div className="mt-2">
                      <CommandBlock
                        label={`${platform.label} command`}
                        value={sensorCommand}
                        copied={copiedField === 'sensor-command'}
                        onCopy={() => copyText(sensorCommand, 'sensor-command')}
                      />
                    </div>
                    <p className="mt-2 text-[11px] leading-relaxed text-slate-500">{platform.hint}</p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Footer Actions */}
        <div className="border-t border-slate-800 bg-slate-950/50 p-6 flex justify-between items-center shrink-0">
          <p className="text-xs text-slate-500 font-mono">
            {isReopen
              ? 'Run the same command on another machine to add more sensors.'
              : 'You can always deploy more sensors later.'}
          </p>
          
          <button
            type="button"
            onClick={handleFinish}
            disabled={isFinishing}
            className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-600/50 text-white text-sm font-bold rounded-lg shadow-lg shadow-emerald-900/20 transition-all"
          >
            <span>{isReopen ? 'Close' : 'Finish setup'}</span>
            {!isReopen && <ChevronRight className="h-4 w-4" />}
          </button>
        </div>

      </div>
    </div>
  );
};

export default SetupWizard;