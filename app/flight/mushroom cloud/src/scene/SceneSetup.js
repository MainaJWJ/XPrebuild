import * as THREE from 'three';

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
