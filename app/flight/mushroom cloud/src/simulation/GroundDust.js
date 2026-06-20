import * as THREE from 'three';
import { smokeVert as smokeVertex, smokeFrag as smokeFragment } from '../shaders/shaders.js';

const rand = (i, seed = 1) => {
  const x = Math.sin(i * 91.3458 + seed * 17.132) * 47453.5453;
  return x - Math.floor(x);
};

export class GroundDust {
  constructor(scene, turbulence, maxCount = 60000) {
    this.turbulence = turbulence;
    this.maxCount = maxCount;
    this.activeCount = 0;
    this.spawned = 0;
    this.force = new THREE.Vector3();

    this.position = new Float32Array(maxCount * 3);
    this.velocity = new Float32Array(maxCount * 3);
    this.age = new Float32Array(maxCount);
    this.lifetime = new Float32Array(maxCount);
    this.size = new Float32Array(maxCount);
    this.alpha = new Float32Array(maxCount);
    this.temperature = new Float32Array(maxCount);
    this.density = new Float32Array(maxCount);
    this.rotation = new Float32Array(maxCount);
    this.angularVelocity = new Float32Array(maxCount);
    this.type = new Float32Array(maxCount);

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(this.position, 3));
    geometry.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1));
    geometry.setAttribute('aAlpha', new THREE.BufferAttribute(this.alpha, 1));
    geometry.setAttribute('aTemperature', new THREE.BufferAttribute(this.temperature, 1));
    geometry.setAttribute('aDensity', new THREE.BufferAttribute(this.density, 1));
    geometry.setAttribute('aRotation', new THREE.BufferAttribute(this.rotation, 1));
    geometry.setAttribute('aType', new THREE.BufferAttribute(this.type, 1));
    for (const attribute of Object.values(geometry.attributes)) {
      attribute.setUsage(THREE.DynamicDrawUsage);
    }
    geometry.setDrawRange(0, 0);

    const material = new THREE.ShaderMaterial({
      vertexShader: smokeVertex, fragmentShader: smokeFragment, transparent: true,
      depthWrite: false, depthTest: true, blending: THREE.NormalBlending,
      uniforms: { uTime: { value: 0 }, uSmokeDensity: { value: .8 } }
    });
    this.points = new THREE.Points(geometry, material);
    this.points.frustumCulled = false;
    scene.add(this.points);
  }

  reset() {
    this.activeCount = 0;
    this.spawned = 0;
    this.points.geometry.setDrawRange(0, 0);
  }

  spawn(count, scale) {
    const end = Math.min(this.maxCount, this.activeCount + count);
    for (let i = this.activeCount; i < end; i++) {
      const r1 = rand(this.spawned, 1), r2 = rand(this.spawned, 2), r3 = rand(this.spawned, 3);
      const angle = r1 * Math.PI * 2;
      const radius = (.4 + r2 * 2.6) * scale;
      const p = i * 3;
      this.position[p] = Math.cos(angle) * radius;
      this.position[p + 1] = .2 + r3 * 1.05;
      this.position[p + 2] = Math.sin(angle) * radius;
      const speed = (4.6 + r2 * 8.0) * scale * (.78 + Math.sin(angle * 5.0) * .16);
      this.velocity[p] = Math.cos(angle) * speed;
      this.velocity[p + 1] = 1.8 + r3 * 4.8;
      this.velocity[p + 2] = Math.sin(angle) * speed;
      this.age[i] = 0;
      this.lifetime[i] = 16.0 + r2 * 12.0;
      this.size[i] = 2.4 + r3 * 4.8;
      this.alpha[i] = 0;
      this.temperature[i] = .62 + r2 * .32;
      this.density[i] = .5 + r3 * .5;
      this.rotation[i] = r1 * Math.PI * 2;
      this.angularVelocity[i] = 0;
      this.type[i] = 2;
      this.spawned++;
    }
    this.activeCount = end;
    this.points.geometry.setDrawRange(0, end);
    this.markUpdated(['aDensity', 'aType'], end);
  }

  markUpdated(names, count = this.activeCount) {
    for (const name of names) {
      const attribute = this.points.geometry.attributes[name];
      attribute.clearUpdateRanges();
      attribute.addUpdateRange(0, count * attribute.itemSize);
      attribute.needsUpdate = true;
    }
  }

  update(delta, timeline, params) {
    const time = timeline.time;
    if (time > .45 && time < 3.6) {
      this.spawn(Math.ceil(delta * 3300 * params.dustAmount), params.explosionScale);
    }
    const dt = Math.min(delta, .033);
    for (let i = 0; i < this.activeCount; i++) {
      const p = i * 3;
      this.age[i] += dt;
      const life = this.age[i] / this.lifetime[i];
      if (life >= 1) {
        this.alpha[i] = 0;
        continue;
      }
      this.force.set(this.position[p], this.position[p + 1], this.position[p + 2]);
      this.turbulence.getForce(this.force, time, this.force).multiplyScalar(params.turbulenceStrength * 1.2);
      this.velocity[p] += this.force.x * dt;
      this.velocity[p + 1] += (this.force.y - .75) * dt;
      this.velocity[p + 2] += this.force.z * dt;
      const radius = Math.sqrt(this.position[p] * this.position[p] + this.position[p + 2] * this.position[p + 2]) + .001;
      const entrainment = timeline.stemRise * (1 - timeline.cooling) * Math.max(0, 1 - radius / (18 * params.explosionScale));
      this.velocity[p] -= (this.position[p] / radius) * entrainment * 6.5 * dt;
      this.velocity[p + 1] += entrainment * 5.2 * dt;
      this.velocity[p + 2] -= (this.position[p + 2] / radius) * entrainment * 6.5 * dt;
      const drag = Math.pow(.91, dt * 60);
      this.velocity[p] *= drag;
      this.velocity[p + 2] *= drag;
      this.position[p] += this.velocity[p] * dt;
      this.position[p + 1] = Math.max(.12, this.position[p + 1] + this.velocity[p + 1] * dt);
      this.position[p + 2] += this.velocity[p + 2] * dt;
      if (this.position[p + 1] <= .13) this.velocity[p + 1] = Math.abs(this.velocity[p + 1]) * .2;
      this.temperature[i] *= Math.pow(.965, dt * 60);
      this.rotation[i] += this.angularVelocity[i] * dt;
      this.size[i] = Math.min(7.5, this.size[i] + dt * .16);
      this.alpha[i] = Math.sin(Math.min(1, life * 4) * Math.PI * .5) * Math.pow(1 - life, 1.2) * .72;
    }
    this.points.material.uniforms.uTime.value = time;
    this.points.material.uniforms.uSmokeDensity.value = params.smokeDensity * .75;
    this.markUpdated(['position', 'aSize', 'aAlpha', 'aTemperature', 'aRotation']);
  }

  dispose() {
    this.points.geometry.dispose();
    this.points.material.dispose();
  }
}
