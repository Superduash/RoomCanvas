import { useState, useRef, useEffect } from 'react';
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
}

function MeasureLogic({ measurementsState, pointA }: any) {
  const livePointRef = useRef<THREE.Vector3 | null>(null);

  useFrame(() => {
    // Reticle updates hitMatrixRef and passes it to ArScene via state/ref.
    // We already have hitMatrixRef passed in props, wait, let's just pass it.
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

export function ArScene({ onSessionStart, onSessionEnd, measurementsState, sessionActive }: ArSceneProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [store, setStore] = useState<any>(null);

  useEffect(() => {
    if (overlayRef.current && !store) {
      setStore(createXRStore({ domOverlay: { root: overlayRef.current } as any }));
    }
  }, [store]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible' && sessionActive) {
        try {
          const session = (store as any)?.getState?.()?.session;
          if (session) session.end().catch(() => {});
        } catch (e) {
          // ignore
        } finally {
          onSessionEnd();
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [sessionActive, store, onSessionEnd]);

  const [pointA, setPointA] = useState<THREE.Vector3 | null>(null);
  const hitMatrixRef = useRef<THREE.Matrix4 | null>(null);
  const [isSurfaceFound, setIsSurfaceFound] = useState(false);

  const handleCapture = () => {
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
  };

  const startAR = async () => {
    try {
      if (store) {
        await store.enterAR();
        onSessionStart();
      }
    } catch (err) {
      console.error('Failed to start AR', err);
    }
  };

  return (
    <>
      <div 
        ref={overlayRef} 
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
                onClick={() => {
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
                }}
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
        <Button variant="primary" size="lg" onClick={startAR} className="mt-4" disabled={!store}>
          Start Measuring
        </Button>
      )}

      {store && (
        <div className="absolute inset-0 -z-10" style={{ display: sessionActive ? 'block' : 'none' }}>
          <Canvas>
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
          </Canvas>
        </div>
      )}
    </>
  );
}
