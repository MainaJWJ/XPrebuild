import { XPFilterFactory } from './XPFilterFactory.js';

(function() {
    let scene, camera, renderer, mesh, material;
    let canvas;
    let isMasterEnabled = false; // 마스터 활성화 상태 추적
    let lastTime = 0;
    const fps = 30; // 배경 효과이므로 30fps면 충분합니다.
    const desktopWrapper = document.getElementById('desktop-wrapper');
    if (!desktopWrapper) return;

    // 1. Setup Canvas Container
    const container = document.createElement('div');
    container.id = 'bg-glitch-container';
    container.style.cssText = 'position:absolute; top:0; left:0; width:100%; height:100%; z-index:-1; overflow:hidden; pointer-events:none; display:none;';
    desktopWrapper.insertBefore(container, desktopWrapper.firstChild);

    // 2. Initialize Three.js
    const init = () => {
        scene = new THREE.Scene();
        const aspect = window.innerWidth / window.innerHeight;
        camera = new THREE.OrthographicCamera(-aspect, aspect, 1, -1, 0.1, 1000);
        camera.position.z = 1;

        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(window.innerWidth, window.innerHeight);
        canvas = renderer.domElement;
        container.appendChild(canvas);

        // Load Wallpaper Texture
        const img = new Image();
        img.src = './image/wallpaper.bmp';
        
        img.onload = () => {
            const texture = new THREE.Texture(img);
            texture.needsUpdate = true;
            
            const geometry = new THREE.PlaneGeometry(2 * aspect, 2);
            // Default to 'combined' filter but with user-requested initial values
            material = XPFilterFactory.createMaterial('combined', {
                u_texture: texture,
                resolution: new THREE.Vector2(window.innerWidth, window.innerHeight),
                pixelRatio: window.devicePixelRatio,
                intensity: 1.0, 
                pixelSize: 2.0,
                curvature: 4.0,
                rgbShift: 0.015,
                digitalNoise: 0.15,
                lineDisplacement: 0.02,
                interactionEnabled: false
            });
            
            mesh = new THREE.Mesh(geometry, material);
            scene.add(mesh);
            
            // Note: background is kept as is because master toggle starts 'off'
            
            animate();
        };

        window.addEventListener('resize', onWindowResize);
    };

    const onWindowResize = () => {
        const width = window.innerWidth;
        const height = window.innerHeight;
        const aspect = width / height;
        
        camera.left = -aspect;
        camera.right = aspect;
        camera.updateProjectionMatrix();
        
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(width, height);
        
        if (mesh) {
            mesh.geometry.dispose();
            mesh.geometry = new THREE.PlaneGeometry(2 * aspect, 2);
        }
        
        if (material && material.uniforms) {
            material.uniforms.resolution.value.set(width, height);
        }
    };

    const animate = (currentTime) => {
        requestAnimationFrame(animate);
        
        // 1. 마스터 스위치가 꺼져있으면 렌더링 연산을 아예 하지 않음
        if (!isMasterEnabled) return;

        // 2. 프레임 제한 (부하 감소 핵심)
        const delta = currentTime - lastTime;
        if (delta < 1000 / fps) return;
        lastTime = currentTime;

        if (material && material.uniforms) {
            material.uniforms.time.value += 0.01;
        }
        renderer.render(scene, camera);
    };

    // 3. Handle Messages for Glitch Control
    window.addEventListener('message', (e) => {
        const data = e.data;
        if (!data || !material) return;

        if (data.type === 'toggleBgGlitchMaster') {
            isMasterEnabled = !!data.state; // 전역 상태 업데이트
            container.style.display = isMasterEnabled ? 'block' : 'none';
            // Restore original background if disabled, clear it if enabled to show WebGL
            desktopWrapper.style.background = isMasterEnabled ? 'transparent' : '';
            return;
        }

        if (data.type !== 'updateBgGlitchParam') return;

        const { id, value } = data;
        if (material.uniforms[id]) {
            // Handle specific types if needed (bool, int, etc.)
            if (typeof material.uniforms[id].value === 'boolean') {
                material.uniforms[id].value = (value === true || value === 'true');
            } else if (id === 'interactionShape' || id === 'pixelShape' || id === 'bitDepth' || id === 'dithering') {
                material.uniforms[id].value = parseInt(value);
            } else {
                material.uniforms[id].value = parseFloat(value);
            }
        }
    });

    // Initialize after Three.js is loaded
    if (window.THREE) {
        init();
    } else {
        // Fallback or wait? In index.html we'll load Three.js before this.
        window.addEventListener('load', () => {
            if (window.THREE) init();
        });
    }
})();
