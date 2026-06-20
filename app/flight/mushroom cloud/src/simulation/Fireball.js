import * as THREE from 'three';
import { fireballVert as vertexShader, fireballFrag as fragmentShader } from '../shaders/shaders.js';

const clamp01 = (v) => Math.max(0, Math.min(1, v));

export class Fireball {
  constructor(scene) {
    this.group = new THREE.Group();
    this.group.position.y = 2.2;
    scene.add(this.group);
    this.layers = [];

    const configs = [
      { scale: 1, core: 0xffffdf, edge: 0xff5b08, opacity: 1, noise: 1.05 },
      { scale: 1.18, core: 0xffd64a, edge: 0x7b1002, opacity: .42, noise: 1.7 },
      { scale: .72, core: 0xffffff, edge: 0xffb018, opacity: .7, noise: .65 }
    ];
    for (const cfg of configs) {
      const material = new THREE.ShaderMaterial({
        vertexShader, fragmentShader, transparent: true, depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uTime: { value: 0 }, uNoiseStrength: { value: cfg.noise },
          uOpacity: { value: 0 }, uIntensity: { value: 1 },
          uCoreColor: { value: new THREE.Color(cfg.core) }, uEdgeColor: { value: new THREE.Color(cfg.edge) }
        }
      });
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 96, 64), material);
      mesh.userData.cfg = cfg;
      this.group.add(mesh);
      this.layers.push(mesh);
    }
  }

  reset() {
    this.group.visible = false;
  }

  update(_delta, timeline, params) {
    const time = timeline.time;
    const active = time >= 0.05 && time < 9.0;
    this.group.visible = active;
    if (!active) return;
    const t = clamp01((time - .05) / 8.5);
    const expansion = Math.pow(t, .34);
    const fade = 1 - clamp01((time - 3.5) / 5.0);
    const base = params.explosionScale * (0.28 + expansion * 4.5);
    this.group.position.y = 1.5 + expansion * 2.9;
    this.layers.forEach((mesh, i) => {
      const pulse = 1 + Math.sin(time * (5.1 + i) + i * 2.3) * .045;
      mesh.scale.setScalar(base * mesh.userData.cfg.scale * pulse);
      mesh.rotation.set(time * .18 * (i + 1), time * .12 * (i + 1), time * .09);
      mesh.material.uniforms.uTime.value = time + i * 4.1;
      mesh.material.uniforms.uOpacity.value = fade * mesh.userData.cfg.opacity;
      mesh.material.uniforms.uIntensity.value = params.fireballIntensity * (1.25 - t * .35);
    });
  }

  dispose() {
    for (const mesh of this.layers) {
      mesh.geometry.dispose();
      mesh.material.dispose();
    }
  }
}
