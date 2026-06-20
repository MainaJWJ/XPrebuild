import * as THREE from 'three';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

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
