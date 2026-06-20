// weatherSystem.js
// fft-ocean-master에서 영감을 받은 날씨/기후 제어 시스템
// Day / Sunset / Cloudy / Night / Storm 5가지 프리셋 + 부드러운 Lerp 전환 + 비 파티클

const WeatherSystem = (() => {

    // ================================================================
    // 날씨 프리셋 정의 (fft-ocean UpdateEnvironment 방식 참고)
    // ================================================================
    const PRESETS = {
        day: {
            label: '☀ DAY',
            skyColor:      new THREE.Color(0x7ec2f6),  // 밝은 여름 하늘
            ambientColor:  new THREE.Color(0xdbebff),
            ambientIntensity: 1.2,
            dirColor:      new THREE.Color(0xfffaed),
            dirIntensity:  1.8,
            dirPosition:   new THREE.Vector3(1000, 2000, 1000).normalize(),
            // Ocean uniforms
            oceanColor:    new THREE.Vector3(0.04, 0.18, 0.38),
            skyTop:        new THREE.Vector3(0.25, 0.58, 0.92),
            skyHorizon:    new THREE.Vector3(0.65, 0.82, 0.98),
            waveSpeed:     1.0,
            exposure:      0.35,
            rain:          false,
            rainIntensity: 0.0,
            rainColor:     new THREE.Color(0.8, 0.85, 0.95),
        },
        sunset: {
            label: '🌅 SUNSET',
            skyColor:      new THREE.Color(0xd45a20),  // 주황-빨간 노을
            ambientColor:  new THREE.Color(0xff9955),
            ambientIntensity: 0.9,
            dirColor:      new THREE.Color(0xff7030),
            dirIntensity:  1.4,
            dirPosition:   new THREE.Vector3(-800, 300, -1000).normalize(),
            // Ocean
            oceanColor:    new THREE.Vector3(0.18, 0.08, 0.04),
            skyTop:        new THREE.Vector3(0.55, 0.18, 0.05),
            skyHorizon:    new THREE.Vector3(0.95, 0.55, 0.22),
            waveSpeed:     1.2,
            exposure:      0.40,
            rain:          false,
            rainIntensity: 0.0,
            rainColor:     new THREE.Color(0.9, 0.7, 0.5),
        },
        cloudy: {
            label: '☁ CLOUDY',
            skyColor:      new THREE.Color(0x7a8fa0),  // 흐린 회청색
            ambientColor:  new THREE.Color(0xaabbcc),
            ambientIntensity: 0.7,
            dirColor:      new THREE.Color(0xccddee),
            dirIntensity:  0.8,
            dirPosition:   new THREE.Vector3(0.3, 1.0, 0.5).normalize(),
            // Ocean
            oceanColor:    new THREE.Vector3(0.06, 0.14, 0.24),
            skyTop:        new THREE.Vector3(0.35, 0.42, 0.50),
            skyHorizon:    new THREE.Vector3(0.55, 0.60, 0.65),
            waveSpeed:     1.5,
            exposure:      0.30,
            rain:          true,
            rainIntensity: 0.4,   // 약한 비
            rainColor:     new THREE.Color(0.75, 0.80, 0.90),
        },
        night: {
            label: '🌙 NIGHT',
            skyColor:      new THREE.Color(0x050814),  // 짙은 남색
            ambientColor:  new THREE.Color(0x1a2a4a),
            ambientIntensity: 0.3,
            dirColor:      new THREE.Color(0x6688bb),  // 달빛
            dirIntensity:  0.5,
            dirPosition:   new THREE.Vector3(-0.3, 0.8, 1.0).normalize(),
            // Ocean
            oceanColor:    new THREE.Vector3(0.01, 0.04, 0.12),
            skyTop:        new THREE.Vector3(0.02, 0.04, 0.15),
            skyHorizon:    new THREE.Vector3(0.08, 0.12, 0.28),
            waveSpeed:     1.2,
            exposure:      0.55,  // 밤이라 exposure 올려서 달빛 반짝임 강화
            rain:          true,
            rainIntensity: 0.8,   // 강한 비
            rainColor:     new THREE.Color(0.5, 0.6, 0.8),
        },
        storm: {
            label: '⛈ STORM',
            skyColor:      new THREE.Color(0x111820),  // 폭풍 먹구름
            ambientColor:  new THREE.Color(0x334455),
            ambientIntensity: 0.4,
            dirColor:      new THREE.Color(0x8899aa),
            dirIntensity:  0.6,
            dirPosition:   new THREE.Vector3(1.0, 0.4, 1.0).normalize(),
            // Ocean
            oceanColor:    new THREE.Vector3(0.02, 0.06, 0.10),
            skyTop:        new THREE.Vector3(0.04, 0.07, 0.12),
            skyHorizon:    new THREE.Vector3(0.12, 0.16, 0.22),
            waveSpeed:     2.5,   // 파도 2.5배 속도
            exposure:      0.45,
            rain:          true,
            rainIntensity: 1.0,   // 폭우
            rainColor:     new THREE.Color(0.4, 0.5, 0.7),
        }
    };

    const PRESET_ORDER = ['day', 'sunset', 'cloudy', 'night', 'storm'];

    // ================================================================
    // 내부 상태
    // ================================================================
    let _scene = null;
    let _renderer = null;
    let _ambientLight = null;
    let _dirLight = null;

    let _currentKey = 'day';
    let _from = null;
    let _to = null;
    let _transitionElapsed = 0;
    let _transitionDuration = 5.0;
    let _isTransitioning = false;
    let _lastCameraPos = null;

    // 번개(Lightning) 관련 상태 변수
    let _flashOverlayEl = null;
    let _flashTime = -99;
    let _lightningTimer = 0;
    let _nextLightningTime = 1.0; // 최초 1초 대기

    // ----------------------------------------------------------------
    // 번개(Lightning) 이펙트용 플래시 및 타이머 함수
    // ----------------------------------------------------------------
    function _createFlashOverlay() {
        if (document.getElementById('lightning-flash-overlay')) return;
        const flashOverlay = document.createElement('div');
        flashOverlay.id = 'lightning-flash-overlay';
        flashOverlay.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 4999;
            background: rgba(150, 190, 255, 0);
            transition: none;
        `;
        const gameLayer = document.getElementById('game-layer') || document.body;
        gameLayer.appendChild(flashOverlay);
        _flashOverlayEl = flashOverlay;
    }

    function _updateLightning(delta) {
        _lightningTimer += delta;
        if (_lightningTimer >= _nextLightningTime) {
            _lightningTimer = 0;
            _nextLightningTime = 1.0; // 1초 주기 고정
            
            if (window.LightningSystem) {
                // 기체의 현재 위치 주변 또는 맵 영역 내 무작위 스폰
                let cx = 0;
                let cz = 0;
                if (window.spaceship && window.spaceship.mesh) {
                    const pos = window.spaceship.mesh.position;
                    // 플레이어 기체 기준 가로세로 80km 범위(기체 주변 전체 맵 영역) 내 무작위 스폰
                    cx = pos.x + (Math.random() - 0.5) * 80000;
                    cz = pos.z + (Math.random() - 0.5) * 80000;
                } else {
                    cx = (Math.random() - 0.5) * 80000;
                    cz = (Math.random() - 0.5) * 80000;
                }

                // 번개 발생 (지정한 Y=50000 높이에서 지면 Y=0까지)
                window.LightningSystem.spawnAt(cx, 50000, cz);
                
                // 기체와 번개 간의 수평 법선거리(2D 거리) 계산
                let distance = 999999;
                if (window.spaceship && window.spaceship.mesh) {
                    const px = window.spaceship.mesh.position.x;
                    const pz = window.spaceship.mesh.position.z;
                    const dx = px - cx;
                    const dz = pz - cz;
                    distance = Math.sqrt(dx * dx + dz * dz);
                }

                // 법선거리가 5000 미만일 때만 화면이 번쩍이는 플래시 효과 활성화
                if (distance < 5000) {
                    _flashTime = performance.now() / 1000;
                }
            }
        }
    }

    // ----------------------------------------------------------------
    // 비(Rain) 파티클 시스템
    // ----------------------------------------------------------------
    let _rainPoints = null;
    let _rainPositions = null;
    let _rainVelocities = null;
    const RAIN_COUNT = 2500;
    const RAIN_RANGE  = 600;
    const RAIN_HEIGHT = 500;

    function _createRainSystem() {
        const geo = new THREE.BufferGeometry();
        const positions = new Float32Array(RAIN_COUNT * 3);
        const velocities = new Float32Array(RAIN_COUNT);

        for (let i = 0; i < RAIN_COUNT; i++) {
            positions[i * 3 + 0] = (Math.random() - 0.5) * RAIN_RANGE * 2;
            positions[i * 3 + 1] = Math.random() * RAIN_HEIGHT;
            positions[i * 3 + 2] = (Math.random() - 0.5) * RAIN_RANGE * 2;
            velocities[i] = 450 + Math.random() * 200; // 낙하 속도 증가 (150 -> 450+ unit/s)
        }

        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        _rainPositions = positions;
        _rainVelocities = velocities;

        // 빗방울 텍스처를 코드로 생성 (정사각형 캔버스로 종횡 왜곡 없는 세로 빗금 스트레이크 생성)
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx2d = canvas.getContext('2d');
        const grad = ctx2d.createLinearGradient(32, 0, 32, 64);
        grad.addColorStop(0.0, 'rgba(220, 235, 255, 0.0)');
        grad.addColorStop(0.5, 'rgba(220, 235, 255, 0.95)');
        grad.addColorStop(1.0, 'rgba(220, 235, 255, 0.0)');
        ctx2d.fillStyle = grad;
        ctx2d.beginPath();
        ctx2d.ellipse(32, 32, 0.8, 28, 0, 0, Math.PI * 2); // 얇고 긴 빗방울 세로 형태
        ctx2d.fill();
        const dropTexture = new THREE.CanvasTexture(canvas);

        const mat = new THREE.PointsMaterial({
            size: 20, // 빗방울 스트레이크 크기 확장
            map: dropTexture,
            transparent: true,
            opacity: 0.0,           // 초기엔 안 보임 (날씨 전환 시 fade-in)
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            sizeAttenuation: true,
        });

        _rainPoints = new THREE.Points(geo, mat);
        _rainPoints.frustumCulled = false;
        _scene.add(_rainPoints);
    }

    function _updateRain(delta, camera, targetIntensity) {
        if (!_rainPoints) return;

        const mat = _rainPoints.material;
        // Fade opacity to/from target intensity
        mat.opacity += (targetIntensity * 0.85 - mat.opacity) * Math.min(1.0, delta * 1.5);
        _rainPoints.visible = mat.opacity > 0.01;

        if (!_rainPoints.visible) return;

        // 날씨 프리셋별 빗방울 색상 반영
        if (PRESETS[_currentKey] && PRESETS[_currentKey].rainColor) {
            mat.color.copy(PRESETS[_currentKey].rainColor);
        }

        // 카메라 이동(전투기 비행)에 따라 빗방울의 상대 위치가 비바람 뚫고 가듯 뒤처지게 상대 변위 계산
        const camDisp = new THREE.Vector3();
        if (_lastCameraPos) {
            camDisp.copy(camera.position).sub(_lastCameraPos);
        }
        _lastCameraPos = _lastCameraPos || new THREE.Vector3();
        _lastCameraPos.copy(camera.position);

        // Rain emitter follows camera position
        _rainPoints.position.copy(camera.position);

        const pos = _rainPositions;
        for (let i = 0; i < RAIN_COUNT; i++) {
            const idx = i * 3;

            // 1. 낙하 속도 적용
            pos[idx + 1] -= _rainVelocities[i] * delta;

            // 2. 카메라 이동의 역변위를 적용하여 빗방울을 세계 공간에 고정시킴
            pos[idx + 0] -= camDisp.x;
            pos[idx + 1] -= camDisp.y;
            pos[idx + 2] -= camDisp.z;

            // 3. 경계 영역을 벗어나면 맞은편 영역으로 리셋 (무한 워핑 루프)
            if (pos[idx + 0] < -RAIN_RANGE) pos[idx + 0] += RAIN_RANGE * 2;
            else if (pos[idx + 0] > RAIN_RANGE) pos[idx + 0] -= RAIN_RANGE * 2;

            if (pos[idx + 2] < -RAIN_RANGE) pos[idx + 2] += RAIN_RANGE * 2;
            else if (pos[idx + 2] > RAIN_RANGE) pos[idx + 2] -= RAIN_RANGE * 2;

            if (pos[idx + 1] < -50) pos[idx + 1] += RAIN_HEIGHT;
            else if (pos[idx + 1] > RAIN_HEIGHT - 50) pos[idx + 1] -= RAIN_HEIGHT;
        }
        _rainPoints.geometry.attributes.position.needsUpdate = true;
    }

    // ----------------------------------------------------------------
    // 상태 캡처 (전환 시작 시점의 현재값을 "from"으로 저장)
    // ----------------------------------------------------------------
    function _captureCurrentState() {
        const p = PRESETS[_currentKey];
        return {
            skyColor:        _scene.background.clone(),
            ambientColor:    _ambientLight.color.clone(),
            ambientIntensity: _ambientLight.intensity,
            dirColor:        _dirLight.color.clone(),
            dirIntensity:    _dirLight.intensity,
            dirPosition:     _dirLight.position.clone().normalize(),
            oceanColor:      p.oceanColor.clone(),
            skyTop:          p.skyTop.clone(),
            skyHorizon:      p.skyHorizon.clone(),
            waveSpeed:       p.waveSpeed,
            exposure:        p.exposure,
            rainIntensity:   p.rainIntensity,
        };
    }

    // ================================================================
    // 공개 API
    // ================================================================

    function init(scene, renderer, ambientLight, dirLight) {
        _scene = scene;
        _renderer = renderer;
        _ambientLight = ambientLight;
        _dirLight = dirLight;

        _createRainSystem();
        _createWeatherPanel();
        _createFlashOverlay();

        if (window.LightningSystem) {
            window.LightningSystem.init(_scene);
            // 월드 스케일에 맞게 번개의 두께와 파티클 크기 등을 크게 조정하여 멀리서도 보이게 설정
            // 뒤집힌 나무 형태(많은 가지, 높은 굴곡)이되 수직 방향성을 유지하도록 커스텀 매개변수 적용
            window.LightningSystem.setParams({
                layers: [
                    { color: '#4764e1', thick: 35.0, alpha: 0.25 },
                    { color: '#1072bd', thick: 15.0, alpha: 0.65 },
                    { color: '#aceeff', thick: 5.0, alpha: 1.0  },
                ],
                sparkSize: 12.0,
                groundFlashSize: 350.0,
                shockwaveDur: 0.8,
                shockwaveAlphaMult: 0.8,

                // 꺾임 및 형상 디테일 강화 (구불구불함 극대화)
                mainFractalDepth: 6,       // 본체 세분화 단계 증가
                altFractalDepth: 4,        // 가지 세분화 단계 증가
                roughnessMin: 0.75,        // 최소 지그재그 편차 증가
                roughnessMax: 0.95,        // 최대 지그재그 편차 증가

                // 거꾸로 뒤집힌 나무 디자인 (많은 수의 짧은 수직 가지)
                branchCountMin: 5,         // 가지 개수 대폭 확장
                branchCountMax: 10,
                branchLengthFactorMin: 0.15, // 가지 길이를 본체 대비 다소 짧게 제한
                branchLengthFactorMax: 0.35,
                branchXZScaleX: 0.15,      // 좌우(X축) 퍼짐을 억제하여 수직성 유지
                branchXZScaleZ: 0.15,      // 앞뒤(Z축) 퍼짐을 억제하여 수직성 유지
                branchDropFactorMin: 0.85, // 가지가 지면 방향으로 빠르게 떨어지도록 설정
                branchDropFactorMax: 1.15
            });
        }

        // 초기 프리셋 적용 (전환 없이 즉각)
        _applyPresetInstant('day');

        console.log('[WeatherSystem] Initialized ☀ DAY');
    }

    // 즉각 적용 (초기화 전용)
    function _applyPresetInstant(key) {
        const p = PRESETS[key];
        if (!p) return;

        _currentKey = key;
        _scene.background.set(p.skyColor);
        _renderer.setClearColor(p.skyColor, 1);
        _ambientLight.color.set(p.ambientColor);
        _ambientLight.intensity = p.ambientIntensity;
        _dirLight.color.set(p.dirColor);
        _dirLight.intensity = p.dirIntensity;
        _dirLight.position.copy(p.dirPosition).multiplyScalar(2000);

        if (window.OceanSystem && window.OceanSystem.setWeatherUniforms) {
            window.OceanSystem.setWeatherUniforms({
                oceanColor: p.oceanColor,
                skyTop:     p.skyTop,
                skyHorizon: p.skyHorizon,
                waveSpeed:  p.waveSpeed,
                exposure:   p.exposure,
                dirToLight: p.dirPosition,
            });
        }

        _updatePanelSelection(key);
    }

    // Lerp 전환 시작
    function setWeather(key, duration = 5.0) {
        if (!PRESETS[key] || key === _currentKey) return;

        _from = _captureCurrentState();
        _to = PRESETS[key];
        _transitionDuration = duration;
        _transitionElapsed = 0;
        _isTransitioning = true;
        _currentKey = key;

        _updatePanelSelection(key);
        console.log(`[WeatherSystem] Transitioning → ${PRESETS[key].label} (${duration}s)`);
    }

    // ease in-out cubic
    function _easeInOut(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    function update(delta, camera) {
        const targetIntensity = PRESETS[_currentKey].rainIntensity;

        if (_isTransitioning && _from && _to) {
            _transitionElapsed += delta;
            const raw = Math.min(1.0, _transitionElapsed / _transitionDuration);
            const t = _easeInOut(raw);

            // --- 하늘 배경색 ---
            const blendedSky = _from.skyColor.clone().lerp(_to.skyColor, t);
            _scene.background.set(blendedSky);
            _renderer.setClearColor(blendedSky, 1);

            // --- 조명 ---
            _ambientLight.color.copy(_from.ambientColor.clone().lerp(_to.ambientColor, t));
            _ambientLight.intensity = _from.ambientIntensity + (_to.ambientIntensity - _from.ambientIntensity) * t;
            _dirLight.color.copy(_from.dirColor.clone().lerp(_to.dirColor, t));
            _dirLight.intensity = _from.dirIntensity + (_to.dirIntensity - _from.dirIntensity) * t;
            const blendedDirPos = _from.dirPosition.clone().lerp(_to.dirPosition, t).normalize();
            _dirLight.position.copy(blendedDirPos).multiplyScalar(2000);

            // --- Ocean 유니폼 ---
            if (window.OceanSystem && window.OceanSystem.setWeatherUniforms) {
                const blendVec3 = (a, b, tt) => new THREE.Vector3(
                    a.x + (b.x - a.x) * tt,
                    a.y + (b.y - a.y) * tt,
                    a.z + (b.z - a.z) * tt,
                );
                window.OceanSystem.setWeatherUniforms({
                    oceanColor: blendVec3(_from.oceanColor, _to.oceanColor, t),
                    skyTop:     blendVec3(_from.skyTop,     _to.skyTop,     t),
                    skyHorizon: blendVec3(_from.skyHorizon, _to.skyHorizon, t),
                    waveSpeed:  _from.waveSpeed  + (_to.waveSpeed  - _from.waveSpeed)  * t,
                    exposure:   _from.exposure   + (_to.exposure   - _from.exposure)   * t,
                    dirToLight: blendedDirPos,
                });
            }

            if (raw >= 1.0) {
                _isTransitioning = false;
                _from = null;
            }
        }

        // --- 번개(Lightning) 시스템 업데이트 ---
        if (window.LightningSystem) {
            window.LightningSystem.update(delta);
        }

        // --- 폭풍(STORM) 날씨일 때 번개 생성 타이머 작동 ---
        if (_currentKey === 'storm') {
            _updateLightning(delta);
        }

        // --- 번개 스크린 플래시 애니메이션 처리 ---
        if (_flashTime > 0) {
            const now = performance.now() / 1000;
            const elapsed = now - _flashTime;
            const alpha = Math.max(0, Math.exp(-elapsed * 8) * 0.65); // 지수 감쇠로 자연스러운 깜빡임 효과
            if (_flashOverlayEl) {
                _flashOverlayEl.style.backgroundColor = `rgba(180, 210, 255, ${alpha.toFixed(3)})`;
            }
            if (alpha <= 0.001) {
                _flashTime = -99;
                if (_flashOverlayEl) {
                    _flashOverlayEl.style.backgroundColor = `rgba(180, 210, 255, 0)`;
                }
            }
        }

        _updateRain(delta, camera, targetIntensity);
        _updateWeatherHUD();
    }

    function getCurrentKey() { return _currentKey; }
    function getCurrentLabel() { return PRESETS[_currentKey]?.label || ''; }

    // ================================================================
    // 날씨 선택 UI 패널 (fft-ocean env-selector 스타일)
    // ================================================================
    let _panelBtns = {};

    function _createWeatherPanel() {
        const panel = document.createElement('div');
        panel.id = 'weather-panel';
        
        const lobbyWeatherContainer = document.getElementById('lobby-weather-container');
        if (lobbyWeatherContainer) {
            panel.style.cssText = `
                display: flex;
                gap: 6px;
                pointer-events: auto;
                font-family: 'Courier New', monospace;
            `;
        } else {
            panel.style.cssText = `
                position: absolute;
                top: 12px;
                left: 50%;
                transform: translateX(-50%);
                display: flex;
                gap: 6px;
                z-index: 5000;
                pointer-events: auto;
                font-family: 'Courier New', monospace;
            `;
        }

        PRESET_ORDER.forEach((key, i) => {
            const p = PRESETS[key];
            const btn = document.createElement('button');
            btn.id = `weather-btn-${key}`;
            btn.innerText = `[F${i + 1}] ${p.label}`;
            btn.dataset.weatherKey = key;
            btn.style.cssText = `
                background: rgba(0, 0, 0, 0.55);
                color: #aaddff;
                border: 1px solid rgba(100, 160, 220, 0.4);
                border-radius: 4px;
                padding: 5px 10px;
                font-size: 12px;
                font-family: 'Courier New', monospace;
                cursor: pointer;
                transition: all 0.25s ease;
                letter-spacing: 0.5px;
                backdrop-filter: blur(4px);
            `;
            btn.addEventListener('mouseenter', () => {
                if (btn.dataset.weatherKey !== _currentKey) {
                    btn.style.background = 'rgba(40, 100, 180, 0.6)';
                    btn.style.color = '#ffffff';
                }
            });
            btn.addEventListener('mouseleave', () => {
                if (btn.dataset.weatherKey !== _currentKey) {
                    btn.style.background = 'rgba(0, 0, 0, 0.55)';
                    btn.style.color = '#aaddff';
                }
            });
            btn.addEventListener('click', () => {
                setWeather(key, 5.0);
            });
            panel.appendChild(btn);
            _panelBtns[key] = btn;
        });

        if (lobbyWeatherContainer) {
            lobbyWeatherContainer.appendChild(panel);
        } else {
            const gameLayer = document.getElementById('game-layer') || document.body;
            gameLayer.appendChild(panel);
        }
    }

    function _updatePanelSelection(key) {
        Object.entries(_panelBtns).forEach(([k, btn]) => {
            if (k === key) {
                btn.style.background = 'rgba(30, 130, 220, 0.8)';
                btn.style.color = '#ffffff';
                btn.style.borderColor = 'rgba(100, 200, 255, 0.9)';
                btn.style.boxShadow = '0 0 10px rgba(80, 180, 255, 0.5)';
            } else {
                btn.style.background = 'rgba(0, 0, 0, 0.55)';
                btn.style.color = '#aaddff';
                btn.style.borderColor = 'rgba(100, 160, 220, 0.4)';
                btn.style.boxShadow = 'none';
            }
        });
    }

    // ================================================================
    // HUD 날씨 상태 텍스트 (우상단 FPS 옆)
    // ================================================================
    let _weatherHudEl = null;

    function _updateWeatherHUD() {
        if (!_weatherHudEl) {
            _weatherHudEl = document.createElement('div');
            _weatherHudEl.id = 'weather-hud';
            _weatherHudEl.style.cssText = `
                position: absolute;
                top: 46px;
                right: 10px;
                color: #aaddff;
                font-family: 'Courier New', monospace;
                font-size: 13px;
                font-weight: bold;
                background: rgba(0,0,0,0.5);
                padding: 3px 8px;
                border-radius: 4px;
                z-index: 9999;
                pointer-events: none;
                letter-spacing: 0.5px;
            `;
            (document.getElementById('game-layer') || document.body).appendChild(_weatherHudEl);
        }
        const label = getCurrentLabel();
        const transitioning = _isTransitioning ? ' ···' : '';
        _weatherHudEl.innerText = `WX: ${label}${transitioning}`;
    }

    return {
        init,
        update,
        setWeather,
        getCurrentKey,
        getCurrentLabel,
        PRESETS,
        PRESET_ORDER,
    };
})();

window.WeatherSystem = WeatherSystem;

// lightningSystem.js
// Lightning-VFX-main (Vite+ESM) → 바닐라 JS 변환판
// Three.js r128 CDN 버전과 호환 (mergeGeometries 직접 구현 포함)
// 외부 의존성: THREE (전역) 만 필요
// 사용법:
//   window.LightningSystem.init(scene);
//   window.LightningSystem.spawnAt(x, y, z);   // y = 낙뢰 높이 (시작점)
//   window.LightningSystem.update(delta);        // 게임루프에서 매 프레임 호출
//   window.LightningSystem.clear();              // 활성 번개 전부 제거

const LightningSystem = (() => {

    // ================================================================
    // GLSL 셰이더 (인라인 문자열)
    // ================================================================
    const BOLT_VS = /* glsl */`
        attribute float aRatio;
        attribute vec3  aDirection;
        attribute float aSide;
        attribute float aStrikeOffset;
        attribute float aThickness;
        attribute float aAlpha;
        attribute vec3  aColor;

        uniform float uTime;
        uniform float uStrikeDur;
        uniform float uFadeDur;
        uniform float uSpread;

        varying float vRatio;
        varying float vStrikeOffset;
        varying float vAlpha;
        varying vec3  vColor;

        void main() {
            float fadeT = clamp((uTime - uStrikeDur) / uFadeDur, 0.0, 1.0);
            vec3 pos = position;
            pos.xz += pos.xz * pow(fadeT, 2.0) * uSpread;

            vec4 worldPos = modelMatrix * vec4(pos, 1.0);
            vec3 toCamera  = normalize(cameraPosition - worldPos.xyz);
            vec4 nextWorld = modelMatrix * vec4(position + aDirection, 1.0);
            vec3 tangent   = normalize(cross(normalize(nextWorld.xyz - worldPos.xyz), toCamera));
            worldPos.xyz  += tangent * aSide * aThickness;

            vRatio        = aRatio;
            vStrikeOffset = aStrikeOffset;
            vAlpha        = aAlpha;
            vColor        = aColor;
            gl_Position   = projectionMatrix * viewMatrix * worldPos;
        }
    `;

    const BOLT_FS = /* glsl */`
        uniform float uTime;
        uniform float uStrikeDur;
        uniform float uFadeDur;

        varying float vRatio;
        varying float vStrikeOffset;
        varying float vAlpha;
        varying vec3  vColor;

        void main() {
            float strikeT = clamp(uTime / uStrikeDur, 0.0, 1.0);
            float fadeT   = clamp((uTime - uStrikeDur) / uFadeDur, 0.0, 1.0);

            float window = max(1.0 - vStrikeOffset, 0.001);
            float localT = clamp((strikeT - vStrikeOffset) / window, 0.0, 1.0);

            float reveal = step(vRatio, localT);
            float alpha  = reveal * (1.0 - fadeT * fadeT) * vAlpha;

            gl_FragColor = vec4(vColor, alpha);
        }
    `;

    const CRACK_VS = /* glsl */`
        attribute float aRatio;
        attribute float aSide;
        attribute float aAlpha;
        attribute float aFadeMult;

        varying float vRatio;
        varying float vSide;
        varying float vAlpha;
        varying float vFadeMult;

        void main() {
            vRatio    = aRatio;
            vSide     = aSide;
            vAlpha    = aAlpha;
            vFadeMult = aFadeMult;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `;

    const CRACK_FS = /* glsl */`
        uniform float uTime;
        uniform float uDelay;
        uniform float uRevealDur;
        uniform float uFadeDur;
        uniform vec3  uCoreColor;
        uniform vec3  uMidColor;
        uniform vec3  uEdgeColor;

        varying float vRatio;
        varying float vSide;
        varying float vAlpha;
        varying float vFadeMult;

        void main() {
            float t       = max(0.0, uTime - uDelay);
            float revealT = clamp(t / uRevealDur, 0.0, 1.0);
            float fadeT   = clamp((t - uRevealDur) / (uFadeDur * vFadeMult), 0.0, 1.0);

            float reveal = step(vRatio, revealT);
            float edge   = 1.0 - abs(vSide);
            float core   = smoothstep(0.0, 0.25, edge);
            float glow   = smoothstep(0.0, 0.85, edge);

            vec3 col   = mix(uEdgeColor, mix(uMidColor, uCoreColor, core), glow);
            float fade = 1.0 - fadeT * fadeT;

            float alpha = reveal * glow * fade * vAlpha;
            gl_FragColor = vec4(col, alpha);
        }
    `;

    const GROUND_FLASH_VS = /* glsl */`
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `;

    const GROUND_FLASH_FS = /* glsl */`
        uniform float uTime;
        uniform float uDur;
        uniform vec3  uColor;
        uniform float uIntensity;
        uniform float uRadialPow;
        uniform float uFadePow;

        varying vec2 vUv;

        void main() {
            float t      = clamp(uTime / uDur, 0.0, 1.0);
            float radial = max(0.0, 1.0 - length(vUv - vec2(0.5)) * 2.0);
            float alpha  = pow(radial, uRadialPow) * pow(1.0 - t, uFadePow) * uIntensity;
            gl_FragColor = vec4(uColor, alpha);
        }
    `;

    const SPARKS_VS = /* glsl */`
        attribute vec3  aVelocity;
        attribute float aLifetime;
        attribute float aSeed;

        uniform float uTime;
        uniform float uDelay;
        uniform float uSize;
        uniform float uGravity;
        uniform float uDepthScale;

        varying float vAge;
        varying float vSeed;

        void main() {
            float t  = max(0.0, uTime - uDelay);
            vAge     = clamp(t / aLifetime, 0.0, 1.5);
            vSeed    = aSeed;

            vec3 p   = position + aVelocity * t + vec3(0.0, -uGravity * t * t, 0.0);
            p.y      = max(p.y, 0.0);

            vec4 mv  = modelViewMatrix * vec4(p, 1.0);
            gl_PointSize = uSize * max(0.0, 1.0 - vAge * 0.8) * (uDepthScale / -mv.z);
            gl_Position  = projectionMatrix * mv;
        }
    `;

    const SPARKS_FS = /* glsl */`
        varying float vAge;
        varying float vSeed;

        void main() {
            vec2  uv   = gl_PointCoord - 0.5;
            float r    = length(uv);
            if (r > 0.5) discard;

            float core = max(0.0, 1.0 - r * 5.0);
            float glow = max(0.0, 1.0 - r * 2.2);

            vec3 hot  = vec3(1.00, 0.92, 0.55);
            vec3 mid  = vec3(1.00, 0.42, 0.05);
            vec3 cool = vec3(0.70, 0.10, 0.00);

            vec3 col   = mix(cool, mix(mid, hot, core), glow);
            float fade = max(0.0, 1.0 - vAge * vAge);
            gl_FragColor = vec4(col, (core * 1.0 + glow * 0.45) * fade);
        }
    `;

    const SHOCKWAVE_VS = /* glsl */`
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `;

    const SHOCKWAVE_FS = /* glsl */`
        uniform float uTime;
        uniform float uDelay;
        uniform float uDur;
        uniform float uAlphaMult;
        uniform vec3  uColorA;
        uniform vec3  uColorB;

        varying vec2 vUv;

        void main() {
            float t   = clamp((uTime - uDelay) / uDur, 0.0, 1.0);
            vec2 uvc  = vUv - 0.5;
            float r   = length(uvc) * 2.0;
            float ring = abs(r - t);
            float alpha = smoothstep(0.12, 0.0, ring) * (1.0 - t) * (1.0 - t) * uAlphaMult;

            vec3 col = mix(uColorA, uColorB, t);
            gl_FragColor = vec4(col, alpha);
        }
    `;

    // ================================================================
    // mergeGeometries 직접 구현 (THREE.BufferGeometryUtils 대체)
    // Three.js r128 CDN에는 BufferGeometryUtils가 없으므로 직접 구현
    // ================================================================
    function mergeGeometries(geos) {
        // 각 attribute 이름 수집
        const attrNames = Object.keys(geos[0].attributes);
        const hasIndex  = geos.some(g => g.index !== null);

        const mergedAttrs = {};
        for (const name of attrNames) {
            const itemSize = geos[0].attributes[name].itemSize;
            let totalCount = 0;
            for (const g of geos) totalCount += g.attributes[name].count;
            mergedAttrs[name] = {
                array:    new Float32Array(totalCount * itemSize),
                itemSize: itemSize,
                offset:   0,
            };
        }

        let indexOffset = 0;
        let totalIndexCount = 0;
        if (hasIndex) {
            for (const g of geos) {
                if (g.index) totalIndexCount += g.index.count;
            }
        }
        const indexArray = hasIndex ? new Uint32Array(totalIndexCount) : null;
        let indexWriteOffset = 0;
        let vertexOffset = 0;

        for (const g of geos) {
            const vertCount = g.attributes[attrNames[0]].count;

            for (const name of attrNames) {
                const src  = g.attributes[name];
                const dst  = mergedAttrs[name];
                const data = src.array;
                dst.array.set(data, dst.offset);
                dst.offset += data.length;
            }

            if (hasIndex && g.index) {
                const srcIdx = g.index.array;
                for (let i = 0; i < srcIdx.length; i++) {
                    indexArray[indexWriteOffset++] = srcIdx[i] + vertexOffset;
                }
            }

            vertexOffset += vertCount;
        }

        const merged = new THREE.BufferGeometry();
        for (const name of attrNames) {
            const d = mergedAttrs[name];
            merged.setAttribute(name, new THREE.BufferAttribute(d.array, d.itemSize));
        }
        if (indexArray) {
            merged.setIndex(new THREE.BufferAttribute(indexArray, 1));
        }
        return merged;
    }

    // ================================================================
    // 기본 파라미터 (오리지널 LightningApp.getDefaultParams() 그대로)
    // ================================================================
    const DEFAULT_PARAMS = {
        // Bolt shader
        strikeDur: 0.15,
        fadeDur:   1.0,
        tailExtra: 0.15,
        impactExtra: 0.5,
        boltSpread: 0.01,

        layers: [
            { color: '#4764e1', thick: 0.34, alpha: 0.18 },
            { color: '#1072bd', thick: 0.13, alpha: 0.55 },
            { color: '#aceeff', thick: 0.038, alpha: 1.0  },
        ],

        // Fractal / branch
        mainFractalDepth:  6,
        altFractalDepth:   4,
        altRoughnessMult:  0.85,
        roughnessMin:      0.42,
        roughnessMax:      0.58,
        spawnTopXZJitter:  1.5,

        branchCountMin: 1, branchCountMax: 3,
        branchFFMin: 0.12, branchFFMax: 0.67,
        branchLengthFactorMin: 0.22, branchLengthFactorMax: 0.54,
        branchDropFactorMin:   0.55, branchDropFactorMax:   0.9,
        branchEndYJitter:  3,
        branchMinYClampOffset: 0.5,
        branchXZScaleX: 0.65, branchXZScaleZ: 0.45,
        mainStrandThickMult: 1.5, mainStrandAlphaMult: 1.0,
        altStrandThickMult:  0.55, altStrandAlphaMult:  0.75,

        // Crack
        crackReveal:  0.22,
        crackFade:    2.8,
        crackCoreColor: '#1086c1',
        crackMidColor:  '#1088bc',
        crackEdgeColor: '#4791e1',
        crackCountMin: 4, crackCountMax: 7,
        crackBranchDepth:  2,
        crackBranchChance: 0.72,
        crackRoughness:    0.725,
        crackOriginYOffset: 0.025,
        crackAngleJitter:   0.8,
        crackLengthMin: 0.4, crackLengthMax: 3.9,
        crackBranchAngleOffsetMin: 0.55,  crackBranchAngleOffsetMax: 1.45,
        crackBranchLengthScaleMin: 0.3,   crackBranchLengthScaleMax: 0.7,
        crackBranchStepsMin: 5, crackBranchStepsMax: 9,
        crackThinHW: 0.025, crackThinAlpha: 0.55,
        crackThickHW: 0.08, crackThickAlpha: 1.0,
        crackThickFadeMult: 0.6,

        // Sparks
        sparkCountMin: 30, sparkCountMax: 40,
        sparkSize: 2.5, sparkGravity: 9.5, sparkDepthScale: 160,
        sparkPosJitter: 0.3, sparkPosYOffset: 0.1,
        sparkVelocitySpdMin: 1, sparkVelocitySpdMax: 6,
        sparkVelocityUpMin:  1, sparkVelocityUpMax:  7,
        sparkLifeMin: 0.3, sparkLifeMax: 1.3,

        // Shockwave
        shockwaveDur: 0.55, shockwaveAlphaMult: 0.4,
        shockwaveColorA: '#ffb060', shockwaveColorB: '#66b3ff',

        // Debris
        debrisCountMin: 3, debrisCountMax: 8,
        debrisBaseYOffset: 0.15,
        debrisLifetimeMin: 1.0, debrisLifetimeMax: 2.2,
        debrisGravity: 18,
        debrisFadePower: 2, debrisFadeMult: 0.85,
        debrisVelocitySpdMin: 1, debrisVelocitySpdMax: 3.5,
        debrisVelocityUpMin:  1, debrisVelocityUpMax:  4,
        debrisRotationScale:  8,
        debrisWMin: 0.08, debrisWMax: 0.33,
        debrisHMin: 0.04, debrisHMax: 0.16,
        debrisBlueChance: 0.65,
        debrisBlueHueMin: 0.6, debrisBlueHueMax: 0.68,
        debrisBlueSat: 0.6,
        debrisBlueLightMin: 0.55, debrisBlueLightMax: 0.8,
        debrisWarmRMin: 0.3, debrisWarmRMax: 0.6,
        debrisWarmGMin: 0.3, debrisWarmGMax: 0.5,
        debrisWarmBMin: 0.3, debrisWarmBMax: 0.5,

        // Ground flash
        groundFlashDur: 0.45, groundFlashIntensity: 0.35,
        groundFlashRadialPow: 1.2, groundFlashFadePow: 1.5,
        groundFlashSize: 5, groundFlashColor: '#4db2ff',
    };

    // ================================================================
    // 내부 상태
    // ================================================================
    let _scene       = null;
    let _params      = Object.assign({}, DEFAULT_PARAMS);
    let _activeBolts = [];

    // 공유 geometry (debris용)
    let _debrisSharedGeo = null;
    const _dummy     = new THREE.Object3D();
    const _fadeColor = new THREE.Color();

    // ================================================================
    // 기하학 빌더 (bolt)
    // ================================================================
    function buildBoltGeo(points, strikeOffset, thickness, alpha, color) {
        const segs = points.length - 1;
        const vc   = segs * 4;
        const pos  = new Float32Array(vc * 3);
        const ratios = new Float32Array(vc);
        const dirs   = new Float32Array(vc * 3);
        const sides  = new Float32Array(vc);
        const sOff   = new Float32Array(vc).fill(strikeOffset);
        const thick  = new Float32Array(vc).fill(thickness);
        const alph   = new Float32Array(vc).fill(alpha);
        const col    = new Float32Array(vc * 3);
        const idx    = [];

        for (let i = 0; i < segs; i++) {
            const a   = points[i];
            const b   = points[i + 1];
            const rA  = i / (points.length - 1);
            const rB  = (i + 1) / (points.length - 1);
            const dir = new THREE.Vector3().subVectors(b, a).normalize();
            const vi  = i * 4;
            const verts = [
                [a, rA, -0.5],
                [a, rA,  0.5],
                [b, rB, -0.5],
                [b, rB,  0.5],
            ];

            verts.forEach(([p, r, s], j) => {
                const k = (vi + j) * 3;
                pos[k]     = p.x; pos[k + 1] = p.y; pos[k + 2] = p.z;
                ratios[vi + j] = r;
                dirs[k]    = dir.x; dirs[k + 1] = dir.y; dirs[k + 2] = dir.z;
                sides[vi + j] = s;
                col[k] = color.r; col[k + 1] = color.g; col[k + 2] = color.b;
            });
            idx.push(vi, vi + 1, vi + 2, vi + 1, vi + 3, vi + 2);
        }

        const g = new THREE.BufferGeometry();
        g.setAttribute('position',       new THREE.BufferAttribute(pos,    3));
        g.setAttribute('aRatio',         new THREE.BufferAttribute(ratios, 1));
        g.setAttribute('aDirection',     new THREE.BufferAttribute(dirs,   3));
        g.setAttribute('aSide',          new THREE.BufferAttribute(sides,  1));
        g.setAttribute('aStrikeOffset',  new THREE.BufferAttribute(sOff,   1));
        g.setAttribute('aThickness',     new THREE.BufferAttribute(thick,  1));
        g.setAttribute('aAlpha',         new THREE.BufferAttribute(alph,   1));
        g.setAttribute('aColor',         new THREE.BufferAttribute(col,    3));
        g.setIndex(idx);
        return g;
    }

    function fractalPath(start, end, depth, roughness) {
        if (depth <= 0) return [start.clone(), end.clone()];
        const mid  = start.clone().lerp(end, 0.45 + Math.random() * 0.1);
        const dist = start.distanceTo(end);
        mid.x += (Math.random() - 0.5) * dist * roughness;
        mid.z += (Math.random() - 0.5) * dist * roughness;
        const L = fractalPath(start, mid, depth - 1, roughness * 0.88);
        const R = fractalPath(mid,   end,  depth - 1, roughness * 0.88);
        return [...L.slice(0, -1), ...R];
    }

    // ================================================================
    // VFX 생성 함수들
    // ================================================================
    function createBoltMesh(strandDefs) {
        const p    = _params;
        const geos = [];
        for (const { points, strikeOffset, thickMult, alphaMult } of strandDefs) {
            for (const layer of p.layers) {
                geos.push(buildBoltGeo(
                    points,
                    strikeOffset,
                    layer.thick * thickMult,
                    layer.alpha * alphaMult,
                    new THREE.Color(layer.color),
                ));
            }
        }
        const merged = mergeGeometries(geos);
        geos.forEach(g => g.dispose());

        const material = new THREE.ShaderMaterial({
            vertexShader:   BOLT_VS,
            fragmentShader: BOLT_FS,
            uniforms: {
                uTime:      { value: 0 },
                uStrikeDur: { value: p.strikeDur },
                uFadeDur:   { value: p.fadeDur },
                uSpread:    { value: p.boltSpread },
            },
            transparent: true,
            blending:    THREE.AdditiveBlending,
            depthWrite:  false,
            side:        THREE.DoubleSide,
        });

        const mesh = new THREE.Mesh(merged, material);
        mesh.renderOrder = 2;
        _scene.add(mesh);
        return { mesh, material, geometry: merged };
    }

    function createGroundFlash(cx, cz, groundY) {
        const p   = _params;
        const mat = new THREE.ShaderMaterial({
            vertexShader:   GROUND_FLASH_VS,
            fragmentShader: GROUND_FLASH_FS,
            uniforms: {
                uTime:         { value: -0.13 },
                uDur:          { value: p.groundFlashDur },
                uColor:        { value: new THREE.Color(p.groundFlashColor) },
                uIntensity:    { value: p.groundFlashIntensity },
                uRadialPow:    { value: p.groundFlashRadialPow },
                uFadePow:      { value: p.groundFlashFadePow },
            },
            transparent: true,
            blending:    THREE.AdditiveBlending,
            depthWrite:  false,
        });

        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(p.groundFlashSize, p.groundFlashSize), mat);
        mesh.position.set(cx, groundY + 0.2, cz);
        mesh.rotation.x = -Math.PI / 2;
        mesh.renderOrder = 2;
        _scene.add(mesh);
        return { mesh, mat };
    }

    function buildCrackGeo(points, hw, passAlpha, fadeDurMult) {
        const segs = points.length - 1;
        if (segs < 1) return null;
        const vc      = segs * 4;
        const pos     = new Float32Array(vc * 3);
        const ratios  = new Float32Array(vc);
        const sides   = new Float32Array(vc);
        const alpha   = new Float32Array(vc).fill(passAlpha);
        const fadeMul = new Float32Array(vc).fill(fadeDurMult);
        const idx     = [];

        for (let i = 0; i < segs; i++) {
            const a  = points[i];
            const b  = points[i + 1];
            const rA = i / (points.length - 1);
            const rB = (i + 1) / (points.length - 1);
            const dx = b.x - a.x;
            const dz = b.z - a.z;
            const len = Math.sqrt(dx * dx + dz * dz) || 1;
            const px = (-dz / len) * hw;
            const pz = (dx  / len) * hw;
            const vi = i * 4;

            [
                { p: a, r: rA, s: -1, ox: -px, oz: -pz },
                { p: a, r: rA, s:  1, ox:  px, oz:  pz },
                { p: b, r: rB, s: -1, ox: -px, oz: -pz },
                { p: b, r: rB, s:  1, ox:  px, oz:  pz },
            ].forEach(({ p: pt, r, s, ox, oz }, j) => {
                const k = (vi + j) * 3;
                pos[k] = pt.x + ox; pos[k + 1] = pt.y; pos[k + 2] = pt.z + oz;
                ratios[vi + j] = r;
                sides[vi + j]  = s;
            });
            idx.push(vi, vi + 1, vi + 2, vi + 1, vi + 3, vi + 2);
        }

        const g = new THREE.BufferGeometry();
        g.setAttribute('position',  new THREE.BufferAttribute(pos,     3));
        g.setAttribute('aRatio',    new THREE.BufferAttribute(ratios,  1));
        g.setAttribute('aSide',     new THREE.BufferAttribute(sides,   1));
        g.setAttribute('aAlpha',    new THREE.BufferAttribute(alpha,   1));
        g.setAttribute('aFadeMult', new THREE.BufferAttribute(fadeMul, 1));
        g.setIndex(idx);
        return g;
    }

    function generateCrackBranches(origin, angle, length, depth, roughness, all) {
        const p = _params;
        const steps = p.crackBranchStepsMin +
            Math.floor(Math.random() * (p.crackBranchStepsMax - p.crackBranchStepsMin + 1));
        const points = [origin.clone()];
        let cur = origin.clone();

        for (let i = 0; i < steps; i++) {
            angle += (Math.random() - 0.5) * roughness;
            const step = (length / steps) * (0.6 + Math.random() * 0.8);
            cur = cur.clone();
            cur.x += Math.cos(angle) * step;
            cur.z += Math.sin(angle) * step;
            cur.y  = origin.y;
            points.push(cur.clone());
        }
        all.push(points);

        if (depth > 0 && Math.random() < p.crackBranchChance) {
            const fi   = 1 + Math.floor(Math.random() * (points.length - 2));
            const sign = Math.random() > 0.5 ? 1 : -1;
            generateCrackBranches(
                points[fi].clone(),
                angle + sign * (p.crackBranchAngleOffsetMin + Math.random() * (p.crackBranchAngleOffsetMax - p.crackBranchAngleOffsetMin)),
                length * (p.crackBranchLengthScaleMin + Math.random() * (p.crackBranchLengthScaleMax - p.crackBranchLengthScaleMin)),
                depth - 1,
                roughness * 0.9,
                all,
            );
        }
    }

    function spawnCracks(cx, cz, groundY, delay) {
        const p    = _params;
        const geos = [];
        const n    = p.crackCountMin + Math.floor(Math.random() * (p.crackCountMax - p.crackCountMin + 1));

        for (let m = 0; m < n; m++) {
            const angle  = (m / n) * Math.PI * 2 + (Math.random() - 0.5) * p.crackAngleJitter;
            const length = p.crackLengthMin + Math.random() * (p.crackLengthMax - p.crackLengthMin);
            const branches = [];
            generateCrackBranches(
                new THREE.Vector3(cx, groundY + p.crackOriginYOffset, cz),
                angle, length, p.crackBranchDepth, p.crackRoughness, branches,
            );

            for (const pts of branches) {
                const gWide   = buildCrackGeo(pts, p.crackThinHW,  p.crackThinAlpha,  1.0);
                if (gWide)   geos.push(gWide);
                const gNarrow = buildCrackGeo(pts, p.crackThickHW, p.crackThickAlpha, p.crackThickFadeMult);
                if (gNarrow) geos.push(gNarrow);
            }
        }

        if (geos.length === 0) return null;
        const merged = mergeGeometries(geos);
        geos.forEach(g => g.dispose());

        const material = new THREE.ShaderMaterial({
            vertexShader:   CRACK_VS,
            fragmentShader: CRACK_FS,
            uniforms: {
                uTime:      { value: 0 },
                uDelay:     { value: delay },
                uRevealDur: { value: p.crackReveal },
                uFadeDur:   { value: p.crackFade },
                uCoreColor: { value: new THREE.Color(p.crackCoreColor) },
                uMidColor:  { value: new THREE.Color(p.crackMidColor) },
                uEdgeColor: { value: new THREE.Color(p.crackEdgeColor) },
            },
            transparent: true,
            blending:    THREE.AdditiveBlending,
            depthWrite:  false,
            side:        THREE.DoubleSide,
        });

        const mesh = new THREE.Mesh(merged, material);
        mesh.renderOrder = 1;
        _scene.add(mesh);
        return { mesh, material, geometry: merged };
    }

    function spawnSparks(cx, cz, groundY, delay) {
        const p     = _params;
        const count = p.sparkCountMin + Math.floor(Math.random() * (p.sparkCountMax - p.sparkCountMin + 1));
        const pos   = new Float32Array(count * 3);
        const vel   = new Float32Array(count * 3);
        const life  = new Float32Array(count);
        const seeds = new Float32Array(count);

        for (let i = 0; i < count; i++) {
            pos[i * 3]     = cx + (Math.random() - 0.5) * p.sparkPosJitter;
            pos[i * 3 + 1] = groundY + p.sparkPosYOffset;
            pos[i * 3 + 2] = cz + (Math.random() - 0.5) * p.sparkPosJitter;
            const a   = Math.random() * Math.PI * 2;
            const spd = p.sparkVelocitySpdMin + Math.random() * (p.sparkVelocitySpdMax - p.sparkVelocitySpdMin);
            const up  = p.sparkVelocityUpMin  + Math.random() * (p.sparkVelocityUpMax  - p.sparkVelocityUpMin);
            vel[i * 3]     = Math.cos(a) * spd;
            vel[i * 3 + 1] = up;
            vel[i * 3 + 2] = Math.sin(a) * spd;
            life[i]  = p.sparkLifeMin + Math.random() * (p.sparkLifeMax - p.sparkLifeMin);
            seeds[i] = Math.random();
        }

        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position',  new THREE.BufferAttribute(pos,   3));
        geo.setAttribute('aVelocity', new THREE.BufferAttribute(vel,   3));
        geo.setAttribute('aLifetime', new THREE.BufferAttribute(life,  1));
        geo.setAttribute('aSeed',     new THREE.BufferAttribute(seeds, 1));

        const mat = new THREE.ShaderMaterial({
            vertexShader:   SPARKS_VS,
            fragmentShader: SPARKS_FS,
            uniforms: {
                uTime:       { value: 0 },
                uDelay:      { value: delay },
                uSize:       { value: p.sparkSize },
                uGravity:    { value: p.sparkGravity },
                uDepthScale: { value: p.sparkDepthScale },
            },
            transparent: true,
            blending:    THREE.AdditiveBlending,
            depthWrite:  false,
        });

        const mesh = new THREE.Points(geo, mat);
        mesh.renderOrder = 3;
        _scene.add(mesh);
        return { mesh, mat, geo };
    }

    function spawnShockwave(cx, cz, groundY, delay) {
        const p   = _params;
        const mat = new THREE.ShaderMaterial({
            vertexShader:   SHOCKWAVE_VS,
            fragmentShader: SHOCKWAVE_FS,
            uniforms: {
                uTime:       { value: 0 },
                uDelay:      { value: delay },
                uDur:        { value: p.shockwaveDur },
                uAlphaMult:  { value: p.shockwaveAlphaMult },
                uColorA:     { value: new THREE.Color(p.shockwaveColorA) },
                uColorB:     { value: new THREE.Color(p.shockwaveColorB) },
            },
            transparent: true,
            blending:    THREE.AdditiveBlending,
            depthWrite:  false,
        });

        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), mat);
        mesh.position.set(cx, groundY + 0.06, cz);
        mesh.rotation.x = -Math.PI / 2;
        mesh.renderOrder = 1;
        _scene.add(mesh);
        return { mesh, mat };
    }

    function pickDebrisColor() {
        const p = _params;
        if (Math.random() < p.debrisBlueChance) {
            const hue   = p.debrisBlueHueMin + Math.random() * (p.debrisBlueHueMax - p.debrisBlueHueMin);
            const sat   = p.debrisBlueSat;
            const light = p.debrisBlueLightMin + Math.random() * (p.debrisBlueLightMax - p.debrisBlueLightMin);
            return new THREE.Color().setHSL(hue, sat, light);
        }
        const r = p.debrisWarmRMin + Math.random() * (p.debrisWarmRMax - p.debrisWarmRMin);
        const g = p.debrisWarmGMin + Math.random() * (p.debrisWarmGMax - p.debrisWarmGMin);
        const b = p.debrisWarmBMin + Math.random() * (p.debrisWarmBMax - p.debrisWarmBMin);
        return new THREE.Color(r, g, b);
    }

    function spawnDebris(cx, cz, groundY) {
        const p     = _params;
        const count = p.debrisCountMin + Math.floor(Math.random() * (p.debrisCountMax - p.debrisCountMin + 1));

        const material = new THREE.MeshBasicMaterial({
            vertexColors: true,
            transparent:  true,
            blending:     THREE.AdditiveBlending,
            depthWrite:   false,
            side:         THREE.DoubleSide,
        });

        const instanced = new THREE.InstancedMesh(_debrisSharedGeo, material, count);
        instanced.renderOrder = 2;
        _scene.add(instanced);

        const shards = [];
        for (let i = 0; i < count; i++) {
            const sx = p.debrisWMin + Math.random() * (p.debrisWMax - p.debrisWMin);
            const sy = p.debrisHMin + Math.random() * (p.debrisHMax - p.debrisHMin);

            _dummy.position.set(cx, groundY + p.debrisBaseYOffset, cz);
            _dummy.rotation.set(0, 0, 0);
            _dummy.scale.set(sx, sy, 1);
            _dummy.updateMatrix();
            instanced.setMatrixAt(i, _dummy.matrix);

            const color = pickDebrisColor();
            instanced.setColorAt(i, color);

            const a   = Math.random() * Math.PI * 2;
            const spd = p.debrisVelocitySpdMin + Math.random() * (p.debrisVelocitySpdMax - p.debrisVelocitySpdMin);
            const up  = p.debrisVelocityUpMin  + Math.random() * (p.debrisVelocityUpMax  - p.debrisVelocityUpMin);

            shards.push({
                index: i,
                baseScaleX: sx, baseScaleY: sy,
                baseColor: color.clone(),
                pos: new THREE.Vector3(cx, groundY + p.debrisBaseYOffset, cz),
                rotEuler: new THREE.Euler(),
                vx: Math.cos(a) * spd, vy: up, vz: Math.sin(a) * spd,
                rx: (Math.random() - 0.5) * p.debrisRotationScale,
                ry: (Math.random() - 0.5) * p.debrisRotationScale,
                rz: (Math.random() - 0.5) * p.debrisRotationScale,
                lifetime: p.debrisLifetimeMin + Math.random() * (p.debrisLifetimeMax - p.debrisLifetimeMin),
                active: false, t: 0, groundY,
            });
        }

        instanced.instanceMatrix.needsUpdate = true;
        instanced.instanceColor.needsUpdate  = true;
        return { instanced, material, shards };
    }

    // ================================================================
    // 낙뢰 1회 생성
    // ================================================================
    function spawnAt(cx, groundY, cz) {
        if (!_scene) { console.warn('[LightningSystem] init() 먼저 호출하세요.'); return; }

        const p = _params;
        const roughness = p.roughnessMin + Math.random() * (p.roughnessMax - p.roughnessMin);
        const height    = groundY; // groundY 위에서 번개가 시작됨 (호출자가 결정)

        // 번개 시작점 (위)과 끝점 (착탄 지점)
        const top    = new THREE.Vector3(
            cx + (Math.random() - 0.5) * p.spawnTopXZJitter,
            groundY,
            cz + (Math.random() - 0.5) * p.spawnTopXZJitter,
        );
        const bottom = new THREE.Vector3(cx, 0, cz); // 지표면 y=0
        const mainPoints = fractalPath(top, bottom, p.mainFractalDepth, roughness);

        const strandDefs = [{
            points:     mainPoints,
            strikeOffset: 0,
            thickMult:  p.mainStrandThickMult,
            alphaMult:  p.mainStrandAlphaMult,
        }];

        const bc = p.branchCountMin + Math.floor(Math.random() * (p.branchCountMax - p.branchCountMin + 1));
        for (let b = 0; b < bc; b++) {
            const ff = p.branchFFMin + Math.random() * (p.branchFFMax - p.branchFFMin);
            const fi = Math.floor(ff * (mainPoints.length - 1));
            const fp = mainPoints[fi].clone();
            const ba = Math.random() * Math.PI * 2;
            const bl = (1 - ff) * (groundY)
                * (p.branchLengthFactorMin + Math.random() * (p.branchLengthFactorMax - p.branchLengthFactorMin));

            const be = fp.clone();
            be.x += Math.cos(ba) * bl * p.branchXZScaleX;
            be.y -= bl * (p.branchDropFactorMin + Math.random() * (p.branchDropFactorMax - p.branchDropFactorMin));
            be.z += Math.sin(ba) * bl * p.branchXZScaleZ;
            be.y  = Math.max(be.y, 0 + p.branchMinYClampOffset + Math.random() * p.branchEndYJitter);

            const altPoints = fractalPath(fp, be, p.altFractalDepth, roughness * p.altRoughnessMult);
            strandDefs.push({
                points:     altPoints,
                strikeOffset: ff,
                thickMult:  p.altStrandThickMult,
                alphaMult:  p.altStrandAlphaMult,
            });
        }

        const boltMesh  = createBoltMesh(strandDefs);
        const flash     = createGroundFlash(cx, cz, 0);
        const cracks    = spawnCracks(cx, cz, 0, p.strikeDur);
        const sparks    = spawnSparks(cx, cz, 0, p.strikeDur);
        const debris    = spawnDebris(cx, cz, 0);
        const shockwave = spawnShockwave(cx, cz, 0, p.strikeDur);

        const nowSec = performance.now() / 1000;
        _activeBolts.push({
            boltMesh, flash, cracks, sparks, debris, shockwave,
            startTime: nowSec,
            debrisStarted:   false,
            shakeTriggered:  false,
        });

        console.log(`[LightningSystem] ⚡ 낙뢰 발생 at (${cx.toFixed(1)}, ${groundY.toFixed(1)}, ${cz.toFixed(1)})`);
    }

    // ================================================================
    // 매 프레임 업데이트
    // ================================================================
    function update(delta) {
        if (!_scene) return;
        const p      = _params;
        const nowSec = performance.now() / 1000;
        const maxD   = Math.max(
            p.strikeDur + p.fadeDur + p.tailExtra,
            p.strikeDur + p.crackReveal + p.crackFade + p.impactExtra,
        );

        for (let i = _activeBolts.length - 1; i >= 0; i--) {
            const bolt    = _activeBolts[i];
            const elapsed = nowSec - bolt.startTime;

            // --- Bolt uniform 업데이트 ---
            bolt.boltMesh.material.uniforms.uTime.value      = elapsed;
            bolt.boltMesh.material.uniforms.uStrikeDur.value = p.strikeDur;
            bolt.boltMesh.material.uniforms.uFadeDur.value   = p.fadeDur;
            bolt.boltMesh.material.uniforms.uSpread.value    = p.boltSpread;

            // --- Ground flash ---
            bolt.flash.mat.uniforms.uTime.value      = elapsed - p.strikeDur;
            bolt.flash.mat.uniforms.uDur.value        = p.groundFlashDur;
            bolt.flash.mat.uniforms.uIntensity.value  = p.groundFlashIntensity;
            bolt.flash.mat.uniforms.uRadialPow.value  = p.groundFlashRadialPow;
            bolt.flash.mat.uniforms.uFadePow.value    = p.groundFlashFadePow;
            bolt.flash.mat.uniforms.uColor.value.set(p.groundFlashColor);

            // --- Cracks ---
            if (bolt.cracks) {
                bolt.cracks.material.uniforms.uTime.value      = elapsed;
                bolt.cracks.material.uniforms.uRevealDur.value = p.crackReveal;
                bolt.cracks.material.uniforms.uFadeDur.value   = p.crackFade;
                bolt.cracks.material.uniforms.uCoreColor.value.set(p.crackCoreColor);
                bolt.cracks.material.uniforms.uMidColor.value.set(p.crackMidColor);
                bolt.cracks.material.uniforms.uEdgeColor.value.set(p.crackEdgeColor);
            }

            // --- Sparks ---
            bolt.sparks.mat.uniforms.uTime.value       = elapsed;
            bolt.sparks.mat.uniforms.uSize.value        = p.sparkSize;
            bolt.sparks.mat.uniforms.uGravity.value     = p.sparkGravity;
            bolt.sparks.mat.uniforms.uDepthScale.value  = p.sparkDepthScale;

            // --- Shockwave ---
            bolt.shockwave.mat.uniforms.uTime.value      = elapsed;
            bolt.shockwave.mat.uniforms.uDur.value        = p.shockwaveDur;
            bolt.shockwave.mat.uniforms.uAlphaMult.value  = p.shockwaveAlphaMult;
            bolt.shockwave.mat.uniforms.uColorA.value.set(p.shockwaveColorA);
            bolt.shockwave.mat.uniforms.uColorB.value.set(p.shockwaveColorB);

            // --- Debris 물리 ---
            if (elapsed >= p.strikeDur && !bolt.debrisStarted) {
                bolt.debrisStarted = true;
                for (const s of bolt.debris.shards) s.active = true;
            }
            if (bolt.debrisStarted) {
                let matrixDirty = false;
                let colorDirty  = false;
                for (const s of bolt.debris.shards) {
                    if (!s.active) continue;
                    s.t += delta;
                    if (s.t >= s.lifetime) {
                        s.active = false;
                        _dummy.position.copy(s.pos);
                        _dummy.rotation.copy(s.rotEuler);
                        _dummy.scale.set(0, 0, 0);
                        _dummy.updateMatrix();
                        bolt.debris.instanced.setMatrixAt(s.index, _dummy.matrix);
                        matrixDirty = true;
                        continue;
                    }
                    s.pos.x += s.vx * delta;
                    s.pos.z += s.vz * delta;
                    s.vy    -= p.debrisGravity * delta;
                    s.pos.y  = Math.max(s.groundY + 0.05, s.pos.y + s.vy * delta);
                    s.rotEuler.x += s.rx * delta;
                    s.rotEuler.y += s.ry * delta;
                    s.rotEuler.z += s.rz * delta;
                    _dummy.position.copy(s.pos);
                    _dummy.rotation.copy(s.rotEuler);
                    _dummy.scale.set(s.baseScaleX, s.baseScaleY, 1);
                    _dummy.updateMatrix();
                    bolt.debris.instanced.setMatrixAt(s.index, _dummy.matrix);
                    matrixDirty = true;
                    const life = s.t / s.lifetime;
                    const fade = Math.max(0, (1 - Math.pow(life, p.debrisFadePower)) * p.debrisFadeMult);
                    _fadeColor.copy(s.baseColor).multiplyScalar(fade);
                    bolt.debris.instanced.setColorAt(s.index, _fadeColor);
                    colorDirty = true;
                }
                if (matrixDirty) bolt.debris.instanced.instanceMatrix.needsUpdate = true;
                if (colorDirty)  bolt.debris.instanced.instanceColor.needsUpdate  = true;
            }

            // --- 수명 만료 → GPU 리소스 해제 ---
            if (elapsed > maxD) {
                _scene.remove(bolt.boltMesh.mesh);
                bolt.boltMesh.material.dispose();
                bolt.boltMesh.geometry.dispose();

                _scene.remove(bolt.flash.mesh);
                bolt.flash.mat.dispose();

                if (bolt.cracks) {
                    _scene.remove(bolt.cracks.mesh);
                    bolt.cracks.material.dispose();
                    bolt.cracks.geometry.dispose();
                }
                if (bolt.sparks) {
                    _scene.remove(bolt.sparks.mesh);
                    bolt.sparks.mat.dispose();
                    bolt.sparks.geo.dispose();
                }
                if (bolt.shockwave) {
                    _scene.remove(bolt.shockwave.mesh);
                    bolt.shockwave.mat.dispose();
                }
                _scene.remove(bolt.debris.instanced);
                bolt.debris.material.dispose();
                // _debrisSharedGeo는 공유 자원이므로 여기서 dispose 안 함

                _activeBolts.splice(i, 1);
            }
        }
    }

    // ================================================================
    // 공개 API
    // ================================================================
    function init(scene, customParams) {
        _scene = scene;
        if (customParams) Object.assign(_params, customParams);

        // 공유 debris geometry 초기화
        _debrisSharedGeo = new THREE.PlaneGeometry(1, 1);

        console.log('[LightningSystem] ⚡ Initialized (Vanilla JS / Three.js r128 compatible)');
    }

    function clear() {
        for (const bolt of _activeBolts) {
            _scene.remove(bolt.boltMesh.mesh);
            bolt.boltMesh.material.dispose();
            bolt.boltMesh.geometry.dispose();
            _scene.remove(bolt.flash.mesh);
            bolt.flash.mat.dispose();
            if (bolt.cracks) {
                _scene.remove(bolt.cracks.mesh);
                bolt.cracks.material.dispose();
                bolt.cracks.geometry.dispose();
            }
            if (bolt.sparks) {
                _scene.remove(bolt.sparks.mesh);
                bolt.sparks.mat.dispose();
                bolt.sparks.geo.dispose();
            }
            if (bolt.shockwave) {
                _scene.remove(bolt.shockwave.mesh);
                bolt.shockwave.mat.dispose();
            }
            _scene.remove(bolt.debris.instanced);
            bolt.debris.material.dispose();
        }
        _activeBolts.length = 0;
        if (_debrisSharedGeo) { _debrisSharedGeo.dispose(); _debrisSharedGeo = null; }
    }

    function setParams(customParams) {
        Object.assign(_params, customParams);
    }

    function getActiveCount() {
        return _activeBolts.length;
    }

    return {
        /**
         * 초기화
         * @param {THREE.Scene} scene - 기존 씬 객체
         * @param {object} [customParams] - 파라미터 덮어쓰기 (선택)
         */
        init,

        /**
         * 낙뢰 1회 발생
         * @param {number} cx - 월드 X 좌표 (착탄 지점)
         * @param {number} startY - 번개 시작 높이 (예: 500 = 구름 높이)
         * @param {number} cz - 월드 Z 좌표 (착탄 지점)
         */
        spawnAt,

        /**
         * 매 프레임 호출 (게임루프에서)
         * @param {number} delta - 프레임 델타타임 (초)
         */
        update,

        /** 모든 활성 번개 제거 및 리소스 해제 */
        clear,

        /** 런타임 파라미터 변경 */
        setParams,

        /** 현재 활성 번개 개수 */
        getActiveCount,

        /** 기본 파라미터 원본 (참조용) */
        DEFAULT_PARAMS,
    };

})();

window.LightningSystem = LightningSystem;
