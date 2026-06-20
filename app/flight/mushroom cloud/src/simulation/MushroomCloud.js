import * as THREE from 'three';
import { billowVert as billowVertex, billowFrag as billowFragment } from '../shaders/shaders.js';

const TAU = Math.PI * 2;
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const rand = (i, seed = 1) => {
  const x = Math.sin(i * 73.156 + seed * 19.771) * 43758.5453;
  return x - Math.floor(x);
};

export class MushroomCloud {
  constructor(scene, turbulence, maxCount = 200000) {
    this.turbulence = turbulence;
    this.maxCount = maxCount;
    this.activeCount = 0;
    this.spawnSerial = 0;
    this.emissionCarry = 0;
    this.force = new THREE.Vector3();
    this.positionVector = new THREE.Vector3();

    this.position = new Float32Array(maxCount * 3);
    this.velocity = new Float32Array(maxCount * 3);
    this.age = new Float32Array(maxCount);
    this.lifetime = new Float32Array(maxCount);
    this.temperature = new Float32Array(maxCount);
    this.density = new Float32Array(maxCount);
    this.size = new Float32Array(maxCount);
    this.rotation = new Float32Array(maxCount);
    this.angularVelocity = new Float32Array(maxCount);
    this.alpha = new Float32Array(maxCount);
    this.type = new Float32Array(maxCount);
    this.color = new Float32Array(maxCount * 3);

    const geometry = new THREE.InstancedBufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
      -.5, -.5, 0, .5, -.5, 0, .5, .5, 0, -.5, .5, 0
    ]), 3));
    geometry.setAttribute('uv', new THREE.BufferAttribute(new Float32Array([
      0, 0, 1, 0, 1, 1, 0, 1
    ]), 2));
    geometry.setIndex([0, 1, 2, 0, 2, 3]);
    geometry.setAttribute('aPosition', new THREE.InstancedBufferAttribute(this.position, 3));
    geometry.setAttribute('aSize', new THREE.InstancedBufferAttribute(this.size, 1));
    geometry.setAttribute('aAlpha', new THREE.InstancedBufferAttribute(this.alpha, 1));
    geometry.setAttribute('aTemperature', new THREE.InstancedBufferAttribute(this.temperature, 1));
    geometry.setAttribute('aDensity', new THREE.InstancedBufferAttribute(this.density, 1));
    geometry.setAttribute('aRotation', new THREE.InstancedBufferAttribute(this.rotation, 1));
    geometry.setAttribute('aType', new THREE.InstancedBufferAttribute(this.type, 1));
    for (const attribute of Object.values(geometry.attributes)) {
      if (attribute.isInstancedBufferAttribute) attribute.setUsage(THREE.DynamicDrawUsage);
    }
    geometry.instanceCount = 0;

    const material = new THREE.ShaderMaterial({
      vertexShader: billowVertex, fragmentShader: billowFragment,
      transparent: true, depthWrite: false, depthTest: true,
      blending: THREE.NormalBlending,
      uniforms: { uTime: { value: 0 }, uSmokeDensity: { value: 1 } }
    });
    this.points = new THREE.Mesh(geometry, material);
    this.points.frustumCulled = false;
    this.points.renderOrder = 4;
    scene.add(this.points);
  }

  reset() {
    this.activeCount = 0;
    this.spawnSerial = 0;
    this.emissionCarry = 0;
    this.points.geometry.instanceCount = 0;
  }

  spawn(count, time, scale, timeline) {
    const end = Math.min(this.maxCount, this.activeCount + count);
    for (let i = this.activeCount; i < end; i++) {
      const s = this.spawnSerial++;
      const r1 = rand(s, 1), r2 = rand(s, 2), r3 = rand(s, 3), r4 = rand(s, 4);
      const angle = r1 * TAU;
      const radius = Math.sqrt(r2) * (3.0 + clamp01(time / 10) * 4.5) * scale;
      const p = i * 3;
      const capProgress = clamp01((time - 8) / 12);
      const capParticle = r4 < capProgress * .72;
      const capRadius = (7 + r2 * 15) * scale;
      const headY = (4 + 43 * timeline.headRise) * scale;
      this.position[p] = Math.cos(angle) * (capParticle ? capRadius : radius);
      this.position[p + 1] = capParticle ? headY + (r3 - .5) * 12 * scale : .9 + r3 * 1.8;
      this.position[p + 2] = Math.sin(angle) * (capParticle ? capRadius : radius);
      this.velocity[p] = Math.cos(angle) * (capParticle ? 1.2 : -1.8 - r2 * 1.5);
      this.velocity[p + 1] = capParticle ? (r3 - .5) * 1.2 : (7.8 + r3 * 7.0) * scale;
      this.velocity[p + 2] = Math.sin(angle) * (capParticle ? 1.2 : -1.8 - r2 * 1.5);
      this.age[i] = 0;
      this.lifetime[i] = 18 + r4 * 17;
      this.temperature[i] = capParticle ? .78 + r3 * .22 : .52 + r3 * .28;
      this.density[i] = .5 + r2 * .5;
      this.size[i] = (2.4 + r4 * 4.8) * scale;
      this.rotation[i] = r1 * TAU;
      this.angularVelocity[i] = 0;
      this.alpha[i] = 0;
      this.type[i] = capParticle ? 1 : 0;
      this.color[p] = this.color[p + 1] = this.color[p + 2] = 1;
    }
    this.activeCount = end;
    this.points.geometry.instanceCount = end;
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
    const dt = Math.min(delta, .033);
    if (time > 3.5 && time < 22) {
      const ramp = timeline.stemRise * (1 - timeline.cooling);
      this.emissionCarry += dt * 420 * ramp * params.particleCount;
      const count = Math.floor(this.emissionCarry);
      if (count > 0) {
        this.spawn(count, time, params.explosionScale, timeline);
        this.emissionCarry -= count;
      }
    }

    const scale = params.explosionScale;
    const capHeight = (4 + 43 * timeline.headRise) * scale;
    const mature = timeline.capSpread;
    const cooling = timeline.cooling;

    for (let i = 0; i < this.activeCount; i++) {
      const p = i * 3;
      this.age[i] += dt;
      const life = this.age[i] / this.lifetime[i];
      if (life >= 1) {
        this.alpha[i] = 0;
        continue;
      }

      let x = this.position[p], y = this.position[p + 1], z = this.position[p + 2];
      let vx = this.velocity[p], vy = this.velocity[p + 1], vz = this.velocity[p + 2];
      const radius = Math.sqrt(x * x + z * z) + .0001;
      const nx = x / radius, nz = z / radius;
      const temp = this.temperature[i];

      this.positionVector.set(x, y, z);
      this.turbulence.getForce(this.positionVector, time + i * .00017, this.force);
      const turb = params.turbulenceStrength * (0.65 + mature * .8) * (0.45 + this.density[i] * .55);
      vx += this.force.x * turb * dt;
      vy += this.force.y * turb * .55 * dt;
      vz += this.force.z * turb * dt;

      const columnZone = y < capHeight - 2.4 * scale;
      if (columnZone) {
        vy += (2.9 * temp + .32) * dt;
        const normalizedHeight = Math.max(0, Math.min(1, y / Math.max(1, capHeight)));
        const columnRadius = (3.4 + normalizedHeight * 2.8) * scale;
        const inwardFlow = (1.15 + normalizedHeight * 1.8) * params.vortexStrength;
        vx -= nx * inwardFlow * dt;
        vz -= nz * inwardFlow * dt;
        if (radius > columnRadius) {
          vx -= nx * (radius - columnRadius) * 1.15 * dt;
          vz -= nz * (radius - columnRadius) * 1.15 * dt;
        }
      } else {
        const heightDelta = y - capHeight;
        const radialPush = (2.8 + mature * 3.8) * temp * params.vortexStrength;
        vx += nx * radialPush * dt;
        vz += nz * radialPush * dt;
        vy += (-heightDelta * .24 + .35 * temp) * dt;

        const ringRadius = (5.5 + mature * 10.5) * scale;
        const ringDelta = radius - ringRadius;
        const toroidal = params.vortexStrength * 1.25;
        vy += -ringDelta * toroidal * .15 * dt;
        vx += nx * heightDelta * toroidal * .16 * dt;
        vz += nz * heightDelta * toroidal * .16 * dt;
        if (radius > ringRadius * 1.2) {
          vx -= nx * (radius - ringRadius * 1.2) * .4 * dt;
          vz -= nz * (radius - ringRadius * 1.2) * .4 * dt;
        }
      }

      const drag = Math.pow(columnZone ? .985 : .972, dt * 60);
      vx *= drag; vy *= Math.pow(.991, dt * 60); vz *= drag;
      x += vx * dt; y += vy * dt; z += vz * dt;

      this.position[p] = x;
      this.position[p + 1] = y;
      this.position[p + 2] = z;
      this.velocity[p] = vx;
      this.velocity[p + 1] = vy;
      this.velocity[p + 2] = vz;
      this.temperature[i] = Math.max(0, temp - dt * (.032 + cooling * .025));
      this.rotation[i] += this.angularVelocity[i] * dt;
      const maxSize = (this.type[i] > .5 ? 10.0 : 6.5) * scale;
      this.size[i] = Math.min(maxSize, this.size[i] + dt * (columnZone ? .08 : .22));
      const fadeIn = Math.sin(Math.min(1, life * 6) * Math.PI * .5);
      const fadeOut = Math.pow(1 - life, .55) * (1 - cooling * .22);
      const detailStrength = this.type[i] > .5 ? .38 : .025;
      this.alpha[i] = fadeIn * fadeOut * detailStrength * (.45 + this.density[i] * .55);
    }

    this.points.material.uniforms.uTime.value = time;
    this.points.material.uniforms.uSmokeDensity.value = params.smokeDensity;
    this.markUpdated(['aPosition', 'aSize', 'aAlpha', 'aTemperature', 'aRotation']);
  }

  dispose() {
    this.points.geometry.dispose();
    this.points.material.dispose();
  }
}
