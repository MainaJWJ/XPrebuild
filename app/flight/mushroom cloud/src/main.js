import * as THREE from 'three';
import { SceneSetup } from './scene/SceneSetup.js';
import { TurbulenceField } from './simulation/TurbulenceField.js';
import { ExplosionVolume } from './simulation/ExplosionVolume.js';
import { SimulationTimeline } from './simulation/SimulationTimeline.js';
import { Shockwave } from './simulation/Shockwave.js';
import { GroundDust } from './simulation/GroundDust.js';
import { MushroomCloud } from './simulation/MushroomCloud.js';
import { PostProcessing } from './rendering/PostProcessing.js';
import { CameraController } from './rendering/CameraController.js';
import { ExplosionController } from './simulation/ExplosionController.js';
import { DebugUI } from './ui/DebugUI.js';

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
const shockwave = new Shockwave(sceneSetup.scene);
const groundDust = new GroundDust(sceneSetup.scene, turbulence);
const mushroomCloud = new MushroomCloud(sceneSetup.scene, turbulence);
const post = new PostProcessing(sceneSetup.renderer, sceneSetup.scene, sceneSetup.camera);
const cameraController = new CameraController(sceneSetup.camera, sceneSetup.renderer.domElement);
const controller = new ExplosionController({
  systems: [explosionVolume, shockwave, groundDust, mushroomCloud],
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
