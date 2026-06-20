// enemySystem.js
// 적(NPC/정적 오브젝트)이 플레이어를 감지하고 락온 후 미사일/폭탄을 투하하는 시스템

const EnemySystem = {
    scene: null,
    spaceship: null, // 플레이어 기체
    enemyWeapons: [], // 날아가는 적 미사일/폭탄 목록
    missileModel: null,
    f18Model: null,
    b52Model: null,
    bombModel: null,
    enemyJets: [],
    missileConfig: null,
    f18Config: null,
    b52Config: null,
    bombConfig: null,

    init: async function (scene, spaceshipObj) {
        this.scene = scene;
        this.spaceship = spaceshipObj;

        const loader = new THREE.GLTFLoader();
        
        // 미사일 모델 및 설정 비동기 로딩
        try {
            const gltf = await loader.loadAsync(`./model/aim120d/aim120d.glb`);
            this.missileModel = gltf.scene;
            console.log("[EnemySystem] Enemy missile model loaded.");

            const response = await fetch(`./model/aim120d/aim120d.json?v=${Date.now()}`);
            this.missileConfig = await response.json();
            console.log("[EnemySystem] Enemy missile config loaded.");
        } catch (e) {
            console.error("[EnemySystem] Failed to load enemy missile model/config", e);
            window.enemySpawnError = `Missile load error: ${e.message}`;
        }

        // F-18_2 모델 및 설정 로딩 및 적기 스폰
        try {
            const gltf = await loader.loadAsync(`./model/F18_2/F18_2.glb`);
            this.f18Model = gltf.scene;
            console.log("[EnemySystem] Enemy F18_2 model loaded.");

            const response = await fetch(`./model/F18_2/F18_2.json?v=${Date.now()}`);
            this.f18Config = await response.json();
            console.log("[EnemySystem] Enemy F18_2 config loaded.");

            this.spawnEnemyJets();
        } catch (e) {
            console.error("[EnemySystem] Failed to load F18_2 model/config", e);
            window.enemySpawnError = `F18_2 load error: ${e.message}`;
        }

        // 적 폭탄 모델 및 설정 비동기 로딩
        try {
            const gltf = await loader.loadAsync(`./model/airbomb/airbomb.glb`);
            this.bombModel = gltf.scene;
            console.log("[EnemySystem] Enemy bomb model loaded.");

            const response = await fetch(`./model/airbomb/airbomb.json?v=${Date.now()}`);
            this.bombConfig = await response.json();
            console.log("[EnemySystem] Enemy bomb config loaded.");
        } catch (e) {
            console.error("[EnemySystem] Failed to load enemy bomb model/config", e);
            window.enemySpawnError = `Bomb load error: ${e.message}`;
        }

        // B-52_2 모델 및 설정 로딩 및 폭격기 스폰
        try {
            const gltf = await loader.loadAsync(`./model/b52_2/b52_2.glb`);
            this.b52Model = gltf.scene;
            console.log("[EnemySystem] Enemy B52_2 model loaded.");

            const response = await fetch(`./model/b52_2/b52_2.json?v=${Date.now()}`);
            this.b52Config = await response.json();
            console.log("[EnemySystem] Enemy B52_2 config loaded.");

            this.spawnEnemyBombers();
        } catch (e) {
            console.error("[EnemySystem] Failed to load B52_2 model/config", e);
            window.enemySpawnError = `B52_2 load error: ${e.message}`;
        }
    },

    spawnEnemyJets: function () {
        if (!this.f18Model || !this.spaceship || !this.spaceship.mesh) return;

        const playerPos = this.spaceship.mesh.position;

        // 적기 설정 파일의 좌표를 우선 사용, 없으면 플레이어 기준 앞쪽 30000, 고도 10000 스폰
        let spawnCenter;
        if (this.f18Config && this.f18Config.model && this.f18Config.model.initialPosition) {
            const pos = this.f18Config.model.initialPosition;
            spawnCenter = new THREE.Vector3(pos.x, pos.y, pos.z);
        } else {
            spawnCenter = playerPos.clone().add(new THREE.Vector3(30000, 10000, 0));
        }
        this.spawnCenter = spawnCenter.clone();

        // 1대 스폰
        const formations = [
            new THREE.Vector3(0, 0, 0)          // Leader
        ];

        formations.forEach((offset, idx) => {
            const jet = this.f18Model.clone();
            jet.scale.set(1, 1, 1);
            
            // 위치 설정
            const startPos = spawnCenter.clone().add(offset);
            jet.position.copy(startPos);
            
            // 플레이어를 향하도록 회전
            const dir = new THREE.Vector3().subVectors(playerPos, startPos).normalize();
            jet.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), dir);

            jet.traverse(child => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });

            // 타겟 시스템 등록용 속성
            const destruction = (this.f18Config && this.f18Config.destruction) ? this.f18Config.destruction : {};
            jet.config = this.f18Config;
            jet.isTarget = true;
            jet.targetName = `ENEMY F-18 #${idx + 1}`;
            jet.destroyed = false;
            jet.faction = (this.f18Config && this.f18Config.faction) ? this.f18Config.faction : "RED";
            jet.hostileFactions = (this.f18Config && this.f18Config.hostileFactions) ? this.f18Config.hostileFactions : ["BLUE"];
            jet.explosionScale = destruction.explosionScale !== undefined ? destruction.explosionScale : 8.0;
            jet.explosionCount = destruction.explosionCount !== undefined ? destruction.explosionCount : 1;
            jet.collisionRadius = (this.f18Config && this.f18Config.collisionRadius) ? this.f18Config.collisionRadius : 45.0;
            jet.health = destruction.health !== undefined ? destruction.health : 100;

            this.scene.add(jet);
            window.lockableTargets.push(jet);

            const f18Perf = (this.f18Config && this.f18Config.performance) ? this.f18Config.performance : {};
            const baseSpeed = f18Perf.speed !== undefined ? f18Perf.speed : 700;
            const finalSpeed = baseSpeed + (Math.random() - 0.5) * 100;
            const f18FlareAmmo = f18Perf.flareAmmo !== undefined ? f18Perf.flareAmmo : 30;

            this.enemyJets.push({
                mesh: jet,
                speed: finalSpeed,
                velocity: dir.clone().multiplyScalar(finalSpeed),
                cooldown: 0,
                lockProgress: 0,
                isJet: true,
                state: 'PATROL',
                stateTimer: 0,
                patrolCenter: spawnCenter.clone().add(offset),
                patrolWaypoint: null,
                targetOffset: new THREE.Vector3(
                    (Math.random() - 0.5) * 6000,
                    (Math.random() - 0.5) * 3000,
                    (Math.random() - 0.5) * 6000
                ),
                offsetTimer: Math.random() * 5,
                evasiveManeuver: null,
                evasiveDir: Math.random() < 0.5 ? 1 : -1,
                flareAmmo: f18FlareAmmo,
                flareCooldown: 0,
                flareQueue: 0,
                lastFlarePulse: 0
            });
        });
        
        console.log(`[EnemySystem] Spawned 1 Enemy F-18 (F18_2) with Advanced AI.`);
    },

    spawnEnemyBombers: function () {
        if (!this.b52Model || !this.spaceship || !this.spaceship.mesh) return;

        let spawnPos;
        if (this.b52Config && this.b52Config.model && this.b52Config.model.initialPosition) {
            const pos = this.b52Config.model.initialPosition;
            spawnPos = new THREE.Vector3(pos.x, pos.y, pos.z);
        } else {
            spawnPos = new THREE.Vector3(-25000, 4500, -9825);
        }

        const spawnHeading = (this.b52Config && this.b52Config.model && this.b52Config.model.spawnHeading !== undefined)
            ? this.b52Config.model.spawnHeading
            : 0;

        const jet = this.b52Model.clone();
        const scale = (this.b52Config && this.b52Config.model && this.b52Config.model.scale) ? this.b52Config.model.scale : 24.0;
        jet.scale.set(scale, scale, scale);
        
        jet.position.copy(spawnPos);
        
        // 초기 각도 설정
        const yawRad = THREE.MathUtils.degToRad(spawnHeading);
        const qY = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yawRad);
        jet.quaternion.copy(qY);

        jet.traverse(child => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });

        // 타겟 등록
        const destruction = (this.b52Config && this.b52Config.destruction) ? this.b52Config.destruction : {};
        jet.config = this.b52Config;
        jet.isTarget = true;
        jet.targetName = "ENEMY B-52 BOMBER";
        jet.destroyed = false;
        jet.faction = (this.b52Config && this.b52Config.faction) ? this.b52Config.faction : "RED";
        jet.hostileFactions = (this.b52Config && this.b52Config.hostileFactions) ? this.b52Config.hostileFactions : ["BLUE"];
        jet.explosionScale = destruction.explosionScale !== undefined ? destruction.explosionScale : 15.0;
        jet.explosionCount = destruction.explosionCount !== undefined ? destruction.explosionCount : 3;
        jet.collisionRadius = (this.b52Config && this.b52Config.collisionRadius) ? this.b52Config.collisionRadius : 180.0;
        jet.health = destruction.health !== undefined ? destruction.health : 350;

        this.scene.add(jet);
        window.lockableTargets.push(jet);

        const perf = (this.b52Config && this.b52Config.performance) ? this.b52Config.performance : {};
        const speed = perf.speed !== undefined ? perf.speed : 400;

        const forwardDir = new THREE.Vector3(1, 0, 0).applyQuaternion(jet.quaternion);

        this.enemyJets.push({
            mesh: jet,
            speed: speed,
            velocity: forwardDir.clone().multiplyScalar(speed),
            isJet: true,
            isBomber: true,
            role: 'BOMBER',
            state: 'APPROACH',
            stateTimer: 0,
            bombCooldown: 0,
            bombsFired: 0,
            bombsMax: 4,
            target: null,
            yawAngle: yawRad,
            pitchAngle: 0,
            rollAngle: 0,
            uTurnTargetHeading: 0,
            flareAmmo: perf.flareAmmo !== undefined ? perf.flareAmmo : 60,
            flareCooldown: 0,
            flareQueue: 0,
            lastFlarePulse: 0
        });

        console.log("[EnemySystem] Spawned Enemy B-52 Bomber with Carpet Bombing AI.");
    },

    fireBombFromBomber: function (bomberEntity) {
        if (!this.bombModel) return;

        const bombMesh = this.bombModel.clone();
        
        const hardpointNames = ["hardpoint_1", "hardpoint_5", "hardpoint_2", "hardpoint_4"];
        const hpIdx = bomberEntity.bombsFired % hardpointNames.length;
        const hpName = hardpointNames[hpIdx];
        
        const hardpoints = bomberEntity.mesh.config.hardpoints || {};
        const hp = hardpoints[hpName] || { position: { x: -20, y: -25, z: 0 }, scale: 1.0 };

        const scale = hp.scale || 1.0;
        bombMesh.scale.set(scale, scale, scale);

        const worldPos = new THREE.Vector3();
        const worldQuat = new THREE.Quaternion();
        bomberEntity.mesh.getWorldPosition(worldPos);
        bomberEntity.mesh.getWorldQuaternion(worldQuat);

        const localOffset = new THREE.Vector3(hp.position.x, hp.position.y, hp.position.z);
        const spawnPos = worldPos.clone().add(localOffset.applyQuaternion(worldQuat));
        
        bombMesh.position.copy(spawnPos);
        bombMesh.quaternion.copy(worldQuat);

        this.scene.add(bombMesh);

        const forwardDir = new THREE.Vector3(1, 0, 0).applyQuaternion(worldQuat);
        const planeSpeed = bomberEntity.velocity ? bomberEntity.velocity.length() : 450;
        
        const initialVelocity = forwardDir.clone().multiplyScalar(planeSpeed);
        const downDir = new THREE.Vector3(0, -1, 0).applyQuaternion(worldQuat);
        initialVelocity.add(downDir.multiplyScalar(80)); 

        const bombObj = {
            mesh: bombMesh,
            velocity: initialVelocity,
            age: 0,
            lifespan: 15.0,
            ignitionDelay: 9999.0, // 자유낙하를 보장하기 위해 점화 방지
            config: this.bombConfig,
            isBomb: true,
            firer: bomberEntity
        };

        this.enemyWeapons.push(bombObj);
        
        if (window.soundManager) {
            try { window.soundManager.play('missile-fire'); } catch(e){}
        }
    },

    update: function (deltaTime) {
        if (!this.spaceship || !this.spaceship.mesh || this.spaceship.destroyed) {
            if (window.soundManager && window.soundManager.isPlaying('rwr-warning')) {
                window.soundManager.stop('rwr-warning');
            }
            return;
        }

        const playerPos = this.spaceship.mesh.position;
        const playerFaction = (this.spaceship.config && this.spaceship.config.faction) ? this.spaceship.config.faction : "BLUE";

        let isAnyEnemyLocking = false;
        let isAnyEnemyLocked = false;

        // 1. 모든 적 타겟이 플레이어를 감지하고 락온하는지 확인
        if (window.lockableTargets && window.lockableTargets.length > 0) {
            window.lockableTargets.forEach(target => {
                if (target.destroyed) return;
                
                // 플레이어와 적대적인지 확인
                if (!target.hostileFactions || !target.hostileFactions.includes(playerFaction)) return;

                const targetPos = new THREE.Vector3();
                target.getWorldPosition(targetPos);

                const distToPlayer = targetPos.distanceTo(playerPos);
                
                // 타겟 내부 상태 초기화
                if (target.lockOnPlayerProgress === undefined) target.lockOnPlayerProgress = 0;
                if (target.cooldown === undefined) target.cooldown = 0;

                // 쿨다운 감소
                if (target.cooldown > 0) target.cooldown -= deltaTime;

                const sensors = (target.config && target.config.sensors) ? target.config.sensors : {};
                const weapons = (target.config && target.config.weapons) ? target.config.weapons : {};
                const maxLockDistance = sensors.detectionRange !== undefined ? sensors.detectionRange : 30000;
                const lockOnTime = sensors.lockOnTime !== undefined ? sensors.lockOnTime : 2.0;
                const cooldownConfig = weapons.fireCooldown !== undefined ? weapons.fireCooldown : 8.0;

                if (distToPlayer < maxLockDistance) {
                    target.lockOnPlayerProgress += deltaTime / lockOnTime;
                    
                    if (target.lockOnPlayerProgress >= 1.0) {
                        isAnyEnemyLocked = true;
                        
                        // 발사 조건 (쿨다운이 끝났을 때 - 폭격기는 락온 무장 발사 안 함)
                        if (target.cooldown <= 0 && target.config.role !== "BOMBER") {
                            this.fireMissileAtPlayer(target);
                            target.cooldown = cooldownConfig;
                            target.lockOnPlayerProgress = 0;
                        }
                    } else {
                        isAnyEnemyLocking = true;
                    }
                } else {
                    target.lockOnPlayerProgress = Math.max(0, target.lockOnPlayerProgress - deltaTime);
                }
            });
        }

        // 2. 플레이어 시점의 RWR(레이더 경보 수신기) 소리 업데이트
        if (window.soundManager) {
            try {
                if (isAnyEnemyLocked && window.warningSoundEnabled !== false) {
                    if (!window.soundManager.isPlaying('rwr-lock')) {
                        window.soundManager.play('rwr-lock');
                    }
                } else if (isAnyEnemyLocking && window.warningSoundEnabled !== false) {
                    if (!window.soundManager.isPlaying('rwr-tws')) {
                        window.soundManager.play('rwr-tws');
                    }
                } else {
                    if (window.soundManager.isPlaying('rwr-lock')) window.soundManager.stop('rwr-lock');
                    if (window.soundManager.isPlaying('rwr-tws')) window.soundManager.stop('rwr-tws');
                }
            } catch(e) {}
        }

        // 3. UI 경고 업데이트 (hud.js 등에서 활용 가능)
        window.isPlayerBeingLocked = isAnyEnemyLocking;
        window.isPlayerLocked = isAnyEnemyLocked;

        // 3.5. 적 비행기 이동 (Dogfight / Bomber AI State Machine)
        this.enemyJets.forEach(enemy => {
            if (enemy.mesh.destroyed) return;

            const currentPos = enemy.mesh.position;
            const distToPlayer = currentPos.distanceTo(playerPos);

            if (enemy.role === 'BOMBER') {
                // --- 폭격기(Bomber) AI 기동 및 융단폭격 상태 머신 ---
                const perf = (enemy.mesh.config && enemy.mesh.config.performance) ? enemy.mesh.config.performance : {};
                const speed = enemy.speed;

                // 1. 폭격 대상(Target) 선정 (BLUE 고정 타겟 NIMITZ, RUNWAY 우선, 파괴 시 플레이어)
                if (!enemy.target || enemy.target.destroyed) {
                    enemy.target = null;
                    if (window.lockableTargets && window.lockableTargets.length > 0) {
                        let possibleTarget = window.lockableTargets.find(t => !t.destroyed && t.targetName === "NIMITZ" && t.faction === "BLUE");
                        if (!possibleTarget) {
                            possibleTarget = window.lockableTargets.find(t => !t.destroyed && t.targetName === "RUNWAY" && t.faction === "BLUE");
                        }
                        if (!possibleTarget) {
                            possibleTarget = this.spaceship.mesh;
                        }
                        enemy.target = possibleTarget;
                    }
                    if (!enemy.target || (enemy.target.destroyed && enemy.target !== this.spaceship.mesh)) {
                        enemy.state = 'RETREAT';
                    }
                }

                // 2. 상태 머신 연산 및 조작 변수 계산
                let rollInput = 0;
                let pitchInput = 0;
                let yawInput = 0;
                let targetPos = null;

                const targetWorldPos = new THREE.Vector3();
                if (enemy.target) {
                    enemy.target.getWorldPosition(targetWorldPos);
                }

                // 폭격 평균 고도 로드 (설정 파일의 performance.bombingAltitude 우선, 없으면 초기 스폰 Y 좌표, 그 외 기본값 4500)
                const bombingAltitude = (enemy.mesh.config && enemy.mesh.config.performance && enemy.mesh.config.performance.bombingAltitude !== undefined)
                    ? enemy.mesh.config.performance.bombingAltitude
                    : (enemy.mesh.config && enemy.mesh.config.model && enemy.mesh.config.model.initialPosition && enemy.mesh.config.model.initialPosition.y !== undefined
                        ? enemy.mesh.config.model.initialPosition.y
                        : 4500);

                // 미사일 위협 감지 시 플레어 살포
                const isMissileTrackingMe = window.WeaponManager && 
                    window.WeaponManager.launchedWeapons.some(m => m.target === enemy.mesh && !m.destroyed);
                if (enemy.flareCooldown > 0) {
                    enemy.flareCooldown -= deltaTime;
                }
                const flareConfig = perf.flare || {};
                const intervalConfig = flareConfig.interval !== undefined ? flareConfig.interval : 0.15;
                const burstCountConfig = flareConfig.burstCount !== undefined ? flareConfig.burstCount : 8;
                const cooldownConfig = flareConfig.cooldown !== undefined ? flareConfig.cooldown : 2.0;

                if (enemy.flareQueue > 0) {
                    enemy.lastFlarePulse += deltaTime;
                    if (enemy.lastFlarePulse >= intervalConfig) {
                        this.fireEnemyFlare(enemy);
                        enemy.flareQueue--;
                        enemy.lastFlarePulse = 0;
                    }
                }
                if (isMissileTrackingMe && enemy.flareCooldown <= 0 && enemy.flareAmmo > 0) {
                    const burstCount = Math.min(burstCountConfig, enemy.flareAmmo);
                    enemy.flareAmmo -= burstCount;
                    enemy.flareQueue += burstCount;
                    enemy.lastFlarePulse = intervalConfig;
                    enemy.flareCooldown = cooldownConfig;
                    console.log(`[EnemySystem] B-52 Bomber deployed flares. Remaining: ${enemy.flareAmmo}`);
                }

                if (enemy.state === 'APPROACH') {
                    // 폭격 고도(4500) 유지하며 타겟을 향해 수평 접근 정렬
                    targetPos = new THREE.Vector3(targetWorldPos.x, bombingAltitude, targetWorldPos.z);
                    
                    const horizDist = new THREE.Vector2(currentPos.x - targetWorldPos.x, currentPos.z - targetWorldPos.z).length();

                    // 폭탄의 포물선 낙하 시간 연산 (t = sqrt(2*h/g))
                    const bombGravity = 400.0;
                    const heightDiff = Math.max(10, currentPos.y - targetWorldPos.y);
                    const t_fall = Math.sqrt((2 * heightDiff) / bombGravity);
                    const forwardSpeed = speed;
                    
                    const dropStartDist = forwardSpeed * t_fall + 1000; // 폭격 시작 거리
                    const dropEndDist = forwardSpeed * t_fall - 1500;   // 폭격 종료 거리

                    const toTarget = new THREE.Vector3().subVectors(targetPos, currentPos);
                    const forwardDir = new THREE.Vector3(1, 0, 0).applyQuaternion(enemy.mesh.quaternion);
                    const dot = forwardDir.dot(toTarget.clone().normalize());

                    // 폭탄 잔탄이 있고 수평 타겟 정렬 및 낙하 궤적 범위에 들어왔을 때
                    if (dot > 0.85 && horizDist <= dropStartDist && horizDist >= dropEndDist && enemy.bombsFired < enemy.bombsMax) {
                        enemy.state = 'BOMBING';
                        enemy.bombCooldown = 0;
                        console.log("[EnemySystem] B-52 Bomber entered BOMBING state.");
                    }
                } else if (enemy.state === 'BOMBING') {
                    // 수평 직진 비행 유지 (자세 복원)
                    targetPos = null;
                    rollInput = -enemy.rollAngle * 0.1;
                    pitchInput = -enemy.pitchAngle * 0.1;

                    // 융단 폭격 투하 루프 (0.4초 간격 투하)
                    if (enemy.bombCooldown <= 0 && enemy.bombsFired < enemy.bombsMax) {
                        this.fireBombFromBomber(enemy);
                        enemy.bombsFired++;
                        enemy.bombCooldown = 0.4;
                    } else {
                        enemy.bombCooldown -= deltaTime;
                    }

                    const toTarget = new THREE.Vector3().subVectors(targetWorldPos, currentPos);
                    const forwardDir = new THREE.Vector3(1, 0, 0).applyQuaternion(enemy.mesh.quaternion);
                    const dot = forwardDir.dot(toTarget.clone().normalize());

                    // 폭탄을 다 소진했거나 타겟을 완전히 지나쳤을 때 FLY_BY 전이
                    if (enemy.bombsFired >= enemy.bombsMax || dot < 0) {
                        enemy.state = 'FLY_BY';
                        console.log("[EnemySystem] B-52 Bomber entering FLY_BY.");
                    }
                } else if (enemy.state === 'FLY_BY') {
                    // 폭격 후 직진하여 충분한 안전거리 확보
                    targetPos = null;
                    rollInput = -enemy.rollAngle * 0.1;
                    pitchInput = -enemy.pitchAngle * 0.1;

                    const horizDist = new THREE.Vector2(currentPos.x - targetWorldPos.x, currentPos.z - targetWorldPos.z).length();
                    if (horizDist > 10000) {
                        enemy.state = 'U_TURN';
                        const toTargetDir = new THREE.Vector3().subVectors(targetWorldPos, currentPos).normalize();
                        enemy.uTurnTargetHeading = Math.atan2(-toTargetDir.z, toTargetDir.x);
                        console.log("[EnemySystem] B-52 Bomber entering U_TURN.");
                    }
                } else if (enemy.state === 'U_TURN') {
                    // 완만한 롤 뱅킹 선회 U턴 기동
                    targetPos = null;

                    // 기체가 롤/피치로 심하게 꺾여 있을 때 오일러 각도 왜곡(Gimbal Lock)을 막기 위해,
                    // 실제 월드 수평면(Y=0) 상의 정면 방향 벡터를 직접 투영해 실제 진행 방향 헤딩을 구합니다.
                    const forwardDir = new THREE.Vector3(1, 0, 0).applyQuaternion(enemy.mesh.quaternion);
                    forwardDir.y = 0;
                    forwardDir.normalize();
                    const currentHeading = Math.atan2(-forwardDir.z, forwardDir.x);

                    let yawDiff = enemy.uTurnTargetHeading - currentHeading;
                    while (yawDiff > Math.PI) yawDiff -= Math.PI * 2;
                    while (yawDiff < -Math.PI) yawDiff += Math.PI * 2;

                    const turnDir = Math.sign(yawDiff);
                    const maxRoll = THREE.MathUtils.degToRad(perf.maxRollAngle || 30);

                    rollInput = THREE.MathUtils.clamp(yawDiff * 1.8, -maxRoll, maxRoll);
                    yawInput = turnDir * (perf.yawRate || 0.15);
                    pitchInput = 0.05; // 선회 중 고도 보정

                    if (Math.abs(yawDiff) < 0.15) {
                        enemy.state = 'APPROACH';
                        enemy.bombsFired = 0; // 폭격 탄약 재장전
                        console.log("[EnemySystem] B-52 U-turn complete. Re-armed for next bombing run.");
                    }
                } else if (enemy.state === 'RETREAT') {
                    targetPos = null;
                    pitchInput = 0.2; // 서서히 고도를 상승하며 이탈
                    rollInput = -enemy.rollAngle * 0.1;

                    if (currentPos.y > 15000 || currentPos.length() > 80000) {
                        enemy.mesh.destroyed = true;
                        this.scene.remove(enemy.mesh);
                        console.log("[EnemySystem] B-52 Bomber retreated and despawned.");
                        return;
                    }
                }

                // 타겟 정렬 조향
                if (targetPos) {
                    const localTarget = targetPos.clone().sub(currentPos).applyQuaternion(enemy.mesh.quaternion.clone().invert());
                    const signY = localTarget.y >= 0 ? 1 : -1;
                    const denomY = signY * Math.max(200.0, Math.abs(localTarget.y));
                    const rollError = Math.atan2(-localTarget.z, denomY);
                    const maxRoll = THREE.MathUtils.degToRad(perf.maxRollAngle || 30);

                    rollInput = THREE.MathUtils.clamp(rollError * 1.5, -maxRoll, maxRoll);
                    pitchInput = THREE.MathUtils.clamp(localTarget.y / 1500, -0.3, 0.3);
                    yawInput = THREE.MathUtils.clamp(-localTarget.z / 2000, -0.15, 0.15);
                }

                const maxPitchRate = perf.pitchRate || 0.35;
                const maxRollRate = perf.rollRate || 0.4;
                const maxYawRate = perf.yawRate || 0.2;

                const pitchChange = pitchInput * maxPitchRate * deltaTime;
                const rollChange = rollInput * maxRollRate * deltaTime;
                const yawChange = yawInput * maxYawRate * deltaTime;

                const qP = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), pitchChange);
                const qR = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), rollChange);
                const qY = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yawChange);

                enemy.mesh.quaternion.multiply(qY).multiply(qP).multiply(qR);
                enemy.mesh.quaternion.normalize();

                const euler = new THREE.Euler().setFromQuaternion(enemy.mesh.quaternion, 'YZX');
                enemy.yawAngle = euler.y;
                enemy.pitchAngle = euler.z;
                enemy.rollAngle = euler.x;

                const forwardDir = new THREE.Vector3(1, 0, 0).applyQuaternion(enemy.mesh.quaternion);
                enemy.velocity.copy(forwardDir).multiplyScalar(speed);
                enemy.mesh.velocity = enemy.velocity.clone();
                enemy.mesh.position.add(enemy.velocity.clone().multiplyScalar(deltaTime));

                enemy.mesh.updateMatrixWorld();

                if (window.ParticleManager && enemy.mesh.config && enemy.mesh.config.visuals) {
                    const engineHPs = enemy.mesh.config.visuals.engineHardpoints || [
                        { x: -120, y: -20, z: -300 },
                        { x: -50, y: -20, z: -155 },
                        { x: -50, y: -20, z: 155 },
                        { x: -120, y: -20, z: 300 }
                    ];
                    window.ParticleManager.spawnTrails(
                        enemy.mesh, 
                        engineHPs, 
                        false, 
                        { parentVelocity: enemy.velocity.clone(), overrideColor: 0xffaa22 }
                    );
                }
            } else {
                // --- 기존 F-18 전투기 AI 기동 ---
                const isBeingLocked = window.WeaponManager && (
                    window.WeaponManager.lockingTarget === enemy.mesh || 
                    window.WeaponManager.lockedTarget === enemy.mesh
                );
                const isMissileTrackingMe = window.WeaponManager && 
                    window.WeaponManager.launchedWeapons.some(m => m.target === enemy.mesh && !m.destroyed);

                if (enemy.flareCooldown > 0) {
                    enemy.flareCooldown -= deltaTime;
                }

                const f18Perf = (this.f18Config && this.f18Config.performance) ? this.f18Config.performance : {};
                const flareConfig = f18Perf.flare || {};
                const intervalConfig = flareConfig.interval !== undefined ? flareConfig.interval : 0.15;
                const burstCountConfig = flareConfig.burstCount !== undefined ? flareConfig.burstCount : 6;
                const cooldownConfig = flareConfig.cooldown !== undefined ? flareConfig.cooldown : 3.0;

                if (enemy.flareQueue > 0) {
                    enemy.lastFlarePulse += deltaTime;
                    if (enemy.lastFlarePulse >= intervalConfig) {
                        this.fireEnemyFlare(enemy);
                        enemy.flareQueue--;
                        enemy.lastFlarePulse = 0;
                    }
                }

                if (isMissileTrackingMe && enemy.flareCooldown <= 0 && enemy.flareAmmo > 0) {
                    const burstCount = Math.min(burstCountConfig, enemy.flareAmmo);
                    enemy.flareAmmo -= burstCount;
                    enemy.flareQueue += burstCount;
                    enemy.lastFlarePulse = intervalConfig;
                    enemy.flareCooldown = cooldownConfig;
                    console.log(`[EnemySystem] ${enemy.mesh.targetName} fired flare burst. Remaining: ${enemy.flareAmmo}`);
                }

                if ((isMissileTrackingMe || isBeingLocked) && enemy.state !== 'EVASIVE') {
                    const shouldEvade = isMissileTrackingMe || (Math.random() < 0.05);
                    if (shouldEvade) {
                        enemy.state = 'EVASIVE';
                        const maneuvers = ['BARREL_ROLL', 'SHARP_BREAK', 'CLIMB_LOOP'];
                        enemy.evasiveManeuver = maneuvers[Math.floor(Math.random() * maneuvers.length)];
                        enemy.stateTimer = 3.0 + Math.random() * 2.0;
                        enemy.evasiveDir = Math.random() < 0.5 ? 1 : -1;
                        console.log(`[EnemySystem] ${enemy.mesh.targetName} evasion triggered: ${enemy.evasiveManeuver}`);
                    }
                }

                if (enemy.state === 'EVASIVE') {
                    enemy.stateTimer -= deltaTime;
                    if (enemy.stateTimer <= 0) {
                        enemy.state = distToPlayer < 35000 ? 'ATTACK' : 'PATROL';
                    }
                } else {
                    if (distToPlayer < 30000) {
                        enemy.state = 'ATTACK';
                    } else if (distToPlayer > 40000) {
                        if (enemy.state === 'ATTACK') {
                            enemy.patrolCenter = currentPos.clone();
                            enemy.patrolWaypoint = null;
                        }
                        enemy.state = 'PATROL';
                    }
                }

                let rollInput = 0;
                let pitchInput = 0;
                let yawInput = 0;
                let targetPos = null;

                if (enemy.state === 'PATROL') {
                    if (!enemy.patrolWaypoint) {
                        const angle = Math.random() * Math.PI * 2;
                        const radius = 5000 + Math.random() * 15000;
                        enemy.patrolWaypoint = enemy.patrolCenter.clone().add(new THREE.Vector3(
                            Math.cos(angle) * radius,
                            (Math.random() - 0.5) * 4000,
                            Math.sin(angle) * radius
                        ));
                        enemy.patrolWaypoint.y = THREE.MathUtils.clamp(enemy.patrolWaypoint.y, 4000, 16000);
                    }

                    targetPos = enemy.patrolWaypoint;
                    const distToWaypoint = currentPos.distanceTo(targetPos);
                    if (distToWaypoint < 2500) {
                        enemy.patrolWaypoint = null;
                    }
                } else if (enemy.state === 'ATTACK') {
                    enemy.offsetTimer -= deltaTime;
                    if (enemy.offsetTimer <= 0) {
                        enemy.targetOffset.set(
                            (Math.random() - 0.5) * 6000,
                            (Math.random() - 0.5) * 3000,
                            (Math.random() - 0.5) * 6000
                        );
                        enemy.offsetTimer = 4.0 + Math.random() * 3.0;
                    }
                    targetPos = playerPos.clone().add(enemy.targetOffset);
                    if (targetPos.y < 1500) targetPos.y = 1500;
                }

                if (targetPos) {
                    const localTarget = targetPos.clone().sub(currentPos).applyQuaternion(enemy.mesh.quaternion.clone().invert());
                    const signY = localTarget.y >= 0 ? 1 : -1;
                    const denomY = signY * Math.max(200.0, Math.abs(localTarget.y));
                    const rollError = Math.atan2(-localTarget.z, denomY);
                    const maxRoll = enemy.state === 'ATTACK' ? 1.0 : 0.7;
                    rollInput = THREE.MathUtils.clamp(rollError * 1.8, -maxRoll, maxRoll);
                    
                    if (localTarget.x < 0) {
                        pitchInput = 1.0;
                    } else {
                        pitchInput = THREE.MathUtils.clamp(localTarget.y / 1200, -0.4, 1.0);
                    }
                    yawInput = THREE.MathUtils.clamp(-localTarget.z / 1500, -0.2, 0.2);

                    if (currentPos.y < 2000 && pitchInput < 0) {
                        pitchInput = 1.0;
                    }
                } else if (enemy.state === 'EVASIVE') {
                    if (enemy.evasiveManeuver === 'BARREL_ROLL') {
                        rollInput = 1.0 * enemy.evasiveDir;
                        pitchInput = 0.8;
                        yawInput = 0.1 * enemy.evasiveDir;
                    } else if (enemy.evasiveManeuver === 'SHARP_BREAK') {
                        rollInput = 1.0 * enemy.evasiveDir;
                        pitchInput = 1.0;
                        yawInput = 0.2 * enemy.evasiveDir;
                    } else if (enemy.evasiveManeuver === 'CLIMB_LOOP') {
                        rollInput = 0;
                        pitchInput = 1.0;
                        yawInput = 0;
                    }

                    if (currentPos.y < 2000) {
                        pitchInput = Math.max(pitchInput, 0.8);
                    }
                }

                const maxPitchRate = f18Perf.pitchRate !== undefined ? f18Perf.pitchRate : 1.2;
                const maxRollRate = f18Perf.rollRate !== undefined ? f18Perf.rollRate : 2.5;
                const maxYawRate = f18Perf.yawRate !== undefined ? f18Perf.yawRate : 0.5;

                const pitchChange = pitchInput * maxPitchRate * deltaTime;
                const rollChange = rollInput * maxRollRate * deltaTime;
                const yawChange = yawInput * maxYawRate * deltaTime;

                const qP = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), pitchChange);
                const qR = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), rollChange);
                const qY = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yawChange);

                enemy.mesh.quaternion.multiply(qY).multiply(qP).multiply(qR);

                const forwardDir = new THREE.Vector3(1, 0, 0).applyQuaternion(enemy.mesh.quaternion);
                
                let currentSpeed = enemy.speed;
                if (enemy.state === 'EVASIVE') {
                    currentSpeed *= 1.3;
                }
                
                enemy.velocity.copy(forwardDir).multiplyScalar(currentSpeed);
                enemy.mesh.velocity = enemy.velocity.clone();
                enemy.mesh.position.add(enemy.velocity.clone().multiplyScalar(deltaTime));

                if (enemy.mesh.position.y < 500) {
                    enemy.mesh.position.y = 500;
                    const recoverQ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), 0.6 * deltaTime);
                    enemy.mesh.quaternion.multiply(recoverQ);
                }

                enemy.mesh.updateMatrixWorld();

                if (window.ParticleManager) {
                    const engineHPs = [
                        { x: -72, y: 4, z: -6 },
                        { x: -72, y: 4, z: 6 }
                    ];
                    const isBoosting = (enemy.state === 'EVASIVE');
                    window.ParticleManager.spawnTrails(
                        enemy.mesh, 
                        engineHPs, 
                        isBoosting,
                        { parentVelocity: enemy.velocity.clone(), overrideColor: isBoosting ? 0xffaa44 : 0xff6600 }
                    );
                }
            }
        });

        // 4. 발사된 적 무장(미사일/폭탄) 업데이트
        for (let i = this.enemyWeapons.length - 1; i >= 0; i--) {
            const missile = this.enemyWeapons[i];
            missile.age += deltaTime;

            let hitPlayer = false;
            let hitWater = missile.mesh.position.y <= 0;
            let hitFlare = false;
            let targetFlare = null;

            // 플레어 접촉 여부 검사
            let hasPlayerFlaresInRange = false;
            if (window.activeFlares && window.activeFlares.length > 0) {
                for (const flare of window.activeFlares) {
                    if (flare.active && flare.faction === 'BLUE' && missile.mesh.position.distanceTo(flare.position) < 4000.0) {
                        hasPlayerFlaresInRange = true;
                        break;
                    }
                }
            }

            if (hasPlayerFlaresInRange && missile.isDecoyed === undefined) {
                missile.isDecoyed = Math.random() < 0.70;
                console.log(`[EnemySystem] Enemy missile encountered BLUE flares. Decoyed: ${missile.isDecoyed}`);
            }

            if (missile.isDecoyed === true && window.activeFlares && window.activeFlares.length > 0) {
                for (const flare of window.activeFlares) {
                    if (!flare.active || flare.faction !== 'BLUE') continue;
                    const distToFlare = missile.mesh.position.distanceTo(flare.position);
                    if (distToFlare < 80.0) {
                        hitFlare = true;
                        targetFlare = flare;
                        break;
                    }
                }
            }

            const distToPlayer = missile.mesh.position.distanceTo(playerPos);
            const playerHitRadius = this.spaceship.collisionRadius || 80;

            if (distToPlayer < playerHitRadius && !this.spaceship.destroyed) {
                hitPlayer = true;
            }

            let hitStatic = false;
            let hitStaticEntity = null;

            // 대형 고정 표면(항공모함, 활주로) 충돌 검사
            if (window.lockableTargets && window.lockableTargets.length > 0 && window.CollisionSystem) {
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
                        false
                    );

                    if (forwardHit) {
                        hitStatic = true;
                        hitStaticEntity = forwardHit.object;
                        missile.mesh.position.copy(forwardHit.point);
                    }
                }
            }

            if (distToPlayer < playerHitRadius * 1.5 || hitStatic) {
                hitWater = false;
            }

            // 소멸 조건: 수명 다함, 수면 충돌, 직접 명중(플레이어/구조물), 플레어 피격
            if (missile.age >= missile.lifespan || hitWater || hitPlayer || hitFlare || hitStatic) {
                const explosionPos = missile.mesh.position.clone();
                if (hitWater) explosionPos.y = 0;

                const weaponScale = (missile.config && missile.config.destruction && missile.config.destruction.explosionScale !== undefined)
                    ? missile.config.destruction.explosionScale
                    : 6.0;

                if (window.ParticleManager) {
                    window.ParticleManager.spawnExplosion(explosionPos, weaponScale);
                    if (window.ParticleManager.spawnPersistentFire) {
                        window.ParticleManager.spawnPersistentFire(explosionPos, 8.0, weaponScale / 6.0);
                    }
                }
                if (window.soundManager) {
                    window.soundManager.play('explosion-random');
                }

                // 스플래시 데미지 (AOE) 연산
                const maxDamage = (missile.config && missile.config.destruction && missile.config.destruction.damage !== undefined)
                    ? missile.config.destruction.damage
                    : 100;
                const splashRadius = (missile.config && missile.config.destruction && missile.config.destruction.splashRadius !== undefined)
                    ? missile.config.destruction.splashRadius
                    : (weaponScale * 150);

                // 플레이어 스플래시 데미지
                if (!hitPlayer && !this.spaceship.destroyed) {
                    const distanceToPlayer = explosionPos.distanceTo(playerPos);
                    if (distanceToPlayer <= splashRadius) {
                        const damageFraction = 1.0 - (distanceToPlayer / splashRadius);
                        const splashDmg = Math.round(maxDamage * damageFraction);
                        if (splashDmg > 0) {
                            this.spaceship.takeDamage(splashDmg);
                            console.log(`[EnemySystem] Enemy weapon splash hit player! Damage: ${splashDmg}, Distance: ${Math.round(distanceToPlayer)}`);
                        }
                    }
                }

                // 아군 타겟 스플래시 데미지
                if (window.lockableTargets && window.lockableTargets.length > 0) {
                    window.lockableTargets.forEach(target => {
                        if (target.destroyed) return;
                        if (target.faction !== "BLUE") return; // 아군 BLUE에만 적용

                        const targetPos = new THREE.Vector3();
                        target.getWorldPosition(targetPos);
                        const distance = explosionPos.distanceTo(targetPos);

                        if (distance <= splashRadius) {
                            const damageFraction = 1.0 - (distance / splashRadius);
                            const splashDmg = Math.round(maxDamage * damageFraction);

                            if (splashDmg > 0) {
                                if (target.health === undefined) target.health = 100;
                                target.health -= splashDmg;
                                console.log(`[EnemySystem] Enemy weapon splash hit friendly -> ${target.targetName}! Damage: ${splashDmg}, HP left: ${target.health}`);

                                if (target.health <= 0) {
                                    target.destroyed = true;
                                    target.visible = false;
                                    console.log(`[EnemySystem] Friendly target destroyed: ${target.targetName}!`);
                                } else {
                                    if (window.ParticleManager && window.ParticleManager.spawnExplosion) {
                                        window.ParticleManager.spawnExplosion(targetPos.clone(), 3.0);
                                    }
                                }
                            }
                        }
                    });
                }

                if (hitPlayer) {
                    const dmg = (missile.config && missile.config.destruction && missile.config.destruction.damage !== undefined)
                        ? missile.config.destruction.damage
                        : 100;
                    this.spaceship.takeDamage(dmg);
                    
                    if (window.triggerActionCam && missile.firer) {
                        window.triggerActionCam(missile.firer, 4.0);
                    }
                }

                if (hitFlare && targetFlare) {
                    targetFlare.active = false;
                    targetFlare.destroy();
                    console.log("[EnemySystem] Enemy weapon decoyed and detonated on flare.");
                }

                this.scene.remove(missile.mesh);
                missile.mesh.traverse(child => {
                    if (child.isMesh) {
                        if (child.geometry) child.geometry.dispose();
                        if (child.material) {
                            if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
                            else child.material.dispose();
                        }
                    }
                });
                this.enemyWeapons.splice(i, 1);
                continue;
            }

            const weaponPerf = (missile.config && missile.config.performance) ? missile.config.performance : {};
            const gravity = weaponPerf.gravity !== undefined ? weaponPerf.gravity : 400.0;

            // 미사일 유도 및 이동 로직 (폭격기 폭탄은 계속 무유도 포물선 낙하 연산 수행)
            if (missile.isBomb) {
                missile.velocity.y -= gravity * deltaTime;
                if (missile.velocity.lengthSq() > 0.001) {
                    const moveDir = missile.velocity.clone().normalize();
                    missile.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), moveDir);
                }
            } else if (missile.age < missile.ignitionDelay) {
                missile.velocity.y -= gravity * deltaTime;
            } else {
                if (!this.spaceship.destroyed) {
                    let steeringTarget = playerPos;
                    if (missile.isDecoyed === true && window.activeFlares && window.activeFlares.length > 0) {
                        let nearestDist = 4000.0;
                        let nearestFlare = null;
                        for (const flare of window.activeFlares) {
                            if (!flare.active || flare.faction !== 'BLUE') continue;
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

                    const dirToTarget = new THREE.Vector3().subVectors(steeringTarget, missile.mesh.position).normalize();
                    const currentDir = missile.velocity.clone().normalize();
                    
                    const agility = weaponPerf.agility !== undefined ? weaponPerf.agility : 2.5;
                    const acceleration = weaponPerf.acceleration !== undefined ? weaponPerf.acceleration : 1500;
                    const maxSpeed = weaponPerf.maxSpeed !== undefined ? weaponPerf.maxSpeed : 4000;

                    const newDir = currentDir.lerp(dirToTarget, agility * deltaTime).normalize();

                    const currentSpeed = Math.min(missile.velocity.length() + acceleration * deltaTime, maxSpeed);
                    missile.velocity.copy(newDir).multiplyScalar(currentSpeed);
                    missile.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), newDir);
                } else {
                    const currentSpeed = missile.velocity.length();
                    const noseDir = new THREE.Vector3(1, 0, 0).applyQuaternion(missile.mesh.quaternion);
                    missile.velocity.lerp(noseDir.clone().multiplyScalar(currentSpeed), 6.0 * deltaTime);
                }
            }

            missile.mesh.position.add(missile.velocity.clone().multiplyScalar(deltaTime));
            missile.mesh.updateMatrixWorld();

            if (missile.age >= missile.ignitionDelay && window.ParticleManager && !missile.isBomb) {
                const engineHP = [{ x: -50, y: 0, z: 0 }];
                window.ParticleManager.spawnMissileTrails(
                    missile.mesh, 
                    engineHP, 
                    { parentVelocity: missile.velocity.clone(), overrideColor: 0xff3300 }
                );
            }
        }
    },

    fireMissileAtPlayer: function (enemyEntity) {
        if (!this.missileModel) return;

        const missileMesh = this.missileModel.clone();
        missileMesh.scale.set(0.5, 0.5, 0.5);

        const spawnPos = new THREE.Vector3();
        enemyEntity.getWorldPosition(spawnPos);
        spawnPos.y += 50; 

        missileMesh.position.copy(spawnPos);

        let initialVelocity;
        if (enemyEntity.targetName && enemyEntity.targetName.includes("F-18")) {
            missileMesh.quaternion.copy(enemyEntity.quaternion);
            const forwardDir = new THREE.Vector3(1, 0, 0).applyQuaternion(enemyEntity.quaternion);
            const jetSpeed = enemyEntity.velocity ? enemyEntity.velocity.length() : 900;
            initialVelocity = forwardDir.clone().multiplyScalar(jetSpeed + 300);
        } else {
            const playerPos = this.spaceship.mesh.position;
            const dir = new THREE.Vector3().subVectors(playerPos, spawnPos).normalize();
            missileMesh.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), dir);
            initialVelocity = dir.clone().multiplyScalar(1000);
            initialVelocity.y += 1000;
        }

        this.scene.add(missileMesh);

        const weaponPerf = (this.missileConfig && this.missileConfig.performance) ? this.missileConfig.performance : {};
        const lifespan = weaponPerf.lifespan !== undefined ? weaponPerf.lifespan : 12.0;
        const ignitionDelay = weaponPerf.ignitionDelay !== undefined ? weaponPerf.ignitionDelay : 0.5;

        const missileObj = {
            mesh: missileMesh,
            velocity: initialVelocity,
            age: 0,
            lifespan: lifespan,
            ignitionDelay: ignitionDelay,
            config: this.missileConfig,
            firer: enemyEntity
        };

        this.enemyWeapons.push(missileObj);
        
        if (window.soundManager) {
            try { window.soundManager.play('missile-fire'); } catch(e){}
        }
        
        console.log(`[EnemySystem] ${enemyEntity.targetName || 'Enemy'} fired a missile at player!`);
    },

    fireEnemyFlare: function (enemy) {
        if (!enemy || !enemy.mesh) return;

        this.fireEnemyFlareWithDir(enemy, false); // 하방 사출
        this.fireEnemyFlareWithDir(enemy, true);  // 상방 사출
    },

    fireEnemyFlareWithDir: function (enemy, isUpward) {
        const worldPos = new THREE.Vector3();
        const worldQuat = new THREE.Quaternion();
        enemy.mesh.getWorldPosition(worldPos);
        enemy.mesh.getWorldQuaternion(worldQuat);

        const forwardDir = new THREE.Vector3(1, 0, 0).applyQuaternion(worldQuat);
        const currentSpeed = enemy.speed || 800;

        const yOffset = isUpward ? 5 : -5;
        const flareLocalOffset = new THREE.Vector3(-30, yOffset, 0);
        const spawnPos = worldPos.clone().add(flareLocalOffset.applyQuaternion(worldQuat));

        const planeVelocity = forwardDir.clone().multiplyScalar(currentSpeed);
        const yEject = isUpward ? (200 + Math.random() * 150) : (-200 - Math.random() * 150);

        const ejectLocal = new THREE.Vector3(
            -500 - Math.random() * 200, 
            yEject,                     
            (Math.random() - 0.5) * 200  
        );
        const ejectVelocity = ejectLocal.applyQuaternion(worldQuat);
        const finalVelocity = planeVelocity.clone().add(ejectVelocity);

        if (!window.activeFlares) {
            window.activeFlares = [];
        }

        const faction = enemy.mesh.faction || 'RED';
        const perf = (enemy.mesh.config && enemy.mesh.config.performance) ? enemy.mesh.config.performance : {};
        const flareConfig = perf.flare || {};

        if (typeof window.Flare !== 'undefined') {
            const newFlare = new window.Flare(this.scene, spawnPos, finalVelocity, faction, flareConfig);
            window.activeFlares.push(newFlare);
        } else {
            console.warn("[EnemySystem] Flare class is not defined globally.");
        }

        if (window.soundManager) {
            try {
                window.soundManager.play('missile-fire');
            } catch (e) {
                console.error("[EnemySystem] Flare sound play error:", e);
            }
        }
    }
};

window.EnemySystem = EnemySystem;
