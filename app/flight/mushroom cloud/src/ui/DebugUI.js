import GUI from 'lil-gui';

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
