// gunSystem.js
// 모델 설정 파일의 gunHardpoints를 읽어와 기관포(Bullet)를 발사하고 업데이트하는 무장 모듈입니다.
// 'A' 키 입력 시 작동하며, 다중 하드포인트 설정을 기본 지원합니다.

const GunManager = {
    scene: null,
    spaceship: null,
    bullets: [],
    
    // M61 기관포 사격 설정 (init() 전 안전망용 기본값. 실제값은 updateGunSpecs()가 F-18.json에서 로드하여 덮어씀)
    fireCooldown: 0.035,
    lastFireTime: 0,
    bulletSpeed: 4500,
    bulletLife: 1.5,
    bulletSpread: 0.027,
    gunDamage: 5,

    init: function (scene, spaceshipObj) {
        this.scene = scene;
        this.spaceship = spaceshipObj;
        this.bullets = [];
        this.lastFireTime = 0;
        this.updateGunSpecs();
        console.log("[GunManager] Rebuilt Cannon System Initialized.");
    },

    updateGunSpecs: function () {
        if (!this.spaceship) return;
        const gunPerf = (this.spaceship.config && this.spaceship.config.performance && this.spaceship.config.performance.gun)
            ? this.spaceship.config.performance.gun
            : {};
        this.fireCooldown = gunPerf.fireCooldown !== undefined ? gunPerf.fireCooldown : 0.035; // JSON에 없을 시 fallback
        this.bulletSpeed = gunPerf.bulletSpeed !== undefined ? gunPerf.bulletSpeed : 4500;
        this.bulletLife = gunPerf.bulletLife !== undefined ? gunPerf.bulletLife : 1.5;
        this.bulletSpread = gunPerf.bulletSpread !== undefined ? gunPerf.bulletSpread : 0.027; // JSON에 없을 시 fallback
        this.gunDamage = gunPerf.damage !== undefined ? gunPerf.damage : 5;
        console.log(`[GunManager] Specs updated: cooldown=${this.fireCooldown}, speed=${this.bulletSpeed}, life=${this.bulletLife}, spread=${this.bulletSpread}, damage=${this.gunDamage}`);
    },

    fire: function () {
        if (!this.spaceship || !this.spaceship.mesh || this.spaceship.frozen) return;

        const now = performance.now() * 0.001; // 초 단위 시간
        if (now - this.lastFireTime < this.fireCooldown) return; // 쿨다운 체크

        this.lastFireTime = now;

        // 1. 모델 설정(spaceship.config)에서 기관포 하드포인트 위치를 읽어옴
        // 설정에 없을 시 F-18의 기본 노즈 포지션([{x: 60, y: 4, z: 0}])을 사용
        const gunHardpoints = (this.spaceship.config && this.spaceship.config.visuals && this.spaceship.config.visuals.gunHardpoints)
            ? this.spaceship.config.visuals.gunHardpoints
            : [{ x: 50, y: 4, z: 0 }];

        // 기체의 현재 행렬 업데이트
        this.spaceship.mesh.updateMatrixWorld(true);
        const shipQuat = this.spaceship.mesh.quaternion;
        const forwardDir = new THREE.Vector3(1, 0, 0).applyQuaternion(shipQuat);

        // 기체의 현재 속도 상속
        const currentShipSpeed = this.spaceship.currentSpeed || 0;
        const actualBulletSpeed = this.bulletSpeed + currentShipSpeed;

        // 2. 등록된 모든 기관포 하드포인트에서 동시에 사격 발사 (다연장 대응)
        gunHardpoints.forEach((hp) => {
            // 로컬 좌표를 월드 좌표로 변환
            const localPos = new THREE.Vector3(hp.x, hp.y, hp.z);
            const worldPos = localPos.applyMatrix4(this.spaceship.matrixWorld || this.spaceship.mesh.matrixWorld);

            // 탄퍼짐 계산 (JSON의 bulletSpread 값 사용, 없으면 fallback 0.027)
            const spread = this.bulletSpread;
            const upDir = new THREE.Vector3(0, 1, 0).applyQuaternion(shipQuat);
            const rightDir = new THREE.Vector3(0, 0, -1).applyQuaternion(shipQuat);
            
            const randUp = (Math.random() - 0.5) * spread;
            const randRight = (Math.random() - 0.5) * spread;
            
            const bulletDir = forwardDir.clone()
                .addScaledVector(upDir, randUp)
                .addScaledVector(rightDir, randRight)
                .normalize();

            // 기관포 총알 메쉬 생성 (Additive Blending을 활용한 오렌지/노란색 레이저 빔)
            const length = 35;
            const geom = new THREE.CylinderGeometry(2, 2, length, 90);
            // Three.js 실린더는 Y축으로 서있으므로 X축 방향을 가리키도록 Z축 90도 회전
            geom.rotateZ(Math.PI / 2);

            const mat = new THREE.MeshBasicMaterial({
                color: 0xff9900, // 밝은 주황색 광채 (Bright Orange-Yellow Glow)
                transparent: true,
                opacity: 1.0,
                blending: THREE.AdditiveBlending,
                depthWrite: false
            });

            const bulletMesh = new THREE.Mesh(geom, mat);
            bulletMesh.position.copy(worldPos);
            // 탄퍼짐 방향을 바라보도록 쿼터니언 회전 설정
            bulletMesh.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), bulletDir);

            this.scene.add(bulletMesh);

            // 포탄 객체 추가
            this.bullets.push({
                mesh: bulletMesh,
                velocity: bulletDir.clone().multiplyScalar(actualBulletSpeed),
                age: 0,
                active: true
            });
        });
    },

    update: function (deltaTime) {
        // 사격 중 키 입력 감지 ('A' 또는 'a' 키)
        const isFiring = this.spaceship && this.spaceship.keys && (this.spaceship.keys["a"] || this.spaceship.keys["A"]) && !this.spaceship.frozen;
        
        if (isFiring) {
            this.fire();
            if (window.soundManager && !window.soundManager.isPlaying('m61-firing')) {
                window.soundManager.play('m61-firing');
            }
        } else {
            if (window.soundManager && window.soundManager.isPlaying('m61-firing')) {
                window.soundManager.stop('m61-firing');
            }
        }

        // 활성화된 총알 물리 업데이트 및 바다 충돌 검사
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const b = this.bullets[i];
            b.age += deltaTime;

            // 수명 초과 시 제거
            if (b.age >= this.bulletLife) {
                this._destroyBullet(i);
                continue;
            }

            // 위치 이동
            b.mesh.position.addScaledVector(b.velocity, deltaTime);

            // 타겟과의 충돌 검사
            let hitTarget = false;
            if (window.lockableTargets && window.lockableTargets.length > 0 && window.CollisionSystem) {
                const hostileFactions = (this.spaceship.config && this.spaceship.config.hostileFactions) ? this.spaceship.config.hostileFactions : [];

                const sphereHit = window.CollisionSystem.checkSphereCollision(
                    b.mesh.position,
                    0,
                    window.lockableTargets,
                    hostileFactions,
                    1.2 // sizeMultiplier (increased by 1.2x for better canon controls feel)
                );

                if (sphereHit) {
                    hitTarget = true;
                    const target = sphereHit.target;
                    const targetPos = new THREE.Vector3();
                    target.getWorldPosition(targetPos);
                    
                    // 기관포 기본 데미지: 설정값 또는 발당 5
                    const gunDamage = this.gunDamage;
                    
                    if (target.health === undefined) {
                        target.health = 100;
                    }
                    target.health -= gunDamage;
                    console.log(`[GunManager] Cannon hit target: ${target.targetName}! Damage: ${gunDamage}, Health remaining: ${target.health}`);

                    // 내가 쏜 기관포가 명중한 대상을 액션 캠으로 보여줌
                    if (window.triggerActionCam) {
                        window.triggerActionCam(target, 4.0);
                    }

                    if (target.health <= 0) {
                        target.destroyed = true;
                        target.visible = false;
                        console.log(`[GunManager] Target destroyed: ${target.targetName}!`);

                        // 타겟 격추 연쇄 폭발 효과 발생
                        if (window.ParticleManager && window.ParticleManager.spawnExplosion) {
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
                                        if (window.soundManager) {
                                            window.soundManager.play('explosion-random');
                                        }
                                    }
                                }, delay);
                            }
                        }
                    } else {
                        // 피격 스파크/폭발 효과 발생
                        if (window.ParticleManager && window.ParticleManager.spawnExplosion) {
                            window.ParticleManager.spawnExplosion(b.mesh.position.clone(), 1.5);
                        }
                        if (window.soundManager) {
                            window.soundManager.play('explosion-random');
                        }
                    }
                }
            }

            // 바다 충돌 검사 (y <= 0) 또는 타격 성공 시 제거
            if (hitTarget || b.mesh.position.y <= 0) {
                this._destroyBullet(i);
            }
        }
    },

    _destroyBullet: function (index) {
        const b = this.bullets[index];
        if (b) {
            this.scene.remove(b.mesh);
            if (b.mesh.geometry) b.mesh.geometry.dispose();
            if (b.mesh.material) b.mesh.material.dispose();
            this.bullets.splice(index, 1);
        }
    }
};

window.GunManager = GunManager;
