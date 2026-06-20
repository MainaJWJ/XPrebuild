// shipEffects.js
// 비행기 기체(spaceship.model)의 가속 및 선회 시 미세진동(Vibration) 효과를 처리합니다.
// 무장(미사일 등)과 기체의 조인트 어긋남 현상을 방지하기 위해 느린 대기 흔들림(Bobbing) 효과는 제외되었습니다.

const ShipEffectsManager = {
    elapsedTime: 0,
    lastModel: null,
    
    // 이펙트 설정 값 (flight 프로젝트의 거대 좌표계 및 카메라 거리 s1 ~200 유닛 기준)
    config: {
        // 미세 진동 (엔진 출력 및 비행 속도에 따른 고주파 떨림)
        vibration: {
            frequency: 50.0,     // 진동 속도 (Hz)
            baseIntensity: 0.01, // 기본 아이들 진동 진폭 (units)
            throttleScale: 0.04, // 스로틀 및 부스터 추가 진폭
            speedScale: 0.06,    // 비행 속도 비례 추가 진폭
            rotIntensity: 0.004  // 회전(각도) 진폭
        }
    },

    update: function (deltaTime, spaceship) {
        if (!spaceship || !spaceship.mesh || !spaceship.model) return;

        // 1. 기체가 로드되었거나 변경되었을 때, 원본 모델의 기준 위치/회전 값을 캐싱
        if (spaceship.model !== this.lastModel) {
            this.lastModel = spaceship.model;
            spaceship.baseModelPosition = spaceship.model.position.clone();
            spaceship.baseModelRotation = spaceship.model.rotation.clone();
            console.log("[ShipEffects] Model changed, baseline position/rotation cached.");
        }

        this.elapsedTime += deltaTime;
        const time = this.elapsedTime;
        const currentSpeed = spaceship.currentSpeed || 0;
        
        // 스로틀 비중 계산 (Space로 가속 시 1.0, 그 외 현재 속도 비율)
        const maxExpectedSpeed = (spaceship.config && spaceship.config.performance) ? spaceship.config.performance.speed : 1000;
        const speedRatio = Math.min(currentSpeed / maxExpectedSpeed, 1.5);
        const isBoosting = spaceship.keys && spaceship.keys[" "];
        const throttleIntensity = isBoosting ? 1.2 : speedRatio;

        // 가속(부스터 사용) 및 회전(방향키 입력) 감지
        const isTurning = spaceship.keys && (
            spaceship.keys["ArrowUp"] || 
            spaceship.keys["ArrowDown"] || 
            spaceship.keys["ArrowLeft"] || 
            spaceship.keys["ArrowRight"]
        );

        // 평소(Idle/수평비행)에는 진동을 거의 제거(0.05 배율)하고,
        // 가속(부스터) 또는 급선회(회전) 시 진동이 활성화되도록 배율 설정
        let dynamicMultiplier = 0.05;
        if (isBoosting) {
            dynamicMultiplier = 1.0;  // 부스터 사용 시 최대 진동
        } else if (isTurning) {
            dynamicMultiplier = 0.7;  // 선회 시 70% 진동
        }

        // --- A. 미세 진동 (Micro-Vibration) ---
        // 기본 공식에 dynamicMultiplier를 적용하여 특정 기동 조건에서만 강한 떨림 발생
        const vibFactor = (this.config.vibration.baseIntensity + 
                          (throttleIntensity * this.config.vibration.throttleScale) + 
                          (speedRatio * this.config.vibration.speedScale)) * dynamicMultiplier;
        
        const vibFreq = this.config.vibration.frequency;
        const vibX = (Math.sin(time * vibFreq) * Math.cos(time * vibFreq * 1.3)) * vibFactor;
        const vibY = (Math.cos(time * vibFreq * 1.1) * Math.sin(time * vibFreq * 0.7)) * vibFactor;
        const vibZ = (Math.sin(time * vibFreq * 0.9)) * vibFactor;

        const vibRotX = Math.sin(time * vibFreq * 1.2) * this.config.vibration.rotIntensity * (vibFactor * 4);
        const vibRotY = Math.cos(time * vibFreq * 0.8) * this.config.vibration.rotIntensity * (vibFactor * 4);
        const vibRotZ = Math.sin(time * vibFreq * 1.4) * this.config.vibration.rotIntensity * (vibFactor * 4);

        // --- B. 기체 원본 모델에 최종 오프셋 적용 ---
        spaceship.model.position.copy(spaceship.baseModelPosition)
            .add(new THREE.Vector3(vibX, vibY, vibZ));

        spaceship.model.rotation.set(
            spaceship.baseModelRotation.x + vibRotX,
            spaceship.baseModelRotation.y + vibRotY,
            spaceship.baseModelRotation.z + vibRotZ
        );
    }
};

window.ShipEffectsManager = ShipEffectsManager;
