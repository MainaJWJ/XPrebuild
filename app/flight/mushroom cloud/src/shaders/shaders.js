export const volumeVert = `varying vec3 vWorldPosition;

void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorldPosition = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

export const volumeFrag = `precision highp float;

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

export const billowVert = `attribute vec3 aPosition;
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

export const billowFrag = `uniform float uTime;
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

export const shockwaveVert = `varying vec2 vUv;
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

export const shockwaveFrag = `uniform float uTime;
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

export const smokeVert = `attribute float aSize;
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

export const smokeFrag = `uniform float uTime;
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

export const fireballVert = `uniform float uTime;
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

export const fireballFrag = `uniform float uTime;
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
