import { useEffect, useState, useRef } from 'react';
import { TacticalMap } from './components/TacticalMap';
import { TrackingPanel } from './components/TrackingPanel';
import { HeaderBar } from './components/HeaderBar';
import { LiveReceiverModal } from './components/LiveReceiverModal';
import { Register } from './components/Register';
import { useSystemStore } from './store/useSystemStore';
import { useAudioSystem } from './store/useAudioSystem';
import type { SystemState } from './types';

// New Components
import { RFAnalysisPanel } from './components/RFAnalysisPanel';
import { HealthMonitorPanel } from './components/HealthMonitorPanel';
import { SignalDetectorPanel } from './components/SignalDetectorPanel';
import { TargetDetailsPanel } from './components/TargetDetailsPanel';
import { LiveFFTPanel } from './components/LiveFFTPanel';
import { WaterfallPanel } from './components/WaterfallPanel';
import { MilitaryTimeline } from './components/MilitaryTimeline';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function App() {
  const { receivers, reports, targets, events, setSystemState } = useSystemStore();
  const [connected, setConnected] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showRegister, setShowRegister] = useState(true);
  const [targetHistory, setTargetHistory] = useState<Record<string, [number, number][]>>({});
  const lastEventCount = useRef(0);
  const audioStore = useAudioSystem();

  useEffect(() => {
      if (events.length > lastEventCount.current) {
          const newEvents = events.slice(lastEventCount.current);
          newEvents.forEach(e => {
              if (e.type === 'TARGET_CREATED') audioStore.playRadarPing();
              else if (e.type === 'TARGET_LOCKED') audioStore.playTargetLocked();
              else if (e.type === 'TARGET_LOST') audioStore.playTargetLost();
          });
          lastEventCount.current = events.length;
      }
  }, [events, audioStore]);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    let ws: WebSocket;
    let reconnectTimer: ReturnType<typeof setTimeout>;
    let reconnectDelay = 1000;

    const connectWebSocket = () => {
        ws = new WebSocket('ws://localhost:8000/ws/frontend');
        
        ws.onopen = () => {
            setConnected(true);
            reconnectDelay = 1000; // Reset delay on successful connection
        };
        
        ws.onclose = () => {
            setConnected(false);
            reconnectTimer = setTimeout(() => {
                reconnectDelay = Math.min(reconnectDelay * 1.5, 10000); // Max 10 seconds
                connectWebSocket();
            }, reconnectDelay);
        };
        
        ws.onmessage = (event) => {
          try {
              const msg = JSON.parse(event.data);
              if (msg.type === "receiver_update") {
                  useSystemStore.getState().updateReport({
                      system_id: msg.receiver_id,
                      doa: msg.doa,
                      freq: msg.freq,
                      signal_power: msg.power,
                      snr: msg.snr,
                      lat: msg.lat,
                      lon: msg.lon,
                      timestamp: Date.now() / 1000,
                      confidence_score: 90,
                      true_bearing: msg.doa,
                      bandwidth: 25000,
                      noise_floor: -120,
                      signal_quality: 85,
                      signal_duration: 0.5,
                      modulation_type: 'FM'
                  });
                  return;
              }
              if (msg.type === "receiver_deleted") {
                  useSystemStore.getState().removeReceiver(msg.receiver_id);
                  // Also clean up target history if targets were dropped
                  setTargetHistory(prev => {
                      const newHistory = { ...prev };
                      const currentTargetIds = useSystemStore.getState().targets.map(t => t.track_id);
                      for (const key of Object.keys(newHistory)) {
                          if (!currentTargetIds.includes(key)) {
                              delete newHistory[key];
                          }
                      }
                      return newHistory;
                  });
                  return;
              }
              const state: SystemState = msg;
              setSystemState(state);
              
              setTargetHistory(prev => {
                const newHistory = { ...prev };
                state.targets.forEach(t => {
                    if (!newHistory[t.track_id]) {
                        newHistory[t.track_id] = [];
                    }
                    newHistory[t.track_id].push([t.lat, t.lon]);
                    if (newHistory[t.track_id].length > 500) {
                        newHistory[t.track_id].shift();
                    }
                });
                
                // Clean up old targets
                const currentTargetIds = state.targets.map(t => t.track_id);
                for (const key of Object.keys(newHistory)) {
                    if (!currentTargetIds.includes(key)) {
                        delete newHistory[key];
                    }
                }
                
                return newHistory;
              });
          } catch(e) {
              console.error("WS Parse error", e);
          }
        };
    };

    connectWebSocket();
    
    // Verify Health Check
    fetch(`${API_URL}/api/health`)
      .then(res => res.json())
      .then(data => console.log('Backend Health:', data))
      .catch(err => console.error('Health check failed:', err));

    return () => {
        clearTimeout(reconnectTimer);
        if (ws) ws.close();
    };
  }, [setSystemState]);

  const handleSaveStation = async (station: any) => {
      try {
          const res = await fetch(`${API_URL}/api/receivers`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(station)
          });
          const data = await res.json();
          if (data.success) {
              setToastMessage(`Receiver Added Successfully`);
              setTimeout(() => setToastMessage(null), 3000);
              
              // Immediately update UI state without waiting for refresh
              if (data.receiver) {
                  setSystemState({
                      receivers: [...useSystemStore.getState().receivers.filter(r => r.receiver_id !== data.receiver.receiver_id), data.receiver]
                  });
              }

              return data;
          } else {
              return { success: false, error: data.error || "Unknown error" };
          }
      } catch (err: any) {
          console.error("Failed to save station", err);
          return { success: false, error: err.message || "Network error" };
      }
  };

  const handleDeleteStation = async (stationId: string) => {
      try {
          await fetch(`${API_URL}/api/receivers/${stationId}`, {
              method: 'DELETE'
          });
          setToastMessage(`Receiver ${stationId} deleted successfully.`);
          setTimeout(() => setToastMessage(null), 3000);
      } catch (err) {
          console.error("Failed to delete station", err);
      }
  };

  return (
    <div className="h-screen w-screen bg-tactical-bg text-tactical-text overflow-hidden flex flex-col font-mono transition-colors duration-300">
      <HeaderBar 
        connected={connected} 
        stationCount={receivers.length} 
        targetCount={targets.length} 
        onOpenLiveReceiver={() => setIsModalOpen(true)}
      />
      
      <div className="flex-1 flex flex-row overflow-hidden">
        {/* Left Panel */}
        <div className="w-[300px] shrink-0 border-r border-tactical-border z-10 bg-tactical-card shadow-xl transition-colors duration-300 flex flex-col">
            <div className="h-[25%]"><RFAnalysisPanel /></div>
            <div className="h-[50%]"><SignalDetectorPanel /></div>
            <div className="h-[25%]"><HealthMonitorPanel /></div>
        </div>

        {/* Center Main Area */}
        <div className="flex-1 flex flex-col min-w-0 bg-tactical-bg">
            <div className="flex-1 relative z-0 border-b border-tactical-border">
                <TacticalMap receivers={receivers} reports={reports} targets={targets} targetHistory={targetHistory} />
            </div>
            {/* Bottom Spectral Area */}
            <div className="h-[250px] shrink-0 z-10 flex border-b border-tactical-border bg-black">
                <div className="flex-1 border-r border-tactical-border"><LiveFFTPanel /></div>
                <div className="flex-1"><WaterfallPanel /></div>
            </div>
            {/* Timeline */}
            <div className="h-[100px] shrink-0 z-10">
                <MilitaryTimeline />
            </div>
        </div>

        {/* Right Panel */}
        <div className="w-[350px] shrink-0 border-l border-tactical-border z-10 bg-tactical-card shadow-xl transition-colors duration-300 flex flex-col">
            <div className="h-[50%] overflow-hidden"><TrackingPanel onDeleteStation={handleDeleteStation} /></div>
            <div className="h-[50%] overflow-hidden"><TargetDetailsPanel target={targets.length > 0 ? targets[0] : null} /></div>
        </div>
      </div>
      
      <LiveReceiverModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSave={handleSaveStation}
        onDelete={handleDeleteStation}
      />

      {showRegister && <Register onComplete={() => setShowRegister(false)} />}
      
      {toastMessage && (
        <div className="fixed bottom-4 right-4 z-50 bg-tactical-success/20 border border-tactical-success text-tactical-success px-4 py-3 rounded shadow-lg animate-fade-in flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-tactical-success"></div>
            {toastMessage}
        </div>
      )}
    </div>
  );
}

export default App;
