const clamp01 = (v) => Math.max(0, Math.min(1, v));

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
