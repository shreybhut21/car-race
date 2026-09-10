import * as THREE from 'three';
export function createParticles(scene) { const material = new THREE.PointsMaterial({ color: 0xff335f, size: .12 }); const points = new THREE.Points(new THREE.BufferGeometry(), material); scene.add(points); return points; }
