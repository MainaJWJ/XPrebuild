// advancedControl.js
// 360도 회전 및 뒤집기가 가능한 기존 시뮬레이터 조작방식을 구현합니다.
// 기동 성능 수치(pitchRate, rollRate, yawRate)는 각 기체 JSON에서 동적으로 읽어옵니다.

(function() {
    window.updateAdvancedPhysics = function(deltaTime, config) {
        if (!window.spaceship || !window.spaceship.mesh) return;
        const spaceship = window.spaceship;

        // 1. 기동 민첩성 값 로드 (각 기체의 JSON 설정 또는 기본값 사용)
        const pitchRate = config.pitchRate !== undefined ? config.pitchRate : 1.2;
        const rollRate  = config.rollRate  !== undefined ? config.rollRate  : 2.5;
        const yawRate   = config.yawRate   !== undefined ? config.yawRate   : 0.5;

        // 2. 조종 키 감지
        // ArrowUp/Down: 피치 (Nose Up/Down)
        // ArrowLeft/Right: 롤 (Roll Left/Right)
        // Q/E: 요/러더 (Yaw Left/Right)
        const pitchInput = (spaceship.keys["ArrowDown"] ? 1 : 0) - (spaceship.keys["ArrowUp"] ? 1 : 0);
        const rollInput  = (spaceship.keys["ArrowRight"] ? 1 : 0) - (spaceship.keys["ArrowLeft"] ? 1 : 0);
        const yawInput   = (spaceship.keys["q"] || spaceship.keys["Q"] ? 1 : 0) - (spaceship.keys["e"] || spaceship.keys["E"] ? 1 : 0);

        // 3. 속도에 따른 조종 효율성 계산 (최저 속도 이하일 때 감도 감소)
        const currentSpd = spaceship.currentSpeed || 0;
        const minSpd = config.minSpeed || 400;
        const controlEffectiveness = currentSpd > minSpd ? 1.0 : Math.max(0.1, currentSpd / minSpd);

        // 4. 로컬 축 회전 quaternion 생성
        // pitch: Z축 (Wings axis), roll: X축 (Longitudinal axis), yaw: Y축 (Up vertical axis)
        const localPitch = pitchInput * pitchRate * deltaTime * controlEffectiveness;
        const localRoll  = rollInput * rollRate * deltaTime * controlEffectiveness;
        const localYaw   = yawInput * yawRate * deltaTime * controlEffectiveness;

        if (spaceship.isGrounded) {
            // 지상에 있을 때는 롤 억제 및 피치 범위 제한
            const currentEuler = new THREE.Euler().setFromQuaternion(spaceship.mesh.quaternion, 'YZX');
            let groundedYaw = currentEuler.y;

            // Q/E 또는 ArrowLeft/ArrowRight 둘 다 지상 조향(Yaw)으로 사용하도록 연동
            const steerInput = yawInput + (spaceship.keys["ArrowLeft"] ? 1 : 0) - (spaceship.keys["ArrowRight"] ? 1 : 0);
            groundedYaw += steerInput * yawRate * deltaTime;

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
            spaceship.rollAngle = 0;

            const qY = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), groundedYaw);
            const qP = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), spaceship.pitchAngle);
            spaceship.mesh.quaternion.copy(qY).multiply(qP);

            spaceship.yawAngle = groundedYaw;
        } else {
            const qY = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), localYaw);
            const qP = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), localPitch);
            const qR = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), localRoll);

            // 로컬 쿼터니언 순차 곱셈 (Yaw -> Pitch -> Roll)을 적용하여 기체 방향 갱신
            if (yawInput !== 0) spaceship.mesh.quaternion.multiply(qY);
            if (pitchInput !== 0) spaceship.mesh.quaternion.multiply(qP);
            if (rollInput !== 0) spaceship.mesh.quaternion.multiply(qR);
            
            spaceship.mesh.quaternion.normalize();

            // 5. YZX 순서 오일러 각 추출하여 동기화
            const euler = new THREE.Euler().setFromQuaternion(spaceship.mesh.quaternion, 'YZX');
            spaceship.yawAngle   = euler.y;
            spaceship.pitchAngle = euler.z;
            spaceship.rollAngle  = euler.x;
        }

        // 6. 속도 및 가속도 계산
        const dir = new THREE.Vector3(1, 0, 0).applyQuaternion(spaceship.mesh.quaternion);

        if (spaceship.isGrounded) {
            // 지상 가속/감속 로직
            let targetSpeed = 0;
            let accelerationRate = 0.4;

            if (spaceship.keys[" "]) {
                targetSpeed = config.speed;
                accelerationRate = config.accelerationRate || 0.08;
            } else if (spaceship.keys["b"] || spaceship.keys["B"]) {
                targetSpeed = 0;
                accelerationRate = 1.5; // 휠 브레이크
            } else {
                targetSpeed = 0;
                accelerationRate = 0.3; // 구름 저항
            }
            spaceship.currentSpeed = THREE.MathUtils.lerp(spaceship.currentSpeed, targetSpeed, accelerationRate * deltaTime);
        } else {
            // 기존 공중 비행 물리 속도 로직
            let targetSpeedAir = spaceship.keys[" "] ? config.speed * config.acceleration : config.speed;

            // [선회 저항 적용]
            let turnEffort = 0;
            if (pitchInput !== 0) turnEffort += 0.6;
            if (rollInput !== 0) turnEffort += 0.4;
            if (yawInput !== 0) turnEffort += 0.4;
            if (spaceship.keys["b"] || spaceship.keys["B"]) turnEffort = 1.0;

            const dragAmount = (config.turnDrag || 0.2) * Math.min(turnEffort, 1.0);
            targetSpeedAir *= (1 - dragAmount);

            // [중력 효과 적용]
            const gravityFactor = config.gravityEffect || 0;
            const gravityModifier = 1.0 - (dir.y * gravityFactor);
            targetSpeedAir *= gravityModifier;

            // 최소 속도 한계
            if (targetSpeedAir < minSpd) targetSpeedAir = minSpd;

            // 속도 보간 업데이트
            if (spaceship.currentSpeed === 0) spaceship.currentSpeed = config.speed;
            const accelerationRateAir = config.accelerationRate || 1.0;
            spaceship.currentSpeed = THREE.MathUtils.lerp(spaceship.currentSpeed, targetSpeedAir, accelerationRateAir * deltaTime);
        }

        // 9. 월드 이동 좌표 갱신
        spaceship.mesh.position.add(dir.clone().multiplyScalar(spaceship.currentSpeed * deltaTime));
    };
})();
