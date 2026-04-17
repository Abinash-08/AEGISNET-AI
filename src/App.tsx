import React, { useState, useEffect, useCallback } from 'react';
import { 
  Bell, 
  Settings, 
  LayoutDashboard, 
  Activity, 
  Antenna, 
  Network, 
  History, 
  CircleHelp, 
  Terminal, 
  TriangleAlert, 
  X,
  Zap,
  ShieldAlert,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI, Type } from "@google/genai";

// --- Types ---

type AlertSeverity = 'critical' | 'warning' | 'info';

interface Alert {
  id: string;
  type: string;
  severity: AlertSeverity;
  message: string;
  timestamp: string;
}

interface Threat {
  id: string;
  type: string;
  x: number;
  y: number;
  angle: number;
  intensity: number;
  label: string;
  isPrediction?: boolean;
  confidence?: number;
  isCountered?: boolean;
  escalation?: 'STATIC' | 'LINEAR' | 'EXPONENTIAL';
  speed?: number;
  targetSector?: string;
}

interface CounterMeasure {
  id: string;
  threatId: string;
  x: number;
  y: number;
  type: string;
  timestamp: string;
}

// --- Icons Mapping ---
const SeverityIcon = ({ severity, className = "w-4 h-4" }: { severity: AlertSeverity, className?: string }) => {
  switch (severity) {
    case 'critical': return <ShieldAlert className={`${className} text-primary`} />;
    case 'warning': return <Zap className={`${className} text-primary/70`} />;
    case 'info': return <TriangleAlert className={`${className} text-on-surface-variant`} />;
  }
};

// --- Components ---

const ThreatMarker = React.memo(({ threat, selected, onSelect, onCounter }: { 
  threat: Threat, 
  selected: boolean,
  onSelect: (id: string) => void,
  onCounter?: (id: string, x: number, y: number) => void 
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const isActive = isHovered || selected;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, scale: selected ? 1.1 : 1 }}
      exit={{ opacity: 0 }}
      className={`absolute z-30 ${threat.isPrediction ? 'opacity-40 grayscale-[0.5]' : ''} ${threat.isCountered ? 'grayscale opacity-30 transition-all duration-1000' : ''}`}
      style={{ left: `${threat.x}%`, top: `${threat.y}%` }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(threat.id);
      }}
    >
      {/* Target Crosshair (New interaction element) */}
      {isActive && !threat.isPrediction && !threat.isCountered && (
        <motion.div 
          initial={{ scale: 2, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="absolute -inset-10 border border-primary/40 rounded-full flex items-center justify-center pointer-events-none"
        >
          <div className="w-[1px] h-full bg-primary/20 absolute left-1/2" />
          <div className="h-[1px] w-full bg-primary/20 absolute top-1/2" />
        </motion.div>
      )}

      {/* Impact Zone */}
      <motion.div
        animate={{ 
          scale: isActive ? [1.2, 1.8, 1.2] : [1, 1.5, 1], 
          opacity: isActive ? [0.3, 0.6, 0.3] : [0.1, 0.3, 0.1] 
        }}
        transition={{ duration: isActive ? 1.5 : 3, repeat: Infinity }}
        className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full blur-2xl transition-all duration-300 ${
          threat.isCountered ? 'bg-white/10' : (isActive ? 'w-64 h-64 bg-primary/40' : 'w-48 h-48 bg-primary/20')
        }`}
      />
      
      {/* Vector Line */}
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ 
          scaleX: 1,
          boxShadow: isActive ? '0 0 15px rgba(0,240,255,0.8)' : '0 0 0px transparent'
        }}
        className={`absolute h-[1px] origin-left transition-all duration-300 ${
          isActive ? 'bg-white w-32 h-[2px] z-10' : (threat.isPrediction ? 'bg-primary/50 border-t border-dashed border-primary/50 w-24' : 'bg-primary w-24')
        } ${threat.isCountered ? 'bg-white/20' : ''}`}
        style={{ transform: `rotate(${threat.angle}deg)` }}
      />

      {/* Threat Node Point */}
      <div className="relative cursor-crosshair group">
        <motion.div 
          animate={isActive ? { scale: 1.5, rotate: 135 } : { rotate: 45 }}
          className={`w-3 h-3 transition-colors duration-300 ${isActive ? 'bg-white' : 'bg-primary'} ${threat.isPrediction ? 'opacity-50' : ''} ${threat.isCountered ? 'bg-white/30' : ''}`}
        />
        
        <motion.div 
          animate={{ scale: isActive ? [1, 2.5] : [1, 2], opacity: [1, 0] }}
          transition={{ duration: isActive ? 0.6 : 1, repeat: Infinity }}
          className={`absolute w-8 h-8 border rounded-full -translate-x-1/2 -translate-y-1/2 ${
            isActive ? 'border-white' : 'border-primary'
          } ${threat.isPrediction ? 'border-dashed' : ''} ${threat.isCountered ? 'border-white/20' : ''}`} 
        />
        
        {/* Label */}
        <motion.div 
          animate={{ 
            x: isActive ? 12 : 16, 
            y: isActive ? 12 : 16,
            scale: isActive ? 1.1 : 1
          }}
          className={`absolute whitespace-nowrap transition-all duration-300 p-2 border ${
            isActive ? 'bg-background border-white z-40' : 'bg-background/80 border-primary/50 pointer-events-none'
          }`}
        >
          <div className={`font-mono text-[9px] uppercase tracking-tighter ${isActive ? 'text-white font-bold' : (threat.isPrediction ? 'text-white/50' : 'text-primary')}`}>
            {threat.isCountered ? 'NEUTRALIZED' : (isActive ? '!! CRITICAL_TARGET !!' : (threat.isPrediction ? `PRED_ID: ${threat.id}` : `> TARGET_ID: ${threat.id}`))}
          </div>
          {!threat.isCountered && (
            <div className="text-white font-mono text-[8px] uppercase tracking-tighter">
              &gt; TYPE: {threat.type}
            </div>
          )}
          {(isActive || threat.isPrediction) && !threat.isCountered && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              className="text-white/70 font-mono text-[7px] uppercase mt-1 border-t border-white/20 pt-1"
            >
              VECTOR_AZIMUTH: {threat.angle.toFixed(1)}°<br/>
              {threat.isPrediction ? (
                <span className="text-primary/70">CONFIDENCE: {(threat.confidence! * 100).toFixed(1)}%</span>
              ) : (
                <>
                  THREAT_INTENSITY: {(threat.intensity * 100).toFixed(1)}%<br/>
                  TARGET_SECTOR: {threat.targetSector}<br/>
                  PATTERN: {threat.escalation || 'STATIC'}<br/>
                  <div className="flex flex-col gap-2 mt-2">
                    <span className="text-primary font-bold">STATUS: INTERCEPT_READY</span>
                    <button 
                      onClick={() => onCounter?.(threat.id, threat.x, threat.y)}
                      className="bg-primary text-background text-[7px] font-bold py-1 px-2 border border-primary hover:bg-white hover:text-black transition-colors pointer-events-auto"
                    >
                      DEPLOY SENTINEL INTERCEPT
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
});


const RailIcon = ({ icon: Icon, active = false, onClick }: { icon: any, active?: boolean, onClick?: () => void }) => (
  <div 
    onClick={onClick}
    className={`w-8 h-8 flex items-center justify-center border transition-all duration-300 cursor-pointer ${
      active ? 'border-primary shadow-[0_0_10px_rgba(0,240,255,0.2)]' : 'border-on-surface-variant/50 opacity-50 hover:opacity-100 hover:border-on-surface'
    }`}
  >
    <Icon className="w-4 h-4" />
  </div>
);

const DataGroup = ({ label, value, percentage }: { label: string, value: string, percentage: number }) => (
  <div className="flex flex-col gap-2">
    <div className="text-[10px] uppercase tracking-[0.2em] text-on-surface-variant font-display">{label}</div>
    <div className="text-3xl font-light font-serif">{value}</div>
    <div className="data-meter">
      <motion.div 
        initial={{ width: 0 }}
        animate={{ width: `${percentage}%` }}
        className="data-meter-fill"
      />
    </div>
  </div>
);

const AlertToast = ({ alert, onDismiss }: { alert: Alert, onDismiss: () => void }) => (
  <motion.div
    initial={{ opacity: 0, x: 20 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: 20 }}
    className="bg-sidebar border border-grid-line p-4 min-w-[300px] shadow-2xl relative group"
  >
    <div className="flex justify-between items-start mb-2">
      <div className="flex items-center gap-2">
        <SeverityIcon severity={alert.severity} className="w-3 h-3" />
        <span className="text-[10px] uppercase tracking-widest font-bold text-primary">{alert.type}</span>
      </div>
      <button onClick={onDismiss} className="opacity-0 group-hover:opacity-100 transition-opacity">
        <X className="w-3 h-3 text-on-surface-variant hover:text-white" />
      </button>
    </div>
    <p className="text-xs font-display leading-tight">{alert.message}</p>
    <div className="mt-2 text-[9px] text-on-surface-variant font-mono">{alert.timestamp}</div>
  </motion.div>
);

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'activity' | 'antenna' | 'network' | 'history'>('dashboard');
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [threats, setThreats] = useState<Threat[]>([]);
  const [predictedThreats, setPredictedThreats] = useState<Threat[]>([]);
  const [counterMeasures, setCounterMeasures] = useState<CounterMeasure[]>([]);
  const [tacticalBriefing, setTacticalBriefing] = useState<string>("Initializing neural lattice synchronization. Surveillance active.");
  const [showNotificationPanel, setShowNotificationPanel] = useState(false);
  const [activeToast, setActiveToast] = useState<Alert | null>(null);
  const [isPredicting, setIsPredicting] = useState(false);
  const [isMapFocused, setIsMapFocused] = useState(false);
  const [selectedThreatId, setSelectedThreatId] = useState<string | null>(null);
  const [threatAnalysis, setThreatAnalysis] = useState<{ [id: string]: string }>({});
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

  // --- Mouse Parallax Tracker ---
  const handleMouseMove = (e: React.MouseEvent) => {
    if (isMapFocused) return;
    const { clientX, clientY } = e;
    const x = (clientX / window.innerWidth - 0.5) * 20;
    const y = (clientY / window.innerHeight - 0.5) * 20;
    setMousePos({ x, y });
  };

  const analyzeSelectedThreat = async (threat: Threat) => {
    if (threatAnalysis[threat.id] || isAnalyzing) return;
    
    setIsAnalyzing(true);
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Analyze this network threat:
                  Type: ${threat.type}
                  Sector: ${threat.targetSector}
                  Escalation: ${threat.escalation || 'STATIC'}
                  Intensity: ${threat.intensity.toFixed(2)}
                  
                  Provide a 2-sentence speculative analysis:
                  1. Interpreted Origin & Motive (Technical/Geopolitical jargon).
                  2. Potential Strategic Impact.
                  Be concise and cold.`,
        config: {
          systemInstruction: "You are the AegisNet AI tactical analyst. Provide speculative, high-level intelligence summaries."
        }
      });
      
      setThreatAnalysis(prev => ({ ...prev, [threat.id]: response.text || "Analysis inconclusive. Patterns obscured." }));
    } catch (error) {
      console.error('Analysis failed:', error);
      setThreatAnalysis(prev => ({ ...prev, [threat.id]: "Quantum decoupling detected. Intelligence unavailable." }));
    } finally {
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    if (selectedThreatId) {
      const threat = [...threats, ...predictedThreats].find(t => t.id === selectedThreatId);
      if (threat) analyzeSelectedThreat(threat);
    }
  }, [selectedThreatId]);

  const fetchTacticalBriefing = async () => {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Provide a 2-sentence highly technical tactical briefing for a cyber-defense dashboard. 
                  Recent alert types: ${alerts.slice(0, 3).map(a => a.type).join(', ')}. 
                  Threat count: ${threats.length}.
                  Be cold, professional, and slightly futuristic.`,
        config: {
          systemInstruction: "You are the AegisNet AI tactical advisor. Use technical jargon."
        }
      });
      setTacticalBriefing(response.text || "Neural integrity normalized. Scanning for anomalies.");
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchTacticalBriefing();
    const interval = setInterval(fetchTacticalBriefing, 60000);
    return () => clearInterval(interval);
  }, [alerts]); // Removed threats from deps to reduce noise

  const deployCounterDefense = (threatId: string, x: number, y: number) => {
    const id = `counter-${Math.random().toString(36).substr(2, 5)}`;
    const newCounter: CounterMeasure = {
      id,
      threatId,
      x,
      y,
      type: 'SENTINEL_PULSE',
      timestamp: new Date().toLocaleTimeString()
    };
    setCounterMeasures(prev => [...prev, newCounter]);
    setThreats(prev => prev.map(t => t.id === threatId ? { ...t, isCountered: true } : t));
    addAlert('COUNTER_DEFENSE', 'info', `Sentinel pulse deployed against target ${threatId}.`);
    
    // Auto remove counter measure visualization
    setTimeout(() => {
      setCounterMeasures(prev => prev.filter(c => c.id !== id));
    }, 5000);
  };

  const runPredictiveAnalysis = async () => {
    if (isPredicting) return;
    setIsPredicting(true);
    try {
      const prompt = `
        Analyze the current security environment of AegisNet AI Dashboard.
        Recent Alerts: ${JSON.stringify(alerts.slice(0, 5))}
        Active Threats: ${JSON.stringify(threats)}
        
        Task: Based on these patterns, predict 3 future threat vectors that might emerge in the next 30 minutes.
        Provide spatial coordinates (x, y from 10 to 90), trajectory angle (0-360), and prediction confidence (0.4 to 0.95).
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                type: { type: Type.STRING, description: "Threat type code like 'DATA_BREACH' or 'SATELLITE_WOBBLE'" },
                label: { type: Type.STRING, description: "Short descriptive label" },
                x: { type: Type.NUMBER },
                y: { type: Type.NUMBER },
                angle: { type: Type.NUMBER },
                confidence: { type: Type.NUMBER }
              },
              required: ["type", "label", "x", "y", "angle", "confidence"]
            }
          }
        }
      });

      const rawJson = response.text;
      const predictions = JSON.parse(rawJson).map((p: any) => ({
        ...p,
        id: `pred-${Math.random().toString(36).substr(2, 5)}`,
        intensity: p.confidence,
        isPrediction: true
      }));

      setPredictedThreats(predictions);
      addAlert('PREDICTIVE_AI', 'info', `Lattice prediction complete. ${predictions.length} potential vectors identified.`);
    } catch (error) {
      console.error('Prediction failed:', error);
      addAlert('AI_ERROR', 'warning', 'Predictive engine synchronization failed.');
    } finally {
      setIsPredicting(false);
    }
  };

  const addThreat = useCallback((type: string, label: string, manualParams?: Partial<Threat>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newThreat: Threat = {
      id,
      type,
      label,
      x: manualParams?.x ?? (10 + Math.random() * 80),
      y: manualParams?.y ?? (10 + Math.random() * 80),
      angle: manualParams?.angle ?? (Math.random() * 360),
      intensity: manualParams?.intensity ?? (0.5 + Math.random() * 0.5),
      escalation: manualParams?.escalation ?? 'STATIC',
      speed: manualParams?.speed ?? 0.2,
      targetSector: manualParams?.targetSector ?? 'UNASSIGNED',
    };
    setThreats(prev => [...prev, newThreat]);
    // Increase lifespan for evolving threats
    const lifespan = manualParams?.escalation && manualParams.escalation !== 'STATIC' ? 20000 : 10000;
    setTimeout(() => setThreats(prev => prev.filter(t => t.id !== id)), lifespan);
  }, []);

  // --- Threat Evolution Loop ---
  useEffect(() => {
    const evolveInterval = setInterval(() => {
      setThreats(prev => prev.map(threat => {
        if (threat.isCountered || threat.isPrediction) return threat;
        
        // Evolve Intensity
        let newIntensity = threat.intensity;
        if (threat.escalation === 'LINEAR') newIntensity += 0.02;
        if (threat.escalation === 'EXPONENTIAL') newIntensity *= 1.05;
        
        // Evolve Position based on trajectory (angle and speed)
        const rad = (threat.angle * Math.PI) / 180;
        const dx = Math.cos(rad) * (threat.speed || 0.1);
        const dy = Math.sin(rad) * (threat.speed || 0.1);
        
        return {
          ...threat,
          intensity: Math.min(newIntensity, 1.0),
          x: Math.min(Math.max(threat.x + dx, 5), 95),
          y: Math.min(Math.max(threat.y + dy, 5), 95),
        };
      }));
    }, 500); // 500ms for smoother propagation
    return () => clearInterval(evolveInterval);
  }, []);

  const addAlert = useCallback((type: string, severity: AlertSeverity, message: string) => {
    const newAlert: Alert = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      severity,
      message,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    };
    setAlerts(prev => [newAlert, ...prev].slice(0, 30));
    setActiveToast(newAlert);

    // Trigger threat visual if applicable
    if (type.includes('THREAT') || type.includes('SEISMIC')) {
      addThreat(type, message.split('detected')[0] || 'Unknown Origin');
    }

    setTimeout(() => setActiveToast(curr => curr?.id === newAlert.id ? null : curr), 6000);
  }, [addThreat]);

  // --- Manual Simulator State ---
  const [simulatorConfig, setSimulatorConfig] = useState({
    type: 'INTRUSION',
    x: 50,
    y: 50,
    intensity: 0.8,
    angle: 45,
    escalation: 'LINEAR' as 'STATIC' | 'LINEAR' | 'EXPONENTIAL',
    speed: 0.5,
    targetSector: 'CENTRAL_HUB'
  });
  const [isSimulatorExpanded, setIsSimulatorExpanded] = useState(false);

  const triggerManualSimulation = () => {
    const message = `${simulatorConfig.type} detected at manual coordinates. Pattern: ${simulatorConfig.escalation}.`;
    addAlert(`MANUAL_${simulatorConfig.type}`, 'critical', message);
    addThreat(simulatorConfig.type, `SIM_${simulatorConfig.targetSector}`, {
      x: simulatorConfig.x,
      y: simulatorConfig.y,
      intensity: simulatorConfig.intensity,
      angle: simulatorConfig.angle,
      escalation: simulatorConfig.escalation,
      speed: simulatorConfig.speed,
      targetSector: simulatorConfig.targetSector
    });
  };

  useEffect(() => {
    const alertsToSimulate = [
      { type: 'COMM LOSS', severity: 'warning' as const, message: 'Encryption link to Satellite B-4 flickering.' },
      { type: 'SEISMIC SHIFT', severity: 'critical' as const, message: 'Level 4 quake detected in Arctic Zone.' },
      { type: 'THREAT DETECTED', severity: 'critical' as const, message: 'Unidentified drone fleet approaching sector 12.' },
      { type: 'SYSTEM INFO', severity: 'info' as const, message: 'Neural lattice optimization complete.' },
    ];

    const simulation = setInterval(() => {
      if (Math.random() > 0.8) {
        const template = alertsToSimulate[Math.floor(Math.random() * alertsToSimulate.length)];
        addAlert(template.type, template.severity, template.message);
      }
    }, 12000);
    return () => clearInterval(simulation);
  }, [addAlert]);

  return (
    <div className={`grid h-screen w-screen overflow-hidden bg-background text-on-surface font-display selection:bg-primary/30 antialiased transition-all duration-700 ${
      isMapFocused 
        ? 'grid-cols-[0px_1fr_0px] grid-rows-[0px_1fr_0px]' 
        : 'grid-cols-[80px_16fr_380px] grid-rows-[100px_1fr_80px]'
    }`}>
      
      {/* Toast Overlay */}
      <div className={`fixed top-28 z-[100] flex flex-col gap-4 pointer-events-none transition-all duration-700 ${
        isMapFocused ? 'right-10' : 'right-[420px]'
      }`}>
        <AnimatePresence>
          {activeToast && (
            <div className="pointer-events-auto">
              <AlertToast alert={activeToast} onDismiss={() => setActiveToast(null)} />
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Left Rail */}
      <nav className={`row-start-1 row-end-3 border-r border-grid-line flex flex-col items-center py-8 gap-10 transition-all duration-700 overflow-hidden ${
        isMapFocused ? 'opacity-0 -translate-x-full' : 'opacity-100 translate-x-0'
      }`}>
        {/* Diamond Logo-mark */}
        <div className="w-10 h-10 border-2 border-primary rotate-45 flex items-center justify-center mb-4 cursor-pointer hover:bg-primary/5 transition-colors">
          <div className="w-3 h-3 bg-primary" />
        </div>
        
        <RailIcon icon={LayoutDashboard} active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
        <RailIcon icon={Activity} active={activeTab === 'activity'} onClick={() => setActiveTab('activity')} />
        <RailIcon icon={Antenna} active={activeTab === 'antenna'} onClick={() => setActiveTab('antenna')} />
        <RailIcon icon={Network} active={activeTab === 'network'} onClick={() => setActiveTab('network')} />
        <RailIcon icon={History} active={activeTab === 'history'} onClick={() => setActiveTab('history')} />
        
        <div className="mt-auto flex flex-col gap-6">
          <CircleHelp className="w-5 h-5 text-on-surface-variant hover:text-white cursor-pointer transition-colors" />
          <Settings className="w-5 h-5 text-on-surface-variant hover:text-white cursor-pointer transition-colors" />
        </div>
      </nav>

      {/* Header */}
      <header className={`col-start-2 col-end-3 border-b border-grid-line flex items-end px-12 pb-6 transition-all duration-700 overflow-hidden ${
        isMapFocused ? 'opacity-0 -translate-y-full' : 'opacity-100 translate-y-0'
      }`}>
        <div>
          <h1 className="text-3xl font-light tracking-tighter uppercase">
            AegisNet <span className="font-extrabold text-primary">AI</span>
          </h1>
        </div>
        
        <div className="ml-auto flex items-center gap-8">
          <div className="relative">
            <Bell 
              className={`w-5 h-5 cursor-pointer transition-colors ${alerts.length > 0 ? 'text-primary' : 'text-on-surface-variant hover:text-white'}`} 
              onClick={() => setShowNotificationPanel(!showNotificationPanel)}
            />
            {alerts.length > 0 && <span className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full animate-pulse" />}
            
            <AnimatePresence>
              {showNotificationPanel && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute top-10 right-0 w-80 bg-sidebar border border-grid-line shadow-2xl z-[80] overflow-hidden"
                >
                  <div className="p-4 border-b border-grid-line flex justify-between items-center bg-white/5">
                    <span className="text-[10px] uppercase tracking-widest font-bold">Log History</span>
                    <button onClick={() => setAlerts([])} className="text-[9px] uppercase text-on-surface-variant hover:text-white transition-colors">Clear</button>
                  </div>
                  <div className="max-h-80 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                    {alerts.length === 0 ? (
                      <div className="text-center py-8 text-[10px] uppercase opacity-30">No log entries</div>
                    ) : (
                      alerts.map(a => (
                        <div key={a.id} className="text-[11px] font-mono leading-relaxed flex gap-3">
                          <span className="text-primary shrink-0 opacity-80">{a.timestamp}</span>
                          <span className="text-on-surface-variant uppercase shrink-0">{a.type}:</span>
                          <span>{a.message}</span>
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div className="editorial-pill">System Live</div>
        </div>
      </header>

      {/* Main Visualization Area */}
      <main 
        onMouseMove={handleMouseMove}
        className={`col-start-2 col-end-3 flex flex-col overflow-hidden transition-all duration-700 ${
          isMapFocused ? 'p-0' : 'p-12'
        }`}
      >
        <motion.h2 
          key={activeTab}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className={`font-serif italic text-6xl leading-[0.9] max-w-sm mb-12 transition-all duration-700 ${
            isMapFocused ? 'h-0 opacity-0 mb-0 overflow-hidden' : 'h-auto opacity-100 mb-12'
          }`}
        >
          {activeTab === 'dashboard' && "Digital Twin Command"}
          {activeTab === 'activity' && "Tactical Analytics"}
          {activeTab === 'antenna' && "Array Calibration"}
          {activeTab === 'network' && "Lattice Topology"}
          {activeTab === 'history' && "Forensic Audit"}
        </motion.h2>

        <div 
          className="flex-grow border border-grid-line relative overflow-hidden bg-[radial-gradient(circle_at_center,_#111_0%,_#050505_100%)] perspective-1000"
          style={{ perspective: '1000px' }}
        >
          {activeTab === 'dashboard' && (
            <motion.div 
              style={{ 
                rotateX: isMapFocused ? 0 : 5 + (mousePos.y * 0.2), 
                rotateY: isMapFocused ? 0 : (mousePos.x * 0.2) 
              }}
              className="absolute inset-0 transition-transform duration-300 ease-out flex flex-col items-center justify-center translate-z-[-100px]"
            >
              {/* SVG Neural Grid Background */}
              <svg className="absolute inset-0 w-full h-full opacity-[0.05] pointer-events-none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern id="neural-grid" width="80" height="80" patternUnits="userSpaceOnUse">
                    <path d="M 80 0 L 0 0 0 80" fill="none" stroke="currentColor" strokeWidth="0.5"/>
                    <circle cx="0" cy="0" r="1" fill="currentColor"/>
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#neural-grid)" />
              </svg>

              {/* Network Lattice Layer */}
              <svg className="absolute inset-0 w-full h-full z-10 pointer-events-none">
                <defs>
                  <linearGradient id="line-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="transparent" />
                    <stop offset="50%" stopColor="var(--color-primary)" />
                    <stop offset="100%" stopColor="transparent" />
                  </linearGradient>
                </defs>
                {/* Connections: Node 01 (60,20) -> Node 02 (15,65), Node 02 -> Node 03 (65,75), Node 01 -> Node 03 */}
                <g className="opacity-20 stroke-primary stroke-[0.5] fill-none">
                  <path d="M 60% 20% L 15% 65% L 65% 75% Z" />
                </g>
                {/* Animated Data Packets */}
                <motion.circle 
                  r="2" fill="white" 
                  animate={{ offsetDistance: ["0%", "100%"] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                  style={{ offsetPath: `path('M 480,180 L 120,585')`, offsetRotate: "auto" }}
                  className="opacity-50"
                />
                <motion.circle 
                  r="2" fill="white" 
                  animate={{ offsetDistance: ["0%", "100%"] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear", delay: 1 }}
                  style={{ offsetPath: `path('M 120,585 L 520,675')`, offsetRotate: "auto" }}
                  className="opacity-50"
                />
              </svg>

              {/* Sweeping Laser Scan */}
              <motion.div 
                animate={{ top: ['-10%', '110%'] }}
                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                className="absolute left-0 right-0 h-[100px] bg-gradient-to-b from-transparent via-primary/5 to-transparent z-10 pointer-events-none border-t border-primary/20"
              />

              {/* Neural Pulse Overlay */}
              <div className="absolute inset-0 neural-pulse-bg pointer-events-none bg-[radial-gradient(circle_at_center,_transparent_40%,_rgba(0,240,255,0.03)_100%)] z-20" />
              <div className="scanline-overlay z-50 pointer-events-none" />

              {/* Threat Visualization Overlay */}
              <div 
                className="absolute inset-0 z-30"
                onClick={() => setSelectedThreatId(null)}
              >
                <AnimatePresence>
                  {[...threats, ...predictedThreats].map((threat: Threat) => (
                    <ThreatMarker 
                      key={threat.id} 
                      threat={threat} 
                      selected={selectedThreatId === threat.id}
                      onSelect={setSelectedThreatId}
                      onCounter={deployCounterDefense} 
                    />
                  ))}
                </AnimatePresence>
                
                <AnimatePresence>
                  {counterMeasures.map(cm => (
                    <motion.div
                      key={cm.id}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: [1, 1.5, 1], opacity: 1 }}
                      exit={{ scale: 3, opacity: 0 }}
                      className="absolute z-50 pointer-events-none"
                      style={{ left: `${cm.x}%`, top: `${cm.y}%` }}
                    >
                      <div className="w-8 h-8 border-2 border-white rounded-full flex items-center justify-center animate-spin-slow">
                        <div className="w-1.5 h-1.5 bg-white" />
                      </div>
                      <motion.div 
                        animate={{ scale: [1, 4], opacity: [0.5, 0] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="absolute inset-0 border border-white rounded-full -translate-x-1/2 -translate-y-1/2 left-4 top-4"
                      />
                      <div className="absolute top-6 left-6 whitespace-nowrap text-[8px] font-mono text-white bg-black/50 px-1">
                        DEPLOYED: {cm.type}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              {/* Core Visualization System */}
              <div className="relative w-full h-full">
                {/* Large Sphere Viz */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
                  <div className="w-80 h-80 rounded-full border border-primary/10 flex items-center justify-center">
                    <motion.div 
                      animate={{ rotate: 360, opacity: [0.3, 0.5, 0.3] }}
                      transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                      className="w-64 h-64 rounded-full border border-dashed border-primary/40"
                    />
                    <motion.div 
                      animate={{ rotate: -360, opacity: [0.1, 0.3, 0.1] }}
                      transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                      className="absolute w-48 h-48 rounded-full border border-primary/20"
                    />
                  </div>
                  {/* Core Glow */}
                  <motion.div 
                    animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.3, 0.1] }}
                    transition={{ duration: 5, repeat: Infinity }}
                    className="absolute inset-0 bg-primary/10 blur-[100px] rounded-full"
                  />
                </div>

                {/* Node Tags */}
                <motion.div 
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="absolute top-[20%] left-[60%] bg-background/90 border border-primary px-3 py-2 text-[10px] uppercase shadow-[0_0_20px_rgba(0,240,255,0.1)] z-40"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-1 bg-primary rounded-full animate-pulse" />
                    Node 01: Core Processor
                  </div>
                </motion.div>
                <div className="absolute top-[65%] left-[15%] bg-background/90 border border-primary px-3 py-2 text-[10px] uppercase shadow-[0_0_20px_rgba(0,240,255,0.1)] z-40">
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-1 bg-primary rounded-full animate-pulse" />
                    Node 02: Neural Bridge
                  </div>
                </div>
                <div className="absolute top-[75%] left-[65%] bg-background/90 border border-primary px-3 py-2 text-[10px] uppercase shadow-[0_0_20px_rgba(0,240,255,0.1)] z-40">
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-1 bg-primary rounded-full animate-pulse" />
                    Node 03: Latency Sink
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'dashboard' && (
            <>
              {/* Overlay elements that shouldn't be tilted for legibility */}
              {/* Fullscreen Toggle Button */}
              <button 
                onClick={() => setIsMapFocused(!isMapFocused)}
                className="absolute top-6 right-6 z-50 p-2 bg-sidebar/50 border border-grid-line text-on-surface-variant hover:text-primary transition-colors hover:border-primary group"
                title={isMapFocused ? "Exit Theater Mode" : "Enter Theater Mode"}
              >
                {isMapFocused ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                <span className="absolute right-10 top-1/2 -translate-y-1/2 bg-sidebar border border-grid-line px-2 py-1 text-[8px] uppercase tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                  {isMapFocused ? "NORMAL_MODE" : "THEATER_MODE"}
                </span>
              </button>

              {/* Tactical Briefing Overlay (Holographic) */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute bottom-6 left-6 z-50 max-w-xs holographic-panel p-4"
              >
                <div className="text-primary font-mono text-[8px] uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full animate-ping" />
                  Tactical Advisory
                </div>
                <p className="text-white font-mono text-[10px] leading-relaxed opacity-80 uppercase">
                  {tacticalBriefing}
                </p>
              </motion.div>

              {/* Metadata Overlay */}
              <div className="absolute top-6 left-6 font-mono text-[9px] text-primary/70 leading-relaxed uppercase tracking-wider z-50">
                COORD_SYSTEM: GRID_B_42<br />
                REF_SYNC: 0.0003ms<br />
                LATTICE_INTEGRITY: {(99.8 - (threats.length * 0.4) - (predictedThreats.length * 0.1)).toFixed(1)}%<br />
                {predictedThreats.length > 0 && <span className="text-white animate-pulse">!! PREDICTIVE_VECTORS_ACTIVE !!</span>}
              </div>
            </>
          )}

          {activeTab === 'activity' && (
            <div className="p-10 h-full overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-2 gap-10">
                <div className="space-y-6">
                  <h3 className="text-primary font-mono text-xs uppercase tracking-widest border-b border-grid-line pb-2">Recent Incident Flux</h3>
                  <div className="space-y-4">
                    {alerts.slice(0, 10).map(a => (
                      <div key={a.id} className="p-4 border border-grid-line bg-white/5 flex gap-4 items-start">
                        <SeverityIcon severity={a.severity} className="w-4 h-4 text-primary mt-1" />
                        <div>
                          <div className="text-[10px] font-bold uppercase">{a.type}</div>
                          <div className="text-[11px] text-on-surface-variant leading-tight mt-1">{a.message}</div>
                          <div className="text-[8px] font-mono text-primary/50 mt-2">{a.timestamp}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-6">
                  <h3 className="text-primary font-mono text-xs uppercase tracking-widest border-b border-grid-line pb-2">Threat Vector Distribution</h3>
                  <div className="h-64 border border-grid-line flex items-center justify-center bg-white/5 relative overflow-hidden">
                    <div className="absolute inset-0 flex items-center justify-center opacity-20">
                      <div className="w-32 h-32 border-4 border-primary rounded-full animate-ping" />
                    </div>
                    <div className="text-center">
                      <div className="text-4xl font-extrabold text-white">{threats.length + predictedThreats.length}</div>
                      <div className="text-[9px] uppercase tracking-tighter text-on-surface-variant mt-1">Total Active Entities</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <DataGroup label="Critical" value={threats.length.toString()} percentage={Math.min(threats.length * 10, 100)} />
                    <DataGroup label="Predicted" value={predictedThreats.length.toString()} percentage={Math.min(predictedThreats.length * 10, 100)} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'antenna' && (
            <div className="flex flex-col items-center justify-center h-full p-20 text-center">
              <Antenna className="w-20 h-20 text-primary mb-8 animate-pulse" />
              <h3 className="text-3xl uppercase font-light tracking-tighter mb-4">Satellite Array <span className="font-bold text-primary">Omega-4</span></h3>
              <p className="max-w-md text-on-surface-variant text-sm font-mono uppercase leading-relaxed">
                Calibration successful. Cross-link synchronization at <span className="text-primary">99.98%</span>. Scanning ionospheric layers for signal diffraction patterns.
              </p>
              <div className="mt-12 w-full max-w-lg h-1 bg-grid-line relative overflow-hidden">
                <motion.div 
                  initial={{ left: '-100%' }}
                  animate={{ left: '100%' }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                  className="absolute inset-0 bg-primary"
                />
              </div>
            </div>
          )}

          {activeTab === 'network' && (
            <div className="grid grid-cols-4 grid-rows-4 h-full p-8 gap-4 overflow-hidden">
              {Array.from({ length: 16 }).map((_, i) => (
                <div key={i} className="border border-grid-line bg-white/5 flex flex-col p-4 justify-between group hover:border-primary transition-colors cursor-crosshair">
                  <div className="flex justify-between items-start">
                    <span className="text-[8px] font-mono text-primary">NODE_{i.toString().padStart(2, '0')}</span>
                    <div className={`w-1 h-1 rounded-full ${Math.random() > 0.8 ? 'bg-error animate-pulse' : 'bg-primary'}`} />
                  </div>
                  <div className="h-4 bg-grid-line relative overflow-hidden">
                    <div className="absolute inset-0 bg-primary/20" style={{ width: `${60 + Math.random() * 40}%` }} />
                  </div>
                  <div className="text-[7px] font-mono opacity-50 uppercase">Latency: {(10 + Math.random() * 5).toFixed(2)}ms</div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'history' && (
            <div className="p-10 h-full overflow-hidden flex flex-col">
              <h3 className="text-primary font-mono text-xs uppercase tracking-widest border-b border-grid-line pb-4 mb-6">Neural Forensic Audit</h3>
              <div className="flex-grow overflow-y-auto custom-scrollbar space-y-1">
                {alerts.map((a) => (
                  <div key={a.id} className="grid grid-cols-[120px_150px_1fr] p-2 hover:bg-white/5 text-[10px] font-mono group border-b border-grid-line/50 items-center">
                    <span className="text-primary opacity-70 group-hover:opacity-100 transition-opacity">{a.timestamp}</span>
                    <span className="text-white font-bold uppercase">{a.type}</span>
                    <span className="text-on-surface-variant group-hover:text-white transition-colors">{a.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Sidebar Metadata */}
      <aside className={`col-start-3 col-end-4 row-start-1 row-end-3 bg-sidebar border-l border-grid-line p-10 flex flex-col gap-10 overflow-y-auto custom-scrollbar transition-all duration-700 ${
        isMapFocused ? 'opacity-0 translate-x-full' : 'opacity-100 translate-x-0'
      }`}>
        {/* Selected Threat Details */}
        <AnimatePresence>
          {selectedThreatId && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="border border-primary bg-primary/5 p-6 space-y-4 overflow-hidden"
            >
              <div className="flex justify-between items-start">
                <div className="text-[10px] uppercase font-bold text-primary tracking-widest font-mono">
                  Tactical Intelligence Summary
                </div>
                <button 
                  onClick={() => setSelectedThreatId(null)}
                  className="text-primary hover:text-white transition-colors"
                >
                  <ChevronUp className="rotate-180 w-3 h-3" />
                </button>
              </div>
              
              {(() => {
                const threat = [...threats, ...predictedThreats].find(t => t.id === selectedThreatId);
                if (!threat) return null;
                return (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-2 text-[9px] font-mono">
                      <div className="text-on-surface-variant">TARGET_ID:</div>
                      <div className="text-white truncate">{threat.id}</div>
                      <div className="text-on-surface-variant">ENTITY_TYPE:</div>
                      <div className="text-white uppercase">{threat.type}</div>
                      <div className="text-on-surface-variant">LATTICE_POS:</div>
                      <div className="text-white">[{threat.x.toFixed(1)}, {threat.y.toFixed(1)}]</div>
                    </div>
                    
                    <div className="pt-4 border-t border-primary/20">
                      <div className="text-[8px] uppercase tracking-widest text-primary/70 mb-2 font-bold">
                        AI_ANALYST_INTERPRETATION:
                      </div>
                      <div className="text-[10px] uppercase leading-relaxed font-mono text-white/90">
                        {isAnalyzing ? (
                          <div className="flex items-center gap-2">
                            <div className="w-1 h-1 bg-primary rounded-full animate-pulse" />
                            Synchronizing neural patterns...
                          </div>
                        ) : (
                          threatAnalysis[selectedThreatId] || "Scanning for identifying markers..."
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </motion.div>
          )}
        </AnimatePresence>

        <DataGroup label="Sync Variance" value="0.0042%" percentage={15} />
        <DataGroup label="Lattice Stress" value={`${(100 - (99.8 - (threats.length * 0.4) - (predictedThreats.length * 0.1))).toFixed(2)}%`} percentage={(100 - (99.8 - (threats.length * 0.4) - (predictedThreats.length * 0.1)))} />
        
        {/* Simulator ControlsSection */}
        <div className="space-y-6">
          <div className="flex justify-between items-center border-b border-grid-line pb-2">
            <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-on-surface-variant font-display">Simulator Tools</span>
            <button 
              onClick={() => setIsSimulatorExpanded(!isSimulatorExpanded)}
              className="text-primary hover:text-white transition-colors"
            >
              {isSimulatorExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>

          <AnimatePresence>
            {isSimulatorExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden space-y-4"
              >
                <div className="space-y-3 pt-2">
                  <div className="space-y-1">
                    <label className="text-[9px] uppercase text-on-surface-variant font-mono">Anomaly Type</label>
                    <select 
                      value={simulatorConfig.type}
                      onChange={(e) => setSimulatorConfig({...simulatorConfig, type: e.target.value})}
                      className="w-full bg-background border border-grid-line text-[10px] p-2 outline-none focus:border-primary uppercase font-mono text-white"
                    >
                      <option value="INTRUSION">Intrusion</option>
                      <option value="DATA_EXFIL">Data Exfil</option>
                      <option value="LATENCY_SPIKE">Latency Spike</option>
                      <option value="SEISMIC">Seismic Anomaly</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] uppercase text-on-surface-variant font-mono">Target Sector</label>
                    <select 
                      value={simulatorConfig.targetSector}
                      onChange={(e) => setSimulatorConfig({...simulatorConfig, targetSector: e.target.value})}
                      className="w-full bg-background border border-grid-line text-[10px] p-2 outline-none focus:border-primary uppercase font-mono text-white"
                    >
                      <option value="CENTRAL_HUB">Central Hub</option>
                      <option value="EDGE_ROUTER">Edge Router</option>
                      <option value="DATA_LAKE">Data Lake</option>
                      <option value="SATELLITE_LINK">Satellite Link</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] uppercase text-on-surface-variant font-mono">Escalation Pattern</label>
                    <div className="flex gap-2">
                      {['STATIC', 'LINEAR', 'EXPONENTIAL'].map((p) => (
                        <button
                          key={p}
                          onClick={() => setSimulatorConfig({...simulatorConfig, escalation: p as any})}
                          className={`flex-1 py-1 text-[8px] border transition-all ${
                            simulatorConfig.escalation === p 
                              ? 'bg-primary border-primary text-black font-bold' 
                              : 'bg-transparent border-grid-line text-on-surface-variant hover:border-primary/50'
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <label className="text-[9px] uppercase text-on-surface-variant font-mono">X-Axis</label>
                        <span className="text-[9px] font-mono text-primary">{simulatorConfig.x}%</span>
                      </div>
                      <input 
                        type="range" min="10" max="90" step="1"
                        value={simulatorConfig.x}
                        onChange={(e) => setSimulatorConfig({...simulatorConfig, x: Number(e.target.value)})}
                        className="w-full h-1 bg-grid-line rounded-none appearance-none cursor-pointer accent-primary"
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <label className="text-[9px] uppercase text-on-surface-variant font-mono">Y-Axis</label>
                        <span className="text-[9px] font-mono text-primary">{simulatorConfig.y}%</span>
                      </div>
                      <input 
                        type="range" min="10" max="90" step="1"
                        value={simulatorConfig.y}
                        onChange={(e) => setSimulatorConfig({...simulatorConfig, y: Number(e.target.value)})}
                        className="w-full h-1 bg-grid-line rounded-none appearance-none cursor-pointer accent-primary"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <label className="text-[9px] uppercase text-on-surface-variant font-mono">Intensity</label>
                        <span className="text-[9px] font-mono text-primary">{simulatorConfig.intensity.toFixed(1)}</span>
                      </div>
                      <input 
                        type="range" min="0.1" max="1.0" step="0.1"
                        value={simulatorConfig.intensity}
                        onChange={(e) => setSimulatorConfig({...simulatorConfig, intensity: Number(e.target.value)})}
                        className="w-full h-1 bg-grid-line rounded-none appearance-none cursor-pointer accent-primary"
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <label className="text-[9px] uppercase text-on-surface-variant font-mono">Azimuth</label>
                        <span className="text-[9px] font-mono text-primary">{simulatorConfig.angle}°</span>
                      </div>
                      <input 
                        type="range" min="0" max="360" step="5"
                        value={simulatorConfig.angle}
                        onChange={(e) => setSimulatorConfig({...simulatorConfig, angle: Number(e.target.value)})}
                        className="w-full h-1 bg-grid-line rounded-none appearance-none cursor-pointer accent-primary"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <label className="text-[9px] uppercase text-on-surface-variant font-mono">Propagation Speed</label>
                      <span className="text-[9px] font-mono text-primary">{simulatorConfig.speed.toFixed(2)}</span>
                    </div>
                    <input 
                      type="range" min="0" max="2.0" step="0.1"
                      value={simulatorConfig.speed}
                      onChange={(e) => setSimulatorConfig({...simulatorConfig, speed: Number(e.target.value)})}
                      className="w-full h-1 bg-grid-line rounded-none appearance-none cursor-pointer accent-primary"
                    />
                  </div>

                  <button 
                    onClick={triggerManualSimulation}
                    className="w-full py-2 bg-primary/10 border border-primary text-primary text-[9px] uppercase tracking-widest hover:bg-primary hover:text-background transition-all font-bold"
                  >
                    Manifest Threat Vector
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <DataGroup label="Processing Load" value="68.4 Gigaflops" percentage={68} />
        <DataGroup label="Active Nodes" value="1,204 / 1,204" percentage={100} />
        
        <div className="flex flex-col gap-4 mt-8">
          <div className="text-[10px] uppercase tracking-[0.2em] text-on-surface-variant font-display">Regional Status</div>
          <div className="space-y-3">
             {[
               { name: 'Sentinel Alpha', status: 'ACTIVE', color: 'text-primary' },
               { name: 'Sentinel Beta', status: 'STANDBY', color: 'text-on-surface-variant' },
               { name: 'Sentinel Gamma', status: 'SYNCING', color: 'text-on-surface' },
             ].map((s, idx) => (
                <div key={idx} className="flex justify-between items-center text-xs pb-2 border-b border-grid-line last:border-0 hover:border-primary/30 transition-colors cursor-default group">
                  <span className="font-light group-hover:text-primary transition-colors">{s.name}</span>
                  <span className={`text-[9px] font-bold ${s.color}`}>{s.status}</span>
                </div>
             ))}
          </div>
        </div>

        <div className="mt-auto space-y-4">
          <button 
            disabled={isPredicting}
            onClick={runPredictiveAnalysis}
            className={`w-full py-3 border transition-all group flex items-center justify-center gap-2 text-[11px] uppercase tracking-widest ${
              isPredicting 
                ? 'border-on-surface-variant/30 text-on-surface-variant cursor-wait' 
                : 'border-primary text-primary hover:bg-primary hover:text-background'
            }`}
          >
            {isPredicting ? 'AI Analysis...' : 'Predictive Lattice'}
            {!isPredicting && <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />}
          </button>
          
          <button 
            onClick={() => addAlert('THREAT DETECTION', 'critical', 'Foreign ingress detected in sector 09.')}
            className="w-full py-3 border border-primary text-primary text-[11px] uppercase tracking-widest hover:bg-primary hover:text-background transition-all group flex items-center justify-center gap-2"
          >
            Initiate Threat Scan
            <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </aside>

      {/* Interactive Footer Timeline */}
      <footer className={`col-start-1 col-end-4 row-start-3 row-end-4 bg-background border-t border-grid-line p-4 flex items-center gap-6 overflow-x-auto custom-scrollbar z-[60] transition-all duration-700 ${
        isMapFocused ? 'opacity-0 translate-y-full' : 'opacity-100 translate-y-0'
      }`}>
        <div className="flex flex-col min-w-[120px]">
          <span className="text-[8px] uppercase tracking-widest text-on-surface-variant font-mono">Incident DNA</span>
          <span className="text-[10px] uppercase font-bold text-primary">Neural Stream</span>
        </div>
        
        <div className="flex items-center gap-1 h-12 relative flex-grow min-w-[800px]">
          <div className="absolute w-full h-[1px] bg-grid-line top-1/2 -translate-y-1/2" />
          {alerts.map((alert, idx) => (
            <motion.div
              layoutId={alert.id}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              key={alert.id}
              className="relative group cursor-pointer"
            >
              <div 
                className={`w-2 h-2 rounded-full border transition-all duration-300 ${
                  alert.severity === 'critical' ? 'bg-primary border-primary shadow-[0_0_10px_rgba(0,240,255,0.5)]' : 
                  alert.severity === 'warning' ? 'bg-primary/50 border-primary/50' : 'bg-white/20 border-white/20'
                } group-hover:scale-150 group-hover:bg-white group-hover:border-white`}
              />
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-sidebar border border-grid-line p-2 whitespace-nowrap z-50 pointer-events-none">
                <div className="text-[8px] font-mono font-bold text-primary mb-1 uppercase">{alert.type}</div>
                <div className="text-[7px] text-white opacity-80 uppercase leading-none">{alert.timestamp}</div>
              </div>
            </motion.div>
          ))}
          {/* Ongoing Scan Pulse */}
          <div className="w-4 h-4 rounded-full border border-primary/30 animate-ping ml-4" />
        </div>

        <div className="ml-auto flex gap-6 pr-6 border-l border-grid-line pl-6 shrink-0">
          <div className="flex flex-col items-end">
            <span className="text-[8px] uppercase text-on-surface-variant">Lattice Frequency</span>
            <span className="text-xs font-mono text-primary animate-pulse">4.82 GHz</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[8px] uppercase text-on-surface-variant">Active Sentinels</span>
            <span className="text-xs font-mono text-white">{counterMeasures.length} / 12</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
