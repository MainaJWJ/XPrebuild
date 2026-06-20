// weaponSystem.js
// 기체와 독립적으로 동작할 수 있도록 모듈화된 무기(미사일) 관리 시스템입니다.
// 이 파일은 언제든지 프로젝트에서 제외해도 기체 비행 로직(myShipControl.js)에 영향을 주지 않도록 설계되었습니다.

class Flare {
    constructor(scene, startPos, startVelocity, faction = 'BLUE', config = {}) {
        this.scene = scene;
        this.position = startPos.clone();
        this.velocity = startVelocity.clone();
        this.faction = faction;
        
        this.life = config.lifespan !== undefined ? config.lifespan : 6.0;
        this.maxLife = this.life;
        this.gravity = config.gravity !== undefined ? config.gravity : 120.0;
        this.drag = config.drag !== undefined ? config.drag : 1.2;
        this.active = true;
        this.trail = [];
        this.distanceSinceLastTrail = 0;
        
        this.initMesh();
    }

    initMesh() {
        this.group = new THREE.Group();
        this.group.position.copy(this.position);
        
        // 플레어 핵심 비주얼용 radial canvas 그라데이션 생성
        const coreSize = 64;
        const canvas = document.createElement('canvas');
        canvas.width = coreSize;
        canvas.height = coreSize;
        const ctx = canvas.getContext('2d');
        const grad = ctx.createRadialGradient(coreSize / 2, coreSize / 2, 0, coreSize / 2, coreSize / 2, coreSize / 2);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.2, '#ffff66');
        grad.addColorStop(0.5, '#ffff00');
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, coreSize, coreSize);
        const flareTexture = new THREE.CanvasTexture(canvas);

        const flareMat = new THREE.SpriteMaterial({
            map: flareTexture,
            color: 0xffff44,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        this.flareSprite = new THREE.Sprite(flareMat);
        this.flareSprite.scale.set(12.0, 12.0, 1.0);
        this.group.add(this.flareSprite);

        const glowMat = new THREE.SpriteMaterial({
            map: flareTexture,
            color: 0xffaa00,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        this.glowSprite = new THREE.Sprite(glowMat);
        this.glowSprite.scale.set(36.0, 36.0, 1.0);
        this.group.add(this.glowSprite);

        this.scene.add(this.group);
    }

    update(dt) {
        if (!this.active) return;

        this.life -= dt;
        if (this.life <= 0) {
            this.destroy();
            return;
        }

        // 3D Cartesian 중력 하강 및 공기 저항 감속 시뮬레이션
        this.velocity.y -= this.gravity * dt; // 중력 낙하
        this.velocity.multiplyScalar(Math.exp(-this.drag * dt)); // 대기 항력에 의한 급감속
        
        this.position.addScaledVector(this.velocity, dt);
        this.group.position.copy(this.position);

        // 깜빡임(Flicker) 및 투명도 서서히 페이드 아웃
        const t = this.life / this.maxLife;
        const flicker1 = 0.9 + Math.random() * 0.2;
        const flicker2 = 0.8 + Math.random() * 0.4;

        // 원거리 식별을 위한 동적 거리 비례 스케일링 계산
        let scaleFactor = 1.0;
        if (window.mainCamera) {
            const dist = this.position.distanceTo(window.mainCamera.position);
            scaleFactor = Math.max(1.0, Math.pow(dist / 800.0, 0.6));
        }
        
        if (this.flareSprite) {
            this.flareSprite.material.opacity = Math.min(1.0, t * 1.5);
            const size = 12.0 * flicker1 * scaleFactor;
            this.flareSprite.scale.set(size, size, 1.0);
        }
        if (this.glowSprite) {
            this.glowSprite.material.opacity = Math.min(0.8, t * 1.2);
            const size = 36.0 * flicker2 * scaleFactor;
            this.glowSprite.scale.set(size, size, 1.0);
        }

        // 연기 비행운 잔상 생성 및 업데이트
        this._spawnTrailIfNeeded(dt);
        this._updateTrail(dt);
    }

    _spawnTrailIfNeeded(dt) {
        const speed = this.velocity.length();
        this.distanceSinceLastTrail += speed * dt;
        const spawnInterval = 15.0; // 연기 생성 주기 거리 (유닛 단위)

        const texture = (window.ParticleManager && window.ParticleManager.sharedTexture) || null;

        while (this.distanceSinceLastTrail >= spawnInterval) {
            this.distanceSinceLastTrail -= spawnInterval;

            const smokeMat = new THREE.SpriteMaterial({
                map: texture,
                color: new THREE.Color(0.25, 0.25, 0.25), // 회색 연기
                transparent: true,
                opacity: 0.35 + Math.random() * 0.15,
                blending: THREE.NormalBlending,
                depthWrite: false
            });
            const smoke = new THREE.Sprite(smokeMat);
            smoke.position.copy(this.position);
            
            // 난류 및 대기 흐름에 의한 연기 드리프트
            smoke.driftVelocity = new THREE.Vector3(
                (Math.random() - 0.5) * 6.0,
                4.0 + Math.random() * 4.0, // 약간의 열기 상승 기류
                (Math.random() - 0.5) * 6.0
            );

            smoke.life = 1.2 + Math.random() * 1.2;
            smoke.maxLife = smoke.life;
            smoke.randomScale = 5.0 + Math.random() * 5.0; // 초기 크기

            this.scene.add(smoke);
            this.trail.push(smoke);
        }
    }

    _updateTrail(dt) {
        for (let i = this.trail.length - 1; i >= 0; i--) {
            const smoke = this.trail[i];
            smoke.life -= dt;
            if (smoke.life <= 0) {
                this.scene.remove(smoke);
                if (smoke.material) smoke.material.dispose();
                this.trail.splice(i, 1);
                continue;
            }

            const lifeRatio = smoke.life / smoke.maxLife;
            // 뭉게뭉게 커지는 구름 묘사 (크기 팽창)
            const currentScale = smoke.randomScale * (1.0 + (1.0 - lifeRatio) * 6.0);
            smoke.scale.set(currentScale, currentScale, 1.0);
            
            smoke.material.opacity = lifeRatio * 0.35;
            smoke.position.addScaledVector(smoke.driftVelocity, dt);
        }
    }

    destroy() {
        this.active = false;
        if (this.group) {
            this.scene.remove(this.group);
            if (this.flareSprite.material.map) {
                this.flareSprite.material.map.dispose();
            }
            this.flareSprite.material.dispose();
            this.glowSprite.material.dispose();
        }
        for (const smoke of this.trail) {
            this.scene.remove(smoke);
            if (smoke.material) smoke.material.dispose();
        }
        this.trail = [];
    }
}

const WeaponManager = {
    scene: null,
    spaceship: null, // 무기를 장착할 부모 기체

    // 상태 관리
    mountedWeapons: {},  // { 'hardpoint_1': missileObj, ... }
    launchedWeapons: [], // 발사되어 날아가는 무기 목록

    // 락온 관리
    lockedTarget: null,
    lockingTarget: null,
    lockProgress: 0.0,
    lockStatus: 'NONE', // 'NONE', 'LOCKING', 'LOCKED'

    // --- 1. 초기화 및 장착 ---
    init: async function (scene, spaceshipObj) {
        this.scene = scene;
        this.spaceship = spaceshipObj;
        
        this.lockedTarget = null;
        this.lockingTarget = null;
        this.lockProgress = 0.0;
        this.lockStatus = 'NONE';

        // 플레어 회피 시스템 초기화 (기체 성능 JSON에서 최대 탄수 로드)
        const shipPerf = (spaceshipObj && spaceshipObj.config && spaceshipObj.config.performance) ? spaceshipObj.config.performance : {};
        const maxFlares = shipPerf.flareAmmo !== undefined ? shipPerf.flareAmmo : 60;
        this.flareAmmo = maxFlares;
        this.maxFlareAmmo = maxFlares;
        this.flareQueue = 0;
        this.flareInterval = 0.15;
        this.lastFlarePulse = 0;
        this.lastFlareFireTime = 0;
        this.flares = [];
        window.activeFlares = this.flares;

        // TODO: JSON 설정(spaceship.config.hardpoints)을 읽어서 
        // aim120d 모델을 로드하고 기체(spaceship.mesh)의 하드포인트 좌표에 부착합니다.
        console.log("[WeaponManager] Initialized. Ready to mount weapons.");

        // 임시 로드 로직 (나중에 실제 모델 로딩 코드로 교체)
        await this._loadAndMountMissiles();

        // 3D 궤적 예측선 초기화
        const lineGeo = new THREE.BufferGeometry();
        const lineMat = new THREE.LineBasicMaterial({
            color: 0x00ff88,
            transparent: true,
            opacity: 0.6,
            blending: THREE.AdditiveBlending,
            linewidth: 2
        });
        this.predictionLine = new THREE.Line(lineGeo, lineMat);
        this.predictionLine.frustumCulled = false;
        this.scene.add(this.predictionLine);
    },

    scanForTargets: function (deltaTime) {
        if (!this.spaceship || !this.spaceship.mesh || this.spaceship.frozen) {
            this.lockedTarget = null;
            this.lockingTarget = null;
            this.lockProgress = 0.0;
            this.lockStatus = 'NONE';
            return;
        }

        const shipPos = this.spaceship.mesh.position;
        const shipQuat = this.spaceship.mesh.quaternion;
        const forwardDir = new THREE.Vector3(1, 0, 0).applyQuaternion(shipQuat); // 이 시뮬레이터는 +X가 전진 방향입니다.

        let bestTarget = null;
        let maxDot = 0.96; // 약 15도 조준각 범위
        const maxLockDistance = 60000;

        const hostileFactions = (this.spaceship.config && this.spaceship.config.hostileFactions) ? this.spaceship.config.hostileFactions : [];

        if (window.lockableTargets && window.lockableTargets.length > 0) {
            window.lockableTargets.forEach(target => {
                if (target.destroyed) return;
                if (!hostileFactions.includes(target.faction)) return;

                const targetPos = new THREE.Vector3();
                target.getWorldPosition(targetPos);

                const toTarget = new THREE.Vector3().subVectors(targetPos, shipPos);
                const dist = toTarget.length();
                if (dist > maxLockDistance) return;

                toTarget.normalize();
                const dot = forwardDir.dot(toTarget);

                if (dot > maxDot) {
                    bestTarget = target;
                    maxDot = dot;
                }
            });
        }

        // 락온 상태 머신 업데이트
        if (bestTarget) {
            if (this.lockingTarget === bestTarget) {
                if (this.lockStatus !== 'LOCKED') {
                    this.lockProgress = Math.min(1.0, this.lockProgress + deltaTime / 1.5); // 1.5초 유지 시 락온 완료
                    this.lockStatus = 'LOCKING';
                    if (this.lockProgress >= 1.0) {
                        this.lockStatus = 'LOCKED';
                        this.lockedTarget = bestTarget;
                    }
                }
            } else {
                this.lockingTarget = bestTarget;
                this.lockedTarget = null;
                this.lockProgress = 0.0;
                this.lockStatus = 'LOCKING';
            }
        } else {
            this.lockingTarget = null;
            this.lockedTarget = null;
            this.lockProgress = 0.0;
            this.lockStatus = 'NONE';
        }
    },

    _loadAndMountMissiles: async function () {
        const hardpoints = this.spaceship.config.hardpoints;
        if (!hardpoints) return;

        const loader = new THREE.GLTFLoader();

        // 어떤 무기 타입들이 있는지 파악하고 각각 한 번씩만 로드합니다.
        const weaponTypes = {};
        for (const key in hardpoints) {
            const hp = hardpoints[key];
            if (hp.type && hp.type !== "none") {
                weaponTypes[hp.type] = true;
            }
        }

        const loadedModels = {};
        const loadedConfigs = {};

        // 각 무기(미사일) 원본 파일과 설정을 비동기로 불러와 저장합니다.
        for (const type in weaponTypes) {
            try {
                // 모델 로드
                const gltf = await loader.loadAsync(`./model/${type}/${type}.glb`);
                loadedModels[type] = gltf.scene;
                
                // 설정(JSON) 로드 (브라우저 캐싱 방지를 위해 타임스탬프 추가)
                const response = await fetch(`./model/${type}/${type}.json?v=${Date.now()}`);
                const config = await response.json();
                loadedConfigs[type] = config;
                
                console.log(`[WeaponManager] Loaded weapon model & config: ${type}`);
            } catch (e) {
                console.error(`[WeaponManager] Failed to load weapon data: ${type}`, e);
            }
        }

        // 로드된 원본 모델을 복제(clone)하여 기체의 각 하드포인트에 부착합니다.
        for (const key in hardpoints) {
            const hp = hardpoints[key];
            if (hp.type && hp.type !== "none" && loadedModels[hp.type]) {
                const missileMesh = loadedModels[hp.type].clone();

                // 크기 설정
                const scale = hp.scale || 1;
                missileMesh.scale.set(scale, scale, scale);

                // 위치 설정
                missileMesh.position.set(hp.position.x, hp.position.y, hp.position.z);

                // 회전 설정 (Deg to Rad)
                missileMesh.rotation.set(
                    THREE.MathUtils.degToRad(hp.rotation.x || 0),
                    THREE.MathUtils.degToRad(hp.rotation.y || 0),
                    THREE.MathUtils.degToRad(hp.rotation.z || 0)
                );

                // 무기 객체 생성 (나중에 발사할 때 속성 추가 용이)
                const missileObj = {
                    id: key,
                    type: hp.type,
                    mesh: missileMesh,
                    config: loadedConfigs[hp.type] || {}, // 무기 전용 설정 저장
                    velocity: new THREE.Vector3()
                };

                // 기체 자식으로 부착!
                this.spaceship.mesh.add(missileMesh);
                this.mountedWeapons[key] = missileObj;
            }
        }

        console.log(`[WeaponManager] Mounted ${Object.keys(this.mountedWeapons).length} weapons.`);
    },

    // --- 2. 발사 로직 (특정 하드포인트 지정 발사) ---
    fire: function (hpName) {
        // hpName이 제공되지 않은 경우 (예: 기존 F키 호출), 첫 번째 사용 가능한 무기 발사
        if (!hpName) {
            const keys = Object.keys(this.mountedWeapons);
            if (keys.length === 0) {
                console.log("[WeaponManager] No weapons left to fire.");
                return;
            }
            hpName = keys[0];
        }

        if (!this.mountedWeapons[hpName]) {
            console.log(`[WeaponManager] No weapons on ${hpName}.`);
            return;
        }

        // 장착된 무기 중 해당 하드포인트의 무기를 꺼냅니다.
        const missile = this.mountedWeapons[hpName];
        delete this.mountedWeapons[hpName]; // 발사 후 슬롯 비우기

        // 1. 미사일의 현재 '세계 좌표(World Position)'와 '세계 회전(World Rotation)'을 저장합니다.
        const worldPos = new THREE.Vector3();
        const worldQuat = new THREE.Quaternion();
        missile.mesh.getWorldPosition(worldPos);
        missile.mesh.getWorldQuaternion(worldQuat);

        // 2. 부모-자식 관계 끊기 (기체에서 분리)
        this.spaceship.mesh.remove(missile.mesh);

        // 3. 씬(Scene)에 직접 추가하여 독립적인 객체로 만듭니다.
        this.scene.add(missile.mesh);

        // 4. 저장해둔 세계 좌표를 덮어씌워 제자리에 자연스럽게 위치시킵니다.
        missile.mesh.position.copy(worldPos);
        missile.mesh.quaternion.copy(worldQuat);

        // 5. 미사일 발사 초기 상태 설정 (자유 낙하)
        // 기체의 현재 방향과 속도를 그대로 물려받음
        const forwardDir = new THREE.Vector3(1, 0, 0).applyQuaternion(worldQuat);
        const initialSpeed = window.spaceship && window.spaceship.currentSpeed ? window.spaceship.currentSpeed : 1000;
        
        missile.velocity = forwardDir.clone().multiplyScalar(initialSpeed);
        // 랙에서 떨어져 나가는 느낌을 위해 기체의 아래 방향으로 살짝 투하
        const downDir = new THREE.Vector3(0, -1, 0).applyQuaternion(worldQuat);
        missile.velocity.add(downDir.multiplyScalar(80)); 

        // 미사일 수명 및 점화 지연(Drop Delay) 설정 (JSON에서 읽기)
        const weaponPerf = (missile.config && missile.config.performance) ? missile.config.performance : {};
        missile.age = 0;
        missile.lifespan = weaponPerf.lifespan || 5.0;
        missile.ignitionDelay = weaponPerf.ignitionDelay || 0.3;

        // 미사일에 유도 타겟 정보 기록
        missile.target = this.lockedTarget;

        // 발사된 목록으로 이동
        this.launchedWeapons.push(missile);

        if (window.soundManager) {
            try {
                window.soundManager.play('missile-fire');
            } catch (e) {
                console.error("[WeaponManager] Sound play error in fire:", e);
            }
        }

        console.log("[WeaponManager] Missile fired! Target locked:", this.lockedTarget ? this.lockedTarget.targetName : "NONE");
    },

    // 플레어 연속 투사 시작
    fireFlare: function () {
        const now = performance.now() * 0.001;
        
        const shipPerf = (this.spaceship && this.spaceship.config && this.spaceship.config.performance) ? this.spaceship.config.performance : {};
        const flareConfig = shipPerf.flare || {};
        const burstCountConfig = flareConfig.burstCount !== undefined ? flareConfig.burstCount : 6;
        const intervalConfig = flareConfig.interval !== undefined ? flareConfig.interval : 0.15;
        const cooldownConfig = flareConfig.cooldown !== undefined ? flareConfig.cooldown : 1.0;

        // 플레어 투하 재사용 대기시간
        if (now - this.lastFlareFireTime < cooldownConfig) {
            return;
        }

        if (this.flareAmmo <= 0) {
            if (window.soundManager) {
                try {
                    window.soundManager.play('weapon-warning');
                } catch (e) {
                    console.error("[WeaponManager] Sound play warning error:", e);
                }
            }
            return;
        }

        // 플레어 N발을 지정된 간격으로 연속 살포
        const burstCount = Math.min(burstCountConfig, this.flareAmmo);
        this.flareAmmo -= burstCount;
        this.flareQueue += burstCount;
        this.flareInterval = intervalConfig;
        this.lastFlarePulse = intervalConfig; // 즉시 첫 발이 투하되도록 유도
        this.lastFlareFireTime = now;

        console.log(`[WeaponManager] Fired flare burst. Queue: ${this.flareQueue}, Remaining: ${this.flareAmmo}`);
    },

    // 단일 플레어 투하 스폰 (상방/하방 동시 사출)
    _spawnSingleFlare: function () {
        if (!this.spaceship || !this.spaceship.mesh) return;

        this._spawnSingleFlareWithDir(false); // 하방 사출
        this._spawnSingleFlareWithDir(true);  // 상방 사출
    },

    _spawnSingleFlareWithDir: function (isUpward) {
        const worldPos = new THREE.Vector3();
        const worldQuat = new THREE.Quaternion();
        this.spaceship.mesh.getWorldPosition(worldPos);
        this.spaceship.mesh.getWorldQuaternion(worldQuat);

        const forwardDir = new THREE.Vector3(1, 0, 0).applyQuaternion(worldQuat);
        const currentSpeed = this.spaceship.currentSpeed || 1000;

        // F-18 하단(-5) 또는 상단(+5) 후방 오프셋
        const yOffset = isUpward ? 5 : -5;
        const flareLocalOffset = new THREE.Vector3(-30, yOffset, 0);
        const spawnPos = worldPos.clone().add(flareLocalOffset.applyQuaternion(worldQuat));

        // 플레어 초기 물리 속도 = 기체 진행 속도 + Ejection 방출 속도
        const planeVelocity = forwardDir.clone().multiplyScalar(currentSpeed);
        
        // 상방 사출 시 양수 Y 속도, 하방 사출 시 음수 Y 속도
        const yEject = isUpward ? (200 + Math.random() * 150) : (-200 - Math.random() * 150);

        const ejectLocal = new THREE.Vector3(
            -500 - Math.random() * 200, // 후방 사출
            yEject,                     // 상방/하방 사출
            (Math.random() - 0.5) * 200  // 좌우 흩뿌림
        );
        const ejectVelocity = ejectLocal.applyQuaternion(worldQuat);
        const finalVelocity = planeVelocity.clone().add(ejectVelocity);

        const shipPerf = (this.spaceship && this.spaceship.config && this.spaceship.config.performance) ? this.spaceship.config.performance : {};
        const flareConfig = shipPerf.flare || {};

        const newFlare = new Flare(this.scene, spawnPos, finalVelocity, 'BLUE', flareConfig);
        this.flares.push(newFlare);

        // 플레어 분사 시 soundManager를 통해 사운드를 재생
        if (window.soundManager) {
            try {
                window.soundManager.play('missile-fire');
            } catch (e) {
                console.error("[WeaponManager] Sound error on flare launch:", e);
            }
        }
    },

    // --- 임시 기능: 미사일 재장전 (나중에 쉽게 지울 수 있도록 분리됨) ---
    reload: async function () {
        console.log("[WeaponManager] Reloading missiles...");
        
        // 1. 기존에 매달려 있던(발사되지 않은) 미사일의 껍데기(Mesh)를 기체에서 제거
        for (const key in this.mountedWeapons) {
            const m = this.mountedWeapons[key];
            this.spaceship.mesh.remove(m.mesh);
        }
        this.mountedWeapons = {}; // 장착 목록 초기화 (객체)
        
        // 2. 초기화 함수 다시 호출하여 4발 다시 달기
        await this._loadAndMountMissiles();

        // 3. 플레어 충전
        this.flareAmmo = this.maxFlareAmmo;
        this.flareQueue = 0;

        // 4. 타겟 상태 초기화 (다시 격추해볼 수 있도록 복구)
        if (window.lockableTargets) {
            window.lockableTargets.forEach(t => {
                t.destroyed = false;
                t.visible = true;
            });
        }

        console.log("[WeaponManager] Reload complete and targets reset!");
    },

    // --- 3. 매 프레임 업데이트 ---
    update: function (deltaTime) {
        // 타겟 스캔 및 락온 연산 수행
        const prevLockStatus = this.lockStatus;
        this.scanForTargets(deltaTime);

        // 궤적 예측선 실시간 업데이트
        this.updatePredictionLine();

        // 사운드 재생 제어
        if (window.soundManager) {
            try {
                if (this.lockStatus === 'LOCKING' && window.warningSoundEnabled !== false) {
                    if (!window.soundManager.isPlaying('rwr-tws')) {
                        window.soundManager.play('rwr-tws');
                    }
                } else {
                    if (window.soundManager.isPlaying('rwr-tws')) {
                        window.soundManager.stop('rwr-tws');
                    }
                }

                if (prevLockStatus !== this.lockStatus && this.lockStatus === 'LOCKED' && window.warningSoundEnabled !== false) {
                    window.soundManager.play('rwr-lock');
                }
                if ((prevLockStatus === 'LOCKED' && this.lockStatus !== 'LOCKED') || window.warningSoundEnabled === false) {
                    if (window.soundManager.isPlaying('rwr-lock')) {
                        window.soundManager.stop('rwr-lock');
                    }
                }
            } catch (e) {
                console.error("[WeaponManager] Sound play error in update:", e);
            }
        }

        // 발사된 미사일들을 이동시키고, 수명을 관리합니다.
        for (let i = this.launchedWeapons.length - 1; i >= 0; i--) {
            const missile = this.launchedWeapons[i];

            // 타겟과의 물리적 충돌 검사
            let hitTarget = false;
            let distToTarget = Infinity;
            let targetHitRadius = 400;
            let hitEntity = null;

            // 락온된 타겟이 있는 경우 먼저 타겟 체크 및 거리 갱신
            if (missile.target && !missile.target.destroyed) {
                const targetPos = new THREE.Vector3();
                missile.target.getWorldPosition(targetPos);
                distToTarget = missile.mesh.position.distanceTo(targetPos);
                targetHitRadius = missile.target.collisionRadius !== undefined ? missile.target.collisionRadius : 150;
                
                if (window.CollisionSystem) {
                    const sphereHit = window.CollisionSystem.checkSphereCollision(missile.mesh.position, 0, [missile.target], [], 1.0);
                    if (sphereHit) {
                        hitTarget = true;
                        hitEntity = sphereHit.target;
                    }
                }
            }

            // 락온된 타겟이 없거나 락온 타겟이 빗나갔어도 주변의 다른 적 타겟과 충돌하는지 체크 (예: 항공폭탄 무유도 투하 등)
            if (!hitTarget && window.lockableTargets && window.lockableTargets.length > 0 && window.CollisionSystem) {
                const hostileFactions = (this.spaceship.config && this.spaceship.config.hostileFactions) ? this.spaceship.config.hostileFactions : [];
                const sphereHit = window.CollisionSystem.checkSphereCollision(missile.mesh.position, 0, window.lockableTargets, hostileFactions, 1.0);
                if (sphereHit) {
                    hitTarget = true;
                    hitEntity = sphereHit.target;
                    const targetPos = new THREE.Vector3();
                    hitEntity.getWorldPosition(targetPos);
                    distToTarget = missile.mesh.position.distanceTo(targetPos);
                    targetHitRadius = hitEntity.collisionRadius !== undefined ? hitEntity.collisionRadius : 150;
                }
            }

            // 대형 고정 표면(항공모함, 활주로)에 대한 정밀 메쉬 레이캐스트 충돌 검사 (옆면/상단 전방향 지원)
            if (!hitTarget && window.lockableTargets && window.lockableTargets.length > 0 && window.CollisionSystem) {
                const missileSpeed = missile.velocity.length();
                if (missileSpeed > 0) {
                    const rayDir = missile.velocity.clone().normalize();
                    const maxDetectionDist = (missileSpeed * deltaTime) + 50.0;
                    const staticTargets = window.lockableTargets.filter(t => !t.destroyed && (t.targetName === "NIMITZ" || t.targetName === "RUNWAY"));
                    
                    const forwardHit = window.CollisionSystem.checkForwardCollision(
                        missile.mesh.position,
                        rayDir,
                        maxDetectionDist,
                        staticTargets,
                        false // ignoreDeck = false (since missile can impact deck)
                    );

                    if (forwardHit) {
                        hitTarget = true;
                        hitEntity = forwardHit.object;
                        missile.mesh.position.copy(forwardHit.point);
                    }
                }
            }

            // 실제 데미지 적용
            if (hitTarget && hitEntity) {
                const dmg = (missile.config && missile.config.destruction && missile.config.destruction.damage !== undefined)
                    ? missile.config.destruction.damage
                    : 100;
                
                if (hitEntity.health === undefined) {
                    hitEntity.health = 100;
                }
                
                hitEntity.health -= dmg;
                console.log(`[WeaponManager] ${missile.type} hit target: ${hitEntity.targetName}! Damage: ${dmg}, Health remaining: ${hitEntity.health}`);
                
                // 내가 쏜 미사일이 명중한 대상을 액션 캠으로 보여줌
                if (window.triggerActionCam) {
                    window.triggerActionCam(hitEntity, 4.0);
                }
                
                if (hitEntity.health <= 0) {
                    hitEntity.destroyed = true;
                    hitEntity.visible = false;
                    console.log(`[WeaponManager] Target destroyed: ${hitEntity.targetName}!`);
                } else {
                    // 타격을 가하되 격추되진 않은 경우, 타격 위치에 중간 크기 폭발만 생성
                    if (window.ParticleManager && window.ParticleManager.spawnExplosion) {
                        window.ParticleManager.spawnExplosion(missile.mesh.position.clone(), 3.0);
                    }
                }
                missile.hitEntity = hitEntity;
            }

            // 적 플레어 접촉 여부 검사 (80 유닛 이내)
            let hitFlare = false;
            let targetFlare = null;

            let hasEnemyFlaresInRange = false;
            if (window.activeFlares && window.activeFlares.length > 0) {
                for (const flare of window.activeFlares) {
                    if (flare.active && flare.faction === 'RED' && missile.mesh.position.distanceTo(flare.position) < 4000.0) {
                        hasEnemyFlaresInRange = true;
                        break;
                    }
                }
            }

            // 최초로 플레어 조우 시 40% 확률로 기만 여부 결정
            if (hasEnemyFlaresInRange && missile.isDecoyed === undefined) {
                missile.isDecoyed = Math.random() < 0.40;
                console.log(`[WeaponManager] Player missile encountered RED flares. Decoyed: ${missile.isDecoyed}`);
            }

            if (missile.isDecoyed === true && window.activeFlares && window.activeFlares.length > 0) {
                for (const flare of window.activeFlares) {
                    if (!flare.active || flare.faction !== 'RED') continue;
                    const distToFlare = missile.mesh.position.distanceTo(flare.position);
                    if (distToFlare < 200.0) {
                        hitFlare = true;
                        targetFlare = flare;
                        break;
                    }
                }
            }

            // 수명 관리 및 충돌 검사: 나이가 수명을 초과하거나 수면(y <= 0)에 닿거나 타겟에 맞으면 폭발
            missile.age += deltaTime;
            
            // 타겟 근처에 있을 때는 수면 충돌(물보라 폭발)을 무시하여 바다 속에 잠겨있는 타겟 중심부까지 미사일이 도달할 수 있도록 함
            let hitWater = missile.mesh.position.y <= 0;
            const activeTarget = missile.hitEntity || missile.target;
            if (activeTarget && !activeTarget.destroyed && distToTarget < targetHitRadius * 1.5) {
                hitWater = false;
            }
            if (missile.age >= missile.lifespan || hitWater || hitTarget || hitFlare) {
                if (window.ParticleManager && window.ParticleManager.spawnExplosion) {
                    const explosionPos = missile.mesh.position.clone();
                    if (hitWater) explosionPos.y = 0; // 수면 폭발로 위치 고정
                    const weaponScale = (missile.config && missile.config.destruction && missile.config.destruction.explosionScale) 
                                        ? missile.config.destruction.explosionScale 
                                        : 6.0;
                    const isBomb = this.getWeaponCategory(missile) === 'bomb';
                    if (isBomb && window.MushroomExplosionManager) {
                        window.MushroomExplosionManager.spawn(explosionPos, weaponScale);
                    } else {
                        if (window.ParticleManager.spawnExplosion) {
                            window.ParticleManager.spawnExplosion(explosionPos, weaponScale); // 미사일 자체 폭발
                        }
                        if (window.ParticleManager.spawnPersistentFire) {
                            window.ParticleManager.spawnPersistentFire(explosionPos, 8.0, weaponScale / 6.0);
                        }
                    }
                    if (window.soundManager) {
                        window.soundManager.play('explosion-random');
                    }

                    // --- 스플래시 데미지 (AOE) 연산 추가 ---
                    const maxDamage = (missile.config && missile.config.destruction && missile.config.destruction.damage !== undefined)
                        ? missile.config.destruction.damage
                        : 100;
                    const splashRadius = (missile.config && missile.config.destruction && missile.config.destruction.splashRadius !== undefined)
                        ? missile.config.destruction.splashRadius
                        : (weaponScale * 150); // 기본 스플래시 반경 (aim120d: 900, airbomb: 1800)

                    if (window.lockableTargets && window.lockableTargets.length > 0) {
                        const playerFaction = (this.spaceship && this.spaceship.config && this.spaceship.config.faction) ? this.spaceship.config.faction : "BLUE";
                        const directHitEntity = missile.hitEntity;

                        window.lockableTargets.forEach(target => {
                            if (target.destroyed) return;
                            if (target.faction === playerFaction) return; // 아군 오사 방지
                            if (target === directHitEntity) return; // 직접 타격 대상은 이미 직접 데미지를 받았으므로 제외 (중복 데미지 방지)

                            const targetPos = new THREE.Vector3();
                            target.getWorldPosition(targetPos);
                            const distance = explosionPos.distanceTo(targetPos);

                            if (distance <= splashRadius) {
                                // 선형 데미지 감쇄 공식: 거리가 멀어질수록 데미지 감소 (0% ~ 100%)
                                const damageFraction = 1.0 - (distance / splashRadius);
                                const splashDmg = Math.round(maxDamage * damageFraction);

                                if (splashDmg > 0) {
                                    if (target.health === undefined) target.health = 100;
                                    target.health -= splashDmg;
                                    console.log(`[WeaponManager] ${missile.type} splash hit -> ${target.targetName}! Damage: ${splashDmg} (${Math.round(damageFraction * 100)}%), Distance: ${Math.round(distance)}/${Math.round(splashRadius)}, HP left: ${target.health}`);

                                    // 격추 처리
                                    if (target.health <= 0) {
                                        target.destroyed = true;
                                        target.visible = false;
                                        console.log(`[WeaponManager] Target destroyed by splash: ${target.targetName}!`);

                                        // 연쇄 폭발 발생
                                        const expScale = target.explosionScale || 6.0;
                                        const expCount = target.explosionCount || 1;

                                        for (let c = 0; c < expCount; c++) {
                                            const delay = c * 250 + Math.random() * 150;
                                            setTimeout(() => {
                                                if (window.ParticleManager && window.ParticleManager.spawnExplosion) {
                                                    const offset = new THREE.Vector3(
                                                        (Math.random() - 0.5) * expScale * 10,
                                                        (Math.random() - 0.5) * expScale * 2,
                                                        (Math.random() - 0.5) * expScale * 10
                                                    );
                                                    const p = targetPos.clone().add(offset);
                                                    window.ParticleManager.spawnExplosion(p, expScale);
                                                    if (window.ParticleManager.spawnPersistentFire) {
                                                        window.ParticleManager.spawnPersistentFire(p, 6.0 + Math.random() * 4.0, expScale / 6.0);
                                                    }
                                                    if (window.soundManager) {
                                                        window.soundManager.play('explosion-random');
                                                    }
                                                }
                                            }, delay);
                                        }
                                    } else {
                                        // 생존 시 피격 이펙트
                                        if (window.ParticleManager && window.ParticleManager.spawnExplosion) {
                                            window.ParticleManager.spawnExplosion(targetPos.clone(), 3.0);
                                        }
                                    }
                                }
                            }
                        });
                    }

                    // 타겟 격추 시 타겟의 진영 설정 크기와 횟수에 부합하는 순차적 연쇄 폭발 실행
                    const explodedTarget = missile.hitEntity || missile.target;
                    if (hitTarget && explodedTarget && explodedTarget.destroyed) {
                        const targetPos = new THREE.Vector3();
                        explodedTarget.getWorldPosition(targetPos);

                        const expScale = missile.target.explosionScale || 6.0;
                        const expCount = missile.target.explosionCount || 1;

                        for (let c = 0; c < expCount; c++) {
                            const delay = c * 250 + Math.random() * 150; // 0.25초 단위 순차적 지연
                            setTimeout(() => {
                                if (window.ParticleManager && window.ParticleManager.spawnExplosion) {
                                    // 타겟 본체의 크기를 고려한 폭발 오프셋 생성
                                    const offset = new THREE.Vector3(
                                        (Math.random() - 0.5) * expScale * 10,
                                        (Math.random() - 0.5) * expScale * 2,
                                        (Math.random() - 0.5) * expScale * 10
                                    );
                                    const p = targetPos.clone().add(offset);
                                    window.ParticleManager.spawnExplosion(p, expScale);
                                    if (window.ParticleManager.spawnPersistentFire) {
                                        window.ParticleManager.spawnPersistentFire(p, 6.0 + Math.random() * 4.0, expScale / 6.0);
                                    }
                                    if (window.soundManager) {
                                        window.soundManager.play('explosion-random');
                                    }
                                }
                            }, delay);
                        }
                    }
                }

                if (hitFlare && targetFlare) {
                    targetFlare.active = false;
                    targetFlare.destroy();
                    console.log("[WeaponManager] Player missile decoyed and detonated on enemy flare.");
                }

                this.scene.remove(missile.mesh); // 씬에서 제거
                
                // 메모리 누수 방지 (지우기)
                missile.mesh.traverse(child => {
                    if (child.isMesh) {
                        if (child.geometry) child.geometry.dispose();
                        if (child.material) {
                            if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
                            else child.material.dispose();
                        }
                    }
                });
                
                this.launchedWeapons.splice(i, 1); // 배열에서 제거
                continue; // 아래 이동 로직을 생략하고 다음 미사일로 넘어감
            }

            const weaponPerf = (missile.config && missile.config.performance) ? missile.config.performance : {};
            const gravity = weaponPerf.gravity !== undefined ? weaponPerf.gravity : 400.0;

            // 점화 전/후 상태에 따른 물리 및 시각 효과 처리
            if (missile.age < missile.ignitionDelay) {
                // [점화 전 - 자유 낙하] 중력의 영향을 받아 아래로 조금씩 떨어짐
                missile.velocity.y -= gravity * deltaTime; 
            } else {
                // [점화 완료 - 로켓 가동]
                if (!missile.ignited) {
                    missile.ignited = true;
                }

                if (missile.target && !missile.target.destroyed) {
                    // [유도 비행] 타겟의 월드 좌표 획득
                    let steeringTarget = null;

                    // 기만 상태인 경우 4000 이내의 적 플레어(RED) 중 가장 가까운 플레어를 추격
                    if (missile.isDecoyed === true && window.activeFlares && window.activeFlares.length > 0) {
                        let nearestDist = 4000.0;
                        let nearestFlare = null;
                        for (const flare of window.activeFlares) {
                            if (!flare.active || flare.faction !== 'RED') continue;
                            const distToFlare = missile.mesh.position.distanceTo(flare.position);
                            if (distToFlare < nearestDist) {
                                nearestDist = distToFlare;
                                nearestFlare = flare;
                            }
                        }
                        if (nearestFlare) {
                            steeringTarget = nearestFlare.position;
                        }
                    }

                    if (!steeringTarget) {
                        const targetPos = new THREE.Vector3();
                        missile.target.getWorldPosition(targetPos);
                        steeringTarget = targetPos;
                    }

                    // 타겟을 향한 유도 제어 벡터 연산
                    const dirToTarget = new THREE.Vector3().subVectors(steeringTarget, missile.mesh.position).normalize();
                    const currentDir = missile.velocity.clone().normalize();
                    
                    const agility = weaponPerf.agility !== undefined ? weaponPerf.agility : 2.8;
                    const acceleration = weaponPerf.acceleration !== undefined ? weaponPerf.acceleration : 1600;
                    const maxSpeed = weaponPerf.maxSpeed !== undefined ? weaponPerf.maxSpeed : 4500;

                    const newDir = currentDir.lerp(dirToTarget, agility * deltaTime).normalize();

                    // 미사일 속도 가속 연산
                    const currentSpeed = Math.min(missile.velocity.length() + acceleration * deltaTime, maxSpeed);
                    missile.velocity.copy(newDir).multiplyScalar(currentSpeed);

                    // 미사일 기수 정렬 (+X 방향)
                    missile.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), newDir);
                } else {
                    // [일반 관성 비행] 기존 로직 유지
                    const acceleration = weaponPerf.acceleration !== undefined ? weaponPerf.acceleration : 1500;
                    const maxSpeed = weaponPerf.maxSpeed !== undefined ? weaponPerf.maxSpeed : 4500;

                    const currentSpeed = Math.min(missile.velocity.length() + acceleration * deltaTime, maxSpeed);
                    const noseDir = new THREE.Vector3(1, 0, 0).applyQuaternion(missile.mesh.quaternion);
                    const idealVelocity = noseDir.clone().multiplyScalar(currentSpeed);
                    missile.velocity.lerp(idealVelocity, 6.0 * deltaTime);
                }
            }

            // 1. 위치 이동
            const displacement = missile.velocity.clone().multiplyScalar(deltaTime);
            missile.mesh.position.add(displacement);
            
            // 2. 행렬 업데이트 (화염 위치 정확도)
            missile.mesh.updateMatrixWorld();

            // 3. 점화 상태인 경우 화염 생성
            if (missile.age >= missile.ignitionDelay && window.ParticleManager) {
                // JSON 설정에서 하드포인트 정보를 가져옴 (없으면 기본값 사용)
                const missileEngineHP = (missile.config && missile.config.visuals && missile.config.visuals.engineHardpoints) 
                                         ? missile.config.visuals.engineHardpoints 
                                         : [{ x: -50, y: 0, z: 0 }]; // 기본값

                window.ParticleManager.spawnMissileTrails(
                    missile.mesh, 
                    missileEngineHP, 
                    { parentVelocity: missile.velocity.clone() }
                );
            }
        }

        // 플레어 분사 대기 큐 처리
        if (this.flareQueue > 0) {
            this.lastFlarePulse += deltaTime;
            if (this.lastFlarePulse >= this.flareInterval) {
                this._spawnSingleFlare();
                this.flareQueue--;
                this.lastFlarePulse = 0;
            }
        }

        // 활성화된 플레어 이동 및 수명 업데이트
        for (let i = this.flares.length - 1; i >= 0; i--) {
            const f = this.flares[i];
            f.update(deltaTime);
            if (!f.active) {
                this.flares.splice(i, 1);
            }
        }
    },

    getWeaponCategory: function (weapon) {
        if (!weapon || !weapon.config) return 'missile';
        
        // 1. JSON 설정의 category 필드 우선 확인
        if (weapon.config.category) {
            return weapon.config.category.toLowerCase();
        }

        // 2. 폴백: 물리 성능 스펙을 기반으로 미사일과 폭탄 동적 분류
        const weaponPerf = weapon.config.performance || {};
        const ignitionDelay = weaponPerf.ignitionDelay !== undefined ? weaponPerf.ignitionDelay : 0.3;
        const acceleration = weaponPerf.acceleration !== undefined ? weaponPerf.acceleration : 1600;

        if (ignitionDelay >= 999.0 || acceleration === 0) {
            return 'bomb';
        }
        return 'missile';
    },

    updatePredictionLine: function () {
        if (!this.predictionLine) return;

        // 기체 정보가 없으면 예측선을 숨김
        if (!this.spaceship || !this.spaceship.mesh) {
            this.predictionLine.visible = false;
            return;
        }

        const keys = Object.keys(this.mountedWeapons);
        let weapon = null;
        let config = {};

        // 현재 카메라 뷰 모드에 따라 궤적을 그릴 무기 범주 결정
        const cameraMode = window.cameraMode || 's1';
        const targetCategory = (cameraMode === 's2') ? 'bomb' : 'missile';

        if (keys.length > 0) {
            // 1. 현재 카메라 모드에 맞는 카테고리 무기 탐색
            for (const key of keys) {
                const w = this.mountedWeapons[key];
                if (this.getWeaponCategory(w) === targetCategory) {
                    weapon = w;
                    break;
                }
            }
        }

        if (weapon) {
            config = weapon.config || {};
        } else {
            // 2. 해당 카테고리의 무기가 없거나 완전히 소진된 경우, 카메라 모드에 맞는 기본 스펙을 폴백으로 적용
            if (targetCategory === 'missile') {
                config = {
                    performance: {
                        gravity: 400.0,
                        ignitionDelay: 0.3,
                        agility: 2.8,
                        acceleration: 1600,
                        maxSpeed: 4500
                    }
                };
            } else { // targetCategory === 'bomb'
                config = {
                    performance: {
                        gravity: 400.0,
                        ignitionDelay: 999.0,
                        agility: 0.0,
                        acceleration: 0,
                        maxSpeed: 1000
                    }
                };
            }
        }

        const weaponPerf = config.performance || {};
        const isGrounded = this.spaceship && this.spaceship.isGrounded;

        // 지상(활주로)에 있을 때는 물리 낙하 및 사출 딜레이를 제거하여 라인이 바닥에 박히는 현상 해결
        const gravity = isGrounded ? 0 : (weaponPerf.gravity !== undefined ? weaponPerf.gravity : 400.0);
        const ignitionDelay = isGrounded ? 0 : (weaponPerf.ignitionDelay !== undefined ? weaponPerf.ignitionDelay : 0.3);
        const agility = weaponPerf.agility !== undefined ? weaponPerf.agility : 2.8;
        const acceleration = weaponPerf.acceleration !== undefined ? weaponPerf.acceleration : 1600;
        const maxSpeed = weaponPerf.maxSpeed !== undefined ? weaponPerf.maxSpeed : 4500;

        // 타겟 락온 상태에 따라 라인 재질 색상 및 투명도 변경
        if (this.predictionLine.material) {
            if (this.lockStatus === 'LOCKED') {
                this.predictionLine.material.color.setHex(0xff3333); // 적색
                this.predictionLine.material.opacity = 0.8;
            } else if (this.lockStatus === 'LOCKING') {
                this.predictionLine.material.color.setHex(0x00ff88); // 연초록색
                this.predictionLine.material.opacity = 0.6;
            } else {
                this.predictionLine.material.color.setHex(0x00ff88); // 연초록색 (대기 상태)
                this.predictionLine.material.opacity = 0.4;
            }
        }

        // 미사일 발사 시점의 초기 물리 상태 설정
        const startPos = new THREE.Vector3();
        const startQuat = new THREE.Quaternion();

        if (weapon && weapon.mesh) {
            weapon.mesh.getWorldPosition(startPos);
            weapon.mesh.getWorldQuaternion(startQuat);
        } else {
            // 무기가 없는 경우 기체 중심에서 약간 하단 앞쪽에서 시작하도록 설정
            this.spaceship.mesh.getWorldPosition(startPos);
            this.spaceship.mesh.getWorldQuaternion(startQuat);
            const localOffset = new THREE.Vector3(20, -2, 0);
            startPos.add(localOffset.applyQuaternion(startQuat));
        }

        const forwardDir = new THREE.Vector3(1, 0, 0).applyQuaternion(startQuat);
        const initialSpeed = this.spaceship.currentSpeed || 1000;
        const velocity = forwardDir.clone().multiplyScalar(initialSpeed);
        
        // 지상에 떠있을 때만 랙에서 떨어져 나가는 느낌의 초기 하방 속도 추가
        if (!isGrounded) {
            const downDir = new THREE.Vector3(0, -1, 0).applyQuaternion(startQuat);
            velocity.add(downDir.multiplyScalar(80));
        }

        const simPos = startPos.clone();
        const simVel = velocity.clone();
        const simQuat = startQuat.clone();

        const points = [];
        points.push(simPos.clone());

        // 시뮬레이션 설정: 60단계, 단계당 0.1초 (총 6.0초 비행 경로)
        const steps = 60;
        const dt = 0.1;
        let age = 0;

        let simulationTarget = this.lockedTarget;

        for (let i = 0; i < steps; i++) {
            age += dt;

            if (age < ignitionDelay) {
                // 점화 전: 자유 낙하
                simVel.y -= gravity * dt;
            } else {
                // 점화 후
                if (simulationTarget && !simulationTarget.destroyed) {
                    const targetPos = new THREE.Vector3();
                    simulationTarget.getWorldPosition(targetPos);

                    const dirToTarget = new THREE.Vector3().subVectors(targetPos, simPos).normalize();
                    const currentDir = simVel.clone().normalize();
                    const newDir = currentDir.lerp(dirToTarget, agility * dt).normalize();

                    const currentSpeed = Math.min(simVel.length() + acceleration * dt, maxSpeed);
                    simVel.copy(newDir).multiplyScalar(currentSpeed);
                    simQuat.setFromUnitVectors(new THREE.Vector3(1, 0, 0), newDir);
                } else {
                    // 무유도 직진 비행
                    const currentSpeed = Math.min(simVel.length() + acceleration * dt, maxSpeed);
                    const noseDir = new THREE.Vector3(1, 0, 0).applyQuaternion(simQuat);
                    const idealVelocity = noseDir.clone().multiplyScalar(currentSpeed);
                    simVel.lerp(idealVelocity, 6.0 * dt);
                }
            }

            const displacement = simVel.clone().multiplyScalar(dt);
            simPos.add(displacement);
            points.push(simPos.clone());

            // 1. 수면 아래로 내려가면 연산 조기 중단
            if (simPos.y <= 0) {
                break;
            }

            // 2. 타겟과 충돌(접촉) 예상 시 연산 조기 중단
            if (simulationTarget && !simulationTarget.destroyed) {
                const targetPos = new THREE.Vector3();
                simulationTarget.getWorldPosition(targetPos);
                const distToTarget = simPos.distanceTo(targetPos);
                const targetHitRadius = simulationTarget.collisionRadius || 150;
                
                // 수면 위에 떠있는 타겟 주변일 때 y <= 0 충돌 조건 우회
                let hitTarget = distToTarget < targetHitRadius;
                if (hitTarget) {
                    break;
                }
            }
        }

        // 지오메트리 업데이트 및 라인 보이기
        this.predictionLine.geometry.setFromPoints(points);
        this.predictionLine.visible = true;
    }
};

window.Flare = Flare;

// 외부에서 접근할 수 있도록 전역에 노출
window.WeaponManager = WeaponManager;
