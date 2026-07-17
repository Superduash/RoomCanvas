import { useState, useEffect } from 'react';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { ArUnsupportedFallback } from '../components/live-measure/ArUnsupportedFallback';
import { ArScene } from '../components/live-measure/ArScene';
import { useArMeasurements } from '../hooks/useArMeasurements';
import { ScanLine } from 'lucide-react';

export function LiveMeasurePage() {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [sessionActive, setSessionActive] = useState(false);
  const measurements = useArMeasurements();

  useEffect(() => {
    // Aggressively block iOS since Safari does not support WebXR natively
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    
    if (isIOS) {
      setSupported(false);
      return;
    }

    if (navigator.xr && navigator.xr.isSessionSupported) {
      navigator.xr.isSessionSupported('immersive-ar').then((isSupported) => {
        setSupported(isSupported);
      }).catch(() => {
        setSupported(false);
      });
    } else {
      setSupported(false);
    }
  }, []);

  if (supported === null) {
    return <div className="min-h-screen bg-bg" />; // Checking capability
  }

  if (!supported) {
    return <ArUnsupportedFallback />;
  }

  return (
    <ErrorBoundary>
      <div className="fixed inset-0 z-50 bg-bg text-text-primary flex flex-col pt-[env(safe-area-inset-top)]">
        {!sessionActive && (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center pointer-events-none">
            <ScanLine className="w-16 h-16 text-accent mb-4" />
            <h1 className="text-2xl font-bold mb-2">Live AR Measure</h1>
            <p className="text-text-secondary mb-8 max-w-sm">
              Point your camera at real-world surfaces to measure distances exactly like Apple Measure.
            </p>
          </div>
        )}
        {/* The ArScene is permanent and never unmounted by structural changes */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="w-full h-full pointer-events-auto">
            <ArScene 
              sessionActive={sessionActive} 
              onSessionStart={() => setSessionActive(true)} 
              onSessionEnd={() => setSessionActive(false)} 
              measurementsState={measurements} 
            />
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}
