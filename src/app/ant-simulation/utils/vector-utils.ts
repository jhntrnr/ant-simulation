import { Vector2 } from 'three';

export function limitVector(vector: Vector2, maxMagnitude: number): Vector2 {
    const magnitude = vector.length();
    
    if (magnitude > maxMagnitude) {
        return vector.normalize().multiplyScalar(maxMagnitude);
    }

    return vector;
}

export function rotateVector(vector: Vector2, angle: number): Vector2 {
    const x = vector.x * Math.cos(angle) - vector.y * Math.sin(angle);
    const y = vector.x * Math.sin(angle) + vector.y * Math.cos(angle);
    return new Vector2(x, y);
}