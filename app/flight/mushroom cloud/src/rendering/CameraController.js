import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export class CameraController {
  constructor(camera, domElement) {
    this.camera = camera;
    this.controls = new OrbitControls(camera, domElement);
    this.controls.target.set(0, 24, 0);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = .045;
    this.controls.minDistance = 42;
    this.controls.maxDistance = 120;
    this.controls.minPolarAngle = Math.PI * .25;
    this.controls.maxPolarAngle = Math.PI * .49;
    this.basePosition = camera.position.clone();
    this.shake = new THREE.Vector3();
  }

  reset() {
    this.camera.position.copy(this.basePosition);
    this.controls.target.set(0, 24, 0);
    this.controls.update();
  }

  update(time, flash, amount) {
    const intensity = flash * amount * .32;
    this.shake.set(
      Math.sin(time * 83.1) * intensity,
      Math.sin(time * 67.7 + 1.2) * intensity * .55,
      Math.cos(time * 72.3) * intensity
    );
    this.camera.position.add(this.shake);
    this.controls.target.y = 20 + Math.min(8, time * .32);
    this.controls.update();
    this.camera.position.sub(this.shake);
  }
}
