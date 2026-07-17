import { useState, useCallback } from 'react';
import * as THREE from 'three';

export type ARMeasurement = {
  id: string;
  pointA: THREE.Vector3;
  pointB: THREE.Vector3;
  distanceCm: string;
};

export function useArMeasurements() {
  const [measurements, setMeasurements] = useState<ARMeasurement[]>([]);

  const addMeasurement = useCallback((measurement: ARMeasurement) => {
    setMeasurements((prev) => [...prev, measurement]);
  }, []);

  const removeMeasurement = useCallback((id: string) => {
    setMeasurements((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const clearMeasurements = useCallback(() => {
    setMeasurements([]);
  }, []);

  return {
    measurements,
    addMeasurement,
    removeMeasurement,
    clearMeasurements,
  };
}

export type UseArMeasurementsReturn = ReturnType<typeof useArMeasurements>;
