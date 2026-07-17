import { useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import { useXRHitTest } from '@react-three/xr';
import { useFrame } from '@react-three/fiber';

interface ReticleProps {
  onHitTestResult: (matrix: THREE.Matrix4 | null) => void;
}

export function Reticle({ onHitTestResult }: ReticleProps) {
  const reticleRef = useRef<THREE.Group>(null);
  const [isFound, setIsFound] = useState(false);
  const foundRef = useRef(false);
  
  // Pre-allocate objects to avoid per-frame allocations
  const matrixHelper = useMemo(() => new THREE.Matrix4(), []);
  const targetScale = useMemo(() => new THREE.Vector3(1, 1, 1), []);

  useXRHitTest((results, getWorldMatrix) => {
    if (results.length > 0) {
      getWorldMatrix(matrixHelper, results[0]);

      if (reticleRef.current) {
        reticleRef.current.position.setFromMatrixPosition(matrixHelper);
        reticleRef.current.quaternion.setFromRotationMatrix(matrixHelper);
        reticleRef.current.visible = true;
      }
      
      onHitTestResult(matrixHelper);

      if (!foundRef.current) {
        foundRef.current = true;
        setIsFound(true);
      }
    } else {
      if (reticleRef.current) {
        reticleRef.current.visible = false;
      }
      onHitTestResult(null);
      if (foundRef.current) {
        foundRef.current = false;
        setIsFound(false);
      }
    }
  }, 'viewer');

  useFrame(() => {
    if (reticleRef.current) {
      const scaleVal = isFound ? 1 : 0.8;
      targetScale.set(scaleVal, scaleVal, scaleVal);
      reticleRef.current.scale.lerp(targetScale, 0.15);
    }
  });

  return (
    <group ref={reticleRef} visible={false}>
      {/* Outer Ring */}
      <mesh rotation-x={-Math.PI / 2}>
        <ringGeometry args={[0.045, 0.05, 32]} />
        <meshBasicMaterial 
          color={isFound ? '#ffffff' : '#e2e8f0'} 
          transparent 
          opacity={isFound ? 0.9 : 0.4} 
          depthTest={false} 
        />
      </mesh>
      {/* Inner Dot */}
      <mesh rotation-x={-Math.PI / 2}>
        <circleGeometry args={[0.006, 16]} />
        <meshBasicMaterial 
          color={isFound ? '#ffffff' : '#e2e8f0'} 
          transparent 
          opacity={isFound ? 1 : 0.6} 
          depthTest={false} 
        />
      </mesh>
    </group>
  );
}
