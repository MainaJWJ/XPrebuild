// landingSystem.js
// 항공모함(NIMITZ) 및 기타 지상 오브젝트에 안전하게 착륙할 수 있도록 하는 확장 시스템입니다.
// 기존 비행 물리 코드(myShipControl.js)를 수정하지 않고 데코레이터 패턴으로 확장합니다.

(function () {
    const raycaster = new THREE.Raycaster();
    const downVector = new THREE.Vector3(0, -1, 0);
    const landingSurfaces = [];
    let highlightedTargets = new Set();

    // 3D 터널 및 ILS 관련 변수
    let approachGates = [];
    let isGatesSpawned = false;
    const APPROACH_GATES_COUNT = 6;
    const GLIDE_ANGLE = 3.5 * Math.PI / 180; // 3.5도 진입각

    // 항모 동적 좌표계 상수
    const localLandingPoint = new THREE.Vector3(0.21875, 0.7175, 8.2925);
    const localRunwayDir = new THREE.Vector3(-Math.sin(10 * Math.PI / 180), 0, -Math.cos(10 * Math.PI / 180));

    function getCarrierData() {
        const carrier = landingSurfaces.find(s => s.targetName === "NIMITZ");
        if (!carrier) return null;
        
        carrier.updateMatrixWorld(true);
        const landingPoint = localLandingPoint.clone().applyMatrix4(carrier.matrixWorld);
        const runwayDir = localRunwayDir.clone().transformDirection(carrier.matrixWorld).normalize();
        const yawRad = Math.atan2(-runwayDir.z, runwayDir.x);
        
        return { carrier, landingPoint, runwayDir, yawRad };
    }

    // 착륙 가능 오브젝트 목록 (targetName 기준)
    const LANDABLE_TARGETS = ["NIMITZ", "RUNWAY"];

    // 1. 착륙 지점 탐색 및 등록
    function checkAndRegisterLandingSurfaces() {
        if (!window.lockableTargets) return;

        for (const target of window.lockableTargets) {
            if (LANDABLE_TARGETS.includes(target.targetName) && !landingSurfaces.includes(target)) {
                landingSurfaces.push(target);
                console.log(`[LandingSystem] Registered landing surface: ${target.targetName}`);

                // 항공모함이 등록되면 3D 진입 가이드 터널 생성
                if (target.targetName === "NIMITZ") {
                    setupApproachGates(target);
                }
            }
        }
    }

        // 2. 가상의 착륙 유도 터널 꼭짓점들을 2D HUD 평면상에 원근 투영하여 그리는 함수
    function drawProjectedTunnel(ctx, w, h, camera, spaceship) {
        const cData = getCarrierData();
        if (!cData) return;

        // 카메라의 최신 matrixWorld 및 matrixWorldInverse 행렬을 명시적으로 강제 동기화
        camera.updateMatrixWorld(true);

        const { landingPoint, runwayDir, yawRad } = cData;
        const approachDir = runwayDir.clone().negate();
        const lateralDir = new THREE.Vector3(-runwayDir.z, 0, runwayDir.x);

        const baseW = 320; // 터널 시작 너비
        const H = 100; // 터널 높이
        
        // 300 유닛 간격으로 촘촘히 쪼개진 단면들 (9000m 범위이므로 총 30스텝)
        const stepSize = 300;
        const totalDist = APPROACH_GATES_COUNT * 1500;
        const stepsCount = Math.round(totalDist / stepSize);

        const projectedCrosssections = [];

        for (let k = 0; k <= stepsCount; k++) {
            const d = k * stepSize;
            
            // 해당 스텝이 속한 세그먼트 인덱스 (1 ~ 6) 계산
            const segmentIdx = Math.min(APPROACH_GATES_COUNT, Math.floor(d / 1500) + 1);
            const gate = approachGates.find(g => g.gateIndex === segmentIdx);
            const isPassed = gate ? gate.isPassed : false;

            const center = landingPoint.clone()
                .addScaledVector(approachDir, d)
                .add(new THREE.Vector3(0, d * Math.tan(GLIDE_ANGLE), 0));
            
            const currentW = baseW * (1 + (d / totalDist));
            const halfW = currentW / 2;
            const BL = center.clone().addScaledVector(lateralDir, halfW);
            const BR = center.clone().addScaledVector(lateralDir, -halfW);
            const TL = BL.clone().add(new THREE.Vector3(0, H, 0));
            const TR = BR.clone().add(new THREE.Vector3(0, H, 0));

            const corners = [BL, BR, TR, TL];
            const screenCorners = [];
            let allInFront = true;

            // 카메라 역행렬을 사용해 각 꼭짓점이 카메라 전방에 위치하는지 강인하게 검증
            for (const pt of corners) {
                const localPos = pt.clone().applyMatrix4(camera.matrixWorldInverse);
                if (localPos.z >= 0) { // Z가 0 이상이면 카메라 뒤쪽이거나 밀착함
                    allInFront = false;
                    break;
                }

                // 3D 좌표 -> NDC -> 2D 캔버스 좌표 투영
                const ndc = pt.clone().project(camera);
                
                // 화면 바깥 과투영 차단용 한계 설정 (인접 게이트가 비스듬히 일부 보일 때 잘리는 현상 방지)
                if (Math.abs(ndc.x) > 15.0 || Math.abs(ndc.y) > 15.0) {
                    allInFront = false;
                    break;
                }

                const screenX = (ndc.x * 0.5 + 0.5) * w;
                const screenY = (-ndc.y * 0.5 + 0.5) * h;
                screenCorners.push({ x: screenX, y: screenY });
            }

            if (allInFront) {
                projectedCrosssections[k] = {
                    corners: screenCorners,
                    isPassed: isPassed
                };
            } else {
                projectedCrosssections[k] = null;
            }
        }

        // A. 횡단면 사각형 가이드라인 그리기
        ctx.lineWidth = 1.2;
        for (let k = 0; k <= stepsCount; k++) {
            const cross = projectedCrosssections[k];
            if (!cross) continue;

            // 이미 성공적으로 지나온 길은 청록색(0x00aaff), 아직 도달하지 않은 가이드 라인은 연녹색 반투명(0x00ff88)
            ctx.strokeStyle = cross.isPassed ? 'rgba(0, 170, 255, 0.75)' : 'rgba(0, 255, 136, 0.35)';

            ctx.beginPath();
            ctx.moveTo(cross.corners[0].x, cross.corners[0].y); // Bottom-Left
            ctx.lineTo(cross.corners[1].x, cross.corners[1].y); // Bottom-Right
            ctx.lineTo(cross.corners[2].x, cross.corners[2].y); // Top-Right
            ctx.lineTo(cross.corners[3].x, cross.corners[3].y); // Top-Left
            ctx.closePath();
            ctx.stroke();
        }

        // B. 종단면 레일 가이드라인 그리기 (각 모서리선 연결)
        ctx.lineWidth = 1.0;
        for (let k = 0; k < stepsCount; k++) {
            const curr = projectedCrosssections[k];
            const next = projectedCrosssections[k + 1];
            if (!curr || !next) continue;

            ctx.strokeStyle = curr.isPassed ? 'rgba(0, 170, 255, 0.75)' : 'rgba(0, 255, 136, 0.35)';

            ctx.beginPath();
            // Bottom-Left 레일
            ctx.moveTo(curr.corners[0].x, curr.corners[0].y);
            ctx.lineTo(next.corners[0].x, next.corners[0].y);
            
            // Bottom-Right 레일
            ctx.moveTo(curr.corners[1].x, curr.corners[1].y);
            ctx.lineTo(next.corners[1].x, next.corners[1].y);
            
            // Top-Right 레일
            ctx.moveTo(curr.corners[2].x, curr.corners[2].y);
            ctx.lineTo(next.corners[2].x, next.corners[2].y);
            
            // Top-Left 레일
            ctx.moveTo(curr.corners[3].x, curr.corners[3].y);
            ctx.lineTo(next.corners[3].x, next.corners[3].y);
            
            ctx.stroke();
        }
    }

    // 3. 착륙 유도용 가상 터널 구간 데이터 초기화 (물리 메쉬를 생성하지 않고 가상 데이터만 관리)
    function setupApproachGates(carrierMesh) {
        if (isGatesSpawned) return;
        isGatesSpawned = true;

        console.log("[LandingSystem] Initializing virtual approach segments...");

        // 6개의 세그먼트 데이터 초기화
        for (let i = 1; i <= APPROACH_GATES_COUNT; i++) {
            approachGates.push({
                gateIndex: i,
                isPassed: false
            });
        }
    }

    // 4. 가상 유도 터널 주행(통과) 여부 실시간 판정
    function checkApproachGatesCollision(shipPosition) {
        const spaceship = window.spaceship;
        if (!spaceship || !spaceship.mesh) return;

        const cData = getCarrierData();
        if (!cData) return;

        const { landingPoint, runwayDir } = cData;
        const approachDir = runwayDir.clone().negate();
        const lateralDir = new THREE.Vector3(-runwayDir.z, 0, runwayDir.x);

        const rel = spaceship.mesh.position.clone().sub(landingPoint);
        const distAlongCenter = rel.dot(approachDir);

        approachGates.forEach(gate => {
            if (gate.isPassed) return;

            const i = gate.gateIndex;
            const minD = (i - 1) * 1500;
            const maxD = i * 1500;

            // 기체가 해당 세그먼트의 종축 범위 안에 위치하는지 검사
            if (distAlongCenter >= minD && distAlongCenter <= maxD) {
                const idealHeight = 574 + distAlongCenter * Math.tan(GLIDE_ANGLE);
                const verticalDev = spaceship.mesh.position.y - idealHeight;
                const horizontalDev = rel.dot(lateralDir);

                const currentW = 320 * (1 + (distAlongCenter / (APPROACH_GATES_COUNT * 1500)));
                const allowedDev = (currentW / 2) + 40;

                // 터널 단면 범위 내에 안착해있는 경우
                if (Math.abs(horizontalDev) < allowedDev && verticalDev > -30 && verticalDev < 130) {
                    gate.isPassed = true;
                    console.log(`[LandingSystem] Passed through Glide Path Segment ${i}`);

                    if (window.soundManager) {
                        window.soundManager.play('reload'); // 통과 알림 사운드 효과
                    }
                }
            }
        });
    }

    // 4. 기존 updateSpaceship 함수 랩핑 (데코레이터 패턴)
    const originalUpdateSpaceship = window.updateSpaceship;
    let prevIsGrounded = false;

    window.updateSpaceship = function (deltaTime, camera, cameraMode) {
        const spaceship = window.spaceship;
        if (!spaceship || !spaceship.mesh || spaceship.frozen) {
            if (originalUpdateSpaceship) {
                originalUpdateSpaceship(deltaTime, camera, cameraMode);
            }
            return;
        }

        // 매 프레임 새로운 착륙 지점이 로드되었는지 확인 및 등록
        checkAndRegisterLandingSurfaces();

        // 3D 가이드 링 통과 여부 검사
        if (approachGates.length > 0 && !spaceship.isGrounded) {
            checkApproachGatesCollision(spaceship.mesh.position);
        }

        let activeGroundY = null;

        // 착륙 표면이 존재할 때만 아래 방향으로 레이캐스트 실행
        const surfaceResult = (landingSurfaces.length > 0 && window.CollisionSystem) ? window.CollisionSystem.checkLandingSurface(spaceship.mesh.position, landingSurfaces) : null;
        if (surfaceResult) {
            // 레이캐스트 충돌 지점 중 가장 위에 있는 표면의 Y 좌표
            activeGroundY = surfaceResult.groundY;

            spaceship.isOnCarrierDeck = (surfaceResult.targetName === "NIMITZ");
            spaceship.isOnRunway = (surfaceResult.targetName === "RUNWAY");

            // 비행 중 착륙 표면에 닿았을 때 자동 착지 판정
            const verticalDescentSpeed = -new THREE.Vector3(1, 0, 0).applyQuaternion(spaceship.mesh.quaternion).y * spaceship.currentSpeed;
            if (!spaceship.isGrounded && verticalDescentSpeed > 0 && spaceship.mesh.position.y <= activeGroundY + (spaceship.originalWheelOffset || 15.0) + 2.0) {
                const currentEuler = new THREE.Euler().setFromQuaternion(spaceship.mesh.quaternion, 'YZX');
                const currentPitch = currentEuler.z;
                const currentRoll = currentEuler.x;

                const isDescentSafe = verticalDescentSpeed <= 200;
                const isPitchSafe = currentPitch >= THREE.MathUtils.degToRad(-10) && currentPitch <= THREE.MathUtils.degToRad(20);
                const isRollSafe = Math.abs(currentRoll) <= THREE.MathUtils.degToRad(15);

                if (isDescentSafe && isPitchSafe && isRollSafe) {
                    spaceship.isGrounded = true;
                    spaceship.pitchAngle = 0;
                    spaceship.rollAngle = 0;
                    const qY = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), spaceship.yawAngle);
                    spaceship.mesh.quaternion.copy(qY);
                    if (window.soundManager) window.soundManager.play('spawn');
                    console.log(`[LandingSystem] Landed on ${spaceship.isOnRunway ? 'RUNWAY' : 'carrier deck'}!`);
                } else {
                    spaceship.takeDamage(100);
                    console.log(`[LandingSystem] Crash landing on surface!`);
                }
            }
        } else {
            spaceship.isOnCarrierDeck = false;
            spaceship.isOnRunway = false;
        }

        // 원래의 wheelOffset 백업
        if (spaceship.originalWheelOffset === undefined && spaceship.wheelOffset !== undefined) {
            spaceship.originalWheelOffset = spaceship.wheelOffset;
        }

        // groundY 조절을 통해 myShipControl.js에 갑판 고도를 전달합니다.
        if (spaceship.isGrounded && activeGroundY !== null) {
            spaceship.groundY = activeGroundY + (spaceship.originalWheelOffset || 15.0);
        } else {
            spaceship.groundY = null;
        }

        // --- 어레스팅 와이어 (Arresting Wire) 동작 제어 ---
        const currentIsGrounded = spaceship.isGrounded;
        if (currentIsGrounded && !prevIsGrounded) {
            // 터치다운(접지 순간) 이벤트 발생
            if (spaceship.isOnCarrierDeck) {
                // 항공모함 갑판: 어레스팅 와이어 강제 제동
                spaceship.arrestingWireActive = true;
                spaceship.arrestingWireTimer = 0.8;
                console.log("[LandingSystem] Arresting Wire Catch! Jet stopping.");
                if (window.soundManager) window.soundManager.play('collision-ground');
            } else if (spaceship.isOnRunway) {
                if (window.soundManager) window.soundManager.play('spawn');
            }
        }
        prevIsGrounded = currentIsGrounded;

        // 어레스팅 와이어 감속 물리 적용 (NIMITZ 전용)
        if (spaceship.arrestingWireActive) {
            spaceship.currentSpeed = THREE.MathUtils.lerp(spaceship.currentSpeed, 0, 6.0 * deltaTime);
            spaceship.arrestingWireTimer -= deltaTime;
            if (spaceship.arrestingWireTimer <= 0) {
                spaceship.arrestingWireActive = false;
            }
        }

        // --- 사출기 (Catapult) 동작 제어 ---
        if (spaceship.catapultState === "LAUNCHING") {
            spaceship.catapultTimer -= deltaTime;
            
            // 폭발적인 사출 가속 고정
            spaceship.currentSpeed = 2000;
            
            // 엔진 배기구 하단부 등에 하얀 증기 김이 서리는 듯한 이펙트 소환
            if (window.ParticleManager) {
                const localSteamPos = new THREE.Vector3(20, -(spaceship.originalWheelOffset || 15.0), 0);
                spaceship.mesh.updateMatrixWorld();
                const worldSteamPos = localSteamPos.applyMatrix4(spaceship.mesh.matrixWorld);
                window.ParticleManager.spawnExplosion(worldSteamPos, 1.2);
            }
            
            if (spaceship.catapultTimer <= 0) {
                spaceship.catapultState = "IDLE";
                spaceship.isGrounded = false; // 공중 모드 활성화로 즉시 이륙
                spaceship.groundY = null; // 이륙 시 지면 고도 초기화
                if (window.soundManager) {
                    window.soundManager.play('spawn');
                }
                console.log("[LandingSystem] Catapult Launch Complete!");
            }
        } else if (spaceship.catapultState === "HOOKED") {
            spaceship.currentSpeed = 0; // 사출기 잠금 상태에서는 가동 정지
        }

        // 지상 택싱 중 착륙 표면 밖으로 굴러 떨어졌을 때의 예외 처리
        if (spaceship.isGrounded && activeGroundY === null && landingSurfaces.length > 0 && !window.isLobbyActive) {
            spaceship.isGrounded = false;
            spaceship.groundY = null;
            console.log("[LandingSystem] Aircraft left the landing surface! Airborne mode reactivated.");
        }

        // 원본 비행 업데이트 로직 수행
        if (originalUpdateSpaceship) {
            originalUpdateSpaceship(deltaTime, camera, cameraMode);
        }

        // --- 4. 정면/옆면 충돌 감지 (전투기가 항모 선체나 활주로 등 장애물 측면/정면에 충돌하는지 감지) ---
        if (!spaceship.isGrounded && spaceship.currentSpeed > 0 && landingSurfaces.length > 0 && window.CollisionSystem) {
            // 기체 정면 방향 벡터 계산
            const shipQuat = spaceship.mesh.quaternion.clone();
            const forwardDir = new THREE.Vector3(1, 0, 0).applyQuaternion(shipQuat).normalize();
            const collisionRadius = spaceship.collisionRadius || 45.0;
            const maxDistance = (spaceship.currentSpeed * deltaTime) + collisionRadius;

            const crashResult = window.CollisionSystem.checkForwardCollision(
                spaceship.mesh.position,
                forwardDir,
                maxDistance,
                landingSurfaces,
                true // ignoreDeck = true
            );

            if (crashResult) {
                spaceship.takeDamage(100);
                console.log(`[CollisionSystem] Crashed into the side of: ${crashResult.object.name || crashResult.targetName || "landing surface"}`);
            }
        }

        // 항모 위에서 비행기가 멈춰 있거나 택싱 중일 때 (사출기 고정 상태 제외) 항모 이동 변위 추가
        if (spaceship.isGrounded && activeGroundY !== null && spaceship.catapultState !== "HOOKED" && window.carrierDisplacement) {
            if (spaceship.isOnCarrierDeck) {
                spaceship.mesh.position.add(window.carrierDisplacement);
            }
        }

        // 사출기 고정 강제화 (회전/위치/속도 스냅) - 키 입력으로 인한 흐트러짐 원천 차단
        if (spaceship.catapultState === "HOOKED") {
            spaceship.currentSpeed = 0;
            if (spaceship.mesh) {
                const cData = getCarrierData();
                const snapY = (activeGroundY !== null)
                    ? (activeGroundY + (spaceship.originalWheelOffset || 15.0))
                    : (cData ? (cData.landingPoint.y + (spaceship.originalWheelOffset || 15.0)) : 589.0);
                if (cData) {
                    spaceship.mesh.position.set(cData.landingPoint.x, snapY, cData.landingPoint.z);
                    spaceship.yawAngle = cData.yawRad;
                } else {
                    spaceship.mesh.position.set(4476, snapY, -9825);
                    spaceship.yawAngle = THREE.MathUtils.degToRad(10);
                }
                spaceship.pitchAngle = 0;
                spaceship.rollAngle = 0;
                const qY = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), spaceship.yawAngle);
                spaceship.mesh.quaternion.copy(qY);
            }
        } else if (spaceship.catapultState === "LAUNCHING") {
            spaceship.currentSpeed = 2000;
        }
    };

    // 5. 기존 spawnSpaceship 함수 랩핑 (스폰 시점의 바닥 Y축 결정 보정 및 시작 상태 세팅)
    const originalSpawnSpaceship = window.spawnSpaceship;
    window.spawnSpaceship = function () {
        const spaceship = window.spaceship;
        if (spaceship && spaceship.config && spaceship.config.model && spaceship.config.model.initialPosition) {
            const pos = spaceship.config.model.initialPosition;
            // 만약 초기 설정 Y좌표가 해수면(55.0)보다 높은 지상의 오브젝트 위에 있다면,
            // 스폰 전에 wheelOffset을 해당 고도 기준으로 세팅하여 Y축 계산 오류(물밑으로 빠지는 현상)를 자동으로 방지합니다.
            if (pos.y > 55.0) {
                if (spaceship.originalWheelOffset === undefined && spaceship.wheelOffset !== undefined) {
                    spaceship.originalWheelOffset = spaceship.wheelOffset;
                }
                if (spaceship.originalWheelOffset !== undefined) {
                    spaceship.wheelOffset = pos.y + spaceship.originalWheelOffset - 50.0;
                }
            }
        }

        if (originalSpawnSpaceship) {
            originalSpawnSpaceship();
        }

        // 스폰 후 첫시작(또는 캐리어 스폰) 시 자동으로 사출기에 고정시킴
        const spawnedSpaceship = window.spaceship;
        if (spawnedSpaceship) {
            const pos = (spawnedSpaceship.config && spawnedSpaceship.config.model && spawnedSpaceship.config.model.initialPosition) || { x: 0, z: 0 };
            
            const cData = getCarrierData();
            const hookX = cData ? cData.landingPoint.x : 4476;
            const hookZ = cData ? cData.landingPoint.z : -9825;
            const hookYaw = cData ? cData.yawRad : THREE.MathUtils.degToRad(10);

            // 허용 오차를 넓혀 동적 이동/확대 시에도 스폰이 훅되도록 처리
            if (Math.abs(pos.x - hookX) < 200 && Math.abs(pos.z - hookZ) < 200) {
                const isHelicopter = (window.selectedShip === 'helicopter');
                spawnedSpaceship.catapultState = isHelicopter ? "IDLE" : "HOOKED";
                spawnedSpaceship.currentSpeed = 0;
                spawnedSpaceship.isGrounded = true;
                
                if (spawnedSpaceship.mesh) {
                    const snapY = cData ? (cData.landingPoint.y + (spawnedSpaceship.originalWheelOffset || spawnedSpaceship.wheelOffset || 15.0)) : 589.0;
                    spawnedSpaceship.mesh.position.set(hookX, snapY, hookZ);
                    spawnedSpaceship.yawAngle = hookYaw;
                    spawnedSpaceship.pitchAngle = 0;
                    spawnedSpaceship.rollAngle = 0;
                    const qY = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), spawnedSpaceship.yawAngle);
                    spawnedSpaceship.mesh.quaternion.copy(qY);
                }
                if (isHelicopter) {
                    console.log("[LandingSystem] Spawned helicopter landed on carrier deck (Catapult IDLE).");
                } else {
                    console.log("[LandingSystem] Spawned spaceship is auto-hooked to the catapult.");
                }
            }
        }
    };

    // 6. 사출기 단축키 바인딩 감지 (Shift 또는 J 키로 사출기 고정)
    window.addEventListener('keydown', e => {
        const spaceship = window.spaceship;
        if (!spaceship || !spaceship.mesh) return;

        // 로비 화면일 때는 키 입력을 허용하되, 일시정지(pause) 상태일 때는 차단
        if (spaceship.frozen && !window.isLobbyActive) return;

        // Shift 키 또는 J 키 입력 감지
        if (e.key === "Shift" || e.key.toLowerCase() === "j") {
            if (window.selectedShip === 'helicopter') return;
            // 로비 단계 등에서 착륙 표면이 미리 등록되지 않았을 경우를 위해 강제 동기화 시도
            checkAndRegisterLandingSurfaces();

            // 로비 화면일 때는 복잡한 충돌 검사 없이 즉시 결속/해제 토글 가능하게 보장
            if (window.isLobbyActive) {
                if (spaceship.catapultState === "HOOKED") {
                    spaceship.catapultState = "IDLE";
                    console.log("[LandingSystem] Catapult Unhooked (Lobby).");
                } else {
                    spaceship.catapultState = "HOOKED";
                    spaceship.currentSpeed = 0;
                    spaceship.isGrounded = true;

                    // 사출 위치 및 각도 스냅
                    const cData = getCarrierData();
                    if (cData) {
                        spaceship.mesh.position.set(cData.landingPoint.x, spaceship.mesh.position.y, cData.landingPoint.z);
                        spaceship.yawAngle = cData.yawRad;
                    } else {
                        spaceship.mesh.position.set(4476, spaceship.mesh.position.y, -9825);
                        spaceship.yawAngle = THREE.MathUtils.degToRad(10);
                    }
                    const qY = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), spaceship.yawAngle);
                    spaceship.mesh.quaternion.copy(qY);

                    console.log("[LandingSystem] Catapult Hooked (Lobby). Ready to launch!");
                    if (window.soundManager) {
                        window.soundManager.play('reload');
                    }
                }
                return;
            }

            // 이미 후크가 걸려있는 상태라면 즉시 해제 (갑판 체크 생략하여 오동작 방지)
            if (spaceship.catapultState === "HOOKED") {
                spaceship.catapultState = "IDLE";
                console.log("[LandingSystem] Catapult Unhooked.");
                return;
            }

            // 지상에 멈춰있는 상태일 때만 사출기 장착 가능
            if (spaceship.isGrounded && spaceship.currentSpeed < 50 && spaceship.catapultState !== "LAUNCHING") {
                // 현재 기체 하단의 오브젝트가 NIMITZ인지 확인
                raycaster.set(spaceship.mesh.position, downVector);
                const intersects = raycaster.intersectObjects(landingSurfaces, true);
                let isOnCarrier = false;
                
                if (intersects.length > 0) {
                    let obj = intersects[0].object;
                    while (obj) {
                        if (obj.targetName === "NIMITZ") {
                            isOnCarrier = true;
                            break;
                        }
                        obj = obj.parent;
                    }
                }

                if (isOnCarrier) {
                    // 사출기에 고정
                    spaceship.catapultState = "HOOKED";
                    spaceship.currentSpeed = 0;
                    const cData = getCarrierData();
                    if (cData) {
                        spaceship.mesh.position.set(cData.landingPoint.x, spaceship.mesh.position.y, cData.landingPoint.z); // 사출 위치 정렬
                        spaceship.yawAngle = cData.yawRad; // 발사 각도 정렬
                    } else {
                        spaceship.mesh.position.set(4476, spaceship.mesh.position.y, -9825); // 사출 위치 정렬
                        spaceship.yawAngle = THREE.MathUtils.degToRad(10); // 발사 각도 정방향 10도 고정
                    }
                    
                    const qY = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), spaceship.yawAngle);
                    spaceship.mesh.quaternion.copy(qY);
                    
                    console.log("[LandingSystem] Catapult Hooked. Ready to launch!");
                    if (window.soundManager) {
                        window.soundManager.play('reload'); // 사출 장치 결속 금속음 대용
                    }
                }
            }
        }

        // 사출기 고정(HOOKED) 상태에서 스페이스바(Afterburner/가속)를 누르면 사출 시작 (로비 중에는 불가)
        if (e.key === " " && spaceship.catapultState === "HOOKED" && !window.isLobbyActive) {
            spaceship.catapultState = "LAUNCHING";
            spaceship.catapultTimer = 2.0; // 2.0초 동안 가속
            console.log("[LandingSystem] Catapult Launching! Afterburners active.");
            if (window.soundManager) {
                window.soundManager.play('boost'); // 엔진 애프터버너 사운드 극대화
            }
        }
    });

    // 7. 2D HUD 계기 착륙 시스템 (ILS & 상태 지시 오버레이 그리기)
    const originalUpdateHUD = window.updateHUD;
    window.updateHUD = function (spaceship, camera, delta) {
        // 기존 HUD 렌더러 동작 수행
        if (originalUpdateHUD) {
            originalUpdateHUD(spaceship, camera, delta);
        }

        const canvas = document.getElementById('military-hud');
        if (!canvas || !spaceship || !spaceship.mesh) return;
        const ctx = canvas.getContext('2d');

        const dpr = window.devicePixelRatio || 1;
        const w = canvas.width / dpr;
        const h = canvas.height / dpr;
        const cx = w / 2;
        const cy = h / 2;

        // 랜딩 기어 및 접지 상태 표시 (HUD 좌하단)
        ctx.save();
        ctx.font = 'bold 13px Courier New';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'bottom';
        
        // 사출 후크 상태 표시
        if (window.selectedShip !== 'helicopter') {
            if (spaceship.catapultState === "HOOKED") {
                ctx.fillStyle = '#ffaa00';
                ctx.fillText('HOOK: ENGAGED (사출기 결속됨)', 20, h - 60);
            } else if (spaceship.catapultState === "LAUNCHING") {
                ctx.fillStyle = '#ff3300';
                ctx.fillText('HOOK: LAUNCHING (사출 중)', 20, h - 60);
            } else {
                ctx.fillStyle = '#00ff88';
                ctx.fillText('HOOK: READY (사출기 대기)', 20, h - 60);
            }
        }

        // F-18 랜딩 기어 상시 장착
        ctx.fillStyle = '#00ff88';
        ctx.fillText('GEAR DN', 20, h - 40);
        
        if (spaceship.isGrounded) {
            ctx.fillStyle = '#ffaa00';
            ctx.fillText('LANDED / TAXIING', 20, h - 20);
        } else {
            ctx.fillStyle = '#00ff88';
            ctx.fillText('AIRBORNE', 20, h - 20);
        }
        ctx.restore();

        ctx.save();
        
        // --- A. 사출기/와이어 상태 HUD 중앙 상단 메시지 표시 ---
        ctx.font = 'bold 16px Courier New';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';

        if (spaceship.catapultState === "HOOKED") {
            ctx.fillStyle = '#ffaa00'; // 황색 알림
            ctx.fillText("CATAPULT HOOKED", cx, 110);
            ctx.font = '12px Courier New';
            ctx.fillStyle = '#ffffff';
            ctx.fillText("Press [SPACE] (Afterburner) to Launch", cx, 130);
        } else if (spaceship.catapultState === "LAUNCHING") {
            ctx.fillStyle = '#ff3300'; // 적색 급가속 알림
            ctx.fillText("LAUNCHING...", cx, 110);
        }

        if (spaceship.arrestingWireActive) {
            ctx.fillStyle = '#00ff88'; // 초록색 제동 성공 알림
            ctx.fillText("CABLE CATCH (3-WIRE)", cx, h - 180);
        }

        // --- B. 가상 착륙 유도 터널 (HITS) 2D 오버레이 투영 렌더링 ---
        const cData = getCarrierData();
        const landingPoint = cData ? cData.landingPoint : new THREE.Vector3(4476, 574, -9825);
        const distToCarrier = spaceship.mesh.position.distanceTo(landingPoint);

        if (!spaceship.isGrounded && distToCarrier < 60000) {
            ctx.save();
            drawProjectedTunnel(ctx, w, h, camera, spaceship);
            ctx.restore();
        }
        ctx.restore();
    };

    // 즉시 가상 착륙 게이트 데이터를 생성하여 초기화 (비동기 모델 로딩 지연 방지)
    setupApproachGates();
})();
