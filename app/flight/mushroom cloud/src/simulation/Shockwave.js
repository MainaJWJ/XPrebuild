import * as THREE from 'three';
import { shockwaveVert as vertexShader, shockwaveFrag as fragmentShader } from '../shaders/shaders.js';

const clamp01 = (v) => Math.max(0, Math.min(1, v));

export class Shockwave {
  constructor(scene) {
    const geometry = new THREE.RingGeometry(.82, 1, 384, 18);
    const material = new THREE.ShaderMaterial({
      vertexShader, fragmentShader, transparent: true, depthWrite: false,
      side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uOpacity: { value: 0 },
        uStrength: { value: 1 },
        uProgress: { value: 0 }
      }
    });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.rotation.x = -Math.PI / 2;
    this.mesh.position.y = .035;
    scene.add(this.mesh);
  }

  reset() { this.mesh.visible = false; }

  update(_delta, timeline, params) {
    const time = timeline.time;
    const p = clamp01((time - .28) / 18);
    this.mesh.visible = p > 0 && p < 1;
    if (!this.mesh.visible) return;
    const radius = params.explosionScale * (1.4 + 52 * Math.pow(p, .34));
    // RingGeometry lies in local XY; local Z becomes world height after rotation.
    this.mesh.scale.set(radius, radius, 1);
    this.mesh.material.uniforms.uTime.value = time;
    this.mesh.material.uniforms.uOpacity.value = Math.pow(1 - p, 1.55) * .42 * params.shockwaveStrength;
    this.mesh.material.uniforms.uStrength.value = params.shockwaveStrength;
    this.mesh.material.uniforms.uProgress.value = p;
  }

  dispose() {
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
  }
}
