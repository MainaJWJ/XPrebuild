import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import * as THREE from 'three';
import { HeatDistortion } from './HeatDistortion.js';

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
