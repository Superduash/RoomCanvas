import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { formatDistanceAuto, getDistanceInMeters } from '../../lib/arMath';

interface MeasurementLineProps {
  pointA: THREE.Vector3;
  pointB?: THREE.Vector3; // undefined means it's the live growing line
  livePointRef?: React.MutableRefObject<THREE.Vector3 | null>; // Ref updated every frame for performance
  isLive?: boolean;
}

export function MeasurementLine({ pointA, pointB, livePointRef, isLive }: MeasurementLineProps) {
  const lineRef = useRef<THREE.Mesh>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  
  // Reusable geometry and material
  const geometry = useMemo(() => new THREE.CylinderGeometry(0.003, 0.003, 1, 8), []);
  const material = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.9, depthTest: false }), []);
  
  const markerGeo = useMemo(() => new THREE.SphereGeometry(0.008, 16, 16), []);
  const markerMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ffffff', depthTest: false }), []);

  // Pre-allocate to avoid GC overhead every frame
  const midpoint = useMemo(() => new THREE.Vector3(), []);
  const orientation = useMemo(() => new THREE.Matrix4(), []);
  const upVector = useMemo(() => new THREE.Vector3(0, 1, 0), []);
  const rotationOffset = useMemo(() => new THREE.Matrix4().set(
      1, 0, 0, 0,
      0, 0, 1, 0,
      0, -1, 0, 0,
      0, 0, 0, 1
  ), []);

  useFrame(() => {
    if (!lineRef.current) return;
    
    // Determine current point B
    let currentB = pointB;
    if (isLive && livePointRef?.current) {
      currentB = livePointRef.current;
    }

    if (!currentB) {
      lineRef.current.visible = false;
      if (labelRef.current) labelRef.current.style.opacity = '0';
      return;
    }

    // Calculate distance
    const distance = getDistanceInMeters(pointA, currentB);
    
    // Avoid rendering tiny lines to prevent Z-fighting or weird visuals at origin
    if (distance < 0.01) {
      lineRef.current.visible = false;
      if (labelRef.current) labelRef.current.style.opacity = '0';
      return;
    }

    midpoint.copy(pointA).lerp(currentB, 0.5);

    // Update cylinder to span from A to B
    lineRef.current.position.copy(midpoint);
    lineRef.current.scale.set(1, distance, 1);
    
    // Rotate cylinder to point from A to B
    orientation.lookAt(pointA, currentB, upVector);
    orientation.multiply(rotationOffset);
    lineRef.current.quaternion.setFromRotationMatrix(orientation);
    lineRef.current.visible = true;

    // Update label text smoothly
    if (labelRef.current) {
      labelRef.current.innerText = formatDistanceAuto(distance);
      labelRef.current.style.opacity = '1';
    }
  });

  return (
    <group>
      {/* Point A Marker */}
      <mesh position={pointA} geometry={markerGeo} material={markerMat} renderOrder={10} />
      
      {/* Point B Marker (only if not live) */}
      {!isLive && pointB && (
        <mesh position={pointB} geometry={markerGeo} material={markerMat} renderOrder={10} />
      )}

      {/* The connecting line */}
      <mesh ref={lineRef} geometry={geometry} material={material} visible={false} renderOrder={5}>
        <Html
          center
          sprite
          zIndexRange={[100, 0]}
        >
          <div 
            ref={labelRef}
            className="bg-white/95 backdrop-blur-md border border-white/20 shadow-[0_4px_12px_rgba(0,0,0,0.15)] rounded-full px-3 py-1.5 text-sm font-bold text-slate-900 pointer-events-none whitespace-nowrap transition-opacity duration-150 transform -translate-y-8"
            style={{ opacity: 0 }}
          >
            0 cm
          </div>
        </Html>
      </mesh>
    </group>
  );
}
