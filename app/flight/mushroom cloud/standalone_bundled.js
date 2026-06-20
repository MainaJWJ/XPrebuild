import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import GUI from 'lil-gui';

// --- 1. Shaders ---
const volumeVert = `
    varying vec3 vWorldPosition;
    void main() {
      vec4 world = modelMatrix * vec4(position, 1.0);
      vWorldPosition = world.xyz;
      gl_Position = projectionMatrix * viewMatrix * world;
    }
`;

const volumeFrag = `
    precision highp float;

    uniform float uTime;
    uniform float uScale;
    uniform float uFireball;
    uniform float uStemRise;
    uniform float uCapSpread;
    uniform float uHeadRise;
    uniform float uHeadGrowth;
    uniform float uCollar;
    uniform float uCooling;
    uniform float uHeat;
    uniform float uDensity;
    uniform float uTurbulence;
    uniform float uFireIntensity;
    uniform float uStepCount;
    uniform vec3 uBoxMin;
    uniform vec3 uBoxMax;
    uniform vec3 uCameraPosition;
    varying vec3 vWorldPosition;

    float hash31(vec3 p) {
      p = fract(p * .1031);
      p += dot(p, p.yzx + 33.33);
      return fract((p.x + p.y) * p.z);
    }

    float noise3(vec3 p) {
      vec3 i = floor(p);
      vec3 f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      return mix(
        mix(mix(hash31(i), hash31(i + vec3(1,0,0)), f.x),
            mix(hash31(i + vec3(0,1,0)), hash31(i + vec3(1,1,0)), f.x), f.y),
        mix(mix(hash31(i + vec3(0,0,1)), hash31(i + vec3(1,0,1)), f.x),
            mix(hash31(i + vec3(0,1,1)), hash31(i + vec3(1,1,1)), f.x), f.y),
        f.z
      );
    }

    float fbm(vec3 p) {
      float value = 0.0;
      float amp = .55;
      for (int i = 0; i < 2; i++) {
        value += noise3(p) * amp;
        p = p * 2.02 + vec3(17.1, 9.2, 13.7);
        amp *= .5;
      }
      return value;
    }

    float sphereField(vec3 p, vec3 center, vec3 radius) {
      return 1.0 - length((p - center) / radius);
    }

    float torusField(vec3 p, vec3 center, float majorRadius, float minorRadius) {
      vec3 q = p - center;
      vec2 t = vec2(length(q.xz) - majorRadius, q.y);
      return 1.0 - length(t) / minorRadius;
    }

    float capsuleField(vec3 p, vec3 a, vec3 b, float radius) {
      vec3 pa = p - a;
      vec3 ba = b - a;
      float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
      return 1.0 - length(pa - ba * h) / radius;
    }

    vec2 sampleField(vec3 worldPos) {
      vec3 p = worldPos / uScale;
      float time = uTime;
      float rise = uStemRise;
      float spread = uCapSpread;

      float capY = mix(4.0, 47.0, uHeadRise);
      float capRadius = mix(7.5, 21.5, uHeadGrowth);
      float capThickness = mix(5.8, 15.0, uHeadGrowth);

      vec3 warp = vec3(
        sin(p.y * .19 + time * .42) + cos(p.z * .16 - time * .27),
        sin(p.x * .14 + p.z * .11 + time * .18) * .45,
        cos(p.y * .17 - time * .36) - sin(p.x * .15 + time * .23)
      ) * .5;
      p += warp * mix(.38, 1.35, spread) * uTurbulence;

      float nLarge = fbm(p * .16 + vec3(0.0, -time * .045, 0.0));
      float nFine = noise3(p * .42 + vec3(time * .02, -time * .09, time * .015));
      float breakup = (nLarge - .46) * .72 + (nFine - .48) * .3;

      float head = sphereField(p, vec3(0.0, capY, 0.0), vec3(capRadius, capThickness, capRadius * .94));
      float baseFire = sphereField(p, vec3(0.0, 3.0, 0.0), vec3(5.4, 4.4, 5.4));

      float stemRadius = mix(4.0, 6.8, spread);
      float stemT = clamp((p.y - 1.5) / max(1.0, capY - 5.5), 0.0, 1.0);
      float lowerFunnel = mix(6.2, 3.4, smoothstep(0.0, .38, stemT));
      float upperNeck = mix(3.4, stemRadius, smoothstep(.48, 1.0, stemT));
      float localStemRadius = mix(lowerFunnel, upperNeck, smoothstep(.25, .58, stemT));
      localStemRadius *= 1.0 + (nLarge - .5) * .28;
      float stemVertical = smoothstep(1.2, 3.0, p.y) * (1.0 - smoothstep(capY - 2.0, capY + 1.0, p.y));
      float stem = (1.0 - length(p.xz) / localStemRadius) * stemVertical;
      stem += .18 * (nLarge - .5) + .08 * (nFine - .5);

      float cap = head;
      float upper = sphereField(p, vec3(-capRadius * .14, capY + capThickness * .42, .4), vec3(capRadius * .72, capThickness * .72, capRadius * .7));
      float lower = sphereField(p, vec3(capRadius * .1, capY - capThickness * .3, -.5), vec3(capRadius * .92, capThickness * .62, capRadius * .82));
      float torus = torusField(p, vec3(0.0, capY - capThickness * .18, 0.0), capRadius * .72, capThickness * .38);
      float torusOuter = torusField(p, vec3(0.0, capY - capThickness * .05, 0.0), capRadius * .9, capThickness * .2);
      float intake = torusField(p, vec3(0.0, capY - capThickness * .58, 0.0), capRadius * .42, capThickness * .26);
      float underside = sphereField(p, vec3(0.0, capY - capThickness * .56, 0.0), vec3(capRadius * .58, capThickness * .3, capRadius * .55));
      float collarRadius = mix(capRadius * .24, capRadius * .42, uCollar);
      float collarHeight = mix(1.5, 6.5, uCollar);
      vec3 collarQ = p - vec3(0.0, capY - capThickness * .72, 0.0);
      float collarDown = clamp(-collarQ.y / max(1.0, collarHeight), 0.0, 1.0);
      float collarExpected = mix(collarRadius * .45, collarRadius, collarDown);
      float collar = 1.0 - abs(length(collarQ.xz) - collarExpected) / mix(.7, 1.7, uCollar);
      collar *= smoothstep(-collarHeight, 0.0, collarQ.y) * (1.0 - smoothstep(0.0, 1.0, collarQ.y));
      float capAngle = atan(p.z, p.x);
      float capLobes = sin(capAngle * 7.0 + time * .08) * .12 + sin(capAngle * 11.0 - time * .05) * .07;
      cap += capLobes * spread;
      torus += capLobes * .75 * spread;

      float field = max(baseFire - rise * 2.2, head);
      field = max(field, stem - (1.0 - rise) * .55);
      float capField = max(max(cap, upper), max(lower, torus - mix(.75, .3, spread)));
      field = max(field, capField - (1.0 - spread) * 2.0);
      field = max(field, torusOuter - mix(1.0, .58, spread) - (1.0 - spread) * 2.2);
      field = max(field, max(intake - .38, underside - .25) - (1.0 - spread) * 1.4);
      field = max(field, collar - .18 - (1.0 - uCollar) * 2.0);
      float shapeMask = smoothstep(-.55, .18, field);
      field += breakup * mix(.34, .72, spread) * shapeMask;

      float density = smoothstep(-.08, .26, field) * uDensity;
      density *= 1.0 - smoothstep(.7, 1.0, uCooling) * .25;

      float coreStem = (1.0 - length(p.xz) / max(1.2, localStemRadius * .48)) * stemVertical;
      float coreCap = sphereField(p, vec3(0.0, capY - 1.0, 0.0), vec3(capRadius * .72, capThickness * .48, capRadius * .68));
      float temperature = max(baseFire - rise * 0.9, head * mix(1.0, .45, uCooling));
      temperature = max(temperature, coreStem * 1.15 - (1.0 - rise) * 1.2);
      temperature = max(temperature, coreCap * 1.0 - (1.0 - spread) * 1.1);
      temperature = smoothstep(.18, .74, temperature + (nFine - .54) * 1.16);
      temperature *= uHeat;
      return vec2(density, temperature);
    }

    vec2 boxHit(vec3 ro, vec3 rd) {
      vec3 inv = 1.0 / rd;
      vec3 t0 = (uBoxMin - ro) * inv;
      vec3 t1 = (uBoxMax - ro) * inv;
      vec3 tmin = min(t0, t1);
      vec3 tmax = max(t0, t1);
      float nearT = max(max(tmin.x, tmin.y), tmin.z);
      float farT = min(min(tmax.x, tmax.y), tmax.z);
      return vec2(nearT, farT);
    }

    void main() {
      vec3 ro = uCameraPosition;
      vec3 rd = normalize(vWorldPosition - ro);
      vec2 hit = boxHit(ro, rd);
      if (hit.x > hit.y || hit.y < 0.0) discard;

      float t = max(hit.x, 0.0);
      float endT = hit.y;
      float stepSize = (endT - t) / max(24.0, uStepCount);
      t += hash31(vec3(gl_FragCoord.xy, 17.0)) * stepSize;
      vec3 color = vec3(0.0);
      float transmittance = 1.0;

      for (int i = 0; i < 256; i++) {
        if (float(i) >= uStepCount) break;
        if (t > endT || transmittance < .015) break;
        vec3 pos = ro + rd * t;
        vec2 sampleValue = sampleField(pos);
        float density = sampleValue.x;
        float temperature = sampleValue.y;
        if (density > .012) {
          float absorption = density * stepSize * .145;
          float alpha = 1.0 - exp(-absorption);
          vec3 cold = mix(vec3(.025, .022, .02), vec3(.14, .105, .085), density);
          vec3 hot = mix(vec3(.55, .055, .005), vec3(1.0, .52, .06), temperature);
          hot = mix(hot, vec3(1.0, .92, .58), smoothstep(.94, 1.0, temperature));
          vec3 localColor = mix(cold, hot * uFireIntensity * 1.35, smoothstep(.28, .8, temperature));
          float edgeLight = clamp(density * .72 + temperature * .95, 0.0, 1.0);
          localColor *= mix(.7, 1.3, edgeLight);
          color += transmittance * alpha * localColor;
          color += transmittance * temperature * temperature * stepSize
            * vec3(.18, .035, .003) * uFireIntensity;
          transmittance *= 1.0 - alpha;
        }
        t += stepSize;
      }

      float alpha = 1.0 - transmittance;
      if (alpha < .01) discard;
      gl_FragColor = vec4(color, alpha);
    }
`;

const billowVert = `
    attribute vec3 aPosition;
    attribute float aSize;
    attribute float aAlpha;
    attribute float aTemperature;
    attribute float aDensity;
    attribute float aRotation;
    attribute float aType;
    varying vec2 vUv;
    varying float vAlpha;
    varying float vTemperature;
    varying float vDensity;
    varying float vRotation;
    varying float vType;

    void main() {
      vUv = uv;
      vAlpha = aAlpha;
      vTemperature = aTemperature;
      vDensity = aDensity;
      vRotation = aRotation;
      vType = aType;
      float c = cos(aRotation);
      float s = sin(aRotation);
      vec2 corner = mat2(c, -s, s, c) * position.xy * aSize;
      vec4 center = modelViewMatrix * vec4(aPosition, 1.0);
      center.xy += corner;
      gl_Position = projectionMatrix * center;
    }
`;

const billowFrag = `
    uniform float uTime;
    uniform float uSmokeDensity;
    varying vec2 vUv;
    varying float vAlpha;
    varying float vTemperature;
    varying float vDensity;
    varying float vRotation;
    varying float vType;

    float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
    float noise(vec2 p) {
      vec2 i = floor(p), f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      return mix(mix(hash(i), hash(i + vec2(1,0)), f.x),
                 mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), f.x), f.y);
    }

    void main() {
      vec2 p = vUv - .5;
      float d = length(p);
      float n = noise(p * 7.0 + vec2(vRotation, uTime * .018));
      n += .5 * noise(p * 15.0 - vec2(uTime * .012, vRotation));
      float edge = .49 + (n - .65) * .09 + sin(atan(p.y, p.x) * 7.0 + vRotation) * .018;
      float shape = 1.0 - smoothstep(edge - .16, edge, d);
      if (shape < .01) discard;
      float hot = clamp(vTemperature, 0.0, 1.0);
      vec3 cold = mix(vec3(.025,.022,.02), vec3(.19,.15,.12), vDensity);
      if (vType > .5) cold *= 1.8;
      vec3 ember = mix(vec3(.22,.025,.003), vec3(1.2,.68,.15), hot);
      vec3 color = mix(cold, ember, smoothstep(.20, .80, hot));
      gl_FragColor = vec4(color, vAlpha * shape * uSmokeDensity);
    }
`;

const shockwaveVert = `
    varying vec2 vUv;
    varying vec3 vWorldPosition;
    varying float vCrest;
    uniform float uTime;
    uniform float uStrength;
    uniform float uProgress;
    void main() {
      vUv = uv;
      vec3 displaced = position;
      float angle = atan(position.y, position.x);
      float irregular = sin(angle * 7.0 + uTime * .8) * .035
        + sin(angle * 17.0 - uTime * 1.1) * .018
        + sin(angle * 31.0 + 2.3) * .009;
      displaced.xy *= 1.0 + irregular * (1.0 - uProgress * .45);
      float radial = clamp((length(position.xy) - .82) / .18, 0.0, 1.0);
      vCrest = sin(radial * 3.14159265);
      displaced.z += vCrest * (.52 + .22 * sin(angle * 11.0 + uTime * 1.7))
        * uStrength * (1.0 - uProgress * .65);
      vec4 world = modelMatrix * vec4(displaced, 1.0);
      vWorldPosition = world.xyz;
      gl_Position = projectionMatrix * viewMatrix * world;
    }
`;

const shockwaveFrag = `
    uniform float uTime;
    uniform float uOpacity;
    uniform float uStrength;
    varying vec2 vUv;
    varying vec3 vWorldPosition;
    varying float vCrest;
    void main() {
      float angle = atan(vWorldPosition.z, vWorldPosition.x);
      float noise = sin(angle * 13.0 + uTime * 1.4) * .5 + sin(angle * 29.0 - uTime * 1.1) * .5;
      float broken = smoothstep(-.65, .15, noise);
      float edge = smoothstep(.02, .22, vUv.x) * (1.0 - smoothstep(.58, 1.0, vUv.x));
      float streak = .62 + .38 * sin(vUv.x * 38.0 + noise * 2.0);
      vec3 color = mix(vec3(.11,.065,.035), vec3(1.0,.48,.11), vCrest * uStrength);
      gl_FragColor = vec4(color, uOpacity * edge * streak * mix(.06, 1.0, broken));
    }
`;

const smokeVert = `
    attribute float aSize;
    attribute float aAlpha;
    attribute float aTemperature;
    attribute float aDensity;
    attribute float aRotation;
    attribute float aType;
    varying float vAlpha;
    varying float vTemperature;
    varying float vDensity;
    varying float vRotation;
    varying float vType;
    varying float vDepth;

    void main() {
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      vAlpha = aAlpha;
      vTemperature = aTemperature;
      vDensity = aDensity;
      vRotation = aRotation;
      vType = aType;
      vDepth = -mvPosition.z;
      gl_PointSize = aSize * (390.0 / max(1.0, -mvPosition.z));
      gl_Position = projectionMatrix * mvPosition;
    }
`;

const smokeFrag = `
    uniform float uTime;
    uniform float uSmokeDensity;
    varying float vAlpha;
    varying float vTemperature;
    varying float vDensity;
    varying float vRotation;
    varying float vType;
    varying float vDepth;

    float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
    float noise(vec2 p) {
      vec2 i = floor(p), f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      return mix(mix(hash(i), hash(i + vec2(1,0)), f.x),
                 mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), f.x), f.y);
    }

    void main() {
      vec2 uv = gl_PointCoord - .5;
      float c = cos(vRotation), s = sin(vRotation);
      uv = mat2(c,-s,s,c) * uv;
      float d = length(uv);
      float n = noise(uv * 7.0 + vec2(vRotation, uTime * .025));
      n += .5 * noise(uv * 15.0 - vec2(uTime * .018, vRotation));
      float lobes = .48 + .055 * n + .025 * sin(atan(uv.y, uv.x) * 7.0 + vRotation);
      float shape = 1.0 - smoothstep(lobes - .14, lobes, d);
      shape *= 1.0 - smoothstep(.22, .53, d);
      if (shape < .01) discard;

      float hot = clamp(vTemperature, 0.0, 1.0);
      vec3 cold = mix(vec3(.035,.032,.03), vec3(.22,.19,.17), clamp(vDensity,0.0,1.0));
      vec3 ember = mix(vec3(.20,.025,.004), vec3(.82,.24,.025), hot);
      vec3 fire = mix(ember, vec3(1.0,.62,.16), smoothstep(.82, 1.0, hot));
      vec3 color = mix(cold, fire, smoothstep(.34, .88, hot));
      if (vType > 1.5) color = mix(vec3(.07,.055,.045), vec3(.35,.13,.035), hot * .45);
      float alpha = vAlpha * shape * mix(.55, 1.0, n) * uSmokeDensity;
      gl_FragColor = vec4(color, alpha);
    }
`;

const fireballVert = `
    uniform float uTime;
    uniform float uNoiseStrength;
    varying vec3 vNormal;
    varying vec3 vWorldPosition;

    float hash(vec3 p) {
      p = fract(p * 0.3183099 + .1);
      p *= 17.0;
      return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
    }

    float noise(vec3 p) {
      vec3 i = floor(p);
      vec3 f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      return mix(mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x),
                     mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
                 mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
                     mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
    }

    void main() {
      vec3 p = position;
      float n = noise(normal * 3.2 + uTime * .9) + .5 * noise(normal * 7.0 - uTime * 1.4);
      p += normal * (n - .72) * uNoiseStrength;
      vec4 world = modelMatrix * vec4(p, 1.0);
      vWorldPosition = world.xyz;
      vNormal = normalize(normalMatrix * normal);
      gl_Position = projectionMatrix * viewMatrix * world;
    }
`;

const fireballFrag = `
    uniform float uTime;
    uniform float uOpacity;
    uniform float uIntensity;
    uniform vec3 uCoreColor;
    uniform vec3 uEdgeColor;
    varying vec3 vNormal;
    varying vec3 vWorldPosition;

    float hash(vec3 p) {
      return fract(sin(dot(p, vec3(127.1,311.7,74.7))) * 43758.5453);
    }

    void main() {
      vec3 viewDir = normalize(cameraPosition - vWorldPosition);
      float facing = max(dot(vNormal, viewDir), 0.0);
      float rim = pow(1.0 - facing, 1.8);
      float flicker = .86 + .14 * sin(uTime * 12.0 + hash(floor(vWorldPosition * 2.0)) * 6.283);
      vec3 color = mix(uCoreColor, uEdgeColor, smoothstep(.15, .92, rim));
      color *= uIntensity * flicker * (1.35 - rim * .45);
      gl_FragColor = vec4(color, uOpacity * smoothstep(0.0, .12, facing));
    }
`;

// --- 2. Helpers ---
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const smooth = (a, b, value) => {
    const t = clamp01((value - a) / (b - a));
    return t * t * (3 - 2 * t);
};
const rand = (i, seed = 1) => {
    const x = Math.sin(i * 73.156 + seed * 19.771) * 43758.5453;
    return x - Math.floor(x);
};
const randDust = (i, seed = 1) => {
    const x = Math.sin(i * 91.3458 + seed * 17.132) * 47453.5453;
    return x - Math.floor(x);
};
const TAU = Math.PI * 2;


// --- 3. Classes ---

export class SceneSetup {
  constructor(container) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);
    this.scene.fog = new THREE.FogExp2(0x000000, 0.003);

    this.camera = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, 0.1, 500);
    this.camera.position.set(48, 22, 76);
    this.camera.lookAt(0, 24, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
    this.pixelRatio = Math.min(devicePixelRatio, .78);
    this.renderer.setSize(innerWidth, innerHeight);
    this.renderer.setPixelRatio(this.pixelRatio);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.46;
    container.appendChild(this.renderer.domElement);

    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(115, 192),
      new THREE.MeshStandardMaterial({ color: 0x070707, roughness: 0.91, metalness: 0.02 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.04;
    this.scene.add(ground);

    const ambient = new THREE.AmbientLight(0x241209, 0.018);
    this.scene.add(ambient);

    this.explosionLight = new THREE.PointLight(0xff8b2a, 0, 95, 1.7);
    this.explosionLight.position.set(0, 4, 0);
    this.scene.add(this.explosionLight);
  }

  resize() {
    this.camera.aspect = innerWidth / innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(innerWidth, innerHeight);
    this.renderer.setPixelRatio(this.pixelRatio);
  }

  setPixelRatio(value) {
    this.pixelRatio = Math.max(.5, Math.min(value, Math.min(devicePixelRatio, .85)));
    this.renderer.setPixelRatio(this.pixelRatio);
    this.renderer.setSize(innerWidth, innerHeight);
  }
}

export class TurbulenceField {
  getForce(position, time, out) {
    const x = position.x * 0.23;
    const y = position.y * 0.19;
    const z = position.z * 0.23;
    const t = time * 0.72;
    out.set(
      Math.sin(y * 1.7 + t) + Math.cos(z * 2.1 - t * 0.7) + Math.sin((y + z) * 0.8),
      Math.sin(z * 1.3 + t * 0.5) * 0.45 + Math.cos(x * 1.9 - t) * 0.35,
      Math.cos(y * 1.5 - t * 0.8) - Math.sin(x * 2.0 + t * 0.6) + Math.cos((x - y) * 0.7)
    );
    return out.multiplyScalar(0.48);
  }
}

export class SimulationTimeline {
  constructor() {
    this.time = 0;
    this.flash = 0;
    this.fireball = 0;
    this.stemRise = 0;
    this.capSpread = 0;
    this.headRise = 0;
    this.headGrowth = 0;
    this.collar = 0;
    this.cooling = 0;
    this.dust = 0;
    this.heat = 0;
  }

  update(time) {
    this.time = time;
    this.flash = Math.pow(1 - smooth(0, .7, time), 2.4);
    this.fireball = smooth(.04, .3, time) * (1 - smooth(18, 28, time));
    this.headRise = smooth(.15, 10, time) * .35
      + smooth(8, 18, time) * .45
      + smooth(18, 32, time) * .2;
    this.headGrowth = smooth(.2, 7.5, time) * .58 + smooth(7.5, 27, time) * .42;
    this.stemRise = smooth(.08, 10, time);
    this.capSpread = smooth(4.5, 25, time);
    this.collar = smooth(8, 22, time);
    this.cooling = smooth(24, 38, time);
    this.dust = smooth(.3, 1.2, time) * (1 - smooth(10, 18, time));
    this.heat = (1 - this.cooling) * (1 - smooth(16, 28, time) * .45);
    return this;
  }
}

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
      vertexShader: volumeVert,
      fragmentShader: volumeFrag,
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
        vertexShader: fireballVert, fragmentShader: fireballFrag, transparent: true, depthWrite: false,
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

export class Shockwave {
  constructor(scene) {
    const geometry = new THREE.RingGeometry(.82, 1, 384, 18);
    const material = new THREE.ShaderMaterial({
      vertexShader: shockwaveVert, fragmentShader: shockwaveFrag, transparent: true, depthWrite: false,
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
      vertexShader: smokeVert, fragmentShader: smokeFrag, transparent: true,
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
      const r1 = randDust(this.spawned, 1), r2 = randDust(this.spawned, 2), r3 = randDust(this.spawned, 3);
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
      vertexShader: billowVert, fragmentShader: billowFrag,
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

export class HeatDistortion {
  constructor() {
    this.pass = new ShaderPass({
      uniforms: {
        tDiffuse: { value: null },
        uTime: { value: 0 },
        uStrength: { value: 0 },
        uAspect: { value: innerWidth / innerHeight }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
      `,
      fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float uTime;
        uniform float uStrength;
        uniform float uAspect;
        varying vec2 vUv;
        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }
        float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
                     mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0)), f.x), f.y);
        }
        void main() {
          vec2 p = vUv - vec2(.5, .43);
          p.x *= uAspect;
          float r = length(p);
          float mask = smoothstep(.42, .06, r) * smoothstep(.72, .2, vUv.y);
          vec2 flowUv = vUv * vec2(18.0, 24.0) + vec2(uTime * .3, -uTime * .7);
          float nx = noise(flowUv) - .5;
          float ny = noise(flowUv + vec2(7.1, 3.7)) - .5;
          vec2 offset = vec2(nx, ny) * .0022 * uStrength * mask;
          gl_FragColor = texture2D(tDiffuse, vUv + offset);
        }
      `
    });
  }

  update(time, strength) {
    this.pass.uniforms.uTime.value = time;
    this.pass.uniforms.uStrength.value = strength;
    this.pass.uniforms.uAspect.value = innerWidth / innerHeight;
  }
}

export class PostProcessing {
  constructor(renderer, scene, camera) {
    this.composer = new EffectComposer(renderer);
    this.composer.addPass(new RenderPass(scene, camera));
    this.heatDistortion = new HeatDistortion();
    this.composer.addPass(this.heatDistortion.pass);
    this.bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), .8, .55, .52);
    this.composer.addPass(this.bloom);
    this.grade = new ShaderPass({
      uniforms: { tDiffuse: { value: null } },
      vertexShader: `varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
      fragmentShader: `
        uniform sampler2D tDiffuse; varying vec2 vUv;
        void main() {
          vec4 c = texture2D(tDiffuse, vUv);
          float vignette = smoothstep(.86, .18, length(vUv - .5));
          c.rgb *= mix(.58, 1.0, vignette);
          c.rgb = pow(c.rgb, vec3(.96));
          gl_FragColor = c;
        }
      `
    });
    this.composer.addPass(this.grade);
  }

  update(time, params, flash) {
    this.bloom.strength = params.bloomStrength + flash * 3.7;
    this.heatDistortion.update(time, Math.max(0, (1 - time / 6)) * 1.05);
  }

  resize() {
    this.composer.setSize(innerWidth, innerHeight);
  }

  setPixelRatio(value) {
    this.composer.setPixelRatio(value);
    this.composer.setSize(innerWidth, innerHeight);
  }

  render() { this.composer.render(); }
}

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

export class ExplosionController {
  constructor({ systems, light, post, cameraController, flashElement, params, timeline }) {
    this.systems = systems;
    this.light = light;
    this.post = post;
    this.cameraController = cameraController;
    this.flashElement = flashElement;
    this.params = params;
    this.timeline = timeline;
    this.time = 0;
    this.duration = 32;
    this.running = false;
    this.paused = false;
  }

  start() {
    this.reset();
    this.running = true;
  }

  reset() {
    this.time = 0;
    this.running = false;
    this.paused = false;
    this.light.intensity = 0;
    this.flashElement.style.opacity = '0';
    this.cameraController.reset();
    this.systems.forEach((system) => system.reset());
  }

  togglePause() {
    if (this.running) this.paused = !this.paused;
  }

  update(delta) {
    if (this.running && !this.paused) {
      this.time += delta * this.params.simulationSpeed;
      if (this.time >= this.duration) this.running = false;
    }
    const time = this.time;
    const timeline = this.timeline.update(time);
    const flash = timeline.flash;
    const fireLight = timeline.heat * (1 - timeline.cooling);
    const lightPower = (flash * 1700 + fireLight * 380) * this.params.fireballIntensity;
    this.light.intensity = lightPower;
    this.light.distance = 80 * this.params.explosionScale;
    this.light.position.y = 3 + timeline.headRise * 39;
    this.flashElement.style.opacity = String(flash * .82);
    this.systems.forEach((system) => system.update(delta, timeline, this.params));
    this.cameraController.update(time, flash, this.params.cameraShake);
    this.post.update(time, this.params, flash);
  }
}

export class DebugUI {
  constructor(params, actions) {
    this.gui = new GUI({ title: 'Mushroom Cloud VFX' });
    this.gui.add(actions, 'Play');
    this.gui.add(actions, 'Pause');
    this.gui.add(actions, 'Reset');
    this.gui.add(params, 'explosionScale').min(0).step(.01);
    this.gui.add(params, 'simulationSpeed').min(0).step(.01);
    this.gui.add(params, 'smokeDensity').min(0).step(.01);
    this.gui.add(params, 'turbulenceStrength').min(0).step(.01);
    this.gui.add(params, 'vortexStrength').min(0).step(.01);
    this.gui.add(params, 'fireballIntensity').min(0).step(.01);
    this.gui.add(params, 'shockwaveStrength').min(0).step(.01);
    this.gui.add(params, 'dustAmount').min(0).step(.01);
    this.gui.add(params, 'particleCount').min(0.01).step(.01);
    this.gui.add(params, 'volumeSteps').min(1).step(1);
    this.gui.add(params, 'bloomStrength').min(0).step(.01);
    this.gui.add(params, 'cameraShake').min(0).step(.01);
  }
}

// --- 4. Main Entry Point ---

const params = {
  explosionScale: 1.2,
  simulationSpeed: 0.85,
  smokeDensity: 6.0,
  turbulenceStrength: 1.5,
  vortexStrength: 1.4,
  fireballIntensity: 5.0,
  shockwaveStrength: 1.3,
  dustAmount: 1.6,
  particleCount: 1.6,
  bloomStrength: 1.5,
  cameraShake: 1.3,
  volumeSteps: 96
};

if (new URLSearchParams(window.location.search).has('max')) {
  Object.assign(params, {
    explosionScale: 1.8,
    simulationSpeed: 0.8,
    smokeDensity: 1.8,
    turbulenceStrength: 2.5,
    vortexStrength: 2.5,
    fireballIntensity: 2.5,
    shockwaveStrength: 2.0,
    dustAmount: 2.5,
    particleCount: 2.5,
    bloomStrength: 2.5,
    cameraShake: 2.0,
    volumeSteps: 128
  });
}

const sceneSetup = new SceneSetup(document.querySelector('#app'));
const turbulence = new TurbulenceField();
const explosionVolume = new ExplosionVolume(sceneSetup.scene, sceneSetup.camera);
const fireball = new Fireball(sceneSetup.scene);
const shockwave = new Shockwave(sceneSetup.scene);
const groundDust = new GroundDust(sceneSetup.scene, turbulence);
const mushroomCloud = new MushroomCloud(sceneSetup.scene, turbulence);
const post = new PostProcessing(sceneSetup.renderer, sceneSetup.scene, sceneSetup.camera);
const cameraController = new CameraController(sceneSetup.camera, sceneSetup.renderer.domElement);
const controller = new ExplosionController({
  systems: [explosionVolume, fireball, shockwave, groundDust, mushroomCloud],
  light: sceneSetup.explosionLight,
  post,
  cameraController,
  flashElement: document.querySelector('#flash'),
  params,
  timeline: new SimulationTimeline()
});
window.mushroomVFX = { controller, params };

const actions = {
  Play: () => controller.start(),
  Pause: () => controller.togglePause(),
  Reset: () => controller.reset()
};
new DebugUI(params, actions);

window.addEventListener('keydown', (event) => {
  if (event.code === 'Space') {
    event.preventDefault();
    controller.start();
  } else if (event.code === 'KeyR') {
    controller.reset();
  } else if (event.code === 'KeyP') {
    controller.togglePause();
  }
});

window.addEventListener('resize', () => {
  sceneSetup.resize();
  post.resize();
});

const timer = new THREE.Timer();
timer.connect(document);
controller.start();

const captureTime = Number(new URLSearchParams(window.location.search).get('t'));
if (Number.isFinite(captureTime)) {
  controller.time = Math.max(0, Math.min(controller.duration, captureTime));
  controller.paused = true;
}

function animate() {
  requestAnimationFrame(animate);
  timer.update();
  const rawDelta = timer.getDelta();
  const delta = Math.min(rawDelta, .1);
  controller.update(delta);
  post.render();
}

animate();
