// myShipControl.js
// 3D 비행 시뮬레이터의 핵심 물리 및 조종 로직을 담당합니다.

const spaceship = {
    mesh: null,
    model: null,
    mixer: null,
    config: null,
    yawAngle: 0,
    pitchAngle: 0,
    rollAngle: 0,
    keys: {},
    frozen: false,
    scene: null,
    lastHardpointPos: [],
    currentSpeed: 0, // 현재 속도를 부드럽게 추적하기 위한 변수
    health: 100,
    destroyed: false,
    collisionRadius: 80.0,
    takeDamage: function(amount) {
        if (this.destroyed || this.frozen) return;
        this.health -= amount;
        console.log(`[Spaceship] Took ${amount} damage. Health: ${this.health}`);
        
        // HUD 업데이트 (임시 시각적 글리치 효과 등)
        const uiContainer = document.getElementById('uiContainer');
        if (uiContainer) {
            uiContainer.style.filter = 'hue-rotate(90deg) blur(2px)';
            setTimeout(() => { uiContainer.style.filter = 'none'; }, 200);
        }

        if (this.health <= 0) {
            this.health = 0;
            this.destroyed = true;
            this.frozen = true; // 비행 정지
            
            // 폭발 이펙트 및 사운드
            if (window.ParticleManager) {
                window.ParticleManager.spawnExplosion(this.mesh.position, 15.0);
            }
            if (window.soundManager) {
                window.soundManager.play('explosion-random');
            }
            
            // 화면에 파괴 메시지 표시
            const crashMenu = document.createElement('div');
            crashMenu.innerHTML = '<h1 style="color:red; font-size:48px; text-shadow:0 0 20px red;">AIRCRAFT DESTROYED</h1><p style="color:white;">RELOAD PAGE TO RESTART</p>';
            crashMenu.style.position = 'absolute';
            crashMenu.style.top = '50%';
            crashMenu.style.left = '50%';
            crashMenu.style.transform = 'translate(-50%, -50%)';
            crashMenu.style.textAlign = 'center';
            crashMenu.style.fontFamily = 'monospace';
            crashMenu.style.zIndex = '9999';
            document.body.appendChild(crashMenu);
        }
    }
};

let cameraZoom = 1.0;
const CAMERA_ZOOM_SENSITIVITY = 0.1;

const DEFAULT_CONFIG = {
    "model": {
        "file": "model/F-18/F-18.glb",
        "scale": 1,
        "initialRotation": { "x": 0, "y": 0, "z": 0 },
        "initialPosition": { "x": 0, "y": 0, "z": 0 }
    },
    "performance": {
        "speed": 1000,
        "acceleration": 3,
        "accelerationRate": 1.0,
        "minSpeed": 0,
        "gravityEffect": 0.0,
        "turnSensitivity": 0.01,
        "pitchLimits": { "up": 85, "down": -85 },
        "maxRollAngle": 85
    },
    "camera": {
        "lerpSpeed": 0.15,
        "lookAtDistance": 500,
        "s1": { "x": -190, "y": 60, "z": 0 }
    }
};

// --- 1. 초기화 및 모델 로딩 ---

// 선택된 기체 (기본값: F-18). uiManager.js의 기체 선택 UI에서 변경됩니다.
window.selectedShip = window.selectedShip || 'F-18';
window.controlMode = 'EASY';

async function loadSpaceshipConfig() {
    try {
        const shipName = window.selectedShip;
        // 브라우저 캐싱 방지를 위해 타임스탬프 추가
        const response = await fetch(`./model/${shipName}/${shipName}.json?v=${Date.now()}`);
        if (response.ok) {
            return await response.json();
        }
    } catch (e) {
        console.warn("Failed to load spaceship config, using defaults.", e);
    }
    return DEFAULT_CONFIG;
}

function loadSpaceshipModel(scene, onReady) {
    const loader = new THREE.GLTFLoader();
    const modelPath = spaceship.config.model.file || DEFAULT_CONFIG.model.file;

    loader.load(modelPath, (gltf) => {
        spaceship.model = gltf.scene;

        if (gltf.animations && gltf.animations.length > 0) {
            spaceship.mixer = new THREE.AnimationMixer(spaceship.model);
            gltf.animations.forEach(clip => spaceship.mixer.clipAction(clip).play());
        }

        const scale = spaceship.config.model.scale || DEFAULT_CONFIG.model.scale;
        spaceship.model.scale.set(scale, scale, scale);

        // Bounding box calculation for landing gear offset before rotation
        spaceship.model.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(spaceship.model);
        spaceship.wheelOffset = -box.min.y;
        console.log(`[Spaceship] Calculated wheelOffset: ${spaceship.wheelOffset}`);

        const rot = spaceship.config.model.initialRotation || DEFAULT_CONFIG.model.initialRotation;
        spaceship.model.rotation.set(
            THREE.MathUtils.degToRad(rot.x),
            THREE.MathUtils.degToRad(rot.y),
            THREE.MathUtils.degToRad(rot.z)
        );

        spaceship.model.traverse(child => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });

        spaceship.mesh = new THREE.Group();
        spaceship.mesh.add(spaceship.model);
        const pos = spaceship.config.model.initialPosition || { x: 0, y: 50, z: 0 };
        spaceship.mesh.position.set(pos.x, pos.y, pos.z);

        if (onReady) onReady();
    });
}

function togglePause() {
    if (spaceship.destroyed) return;
    
    spaceship.frozen = !spaceship.frozen;
    
    if (spaceship.frozen) {
        // Clear all held keys to avoid sticking controls upon resuming
        for (const key in spaceship.keys) {
            spaceship.keys[key] = false;
        }
        if (window.soundManager) {
            window.soundManager.pauseAll();
        }
    } else {
        if (window.soundManager) {
            window.soundManager.resumeAll();
        }
    }
    
    const pauseOverlay = document.getElementById('pause-overlay');
    if (pauseOverlay) {
        pauseOverlay.style.display = spaceship.frozen ? 'flex' : 'none';
    }
}
window.togglePause = togglePause;

function setupKeyboardControls() {
    window.addEventListener('keydown', e => {
        if (e.key.toLowerCase() === 't') {
            togglePause();
            return;
        }

        // If paused, ignore all other inputs
        if (spaceship.frozen) return;

        spaceship.keys[e.key] = true;

        // --- 무기 통합 발사 단축키 (S키) ---
        if (e.key.toLowerCase() === 's' && window.WeaponManager) {
            const isBombingMode = (window.cameraMode === 's2');
            if (isBombingMode) {
                // 폭탄 (hardpoint_1 -> hardpoint_5) 순차 투하
                if (window.WeaponManager.mountedWeapons['hardpoint_1']) {
                    window.WeaponManager.fire('hardpoint_1');
                } else if (window.WeaponManager.mountedWeapons['hardpoint_5']) {
                    window.WeaponManager.fire('hardpoint_5');
                } else {
                    console.log("[WeaponManager] No bombs left on hardpoint_1 or hardpoint_5.");
                }
            } else {
                // 미사일 (hardpoint_2 -> hardpoint_4) 순차 발사
                if (window.WeaponManager.mountedWeapons['hardpoint_2']) {
                    window.WeaponManager.fire('hardpoint_2');
                } else if (window.WeaponManager.mountedWeapons['hardpoint_4']) {
                    window.WeaponManager.fire('hardpoint_4');
                } else {
                    console.log("[WeaponManager] No missiles left on hardpoint_2 or hardpoint_4.");
                }
            }
        }

        // --- 임시 재장전 단축키 (R키) ---
        if (e.key.toLowerCase() === 'r' && window.WeaponManager) {
            window.WeaponManager.reload();
        }

        // --- 플레어 사출 단축키 (V키) ---
        if (e.key.toLowerCase() === 'v' && window.WeaponManager) {
            window.WeaponManager.fireFlare();
        }

        // --- 조종 모드 토글 단축키 (C키) ---
        if (e.key.toLowerCase() === 'c') {
            window.controlMode = (window.controlMode === 'EASY') ? 'REALISTIC' : 'EASY';
            console.log(`[Control Mode] Switched to: ${window.controlMode}`);
            if (window.updateKeyGuides) window.updateKeyGuides();
            
            if (window.controlMode === 'EASY') {
                // Sync Euler angles to prevent snapping
                const euler = new THREE.Euler().setFromQuaternion(spaceship.mesh.quaternion, 'YZX');
                spaceship.yawAngle = euler.y;
                
                const currentConfig = spaceship.config.performance || DEFAULT_CONFIG.performance;
                const limitUp = THREE.MathUtils.degToRad(currentConfig.pitchLimits.up);
                const limitDown = THREE.MathUtils.degToRad(currentConfig.pitchLimits.down);
                spaceship.pitchAngle = THREE.MathUtils.clamp(euler.z, limitDown, limitUp);
                
                spaceship.rollAngle = THREE.MathUtils.clamp(euler.x, -THREE.MathUtils.degToRad(currentConfig.maxRollAngle), THREE.MathUtils.degToRad(currentConfig.maxRollAngle));
            }
        }
    });
    window.addEventListener('keyup', e => {
        if (spaceship.frozen && e.key.toLowerCase() !== 't') return;
        spaceship.keys[e.key] = false; 
    });
    window.addEventListener('wheel', e => {
        if (spaceship.frozen) return;
        cameraZoom = THREE.MathUtils.clamp(cameraZoom + e.deltaY * CAMERA_ZOOM_SENSITIVITY * 0.01, 0.1, 10);
    });
}

// --- 2. 물리 및 이동 로직 ---

function updateSpaceship(deltaTime, camera, cameraMode = 's1') {
    if (!spaceship.mesh || spaceship.frozen) return;

    // 1인칭 콕핏 뷰(s3)에서도 기체 메쉬를 보이도록 일시적으로 숨김 처리를 해제합니다.
    // spaceship.mesh.visible = (cameraMode !== 's3');
    spaceship.mesh.visible = true;

    const config = spaceship.config.performance || DEFAULT_CONFIG.performance;
    let dir;

    if (window.selectedShip === 'helicopter' && window.updateHelicopterPhysics) {
        window.updateHelicopterPhysics(deltaTime, config);
        dir = new THREE.Vector3(1, 0, 0).applyQuaternion(spaceship.mesh.quaternion);
    } else if (window.controlMode === 'REALISTIC' && window.updateAdvancedPhysics) {
        window.updateAdvancedPhysics(deltaTime, config);
        dir = new THREE.Vector3(1, 0, 0).applyQuaternion(spaceship.mesh.quaternion);
    } else {
        const ts = config.turnSensitivity;

        if (spaceship.isGrounded) {
            // 롤은 지상에서 완전히 차단
            spaceship.rollAngle = 0;

            // 속도 기반 이륙 피치 효율 계산 (400부터 20% 단위로 증가)
            let liftMultiplier = 0;
            if (spaceship.currentSpeed >= 400) {
                const rawFactor = (spaceship.currentSpeed - 400) / 100;
                const stepIndex = Math.min(5, Math.floor(rawFactor / 0.2) + 1);
                liftMultiplier = Math.max(0.2, Math.min(1.0, stepIndex * 0.2));
            }

            // 기수 들기 각도 제한 (최대 12도)
            const maxNosePitch = THREE.MathUtils.degToRad(12);
            let targetGroundedPitch = 0;
            if (spaceship.keys["ArrowDown"] && liftMultiplier > 0) {
                targetGroundedPitch = maxNosePitch * liftMultiplier;
            }
            spaceship.pitchAngle = THREE.MathUtils.lerp(spaceship.pitchAngle, targetGroundedPitch, 0.05);

            // 지상 조향(Yaw)
            const steerInput = (spaceship.keys["ArrowLeft"] ? 1 : 0) - (spaceship.keys["ArrowRight"] ? 1 : 0)
                + (spaceship.keys["q"] || spaceship.keys["Q"] ? 1 : 0) - (spaceship.keys["e"] || spaceship.keys["E"] ? 1 : 0);

            spaceship.yawAngle += steerInput * ts;

            const qY = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), spaceship.yawAngle);
            const qP = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), spaceship.pitchAngle);
            spaceship.mesh.quaternion.copy(qY).multiply(qP);

            // 가속/감속 처리
            let targetSpeed = 0;
            let accelerationRate = 0.4;
            if (spaceship.keys[" "]) {
                targetSpeed = config.speed;
                accelerationRate = config.accelerationRate || 0.08;
            } else if (spaceship.keys["b"] || spaceship.keys["B"]) {
                targetSpeed = 0;
                accelerationRate = 1.0;
            } else {
                targetSpeed = 0;
                accelerationRate = 0.1;
            }
            spaceship.currentSpeed = THREE.MathUtils.lerp(spaceship.currentSpeed, targetSpeed, accelerationRate * deltaTime);
        } else {
            // 기존 공중 이지 조작 모드
            if (spaceship.keys["ArrowDown"]) spaceship.pitchAngle = Math.min(THREE.MathUtils.degToRad(config.pitchLimits.up), spaceship.pitchAngle + ts);
            if (spaceship.keys["ArrowUp"]) spaceship.pitchAngle = Math.max(THREE.MathUtils.degToRad(config.pitchLimits.down), spaceship.pitchAngle - ts);
            if (spaceship.keys["ArrowLeft"]) spaceship.yawAngle += ts;
            if (spaceship.keys["ArrowRight"]) spaceship.yawAngle -= ts;

            let targetRoll = 0;
            const maxRoll = THREE.MathUtils.degToRad(config.maxRollAngle);
            if (spaceship.keys["ArrowLeft"]) targetRoll = -maxRoll;
            else if (spaceship.keys["ArrowRight"]) targetRoll = maxRoll;

            // 기체별 설정 파일(JSON)의 performance.rollResponse 값을 사용하며, 없을 시 기본값 0.04 적용
            const rollResponse = config.rollResponse !== undefined ? config.rollResponse : 0.04;
            spaceship.rollAngle = THREE.MathUtils.lerp(spaceship.rollAngle, targetRoll, rollResponse);

            const qY = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), spaceship.yawAngle);
            const qP = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), spaceship.pitchAngle);
            const qR = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), spaceship.rollAngle);
            spaceship.mesh.quaternion.copy(qY).multiply(qP).multiply(qR);

            // 목표 속도 (가속 중인지 아닌지)
            let targetSpeed = spaceship.keys[" "] ? config.speed * config.acceleration : config.speed;

            // [선회 저항 적용] 커브를 돌 때 또는 N키(에어브레이크)를 누를 때 속도가 줄어들게 함
            let turnEffort = 0;
            if (spaceship.keys["ArrowUp"] || spaceship.keys["ArrowDown"]) turnEffort += 0.6;
            if (spaceship.keys["ArrowLeft"] || spaceship.keys["ArrowRight"]) turnEffort += 0.4;
            if (spaceship.keys["b"] || spaceship.keys["B"]) turnEffort = 1.0;

            const dragAmount = (config.turnDrag || 0.2) * Math.min(turnEffort, 1.0);
            targetSpeed *= (1 - dragAmount);

            // [중력 효과 적용] 하강 시 가속, 상승 시 감속
            const dirTemp = new THREE.Vector3(1, 0, 0).applyQuaternion(spaceship.mesh.quaternion);
            const gravityFactor = config.gravityEffect || 0;
            const gravityModifier = 1.0 - (dirTemp.y * gravityFactor);
            targetSpeed *= gravityModifier;

            // 기존의 엄격한 최소 속도 제한을 완화하여 실속(Stall)이 가능하도록 함
            // (대신 완전히 후진하는 것을 막기 위해 최소 50으로 제한)
            if (targetSpeed < 50) targetSpeed = 50;

            // 만약 현재 속도가 초기화되지 않았다면 기본 속도로 시작
            if (spaceship.currentSpeed === 0) spaceship.currentSpeed = config.speed;

            // [가속도 조절] JSON 설정값을 가져오며, 없으면 기본값 1.0 사용
            const accelerationRate = config.accelerationRate || 1.0;
            spaceship.currentSpeed = THREE.MathUtils.lerp(spaceship.currentSpeed, targetSpeed, accelerationRate * deltaTime);
            
            // --- [실속 (Stall) 물리 구현] ---
            const stallSpeed = config.stallSpeed || 200;
            if (spaceship.currentSpeed < stallSpeed && !spaceship.isGrounded && spaceship.catapultState !== "HOOKED") {
                spaceship.isStalling = true;
                
                // 실속 심각도 (0 ~ 1.0)
                const stallSeverity = 1.0 - (spaceship.currentSpeed / Math.max(1, stallSpeed));
                
                // 고도(Y축) 강제 하락: 부족한 속도에 비례하여 추락
                spaceship.mesh.position.y -= (stallSpeed - spaceship.currentSpeed) * 0.5 * deltaTime;
                
                // 기수(Pitch) 강제 다운: 양력을 잃고 머리가 떨어짐
                const minPitch = THREE.MathUtils.degToRad(config.pitchLimits ? config.pitchLimits.down : -75);
                spaceship.pitchAngle = Math.max(spaceship.pitchAngle - (1.5 * stallSeverity * deltaTime), minPitch);
            } else {
                spaceship.isStalling = false;
            }
        }

        dir = new THREE.Vector3(1, 0, 0).applyQuaternion(spaceship.mesh.quaternion);
        spaceship.mesh.position.add(dir.clone().multiplyScalar(spaceship.currentSpeed * deltaTime));
    }

    // --- 착륙 접지 및 이륙 상태 기동 판정 ---
    // 착지 판정은 landingSystem.js의 레이캐스트가 전담합니다.
    // myShipControl은 isGrounded 플래그를 받아 고도 고정과 이륙 판정만 처리합니다.
    const groundY = (spaceship.groundY !== undefined && spaceship.groundY !== null)
        ? spaceship.groundY
        : 50.0 + (spaceship.wheelOffset !== undefined ? spaceship.wheelOffset : 15.0);

    if (spaceship.isGrounded) {
        // 이미 착륙해 있는 상태: 강제 고도 고정
        spaceship.mesh.position.y = groundY;

        // 이륙(Take-off) 검증: 속도가 500 이상이고 기수가 충분히 들리면(5도 이상) 지상에서 이탈하여 비행 시작
        if (spaceship.currentSpeed >= 500 && spaceship.pitchAngle >= THREE.MathUtils.degToRad(5)) {
            spaceship.isGrounded = false;
            spaceship.groundY = null; // 이륙 시 지면 높이 초기화
            if (window.soundManager) {
                window.soundManager.play('spawn');
            }
            console.log("[Spaceship] Takeoff! Lift-off achieved via rotation at >=500 u/s.");
        }
    } else {
        // 비행 중 수면 추락 파괴 판정 (갑판 고도 오프셋 간섭 제거)
        const originalOffset = spaceship.originalWheelOffset !== undefined ? spaceship.originalWheelOffset : (spaceship.wheelOffset !== undefined ? spaceship.wheelOffset : 15.0);
        if (window.CollisionSystem && window.CollisionSystem.checkSeaCollision(spaceship.mesh.position, originalOffset)) {
            spaceship.mesh.position.y = 50.0 + originalOffset; // 해수면 이하로 내려가지 않도록 고정
            spaceship.takeDamage(100);
            console.log("[Spaceship] Crashed into the sea!");
        }
    }

    // --- 실시간 오디오 피드백 (엔진음 피치/볼륨, 애프터버너, GPWS 경고) ---
    if (window.soundManager) {
        // 1. 엔진 사운드 속도 연동 피치/볼륨 조율
        if (window.soundManager.isPlaying('jet-engine')) {
            const minSpd = config.minSpeed || 400;
            const maxSpd = (config.speed * (config.acceleration || 2)) || 2500;
            const currentSpd = spaceship.currentSpeed;
            const ratio = Math.max(0, Math.min(1.0, (currentSpd - minSpd) / (maxSpd - minSpd)));

            // 속도가 빠를수록 엔진 소리가 커지고 톤(피치)이 높아집니다.
            const engineVol = 0.12 + ratio * 0.18;
            const enginePitch = 0.8 + ratio * 0.5;

            window.soundManager.setVolume('jet-engine', engineVol);
            const jetSoundObj = window.soundManager.sounds.get('jet-engine');
            if (jetSoundObj && jetSoundObj.source && jetSoundObj.source.playbackRate) {
                jetSoundObj.source.playbackRate.value = enginePitch;
            }
        }

        // 2. 스페이스바 가속(애프터버너) 엔진 굉음 루프 연동
        const isBoosting = spaceship.keys[" "];
        if (isBoosting) {
            if (!window.soundManager.isPlaying('boost')) {
                window.soundManager.play('boost');
            }
        } else {
            if (window.soundManager.isPlaying('boost')) {
                window.soundManager.stop('boost', 0.2);
            }
        }

        // 3. GPWS 지상 근접 위험 방지 음성 알림 (고도 < 1800 이면서 하강 중일 때)
        const altY = spaceship.mesh.position.y;
        const isDescending = dir.y < -0.12; 
        const gpwsTrigger = altY < 1800 && isDescending && window.selectedShip !== 'helicopter';

        if (gpwsTrigger) {
            if (!window.soundManager.isPlaying('terrain-pull-up')) {
                window.soundManager.play('terrain-pull-up');
            }
        } else {
            if (window.soundManager.isPlaying('terrain-pull-up')) {
                window.soundManager.stop('terrain-pull-up', 0.15);
            }
        }
    }

    updateCamera(camera, cameraMode);

    // 신형 파티클 매니저로 전투기 화염 생성
    if (window.ParticleManager && spaceship.config.visuals) {
        // 전투기의 현재 속도 벡터를 계산하여 파티클에 전달 (화염이 기체에 찰싹 붙어있게 함)
        const shipDir = new THREE.Vector3(1, 0, 0).applyQuaternion(spaceship.mesh.quaternion);
        const shipVelocity = shipDir.multiplyScalar(spaceship.currentSpeed);

        window.ParticleManager.spawnTrails(
            spaceship.mesh,
            spaceship.config.visuals.engineHardpoints || [{ x: -4, y: 0, z: 0 }],
            spaceship.keys[" "],
            { parentVelocity: shipVelocity }
        );
    }
}

function updateCamera(camera, mode) {
    const camConfig = spaceship.config.camera || DEFAULT_CONFIG.camera;
    const modeConfig = camConfig[mode] || camConfig.s1 || DEFAULT_CONFIG.camera.s1;

    let worldCameraPos;
    if (modeConfig.lookAtMode === 'bombing_sight') {
        // [하방 카메라 안정화] 기체의 롤/피치 회전에 카메라 오프셋이 흔들리지 않도록
        // 기체 월드 위치 기준 수평 진행 방향과 수직 고도만 추종합니다.
        const shipForward = new THREE.Vector3(1, 0, 0).applyQuaternion(spaceship.mesh.quaternion);
        shipForward.y = 0; // 수평 전진 성분만 추출
        if (shipForward.lengthSq() < 0.001) shipForward.set(1, 0, 0);
        shipForward.normalize();

        // 기체 중심으로부터 수평 진행 방향으로 x, 수직 상방으로 y 만큼 배치
        worldCameraPos = spaceship.mesh.position.clone()
            .addScaledVector(shipForward, modeConfig.x * cameraZoom)
            .add(new THREE.Vector3(0, modeConfig.y * cameraZoom, 0));
    } else if (modeConfig.lookAtMode === 'cockpit') {
        // 콕핏 뷰: 줌 배율을 카메라 오프셋에 곱하지 않고 고정 위치로 설정
        const offset = new THREE.Vector3(modeConfig.x, modeConfig.y, modeConfig.z);
        spaceship.mesh.updateMatrixWorld();
        worldCameraPos = offset.applyMatrix4(spaceship.mesh.matrixWorld);
    } else {
        const offset = new THREE.Vector3(modeConfig.x * cameraZoom, modeConfig.y * cameraZoom, modeConfig.z * cameraZoom);
        spaceship.mesh.updateMatrixWorld();
        worldCameraPos = offset.applyMatrix4(spaceship.mesh.matrixWorld);
    }

    // [시네마틱 스폰 연출] 처음 스폰되었을 때, 기체 후방 아주 먼 곳에서부터 줌인하며 다가오도록 설정합니다.
    if (spaceship.isJustSpawned) {
        let startPos;
        if (modeConfig.lookAtMode === 'bombing_sight') {
            startPos = worldCameraPos.clone().add(new THREE.Vector3(0, 5000, 0));
        } else {
            const cinematicOffset = new THREE.Vector3(modeConfig.x * 15, modeConfig.y * 15, modeConfig.z);
            startPos = cinematicOffset.applyMatrix4(spaceship.mesh.matrixWorld);
        }
        camera.position.copy(startPos);
        spaceship.isJustSpawned = false;
    } else {
        if (modeConfig.lookAtMode === 'cockpit') {
            camera.position.copy(worldCameraPos); // 지연 없는 카메라 동기화
        } else {
            camera.position.lerp(worldCameraPos, camConfig.lerpSpeed || 0.1);

            if (modeConfig.lookAtMode !== 'bombing_sight') {
                // [최대 거리 제한] 지연 효과로 인해 너무 멀어지는 것을 방지
                const maxDist = (camConfig.maxDistance || 1000) * cameraZoom;
                const currentDist = camera.position.distanceTo(spaceship.mesh.position);
                if (currentDist > maxDist) {
                    const dir = new THREE.Vector3().subVectors(camera.position, spaceship.mesh.position).normalize();
                    camera.position.copy(spaceship.mesh.position).add(dir.multiplyScalar(maxDist));
                }

                // [최소 거리 제한] 기체 안으로 파고드는 현상 방지
                const minDist = (camConfig.minDistance || 0) * cameraZoom;
                const currentDistAfterMax = camera.position.distanceTo(spaceship.mesh.position);
                if (currentDistAfterMax < minDist) {
                    const dir = new THREE.Vector3().subVectors(camera.position, spaceship.mesh.position).normalize();
                    camera.position.copy(spaceship.mesh.position).add(dir.multiplyScalar(minDist));
                }
            }
        }
    }

    let lookAt;
    if (modeConfig.lookAtMode === 'bombing_sight') {
        const flatForward = new THREE.Vector3(1, 0, 0).applyQuaternion(spaceship.mesh.quaternion);
        flatForward.y = 0;
        if (flatForward.lengthSq() < 0.001) flatForward.set(1, 0, 0);
        flatForward.normalize();

        // 롤/피치 기동 회전을 배제하고, 수평 진행 방향 기준 500 전방 및 500 하방 지점을 바라봄
        lookAt = spaceship.mesh.position.clone()
            .addScaledVector(flatForward, 500)
            .add(new THREE.Vector3(0, -500, 0));

        camera.up.set(0, 1, 0); // 수평선이 절대 기울어지지 않도록 월드 UP 벡터 고정
        camera.lookAt(lookAt);
    } else if (modeConfig.lookAtMode === 'cockpit') {
        // 콕핏 뷰: 기체 정면을 바라봄 (+X 축 전진 방향)
        lookAt = new THREE.Vector3(1000, 0, 0).applyQuaternion(spaceship.mesh.quaternion).add(spaceship.mesh.position);
        
        // 쿼터니언을 통해 로컬 위쪽 방향 벡터(+Y)를 계산하여 카메라의 up 벡터로 동기화
        const localUp = new THREE.Vector3(0, 1, 0).applyQuaternion(spaceship.mesh.quaternion);
        camera.up.copy(localUp);
        camera.lookAt(lookAt);
    } else {
        // ── lookAt 계산 ── 기본: lookAtDistance 기준 전방/후방
        const lookDist = camConfig.lookAtDistance || 50;
        const lookAtX = lookDist; // 후방 뷰 제거됨
        lookAt = new THREE.Vector3(lookAtX, 0, 0).applyQuaternion(spaceship.mesh.quaternion).add(spaceship.mesh.position);

        // ── [CAMERA BANK EFFECT: BEGIN] ──
        if (window.controlMode === 'REALISTIC') {
            const localUp = new THREE.Vector3(0, 1, 0).applyQuaternion(spaceship.mesh.quaternion);
            camera.up.copy(localUp);
            camera.lookAt(lookAt);
        } else {
            const rollInfluence = 0.2; // 기울기 강도
            const tiltAngle = spaceship.rollAngle * rollInfluence;
            const camForward = new THREE.Vector3().subVectors(lookAt, camera.position).normalize();
            const worldUp = new THREE.Vector3(0, 1, 0);
            const refUp = Math.abs(camForward.dot(worldUp)) > 0.99 ? new THREE.Vector3(0, 0, 1) : worldUp;
            const camRight = new THREE.Vector3().crossVectors(camForward, refUp).normalize();
            const camUp = new THREE.Vector3().crossVectors(camRight, camForward).normalize();
            const tiltedUp = new THREE.Vector3()
                .addScaledVector(camUp, Math.cos(tiltAngle))
                .addScaledVector(camRight, Math.sin(tiltAngle))
                .normalize();
            camera.up.copy(tiltedUp);
            camera.lookAt(lookAt);
        }
    }

}


// --- 3. 외부 인터페이스 ---

function spawnSpaceship() {
    if (!spaceship.mesh) return;
    spaceship.scene.add(spaceship.mesh);

    // 사출기 상태 초기화
    spaceship.catapultState = "IDLE";

    // JSON 설정 파일의 좌표를 불러와 스폰 위치 지정
    const pos = spaceship.config.model.initialPosition || { x: 0, y: 50, z: 0 };
    spaceship.mesh.position.set(pos.x, pos.y, pos.z);

    // Load initial health and collision radius from config
    const startHealth = (spaceship.config.destruction && spaceship.config.destruction.health !== undefined)
        ? spaceship.config.destruction.health 
        : 100;
    spaceship.health = startHealth;
    spaceship.collisionRadius = spaceship.config.collisionRadius !== undefined ? spaceship.config.collisionRadius : 45.0;
    spaceship.destroyed = false;
    
    // 설정 파일에서 초기 착륙 상태 여부 로드 (기본값: false)
    spaceship.isGrounded = (spaceship.config.model.initialGrounded !== undefined)
        ? spaceship.config.model.initialGrounded 
        : false;

    // 각도 및 회전 상태 초기화 (spawnHeading을 기준으로 Y축 회전값 설정)
    const spawnHeading = (spaceship.config.model && spaceship.config.model.spawnHeading !== undefined)
        ? spaceship.config.model.spawnHeading
        : 0;
    spaceship.yawAngle = THREE.MathUtils.degToRad(spawnHeading);
    spaceship.pitchAngle = 0;
    spaceship.rollAngle = 0;

    const qY = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), spaceship.yawAngle);
    spaceship.mesh.quaternion.copy(qY);

    // 초기 속도 및 높이값 설정
    if (spaceship.isGrounded) {
        spaceship.currentSpeed = 0; // 지상에서 시작할 때는 완전히 멈춘 정지 상태로 시작
        const groundY = 50.0 + (spaceship.wheelOffset !== undefined ? spaceship.wheelOffset : 15.0);
        spaceship.mesh.position.y = groundY;
    } else {
        const perfConfig = spaceship.config.performance || DEFAULT_CONFIG.performance;
        spaceship.currentSpeed = perfConfig.speed || 1000; // 공중에서 시작할 때는 기본 비행 속도로 시작
    }

    spaceship.frozen = false;
    
    // Hide pause overlay and resume audio if active
    const pauseOverlay = document.getElementById('pause-overlay');
    if (pauseOverlay) {
        pauseOverlay.style.display = 'none';
    }
    if (window.soundManager) {
        window.soundManager.resumeAll();
    }

    spaceship.isJustSpawned = true; // 스폰 직후 시야를 즉시 이동시키기 위한 플래그
    spaceship.lastHardpointPos = [];
}

function despawnSpaceship() {
    if (spaceship.mesh) spaceship.scene.remove(spaceship.mesh);
    spaceship.frozen = true;
}

async function initMyShipControl(scene, camera) {
    spaceship.scene = scene;
    spaceship.config = await loadSpaceshipConfig();

    return new Promise(resolve => {
        loadSpaceshipModel(scene, () => {
            setupKeyboardControls();
            resolve();
        });
    });
}

window.initMyShipControl = initMyShipControl;
window.updateSpaceship = updateSpaceship;
window.updateSpaceshipAnimation = dt => spaceship.mixer && spaceship.mixer.update(dt);
window.spawnSpaceship = spawnSpaceship;
window.despawnSpaceship = despawnSpaceship;
window.spaceship = spaceship;

// 기체 변경 함수 (uiManager.js의 기체 선택 UI에서 호출)
window.changeShip = async function (shipName) {
    if (!spaceship.scene) return;

    // 1. 기존 기체 제거
    despawnSpaceship();
    if (spaceship.mesh) {
        spaceship.mesh.traverse(child => {
            if (child.isMesh) {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
                    else child.material.dispose();
                }
            }
        });
    }

    // 2. 선택된 기체 이름 갱신
    window.selectedShip = shipName;

    // 3. 상태 초기화
    spaceship.mesh = null;
    spaceship.model = null;
    spaceship.mixer = null;
    spaceship.yawAngle = 0;
    spaceship.pitchAngle = 0;
    spaceship.rollAngle = 0;
    spaceship.currentSpeed = 0;

    // 4. 새 설정 로드 및 모델 로드
    spaceship.config = await loadSpaceshipConfig();
    await new Promise(resolve => {
        loadSpaceshipModel(spaceship.scene, resolve);
    });

    // 5. 스폰
    if (window.spawnSpaceship) {
        window.spawnSpaceship();
    } else {
        spawnSpaceship();
    }

    // 6. 무기 시스템 재장전 (새 기체의 하드포인트에 맞게)
    if (window.WeaponManager) {
        // 기존 장착 미사일 제거 (객체 방식)
        for (const key in window.WeaponManager.mountedWeapons) {
            const m = window.WeaponManager.mountedWeapons[key];
            spaceship.mesh.remove(m.mesh);
        }
        window.WeaponManager.mountedWeapons = {};
        window.WeaponManager.spaceship = spaceship;
        await window.WeaponManager._loadAndMountMissiles();

        // 플레어 총 탄수 및 잔탄 갱신
        const f18Perf = (spaceship.config && spaceship.config.performance) ? spaceship.config.performance : {};
        window.WeaponManager.maxFlareAmmo = f18Perf.flareAmmo !== undefined ? f18Perf.flareAmmo : 60;
        window.WeaponManager.flareAmmo = window.WeaponManager.maxFlareAmmo;
    }

    // 7. 기관포 시스템 사양 갱신
    if (window.GunManager) {
        window.GunManager.spaceship = spaceship;
        if (window.GunManager.updateGunSpecs) {
            window.GunManager.updateGunSpecs();
        }
    }

    console.log(`[ShipControl] Changed ship to: ${shipName}`);
    if (window.updateKeyGuides) {
        window.updateKeyGuides();
    }
};