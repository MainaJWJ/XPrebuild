// environment.js
// 환경 오브젝트(정적 오브젝트)를 관리하는 모듈입니다.
// 항공모함, 건물 등 배경에 배치되는 모든 고정 3D 오브젝트의 로딩을 담당합니다.

const EnvironmentManager = {
    scene: null,

    init: function (scene) {
        this.scene = scene;
        window.lockableTargets = [];

        // JSON에 설정된 좌표(initialPosition)를 기준으로 환경 오브젝트 배치
        this.loadStaticObject('nimitz');
        this.loadStaticObject('runway');
    },

    loadStaticObject: async function (folderName) {
        try {
            // 브라우저 캐싱 방지를 위해 타임스탬프 추가
            const res = await fetch(`./model/${folderName}/${folderName}.json?v=${Date.now()}`);
            if (!res.ok) return;
            const config = await res.json();

            const loader = new THREE.GLTFLoader();
            loader.load(config.model.file, (gltf) => {
                const mesh = gltf.scene;
                const scale = config.model.scale || 1;
                mesh.scale.set(scale, scale, scale);

                const rot = config.model.initialRotation || { x: 0, y: 0, z: 0 };
                mesh.rotation.set(
                    THREE.MathUtils.degToRad(rot.x),
                    THREE.MathUtils.degToRad(rot.y),
                    THREE.MathUtils.degToRad(rot.z)
                );

                const pos = config.model.initialPosition || { x: 0, y: 0, z: 0 };
                mesh.position.set(pos.x, pos.y, pos.z);

                mesh.traverse(child => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });

                // 타겟 등록용 메타데이터 지정
                mesh.config = config;
                mesh.isTarget = true;
                mesh.targetName = folderName.toUpperCase();
                mesh.destroyed = false;
                mesh.faction = config.faction || "neutral";
                mesh.hostileFactions = config.hostileFactions || [];
                mesh.explosionScale = (config.destruction && config.destruction.explosionScale) ? config.destruction.explosionScale : 6.0;
                mesh.explosionCount = (config.destruction && config.destruction.explosionCount) ? config.destruction.explosionCount : 1;
                mesh.collisionRadius = config.collisionRadius || 150.0;
                window.lockableTargets.push(mesh);

                this.scene.add(mesh);
                console.log(`[EnvironmentManager] Static object loaded and registered as lockable target: ${folderName}`);

                // 바운딩 박스를 계산해 콘솔에 표시하여 크기와 스케일 조정을 돕습니다.
                mesh.updateMatrixWorld(true);
                const boundingBox = new THREE.Box3().setFromObject(mesh);
                console.log(`[EnvironmentManager] ${folderName} Bounding Box (Scale: ${scale}):`, {
                    min: { x: boundingBox.min.x, y: boundingBox.min.y, z: boundingBox.min.z },
                    max: { x: boundingBox.max.x, y: boundingBox.max.y, z: boundingBox.max.z },
                    size: {
                        x: boundingBox.max.x - boundingBox.min.x,
                        y: boundingBox.max.y - boundingBox.min.y,
                        z: boundingBox.max.z - boundingBox.min.z
                    }
                });
            });
        } catch (e) {
            console.error("[EnvironmentManager] Error loading static object", e);
        }
    },

    update: function(delta) {
        // 항모 변위량 초기화
        window.carrierDisplacement = new THREE.Vector3(0, 0, 0);

        if (!window.lockableTargets) return;
        const carrier = window.lockableTargets.find(t => t.targetName === "NIMITZ");
        
        if (carrier && !carrier.destroyed) {
            const speed = 40.0; // 약 30노트 (15m/s) 속도
            const distance = speed * delta;
            
            const prevPos = carrier.position.clone();
            
            // 로컬 전방(-Z축)으로 이동
            carrier.translateZ(-distance);
            
            // 비행기 미끄러짐 방지를 위해 이번 프레임의 변위량 저장
            window.carrierDisplacement.copy(carrier.position).sub(prevPos);
        }
    }
};

window.EnvironmentManager = EnvironmentManager;
