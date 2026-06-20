// helicopterControl.js
// 헬리콥터 조종을 위한 전용 물리 및 로터 회전 애니메이션 엔진

(function() {
    // 헬리콥터 물리 상태 초기화 변수
    let verticalVelocity = 0;
    let horizontalVelocity = new THREE.Vector3();

    // REALISTIC 모드 관련 물리 변수
    if (!window.spaceship) window.spaceship = {};
    window.spaceship.velocity = new THREE.Vector3();
    window.spaceship.collectiveThrust = 320.0; // 중력(320)을 기본 상쇄하는 호버 추력
    window.spaceship.isStalling = false;

    // 헬리콥터 물리 업데이터
    window.updateHelicopterPhysics = function(deltaTime, config) {
        const spaceship = window.spaceship;
        if (!spaceship || !spaceship.mesh) return;

        // 헬리콥터는 항상 실속 상태 해제
        spaceship.isStalling = false;

        const maxSpeed = config.speed || 220;
        const climbSpeed = config.climbSpeed || 150;
        const pitchRate = config.pitchRate || 1.2;
        const rollRate = config.rollRate || 1.5;
        const yawRate = config.yawRate || 1.0;

        // 조종 입력 추출
        const pitchInput = (spaceship.keys["ArrowUp"] ? 1 : 0) - (spaceship.keys["ArrowDown"] ? 1 : 0);
        const rollInput  = (spaceship.keys["ArrowRight"] ? 1 : 0) - (spaceship.keys["ArrowLeft"] ? 1 : 0);
        const yawInput   = (spaceship.keys["q"] || spaceship.keys["Q"] ? 1 : 0) - (spaceship.keys["e"] || spaceship.keys["E"] ? 1 : 0);
        const climbInput = (spaceship.keys[" "] ? 1 : 0) - (spaceship.keys["Shift"] ? 1 : 0);

        // 지면 기준 높이 계산 (접지 Snapping용)
        const groundY = (spaceship.groundY !== undefined && spaceship.groundY !== null)
            ? spaceship.groundY
            : 50.0 + (spaceship.wheelOffset !== undefined ? spaceship.wheelOffset : 15.0);

        if (window.controlMode === 'REALISTIC') {
            // ==========================================
            // [REALISTIC 모드] 물리 포스 시뮬레이션
            // ==========================================
            
            if (spaceship.isGrounded) {
                // 지상 상태 물리 제어
                spaceship.velocity.set(0, 0, 0);
                spaceship.mesh.position.y = groundY;
                
                // 지상에서는 피치/롤 0으로 정렬
                const euler = new THREE.Euler().setFromQuaternion(spaceship.mesh.quaternion, 'YZX');
                spaceship.pitchAngle = THREE.MathUtils.lerp(spaceship.pitchAngle, 0, 0.1);
                spaceship.rollAngle = THREE.MathUtils.lerp(spaceship.rollAngle, 0, 0.1);
                
                // 지상 꼬리날개 회전(Yaw 조향)
                spaceship.yawAngle += yawInput * yawRate * deltaTime;
                
                const qY = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), spaceship.yawAngle);
                const qP = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), spaceship.pitchAngle);
                const qR = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), spaceship.rollAngle);
                spaceship.mesh.quaternion.copy(qY).multiply(qP).multiply(qR);

                // 콜렉티브 추력 리셋 및 시동 대기
                if (climbInput > 0) {
                    spaceship.collectiveThrust = THREE.MathUtils.lerp(spaceship.collectiveThrust, 450.0, 1.5 * deltaTime);
                } else {
                    spaceship.collectiveThrust = THREE.MathUtils.lerp(spaceship.collectiveThrust, 300.0, 2.0 * deltaTime);
                }

                // 이륙 검증: 총 추력이 중력(320)을 초과할 때 이탈
                const localUp = new THREE.Vector3(0, 1, 0).applyQuaternion(spaceship.mesh.quaternion);
                if (spaceship.collectiveThrust * localUp.y > 330.0) {
                    spaceship.isGrounded = false;
                    spaceship.groundY = null;
                    console.log("[Helicopter] Liftoff! Rotor thrust exceeded aircraft weight.");
                    if (window.soundManager) {
                        window.soundManager.play('spawn');
                    }
                }
            } else {
                // 공중 자유 물리 제어 (360도 회전, 토크-포스 변환)
                
                // 1. 입력 기반 로컬 토크 및 피치/롤/요 각가속도 적용
                const localPitch = pitchInput * pitchRate * deltaTime;
                const localRoll  = rollInput * rollRate * deltaTime;
                const localYaw   = yawInput * yawRate * deltaTime;

                const qY = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), localYaw);
                const qP = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), localPitch);
                const qR = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), localRoll);

                spaceship.mesh.quaternion.multiply(qY).multiply(qP).multiply(qR).normalize();

                // YZX 오일러 각 동기화
                const euler = new THREE.Euler().setFromQuaternion(spaceship.mesh.quaternion, 'YZX');
                spaceship.yawAngle = euler.y;
                spaceship.pitchAngle = euler.z;
                spaceship.rollAngle = euler.x;

                // 2. 콜렉티브 수동 미세 조정 (Space로 추력 상승, Shift로 하락)
                const thrustChangeRate = 280.0; // 초당 추력 변화량
                spaceship.collectiveThrust += climbInput * thrustChangeRate * deltaTime;
                // 추력 클램핑 (0 ~ 최대 680)
                spaceship.collectiveThrust = THREE.MathUtils.clamp(spaceship.collectiveThrust, 0.0, 680.0);

                // 3. 물리 포스 벡터 연산
                // - 중력 가속도 (Y축 하방 -320)
                const gravityVec = new THREE.Vector3(0, -320.0, 0);

                // - 메인로터 양력 방향 (기체의 로컬 상방 +Y축 방향으로 발생)
                const localUp = new THREE.Vector3(0, 1, 0).applyQuaternion(spaceship.mesh.quaternion);
                const thrustVec = localUp.clone().multiplyScalar(spaceship.collectiveThrust);

                // - 대기 항력 (속도의 반대 방향 및 감쇠 계수 적용)
                const dragVec = spaceship.velocity.clone().multiplyScalar(-0.45);

                // 가속도 합력 계산 (a = F_thrust + F_gravity + F_drag)
                const netAcceleration = new THREE.Vector3()
                    .add(gravityVec)
                    .add(thrustVec)
                    .add(dragVec);

                // 물리 속도 및 월드 좌표 갱신
                spaceship.velocity.addScaledVector(netAcceleration, deltaTime);
                spaceship.mesh.position.addScaledVector(spaceship.velocity, deltaTime);

                spaceship.currentSpeed = spaceship.velocity.length();
            }
        } else {
            // ==========================================
            // [EASY 모드] 직관적인 호버링/선택적 이동 제어
            // ==========================================

            if (spaceship.isGrounded) {
                // 지상 상태 제어
                verticalVelocity = 0;
                horizontalVelocity.set(0, 0, 0);
                spaceship.velocity.set(0, 0, 0);
                spaceship.currentSpeed = 0;
                spaceship.mesh.position.y = groundY;

                spaceship.pitchAngle = THREE.MathUtils.lerp(spaceship.pitchAngle, 0, 0.1);
                spaceship.rollAngle = THREE.MathUtils.lerp(spaceship.rollAngle, 0, 0.1);
                spaceship.yawAngle += yawInput * yawRate * deltaTime;

                const qY = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), spaceship.yawAngle);
                spaceship.mesh.quaternion.copy(qY);

                // 이륙 조건: Space(콜렉티브 업) 입력 시 이륙 시작
                if (climbInput > 0) {
                    spaceship.isGrounded = false;
                    spaceship.groundY = null;
                    verticalVelocity = 50.0; // 초기 상승 속도
                    console.log("[Helicopter] Lift-off initiated in EASY mode.");
                    if (window.soundManager) {
                        window.soundManager.play('spawn');
                    }
                }
            } else {
                // 공중 호버링 기동 제어

                // 1. Yaw 회전 (Q/E 키)
                spaceship.yawAngle += yawInput * yawRate * deltaTime;

                // 2. Cyclic 피치/롤 각도 맵핑 및 자동 수평 복원(Auto-leveling)
                const maxPitchDeg = (config.pitchLimits && config.pitchLimits.up) ? Math.abs(config.pitchLimits.up) : 20;
                const maxRollDeg = config.maxRollAngle || 20;

                const maxPitchRad = THREE.MathUtils.degToRad(maxPitchDeg);
                const maxRollRad  = THREE.MathUtils.degToRad(maxRollDeg);

                const targetPitch = -pitchInput * maxPitchRad;
                const targetRoll  = rollInput * maxRollRad;

                // 기울어지는 반응 속도 (lerp 계수)
                const pitchSpeed = (config.pitchResponse !== undefined) ? config.pitchResponse : (config.pitchRate ? config.pitchRate * 4.0 : 5.0);
                // rollResponse 설정이 있을 경우 최우선 적용
                const rollSpeed = (config.rollResponse !== undefined) ? config.rollResponse : (config.rollRate ? config.rollRate * 3.3 : 5.0);

                // 키를 떼면 자동으로 복원(EASY 모드의 핵심)
                spaceship.pitchAngle = THREE.MathUtils.lerp(spaceship.pitchAngle, targetPitch, pitchSpeed * deltaTime);
                spaceship.rollAngle  = THREE.MathUtils.lerp(spaceship.rollAngle, targetRoll, rollSpeed * deltaTime);

                const qY = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), spaceship.yawAngle);
                const qP = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), spaceship.pitchAngle);
                const qR = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), spaceship.rollAngle);
                spaceship.mesh.quaternion.copy(qY).multiply(qP).multiply(qR);

                // 3. 콜렉티브 상승/하강 (Space: 상승, Shift: 하강, 떼면 고도 홀드 호버링)
                let targetClimbSpeed = climbInput * climbSpeed;
                verticalVelocity = THREE.MathUtils.lerp(verticalVelocity, targetClimbSpeed, 6.0 * deltaTime);

                // 4. 피치/롤 틸트량에 따른 수평 번역 속도 산출
                const pitchFactor = -spaceship.pitchAngle / maxPitchRad;
                const rollFactor  = spaceship.rollAngle / maxRollRad;

                const forwardSpeed = pitchFactor * maxSpeed;
                const strafeSpeed  = rollFactor * maxSpeed * 0.75; // 좌우 횡이동은 조금 느리게 설정

                // 수평 진행 벡터 계산 (기체 헤딩 방향 기준)
                const forwardVec = new THREE.Vector3(1, 0, 0).applyQuaternion(qY);
                const rightVec   = new THREE.Vector3(0, 0, 1).applyQuaternion(qY);

                const targetHorizVel = new THREE.Vector3()
                    .addScaledVector(forwardVec, forwardSpeed)
                    .addScaledVector(rightVec, strafeSpeed);

                horizontalVelocity.lerp(targetHorizVel, 3.5 * deltaTime);

                // 5. 종합 위치 및 속도 벡터 적용
                spaceship.velocity.copy(horizontalVelocity).y = verticalVelocity;
                spaceship.mesh.position.addScaledVector(spaceship.velocity, deltaTime);

                spaceship.currentSpeed = spaceship.velocity.length();
            }
        }

        // --- 공통: 해수면 접지 레이캐스트 간섭 및 항모/활주로 착륙 판정 ---
        // 착륙 판정은 landingSystem.js가 프레임 루프 후반부에 계산하여 isGrounded를 덮어씌웁니다.
        // 여기서는 수면 아래로 추락하여 침수되는 경우만 1차 방지 처리합니다.
        const originalOffset = spaceship.originalWheelOffset !== undefined ? spaceship.originalWheelOffset : (spaceship.wheelOffset !== undefined ? spaceship.wheelOffset : 15.0);
        if (window.CollisionSystem && window.CollisionSystem.checkSeaCollision(spaceship.mesh.position, originalOffset)) {
            spaceship.mesh.position.y = 50.0 + originalOffset; // 고도 고정
            
            if (!spaceship.isGrounded) {
                // 비행 중 수면 충돌 시 충돌 파해 데미지 가함
                spaceship.takeDamage(100);
                console.log("[Helicopter] Crashed into the sea!");
            }
        }
    };
})();
