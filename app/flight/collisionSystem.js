// collisionSystem.js
// 전투기의 착륙 판정, 미사일 및 기체의 옆면 충돌, 해수면 추락 등 
// 모든 물리적 충돌 연산을 한 곳으로 모아 가독성과 유지보수성을 극대화한 중앙 집중형 모듈입니다.

(function () {
    const raycaster = new THREE.Raycaster();
    const downVector = new THREE.Vector3(0, -1, 0);

    const CollisionSystem = {
        // 1. 해수면 추락 검사
        checkSeaCollision: function (position, originalWheelOffset = 15.0) {
            const seaLevelY = 50.0 + originalWheelOffset;
            return position.y <= seaLevelY;
        },

        // 2. 하방 착륙 표면 감지 (갑판 및 활주로 윗면 검사용)
        checkLandingSurface: function (position, landingSurfaces) {
            if (!landingSurfaces || landingSurfaces.length === 0) return null;

            raycaster.set(position, downVector);
            const intersects = raycaster.intersectObjects(landingSurfaces, true);

            if (intersects.length > 0) {
                const hitIntersect = intersects[0];
                let obj = hitIntersect.object;
                let targetName = "UNKNOWN";

                // 오브젝트 트리 상위에 설정된 targetName 탐색
                while (obj) {
                    if (obj.targetName) {
                        targetName = obj.targetName;
                        break;
                    }
                    obj = obj.parent;
                }

                return {
                    groundY: hitIntersect.point.y,
                    targetName: targetName,
                    object: obj || hitIntersect.object
                };
            }
            return null;
        },

        // 3. 정면/옆면 메쉬 정밀 충돌 검사 (기체 및 미사일 공용)
        checkForwardCollision: function (position, direction, distance, targets, ignoreDeck = false) {
            if (!targets || targets.length === 0) return null;

            raycaster.set(position, direction);
            const intersects = raycaster.intersectObjects(targets, true);

            if (intersects.length > 0 && intersects[0].distance <= distance) {
                const hitIntersect = intersects[0];

                // 착륙 가이드 상단면(갑판 등) 진입 시 이륙/착륙 도중 정면 충돌 판정 오작동 방지용 필터링
                if (ignoreDeck && hitIntersect.face) {
                    const normal = hitIntersect.face.normal.clone();
                    // 월드 공간 기준으로 법선 변환
                    normal.transformDirection(hitIntersect.object.matrixWorld);
                    // 법선 벡터가 수직 위쪽 방향(Y축 성분 0.7 이상)을 가리키면 지면/갑판 윗면으로 판단하고 충돌 무시
                    if (normal.y > 0.7) {
                        return null;
                    }
                }

                let obj = hitIntersect.object;
                let targetName = "UNKNOWN";
                while (obj) {
                    if (obj.targetName) {
                        targetName = obj.targetName;
                        break;
                    }
                    obj = obj.parent;
                }

                return {
                    point: hitIntersect.point,
                    distance: hitIntersect.distance,
                    targetName: targetName,
                    object: obj || hitIntersect.object
                };
            }
            return null;
        },

        // 4. 소형 전투기 등 동적 개체 구형 범위 충돌 검사 (기체, 미사일, 기관포 공용)
        checkSphereCollision: function (position, selfRadius, targets, hostileFactions = [], sizeMultiplier = 1.0) {
            if (!targets || targets.length === 0) return null;

            for (let i = 0; i < targets.length; i++) {
                const target = targets[i];
                if (target.destroyed) continue;

                // 진영이 지정되어 있고, 적대 진영 리스트에 포함되지 않는 우군 타겟은 제외
                if (hostileFactions.length > 0 && !hostileFactions.includes(target.faction)) {
                    continue;
                }

                const targetPos = new THREE.Vector3();
                target.getWorldPosition(targetPos);
                
                const dist = position.distanceTo(targetPos);
                const targetRadius = target.collisionRadius !== undefined ? target.collisionRadius : 150.0;
                const hitRad = (selfRadius + targetRadius) * sizeMultiplier;

                if (dist < hitRad) {
                    return {
                        target: target,
                        distance: dist
                    };
                }
            }
            return null;
        }
    };

    window.CollisionSystem = CollisionSystem;
})();
