import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { createXRStore, XR } from '@react-three/xr';
import * as THREE from 'three';
import { Reticle } from './Reticle';
import { MeasurementLine } from './MeasurementLine';
import { CaptureButton } from './CaptureButton';
import { formatDistanceAuto, getDistanceInMeters } from '../../lib/arMath';
import { Button } from '../primitives/Button';
import { X } from 'lucide-react';
import { logger } from '../../lib/logger';

interface ArSceneProps {
  onSessionStart: () => void;
  onSessionEnd: () => void;
  sessionActive?: boolean;
  onUnsupported?: () => void;
}

function MeasureLogic({ pointA, pointB }: any) {
  // We use this ref to show the line updating live before point B is captured
  const livePointRef = useRef<THREE.Vector3 | null>(null);

  useFrame(() => {
    // Reticle updates hitMatrixRef and passes it to ArScene via state/ref.
  });

  return (
    <>
      <ambientLight intensity={1} />
      <directionalLight position={[10, 10, 10]} />
      
      {/* Show the final locked line if both points exist */}
      {pointA && pointB && (
        <MeasurementLine pointA={pointA} pointB={pointB} />
      )}

      {/* Show the live preview line if point A exists but B is not yet captured */}
      {pointA && !pointB && (
        <MeasurementLine pointA={pointA} isLive livePointRef={livePointRef} />
      )}
    </>
  );
}

export function ArScene({ onSessionStart, onSessionEnd, sessionActive, onUnsupported }: ArSceneProps) {
  const [overlayElement, setOverlayElement] = useState<HTMLDivElement | null>(null);
  
  // 4. Stabilize XR Store
  const store = useMemo(() => {
    if (!overlayElement) return null;
    return createXRStore({ 
      domOverlay: { root: overlayElement } as any,
      requiredFeatures: ['hit-test'],
      optionalFeatures: ['local-floor'],
      meshDetection: false,
      planeDetection: false,
      depthSensing: false,
      anchors: false,
      layers: false,
      hand: false,
      controller: false,
      offerSession: false,
    } as any);
  }, [overlayElement]);

  // 10. Cleanup XR session on unmount or visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible' && sessionActive) {
        try {
          const session = (store as any)?.getState?.()?.session;
          if (session) {
            logger.debug('[WebXR] Cleaning up session due to visibility change');
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
          logger.debug('[WebXR] Cleaning up session on unmount');
          session.end().catch(() => {});
        }
      } catch (e) {}
    };
  }, [sessionActive, store, onSessionEnd]);

  const [pointA, setPointA] = useState<THREE.Vector3 | null>(null);
  const [pointB, setPointB] = useState<THREE.Vector3 | null>(null);
  // const [distance, setDistance] = useState<number | null>(null); // Unused, display is tracked
  const [distanceDisplay, setDistanceDisplay] = useState<string | null>(null);
  
  const hitMatrixRef = useRef<THREE.Matrix4 | null>(null);
  const [isSurfaceFound, setIsSurfaceFound] = useState(false);
  
  const [cameraError, setCameraError] = useState<string | null>(null);
  
  // 2. Canvas Initialization Race
  const [isCanvasReady, setIsCanvasReady] = useState(false);
  
  // 5. Prevent Double Session Starts
  const [isStarting, setIsStarting] = useState(false);

  const handleCapture = useCallback(() => {
    if (!isSurfaceFound || !hitMatrixRef.current) return;

    // 1. Capture the exact current frame position from the ref
    const currentPos = new THREE.Vector3().setFromMatrixPosition(hitMatrixRef.current);

    if (!pointA) {
      setPointA(currentPos);
    } else {
      const dist = getDistanceInMeters(pointA, currentPos);
      logger.debug(`[Measure] Captured final distance. Raw: ${dist} meters. Display: ${formatDistanceAuto(dist)}`);
      setPointB(currentPos);
      setDistanceDisplay(formatDistanceAuto(dist));
    }
  }, [isSurfaceFound, pointA]);

  const handleMeasureAgain = useCallback(() => {
    setPointA(null);
    setPointB(null);
    setDistanceDisplay(null);
  }, []);

  // 6. Await XR Initialization
  const startAR = async () => {
    if (isStarting) {
      logger.debug('[WebXR] Session start already in progress. Ignoring duplicate click.');
      return;
    }
    
    if (!store || !isCanvasReady) {
      logger.debug('[WebXR] Attempted to start AR before store or canvas was ready.');
      return;
    }

    setIsStarting(true);
    setCameraError(null);
    const startTime = performance.now();
    
    try {
      logger.debug('[WebXR] Starting AR...');

      // 9. Camera Permission Flow
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        logger.debug('[WebXR] Requesting camera permissions...');
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          logger.debug('[WebXR] Camera ready. Releasing tracks for XR.');
          // Immediately stop tracks so WebXR can take exclusive control of the camera
          stream.getTracks().forEach(track => track.stop());
        } catch (mediaErr: any) {
          logger.warn('[WebXR] Media access error:', mediaErr);
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

      logger.debug(`[WebXR] Entering AR Session. Elapsed time: ${Math.round(performance.now() - startTime)}ms`);
      try {
        await store.enterAR();
      } catch (err: any) {
        const elapsed = Math.round(performance.now() - startTime);
        logger.debug(`[WebXR] AR session request rejected (device/GPU does not support the requested features). Elapsed: ${elapsed}ms, Browser: ${navigator.userAgent}`, err);
        
        // Go straight to fallback on ANY session start error instead of retrying
        if (onUnsupported) {
          setCameraError(null);
          onUnsupported();
        } else {
          logger.warn('[WebXR] AR unsupported and no fallback handler was provided.', err);
          setCameraError(err.message || 'Unknown error occurred while starting AR.');
        }
        return;
      }
      
      logger.debug('[WebXR] AR session started successfully.');
      onSessionStart();
    } finally {
      setIsStarting(false);
    }
  };

  const handleExit = useCallback(() => {
    logger.debug('[WebXR] AR session ended by user.');
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
    if (isCanvasReady) logger.debug('[WebXR] Canvas mounted, renderer created');
  }, [isCanvasReady]);

  useEffect(() => {
    if (store) logger.debug('[WebXR] XR store connected');
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
            
            {/* 2. Unified disable state - depends directly on isSurfaceFound */}
            {(!pointA || !pointB) ? (
              <div className="pointer-events-auto">
                <CaptureButton onClick={handleCapture} disabled={!isSurfaceFound} />
              </div>
            ) : (
              <div className="absolute bottom-8 left-0 right-0 flex flex-col items-center justify-center pointer-events-auto gap-4 px-4">
                <div className="bg-bg/90 backdrop-blur-md px-8 py-4 rounded-2xl shadow-xl border border-white/20">
                  <div className="text-4xl font-bold text-white text-center">
                    {distanceDisplay}
                  </div>
                </div>
                <div className="flex gap-4">
                  <Button variant="secondary" size="lg" onClick={handleMeasureAgain}>
                    Measure Again
                  </Button>
                  <Button variant="primary" size="lg" onClick={handleExit}>
                    Done
                  </Button>
                </div>
              </div>
            )}
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
                pointA={pointA}
                pointB={pointB}
              />
            </XR>
          )}
        </Canvas>
      </div>
    </>
  );
}
