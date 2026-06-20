import * as THREE from 'three';
import { volumeVert as vertexShader, volumeFrag as fragmentShader } from '../shaders/shaders.js';

export class ExplosionVolume {
  constructor(scene, camera) {
    this.camera = camera;
    this.boxMin = new THREE.Vector3(-27, 0, -27);
    this.boxMax = new THREE.Vector3(27, 55, 27);
    this.activeBoxMin = new THREE.Vector3();
    this.activeBoxMax = new THREE.Vector3();
    const size = new THREE.Vector3().subVectors(this.boxMax, this.boxMin);
    const center = new THREE.Vector3().addVectors(this.boxMin, this.boxMax).multiplyScalar(.5);
    const geometry = new THREE.BoxGeometry(size.x, size.y, size.z);
    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      side: THREE.BackSide,
      blending: THREE.NormalBlending,
      uniforms: {
        uTime: { value: 0 },
        uScale: { value: 1 },
        uFireball: { value: 0 },
        uStemRise: { value: 0 },
        uCapSpread: { value: 0 },
        uHeadRise: { value: 0 },
        uHeadGrowth: { value: 0 },
        uCollar: { value: 0 },
        uCooling: { value: 0 },
        uHeat: { value: 0 },
        uDensity: { value: 1 },
        uTurbulence: { value: 1 },
        uFireIntensity: { value: 1 },
        uStepCount: { value: 44 },
        uBoxMin: { value: this.activeBoxMin.clone() },
        uBoxMax: { value: this.activeBoxMax.clone() },
        uCameraPosition: { value: new THREE.Vector3() }
      }
    });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.copy(center);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 2;
    scene.add(this.mesh);
  }

  reset() {
    this.mesh.visible = false;
  }

  update(_delta, timeline, params) {
    this.mesh.visible = timeline.time > .02;
    const uniforms = this.mesh.material.uniforms;
    uniforms.uTime.value = timeline.time;
    uniforms.uScale.value = params.explosionScale;
    uniforms.uFireball.value = timeline.fireball;
    uniforms.uStemRise.value = timeline.stemRise;
    uniforms.uCapSpread.value = timeline.capSpread;
    uniforms.uHeadRise.value = timeline.headRise;
    uniforms.uHeadGrowth.value = timeline.headGrowth;
    uniforms.uCollar.value = timeline.collar;
    uniforms.uCooling.value = timeline.cooling;
    uniforms.uHeat.value = timeline.heat;
    uniforms.uDensity.value = params.smokeDensity * .92;
    uniforms.uTurbulence.value = params.turbulenceStrength;
    uniforms.uFireIntensity.value = params.fireballIntensity;
    uniforms.uStepCount.value = Math.min(256, params.volumeSteps + (1 - timeline.headGrowth) * 18);
    const scale = params.explosionScale;
    const capY = (4 + 43 * timeline.headRise) * scale;
    const capRadius = (7.5 + 14 * timeline.headGrowth) * scale;
    const capThickness = (5.8 + 9.2 * timeline.headGrowth) * scale;
    const halfWidth = capRadius + 4.5 * scale;
    this.activeBoxMin.set(-halfWidth, 0, -halfWidth);
    this.activeBoxMax.set(halfWidth, Math.min(55 * scale, capY + capThickness + 3.5 * scale), halfWidth);
    uniforms.uBoxMin.value.copy(this.activeBoxMin);
    uniforms.uBoxMax.value.copy(this.activeBoxMax);
    uniforms.uCameraPosition.value.copy(this.camera.position);
  }

  dispose() {
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
  }
}
