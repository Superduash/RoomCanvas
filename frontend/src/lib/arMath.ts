import { Vector3 } from 'three';

/**
 * Calculates the Euclidean distance between two points in 3D space.
 * WebXR hit-test points are returned in meters.
 */
export function getDistanceInMeters(p1: Vector3, p2: Vector3): number {
  return p1.distanceTo(p2);
}

/**
 * Formats a distance in meters to a readable centimeter string.
 * Example: 1.423 meters -> "142.3 cm"
 */
export function formatDistanceToCm(distanceMeters: number): string {
  const cm = distanceMeters * 100;
  return `${cm.toFixed(1)} cm`;
}

/**
 * Formats a given number of meters to human-readable string (either m or cm depending on size).
 */
export function formatDistanceAuto(distanceMeters: number): string {
  if (distanceMeters >= 1) {
    return `${distanceMeters.toFixed(2)} m`;
  }
  return formatDistanceToCm(distanceMeters);
}
