import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { createXRStore, XR } from '@react-three/xr';
import * as THREE from 'three';
import { Reticle } from './Reticle';
import { MeasurementLine } from './MeasurementLine';
import { CaptureButton } from './CaptureButton';
import { MeasurementListPanel } from './MeasurementListPanel';
import { UseArMeasurementsReturn } from '../../hooks/useArMeasurements';
import { formatDistanceAuto, getDistanceInMeters } from '../../lib/arMath';
import { Button } from '../primitives/Button';
import { X } from 'lucide-react';

interface ArSceneProps {
  onSessionStart: () => void;
  onSessionEnd: () => void;
  measurementsState: UseArMeasurementsReturn;
  sessionActive?: boolean;
  onUnsupported?: () => void;
}

function MeasureLogic({ measurementsState, pointA }: any) {
  const livePointRef = useRef<THREE.Vector3 | null>(null);

  useFrame(() => {
    // Reticle updates hitMatrixRef and passes it to ArScene via state/ref.
  });

  return (
    <>
      <ambientLight intensity={1} />
      <directionalLight position={[10, 10, 10]} />
      
      {measurementsState.measurements.map((m: any) => (
        <MeasurementLine key={m.id} pointA={m.pointA} pointB={m.pointB} />
      ))}

      {pointA && (
        <MeasurementLine pointA={pointA} isLive livePointRef={livePointRef} />
      )}
    </>
  );
}

export function ArScene({ onSessionStart, onSessionEnd, measurementsState, sessionActive, onUnsupported }: ArSceneProps) {
  const [overlayElement, setOverlayElement] = useState<HTMLDivElement | null>(null);
  
  // 4. Stabilize XR Store
  const store = useMemo(() => {
    if (!overlayElement) return null;
    return createXRStore({ 
      domOverlay: { root: overlayElement } as any,
      requiredFeatures: ['dom-overlay'],
      optionalFeatures: ['hit-test']
    } as any);
  }, [overlayElement]);

  // 10. Cleanup XR session on unmount or visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible' && sessionActive) {
        try {
          const session = (store as any)?.getState?.()?.session;
          if (session) {
            console.log('[WebXR] Cleaning up session due to visibility change');
            session.end().catch(() => {});
          }
        } catch (e) {
          // ignore
        } finally {
          onSessionEnd();
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      try {
        const session = (store as any)?.getState?.()?.session;
        if (session) {
          console.log('[WebXR] Cleaning up session on unmount');
          session.end().catch(() => {});
        }
      } catch (e) {}
    };
  }, [sessionActive, store, onSessionEnd]);

  const [pointA, setPointA] = useState<THREE.Vector3 | null>(null);
  const hitMatrixRef = useRef<THREE.Matrix4 | null>(null);
  const [isSurfaceFound, setIsSurfaceFound] = useState(false);
  
  const [cameraError, setCameraError] = useState<string | null>(null);
  
  // 2. Canvas Initialization Race
  const [isCanvasReady, setIsCanvasReady] = useState(false);
  
  // 5. Prevent Double Session Starts
  const [isStarting, setIsStarting] = useState(false);

  const handleCapture = useCallback(() => {
    if (!isSurfaceFound || !hitMatrixRef.current) return;

    const currentPos = new THREE.Vector3().setFromMatrixPosition(hitMatrixRef.current);

    if (!pointA) {
      setPointA(currentPos);
    } else {
      const distance = getDistanceInMeters(pointA, currentPos);
      measurementsState.addMeasurement({
        id: Math.random().toString(36).substring(7),
        pointA: pointA,
        pointB: currentPos,
        distanceCm: formatDistanceAuto(distance)
      });
      setPointA(null);
    }
  }, [isSurfaceFound, pointA, measurementsState]);

  // 6. Await XR Initialization
  const startAR = async () => {
    if (isStarting) {
      console.log('[WebXR] Session start already in progress. Ignoring duplicate click.');
      return;
    }
    
    if (!store || !isCanvasReady) {
      console.warn('[WebXR] Attempted to start AR before store or canvas was ready.');
      return;
    }

    setIsStarting(true);
    setCameraError(null);
    const startTime = performance.now();
    
    try {
      console.log('[WebXR] Starting AR...');

      // 9. Camera Permission Flow
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        console.log('[WebXR] Requesting camera permissions...');
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          console.log('[WebXR] Camera ready. Releasing tracks for XR.');
          // Immediately stop tracks so WebXR can take exclusive control of the camera
          stream.getTracks().forEach(track => track.stop());
        } catch (mediaErr: any) {
          console.error('[WebXR] Media access error:', mediaErr);
          if (mediaErr.name === 'NotAllowedError' || mediaErr.message?.includes('Permission')) {
            throw new Error("Camera permission was denied. Please enable camera access in your browser settings.");
          } else if (mediaErr.name === 'NotFoundError') {
            throw new Error("No camera found on this device.");
          } else if (mediaErr.name === 'NotReadableError') {
            throw new Error("Camera is already in use by another application.");
          }
          throw mediaErr;
        }
      }

      console.log(`[WebXR] Entering AR Session. Elapsed time: ${Math.round(performance.now() - startTime)}ms`);
      await store.enterAR();
      
      console.log('[WebXR] AR session started successfully.');
      onSessionStart();
    } catch (err: any) {
      const elapsed = Math.round(performance.now() - startTime);
      console.error(`[WebXR] Failed to start AR. Stage: Startup, Elapsed time: ${elapsed}ms, Browser: ${navigator.userAgent}`, err);
      
      const isConfigError = err?.message?.includes('session configuration') || err?.name === 'NotSupportedError';
      if (isConfigError && onUnsupported) {
        setCameraError(null);
        onUnsupported();
      } else {
        // Format a user-friendly error message
        setCameraError(err.message || 'Unknown error occurred while starting AR.');
      }
    } finally {
      setIsStarting(false);
    }
  };

  const handleExit = useCallback(() => {
    console.log('[WebXR] AR session ended by user.');
    try {
      const session = (store as any)?.getState?.()?.session;
      if (session) {
        session.end().catch(() => {});
      }
    } catch (e) {
      // Ignore errors if session is already ended
    } finally {
      onSessionEnd();
    }
  }, [store, onSessionEnd]);

  // 11. Logging lifecycle
  useEffect(() => {
    if (isCanvasReady) console.log('[WebXR] Canvas mounted\n[WebXR] Three renderer created');
  }, [isCanvasReady]);

  useEffect(() => {
    if (store) console.log('[WebXR] XR store connected');
  }, [store]);

  return (
    <>
      <div 
        ref={setOverlayElement} 
        id="xr-overlay"
        className="fixed inset-0 pointer-events-none z-40 hidden" 
        style={{ display: sessionActive ? 'block' : 'none' }}
      >
        {sessionActive && (
          <>
            <div className="absolute top-4 left-4 right-4 flex justify-end pointer-events-auto">
              <Button 
                variant="secondary" 
                size="sm" 
                icon={<X size={16} />}
                onClick={handleExit}
              >
                Exit
              </Button>
            </div>
            
            <MeasurementListPanel measurementsState={measurementsState} />
            
            <div className="pointer-events-auto">
              <CaptureButton onClick={handleCapture} disabled={!isSurfaceFound} />
            </div>
          </>
        )}
      </div>

      {!sessionActive && (
        <div className="flex flex-col items-center mt-4">
          {cameraError && (
            <div className="mb-4 max-w-sm p-3 text-sm text-center text-white bg-red-500/90 rounded-lg shadow-sm border border-red-400">
              {cameraError}
            </div>
          )}
          <Button 
            variant="primary" 
            size="lg" 
            onClick={startAR} 
            disabled={!store || !isCanvasReady || isStarting} 
            className="pointer-events-auto"
          >
            {(!store || !isCanvasReady) ? 'Initializing AR...' : isStarting ? 'Starting Camera...' : 'Start Measuring'}
          </Button>
        </div>
      )}

      {/* 3. Verify Component Hierarchy: Canvas -> XR -> Scene */}
      <div className="absolute inset-0 -z-10" style={{ visibility: sessionActive ? 'visible' : 'hidden' }}>
        <Canvas onCreated={() => setIsCanvasReady(true)}>
          {store && (
            <XR store={store}>
              <Reticle 
                onHitTestResult={(matrix) => {
                  hitMatrixRef.current = matrix;
                  if (matrix && !isSurfaceFound) setIsSurfaceFound(true);
                  if (!matrix && isSurfaceFound) setIsSurfaceFound(false);
                }} 
              />
              <MeasureLogic 
                measurementsState={measurementsState}
                pointA={pointA}
              />
            </XR>
          )}
        </Canvas>
      </div>
    </>
  );
}
