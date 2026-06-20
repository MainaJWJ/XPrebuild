// uiManager.js
// 비행 시뮬레이터의 모든 UI 요소를 중앙에서 관리합니다.
// FPS 카운터, 좌표 표시, 에임 포인트(조준점), XYZ 축 표시기(Gizmo)
// OpenSkyFlight-main HUD (컴퍼스, 인공수평선, 고도계, 속도계) 통합

let hudContainer, coordinatesElement;
let _missileAlertBox = null, _lockWarningBox = null;

// --- 콕핏 아날로그 계기판 상태 ---
let _gaugeImages = {};
let _gaugesLoaded = false;

// --- FPS 카운터 내부 상태 ---
let fpsCounter, fpsFrames = 0, fpsPrevTime = performance.now();

// --- 3D CCIP 폭폭 조준용 바닥 평면 마커 ---
let _ccipMarker3D = null;


// --- Gizmo(XYZ 축 표시기) ---
let gizmoScene, gizmoCamera;
let lblX, lblY, lblZ;

// --- 내부 참조 ---
let _renderer;

// ============================================================
// OpenSkyFlight HUD — 상수 (constants/hud.js 인라인 이식)
// ============================================================
const HUD_COLOR = '#00ff88';
const HUD_ALPHA = 0.85;
const HUD_SHADOW_COLOR = 'rgba(0, 0, 0, 0.9)';
const HUD_SHADOW_BLUR = 2;

const COMPASS_BAND_WIDTH = 400;
const COMPASS_BAND_Y = 40;
const COMPASS_BAND_HEIGHT = 28;
const COMPASS_VISIBLE_RANGE = 90;

const HORIZON_PX_PER_DEG = 8;
const HORIZON_LINE_WIDTH = 200;
const HORIZON_VISIBLE_RANGE = 150;

const INSTRUMENT_OFFSET_X = 250;
const INSTRUMENT_SCALE_HEIGHT = 200;

const COMPASS_POINTS = [
    { deg: 0, label: 'N' },
    { deg: 45, label: 'NE' },
    { deg: 90, label: 'E' },
    { deg: 135, label: 'SE' },
    { deg: 180, label: 'S' },
    { deg: 225, label: 'SW' },
    { deg: 270, label: 'W' },
    { deg: 315, label: 'NW' },
];

const SPEED_SMOOTH_RATE = 5;
const DIRTY_YAW_THRESHOLD = 0.001;
const DIRTY_PITCH_THRESHOLD = 0.001;
const DIRTY_ALT_THRESHOLD = 0.5;
const DIRTY_SPEED_THRESHOLD = 0.5;

// ============================================================
// OpenSkyFlight HUD — Canvas 및 내부 상태
// ============================================================
let _hudCanvas = null;
let _hudCtx = null;

// Dirty 상태 감지 (불필요한 Canvas 재드로우 방지)
let _prevYaw = NaN, _prevPitch = NaN, _prevRoll = NaN, _prevAlt = NaN, _prevSpeed = NaN, _prevCameraMode = '';
let _forceRedraw = true;

// 속도 스무딩 (SpeedTracker 인라인 이식)
let _speedPrevPos = null;
let _groundSpeed = 0;

function _applyHudShadow(ctx) {
    ctx.shadowColor = HUD_SHADOW_COLOR;
    ctx.shadowBlur = HUD_SHADOW_BLUR;
}

// --- 컴퍼스 (나침반 밴드) ---
function _drawCompass(ctx, w, yaw) {
    const cx = w / 2;
    let headingDeg = ((-yaw * 180) / Math.PI) % 360;
    if (headingDeg < 0) headingDeg += 360;

    ctx.save();
    _applyHudShadow(ctx);
    ctx.beginPath();
    ctx.rect(cx - COMPASS_BAND_WIDTH / 2, COMPASS_BAND_Y - 2, COMPASS_BAND_WIDTH, COMPASS_BAND_HEIGHT + 20);
    ctx.clip();

    ctx.globalAlpha = HUD_ALPHA;
    ctx.strokeStyle = HUD_COLOR;
    ctx.fillStyle = HUD_COLOR;
    ctx.lineWidth = 1;

    const pxPerDeg = COMPASS_BAND_WIDTH / COMPASS_VISIBLE_RANGE;
    for (let d = -180; d <= 540; d += 5) {
        let diff = d - headingDeg;
        while (diff > 180) diff -= 360;
        while (diff < -180) diff += 360;

        const x = cx + diff * pxPerDeg;
        if (x < cx - COMPASS_BAND_WIDTH / 2 - 10 || x > cx + COMPASS_BAND_WIDTH / 2 + 10) continue;

        const isMajor = d % 10 === 0;
        ctx.beginPath();
        ctx.moveTo(x, COMPASS_BAND_Y);
        ctx.lineTo(x, COMPASS_BAND_Y + (isMajor ? 12 : 6));
        ctx.stroke();
    }

    ctx.font = 'bold 14px Courier New';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (const pt of COMPASS_POINTS) {
        let diff = pt.deg - headingDeg;
        while (diff > 180) diff -= 360;
        while (diff < -180) diff += 360;

        const x = cx + diff * pxPerDeg;
        if (x < cx - COMPASS_BAND_WIDTH / 2 - 20 || x > cx + COMPASS_BAND_WIDTH / 2 + 20) continue;
        ctx.fillText(pt.label, x, COMPASS_BAND_Y + 14);
    }

    // 삼각형 포인터
    ctx.beginPath();
    ctx.moveTo(cx, COMPASS_BAND_Y - 2);
    ctx.lineTo(cx - 5, COMPASS_BAND_Y - 8);
    ctx.lineTo(cx + 5, COMPASS_BAND_Y - 8);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // 헤딩 숫자 표시
    _applyHudShadow(ctx);
    ctx.globalAlpha = HUD_ALPHA;
    ctx.fillStyle = HUD_COLOR;
    ctx.font = 'bold 13px Courier New';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const hdgStr = 'HDG ' + String(Math.round(headingDeg) % 360).padStart(3, '0') + '\u00B0';
    ctx.fillText(hdgStr, cx, COMPASS_BAND_Y + COMPASS_BAND_HEIGHT + 4);
}

// --- 인공수평선 (Artificial Horizon) ---
function _drawHorizon(ctx, w, h, pitch, roll) {
    const cx = w / 2;
    const cy = h / 2;
    let pitchDeg = ((pitch * 180) / Math.PI) % 360;
    if (pitchDeg > 180) pitchDeg -= 360;
    if (pitchDeg < -180) pitchDeg += 360;

    ctx.save();
    _applyHudShadow(ctx);
    ctx.globalAlpha = HUD_ALPHA;
    ctx.strokeStyle = HUD_COLOR;
    ctx.fillStyle = HUD_COLOR;
    ctx.lineWidth = 1.5;

    ctx.save();
    // 실제 수평선과 평행하도록 기체의 카메라 롤 회전을 적용
    if (roll !== undefined && roll !== 0) {
        ctx.translate(cx, cy);
        ctx.rotate(roll);
        ctx.translate(-cx, -cy);
    }

    const horizonY = cy - pitchDeg * HORIZON_PX_PER_DEG;

    // 수평선 좌우 라인
    ctx.beginPath();
    ctx.moveTo(cx - HORIZON_LINE_WIDTH, horizonY);
    ctx.lineTo(cx - 40, horizonY);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + 40, horizonY);
    ctx.lineTo(cx + HORIZON_LINE_WIDTH, horizonY);
    ctx.stroke();

    // 피치 사다리
    ctx.font = '11px Courier New';
    ctx.textBaseline = 'middle';
    for (let deg = -180; deg <= 180; deg += 10) {
        if (deg === 0) continue;
        const ladderY = horizonY - deg * HORIZON_PX_PER_DEG;
        if (ladderY < cy - HORIZON_VISIBLE_RANGE || ladderY > cy + HORIZON_VISIBLE_RANGE) continue;

        const tickW = deg % 20 === 0 ? 60 : 35;
        const isDashed = deg < 0;

        if (isDashed) {
            ctx.setLineDash([4, 4]);
        } else {
            ctx.setLineDash([]);
        }

        ctx.beginPath();
        ctx.moveTo(cx - tickW, ladderY);
        ctx.lineTo(cx - 20, ladderY);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx + 20, ladderY);
        ctx.lineTo(cx + tickW, ladderY);
        ctx.stroke();

        ctx.setLineDash([]);
        ctx.textAlign = 'right';
        ctx.fillText(deg > 0 ? '+' + deg : String(deg), cx - tickW - 4, ladderY);
        ctx.textAlign = 'left';
        ctx.fillText(deg > 0 ? '+' + deg : String(deg), cx + tickW + 4, ladderY);
    }

    ctx.restore(); // 회전 콘텍스트 원복

    // 고정 기준 크로스헤어 (기체 중심 고정이므로 회전시키지 않음)
    ctx.setLineDash([]);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - 30, cy);
    ctx.lineTo(cx - 10, cy);
    ctx.lineTo(cx - 10, cy + 5);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + 30, cy);
    ctx.lineTo(cx + 10, cy);
    ctx.lineTo(cx + 10, cy + 5);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

// --- 고도계 (Altimeter) ---
function _drawAltimeter(ctx, w, h, altY) {
    const x = w / 2 + INSTRUMENT_OFFSET_X;
    const cy = h / 2;
    const alt = altY;

    ctx.save();
    _applyHudShadow(ctx);
    ctx.globalAlpha = HUD_ALPHA;
    ctx.strokeStyle = HUD_COLOR;
    ctx.fillStyle = HUD_COLOR;
    ctx.font = 'bold 13px Courier New';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    // 수직 기준선
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, cy - INSTRUMENT_SCALE_HEIGHT / 2);
    ctx.lineTo(x, cy + INSTRUMENT_SCALE_HEIGHT / 2);
    ctx.stroke();

    // 현재값 표시 박스 (화살표 형태)
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, cy);
    ctx.lineTo(x + 8, cy - 6);
    ctx.lineTo(x + 70, cy - 6);
    ctx.lineTo(x + 70, cy + 6);
    ctx.lineTo(x + 8, cy + 6);
    ctx.closePath();
    ctx.stroke();
    ctx.fillText(Math.round(alt), x + 12, cy);

    // 스케일 눈금
    const step = 100;
    const pxPerUnit = INSTRUMENT_SCALE_HEIGHT / (step * 4);
    const baseAlt = Math.round(alt / step) * step;

    ctx.font = '10px Courier New';
    ctx.lineWidth = 1;
    for (let i = -4; i <= 4; i++) {
        const tickAlt = baseAlt + i * step;
        const tickY = cy - (tickAlt - alt) * pxPerUnit;
        if (tickY < cy - INSTRUMENT_SCALE_HEIGHT / 2 || tickY > cy + INSTRUMENT_SCALE_HEIGHT / 2) continue;

        ctx.beginPath();
        ctx.moveTo(x - 5, tickY);
        ctx.lineTo(x, tickY);
        ctx.stroke();

        ctx.textAlign = 'right';
        ctx.fillText(Math.round(tickAlt), x - 8, tickY);
    }

    // 레이블
    ctx.font = 'bold 12px Courier New';
    ctx.textAlign = 'left';
    ctx.fillText('ALT m', x, cy - INSTRUMENT_SCALE_HEIGHT / 2 - 14);

    ctx.restore();
}

// --- 속도계 (Speed Indicator) — 고도계와 동일한 스크롤 눈금 적용 ---
function _drawSpeed(ctx, w, h, speed) {
    const x = w / 2 - INSTRUMENT_OFFSET_X;
    const cy = h / 2;

    ctx.save();
    _applyHudShadow(ctx);
    ctx.globalAlpha = HUD_ALPHA;
    ctx.strokeStyle = HUD_COLOR;
    ctx.fillStyle = HUD_COLOR;

    // 수직 기준선
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, cy - INSTRUMENT_SCALE_HEIGHT / 2);
    ctx.lineTo(x, cy + INSTRUMENT_SCALE_HEIGHT / 2);
    ctx.stroke();

    // 스크롤 눈금 (알티미터와 동일한 구조, 50 단위 간격)
    const step = 50;
    const pxPerUnit = INSTRUMENT_SCALE_HEIGHT / (step * 4);
    const baseSpd = Math.round(speed / step) * step;

    ctx.font = '10px Courier New';
    ctx.lineWidth = 1;
    for (let i = -4; i <= 4; i++) {
        const tickSpd = baseSpd + i * step;
        if (tickSpd < 0) continue; // 음수 속도 눈금 표시 안 함
        const tickY = cy - (tickSpd - speed) * pxPerUnit;
        if (tickY < cy - INSTRUMENT_SCALE_HEIGHT / 2 || tickY > cy + INSTRUMENT_SCALE_HEIGHT / 2) continue;

        // 눈금선은 기준선 왼쪽으로 뻗음 (알티미터는 오른쪽 뻗음이므로 여기는 왼쪽)
        ctx.beginPath();
        ctx.moveTo(x, tickY);
        ctx.lineTo(x - 5, tickY);
        ctx.stroke();

        // 숫자는 눈금선 왼쪽에 표시
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(Math.round(tickSpd), x + 8, tickY);
    }

    // 현재값 표시 박스 (화살표 형태, 왼쪽)
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, cy);
    ctx.lineTo(x - 8, cy - 6);
    ctx.lineTo(x - 70, cy - 6);
    ctx.lineTo(x - 70, cy + 6);
    ctx.lineTo(x - 8, cy + 6);
    ctx.closePath();
    ctx.stroke();

    ctx.font = 'bold 13px Courier New';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(Math.round(speed), x - 12, cy);

    // 레이블
    ctx.font = 'bold 12px Courier New';
    ctx.textAlign = 'right';
    ctx.fillText('SPD', x, cy - INSTRUMENT_SCALE_HEIGHT / 2 - 14);

    ctx.restore();
}


function _drawHUD(spaceship, yaw, pitch, altY, speed, roll) {
    if (!_hudCtx || !_hudCanvas) return;

    const w = _hudCanvas.width / (window.devicePixelRatio || 1);
    const h = _hudCanvas.height / (window.devicePixelRatio || 1);

    _hudCtx.clearRect(0, 0, _hudCanvas.width, _hudCanvas.height);
    _drawCompass(_hudCtx, w, yaw);
    _drawHorizon(_hudCtx, w, h, pitch, roll);
    _drawAltimeter(_hudCtx, w, h, altY);
    _drawSpeed(_hudCtx, w, h, speed);

    // 미사일 락온 및 탐지 경고 (우측 HTML 상자 UI로 대체됨)


    // 체력 바
    if (spaceship) {
        _hudCtx.save();
        _applyHudShadow(_hudCtx);
        _hudCtx.font = 'bold 16px Courier New';
        _hudCtx.textAlign = 'left';
        _hudCtx.textBaseline = 'top';
        const hp = Math.max(0, spaceship.health || 0);
        
        _hudCtx.fillStyle = hp > 50 ? '#00ff88' : (hp > 25 ? '#ffaa00' : '#ff3300');
        _hudCtx.fillText(`ARMOR: ${hp.toFixed(0)}%`, 20, 20);
        
        // 체력 바 그리기
        _hudCtx.strokeStyle = 'white';
        _hudCtx.lineWidth = 2;
        _hudCtx.strokeRect(20, 40, 200, 15);
        _hudCtx.fillRect(22, 42, Math.max(0, 196 * (hp / 100)), 11);
        _hudCtx.restore();

        // 랜딩 기어 및 접지 상태 표시 (HUD 좌하단)
        _hudCtx.save();
        _applyHudShadow(_hudCtx);
        _hudCtx.font = 'bold 13px Courier New';
        _hudCtx.textAlign = 'left';
        _hudCtx.textBaseline = 'bottom';
        
        // F-18 랜딩 기어 상시 장착
        _hudCtx.fillStyle = '#00ff88';
        _hudCtx.fillText('GEAR DN', 20, h - 40);
        
        if (spaceship.isGrounded) {
            _hudCtx.fillStyle = '#ffaa00';
            _hudCtx.fillText('LANDED / TAXIING', 20, h - 20);
        } else {
            _hudCtx.fillStyle = '#00ff88';
            _hudCtx.fillText('AIRBORNE', 20, h - 20);
        }
        _hudCtx.restore();
    }
}

// ============================================================
// 기존 uiManager 초기화
// ============================================================
function initUIManager(scene, renderer) {
    _renderer = renderer;

    // 1. 전체 HUD 감싸는 레이어
    hudContainer = document.createElement('div');
    hudContainer.id = 'hud-container';

    const gameLayer = document.getElementById('game-layer') || document.body;
    gameLayer.appendChild(hudContainer);

    // 2. 좌표계 및 속도 표시기
    coordinatesElement = document.createElement('div');
    coordinatesElement.id = 'coordinates';
    coordinatesElement.style.position = 'absolute';
    coordinatesElement.style.bottom = '20px';
    coordinatesElement.style.right = '20px';
    coordinatesElement.style.textAlign = 'right';
    gameLayer.appendChild(coordinatesElement);

    // 3. FPS 카운터 생성
    fpsCounter = document.createElement('div');
    fpsCounter.id = 'fps-counter';
    fpsCounter.style.position = 'absolute';
    fpsCounter.style.top = '10px';
    fpsCounter.style.right = '10px';
    fpsCounter.style.color = '#00ff00';
    fpsCounter.style.fontFamily = 'monospace';
    fpsCounter.style.fontSize = '16px';
    fpsCounter.style.fontWeight = 'bold';
    fpsCounter.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
    fpsCounter.style.padding = '5px 10px';
    fpsCounter.style.borderRadius = '5px';
    fpsCounter.style.zIndex = '9999';
    fpsCounter.innerText = 'FPS: 0';
    document.body.appendChild(fpsCounter);

    // 3.5. 우측 경고 메시지 박스 컨테이너 생성
    const alertBoxContainer = document.createElement('div');
    alertBoxContainer.id = 'alert-box-container';

    _missileAlertBox = document.createElement('div');
    _missileAlertBox.id = 'missile-alert-box';
    _missileAlertBox.className = 'alert-box alert-box-yellow';
    _missileAlertBox.style.display = 'none';

    _lockWarningBox = document.createElement('div');
    _lockWarningBox.id = 'lock-warning-box';
    _lockWarningBox.className = 'alert-box alert-box-red';
    _lockWarningBox.style.display = 'none';

    alertBoxContainer.appendChild(_missileAlertBox);
    alertBoxContainer.appendChild(_lockWarningBox);
    gameLayer.appendChild(alertBoxContainer);

    // 4. Gizmo(XYZ 축 표시기) 생성
    gizmoScene = new THREE.Scene();
    gizmoCamera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);

    const originObj = new THREE.Vector3(0, 0, 0);
    const arrowX = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), originObj, 20, 0xff0000, 6, 4);
    const arrowY = new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), originObj, 20, 0x00ff00, 6, 4);
    const arrowZ = new THREE.ArrowHelper(new THREE.Vector3(0, 0, 1), originObj, 20, 0x0000ff, 6, 4);
    gizmoScene.add(arrowX, arrowY, arrowZ);

    const hc = hudContainer;
    const createLbl = (txt, color) => {
        const el = document.createElement('div');
        el.innerText = txt;
        el.style.position = 'absolute';
        el.style.color = color;
        el.style.fontWeight = 'bold';
        el.style.fontFamily = 'Arial';
        el.style.fontSize = '14px';
        el.style.pointerEvents = 'none';
        el.style.zIndex = '1000';
        hc.appendChild(el);
        return el;
    };
    lblX = createLbl('X', '#ff5555');
    lblY = createLbl('Y', '#55ff55');
    lblZ = createLbl('Z', '#5555ff');

    // 5. 조준 가이드 라인 — 제거됨

    // 6. 기체 선택 패널 생성
    createShipSelectPanel();

    // 6.5. ★ 3D CCIP 폭격 조준용 바닥 평면 마커 생성
    const ccipGroup = new THREE.Group();
    
    // 외곽 큰 원형 링
    const ringGeom = new THREE.RingGeometry(220, 240, 64);
    const ringMat = new THREE.MeshBasicMaterial({
        color: 0x00ff88,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });
    const ringMesh = new THREE.Mesh(ringGeom, ringMat);
    ringMesh.rotation.x = Math.PI / 2; // 바닥에 평평하게 눕힘
    ccipGroup.add(ringMesh);

    // 내부 작은 원형 링
    const innerRingGeom = new THREE.RingGeometry(60, 70, 32);
    const innerRingMesh = new THREE.Mesh(innerRingGeom, ringMat);
    innerRingMesh.rotation.x = Math.PI / 2;
    ccipGroup.add(innerRingMesh);

    // 십자형 격자 안내선
    const lineMat = new THREE.LineBasicMaterial({
        color: 0x00ff88,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending
    });

    const ptsH = [new THREE.Vector3(-300, 0, 0), new THREE.Vector3(300, 0, 0)];
    const geomH = new THREE.BufferGeometry().setFromPoints(ptsH);
    const lineH = new THREE.Line(geomH, lineMat);
    ccipGroup.add(lineH);

    const ptsV = [new THREE.Vector3(0, 0, -300), new THREE.Vector3(0, 0, 300)];
    const geomV = new THREE.BufferGeometry().setFromPoints(ptsV);
    const lineV = new THREE.Line(geomV, lineMat);
    ccipGroup.add(lineV);

    ccipGroup.visible = false;
    scene.add(ccipGroup);
    _ccipMarker3D = ccipGroup;

    // 7. ★ OpenSkyFlight 군사 HUD Canvas 생성
    _hudCanvas = document.createElement('canvas');
    _hudCanvas.id = 'military-hud';
    _hudCanvas.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 500;
    `;
    gameLayer.appendChild(_hudCanvas);

    _hudCtx = _hudCanvas.getContext('2d');

    // DPR 처리
    function resizeHudCanvas() {
        const dpr = window.devicePixelRatio || 1;
        _hudCanvas.width = window.innerWidth * dpr;
        _hudCanvas.height = window.innerHeight * dpr;
        _hudCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
        _forceRedraw = true;
    }
    resizeHudCanvas();
    window.addEventListener('resize', resizeHudCanvas);

    // 8. 일시정지(Pause) 오버레이 생성
    const pauseOverlay = document.createElement('div');
    pauseOverlay.id = 'pause-overlay';
    pauseOverlay.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.45);
        display: none;
        justify-content: center;
        align-items: center;
        flex-direction: column;
        z-index: 100000;
        pointer-events: auto;
        backdrop-filter: blur(4px);
    `;
    
    const pauseTitle = document.createElement('h1');
    pauseTitle.innerText = 'PAUSED';
    pauseTitle.style.cssText = `
        color: #ffaa00;
        font-family: 'Courier New', Courier, monospace;
        font-size: 54px;
        font-weight: bold;
        letter-spacing: 6px;
        text-shadow: 0 0 20px rgba(255, 170, 0, 0.6);
        margin: 0 0 12px 0;
        animation: pulse 1.2s infinite alternate ease-in-out;
    `;
    
    const pauseSubtitle = document.createElement('p');
    pauseSubtitle.innerText = 'Press [T] to Resume';
    pauseSubtitle.style.cssText = `
        color: #ffffff;
        font-family: 'Courier New', Courier, monospace;
        font-size: 18px;
        letter-spacing: 1px;
        margin: 0;
        text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8);
    `;
    
    pauseOverlay.appendChild(pauseTitle);
    pauseOverlay.appendChild(pauseSubtitle);
    gameLayer.appendChild(pauseOverlay);

    // 콕핏 아날로그 계기판 이미지 프리로드 시작
    _loadGaugeImages();
}

// --- 콕핏 아날로그 계기판 이미지 프리로더 및 렌더러 함수군 ---
function _loadGaugeImages() {
    const imagesToLoad = {
        speedBg: 'images/gauges/speed.png',
        speedNeedle: 'images/gauges/speed-dial.png',
        attitudeBackplate: 'images/gauges/attitude_backplate.png',
        attitudeDisc: 'images/gauges/attitude_disc.png',
        attitudeGear: 'images/gauges/attitude_gear.png',
        attitudePlane: 'images/gauges/attitude_planeshape.png',
        altitudeGear: 'images/gauges/altitude_gear.png',
        altitudeHatch: 'images/gauges/altitude_hatch.png',
        altitudeDial100: 'images/gauges/altitude_dial_100.png',
        altitudeDial1000: 'images/gauges/altitude_dial_1000.png',
        altitudeDial10000: 'images/gauges/altitude_dial_10000.png'
    };

    let loadedCount = 0;
    const keys = Object.keys(imagesToLoad);
    const total = keys.length;

    keys.forEach(key => {
        const img = new Image();
        img.src = imagesToLoad[key];
        img.onload = () => {
            loadedCount++;
            if (loadedCount === total) {
                _gaugesLoaded = true;
                console.log("[uiManager] All cockpit gauge textures loaded successfully.");
            }
        };
        img.onerror = () => {
            console.error(`[uiManager] Failed to load gauge image: ${imagesToLoad[key]}`);
        };
        _gaugeImages[key] = img;
    });
}

function getSpeedAngle(speedVal) {
    const kts = speedVal * 0.08;
    const keys = [0, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150, 160, 170, 180, 190, 200];
    const values = [0.01, 31, 50, 72, 93, 116, 140, 164, 186, 205, 221, 237, 251, 265, 278, 290, 303, 317];
    
    let deg = 0;
    if (kts <= 0) {
        deg = 0.01;
    } else if (kts >= 200) {
        deg = 317;
    } else {
        for (let i = 0; i < keys.length - 1; i++) {
            if (kts >= keys[i] && kts <= keys[i+1]) {
                const t = (kts - keys[i]) / (keys[i+1] - keys[i]);
                deg = values[i] + t * (values[i+1] - values[i]);
                break;
            }
        }
    }
    return deg * Math.PI / 180;
}

function getPitchY(pitchDeg) {
    const keys = [-90, -20, -10, 0, 5, 10, 15, 90];
    const values = [-135, -30, -15, 0.01, 7.5, 15, 22.5, 135];
    const zeroPitch = 150;
    
    let offset = 0;
    if (pitchDeg <= -90) {
        offset = -135;
    } else if (pitchDeg >= 90) {
        offset = 135;
    } else {
        for (let i = 0; i < keys.length - 1; i++) {
            if (pitchDeg >= keys[i] && pitchDeg <= keys[i+1]) {
                const t = (pitchDeg - keys[i]) / (keys[i+1] - keys[i]);
                offset = values[i] + t * (values[i+1] - values[i]);
                break;
            }
        }
    }
    return zeroPitch + offset;
}

function _renderSpeedGauge(speedVal) {
    const canvas = document.getElementById('gauge-speed');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 300, 300);

    if (!_gaugesLoaded) return;

    ctx.drawImage(_gaugeImages.speedBg, 0, 0, 300, 300);

    const angle = getSpeedAngle(speedVal);
    ctx.save();
    ctx.translate(150, 150);
    ctx.rotate(angle);
    ctx.drawImage(_gaugeImages.speedNeedle, -150, -150, 300, 300);
    ctx.restore();
}

function _renderAttitudeGauge(pitchRad, rollRad) {
    const canvas = document.getElementById('gauge-attitude');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 300, 300);

    if (!_gaugesLoaded) return;

    const pitchDeg = pitchRad * 180 / Math.PI;

    ctx.drawImage(_gaugeImages.attitudeBackplate, 0, 0, 300, 300);

    ctx.save();
    ctx.beginPath();
    ctx.arc(150, 150, 121.25, 0, Math.PI * 2);
    ctx.clip();

    const pitchY = getPitchY(pitchDeg);
    ctx.translate(150, pitchY);
    ctx.rotate(-rollRad);
    ctx.drawImage(_gaugeImages.attitudeDisc, -150, -150, 300, 300);
    ctx.restore();

    ctx.save();
    ctx.translate(150, 150);
    ctx.rotate(-rollRad);
    ctx.drawImage(_gaugeImages.attitudeGear, -150, -150, 300, 300);
    ctx.restore();

    ctx.drawImage(_gaugeImages.attitudePlane, 0, 0, 300, 300);
}

function _renderAltitudeGauge(altVal) {
    const canvas = document.getElementById('gauge-altitude');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 300, 300);

    if (!_gaugesLoaded) return;

    ctx.drawImage(_gaugeImages.altitudeGear, 0, 0, 300, 300);

    ctx.save();
    ctx.globalAlpha = altVal > 10000 ? 0 : 1;
    ctx.drawImage(_gaugeImages.altitudeHatch, 0, 0, 300, 300);
    ctx.restore();

    ctx.save();
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "14px Arial Narrow, sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText("29.92", 215, 148);
    ctx.restore();

    ctx.save();
    ctx.translate(150, 150);
    ctx.rotate(((360 / 100000) * altVal) * Math.PI / 180);
    ctx.drawImage(_gaugeImages.altitudeDial10000, -150, -150, 300, 300);
    ctx.restore();

    ctx.save();
    ctx.translate(150, 150);
    ctx.rotate(((360 / 10000) * altVal) * Math.PI / 180);
    ctx.drawImage(_gaugeImages.altitudeDial1000, -150, -150, 300, 300);
    ctx.restore();

    ctx.save();
    ctx.translate(150, 150);
    ctx.rotate(((360 / 1000) * altVal) * Math.PI / 180);
    ctx.drawImage(_gaugeImages.altitudeDial100, -150, -150, 300, 300);
    ctx.restore();
}

// FPS 갱신 (매 프레임 animate 루프에서 호출)
function updateFPS() {
    if (!fpsCounter) return;
    fpsFrames++;
    const time = performance.now();
    if (time >= fpsPrevTime + 500) {
        fpsCounter.innerText = 'FPS: ' + Math.round((fpsFrames * 1000) / (time - fpsPrevTime));
        fpsFrames = 0;
        fpsPrevTime = time;
    }
}


// Gizmo 렌더링 (매 프레임 메인 렌더링 직후 호출)
function renderGizmo(camera, isActive) {
    if (!gizmoScene || !_renderer) return;

    if (isActive) {
        const gizmoSize = 120;
        const pad = 20;
        _renderer.clearDepth();
        _renderer.setViewport(pad, window.innerHeight - gizmoSize - pad, gizmoSize, gizmoSize);

        gizmoCamera.position.set(0, 0, 1).applyQuaternion(camera.quaternion).multiplyScalar(50);
        gizmoCamera.up.copy(camera.up);
        gizmoCamera.lookAt(0, 0, 0);
        _renderer.render(gizmoScene, gizmoCamera);

        const pX = new THREE.Vector3(25, 0, 0).project(gizmoCamera);
        const pY = new THREE.Vector3(0, 25, 0).project(gizmoCamera);
        const pZ = new THREE.Vector3(0, 0, 25).project(gizmoCamera);

        const cx = pad + gizmoSize / 2;
        const cy = pad + gizmoSize / 2;
        lblX.style.left = (cx + pX.x * gizmoSize / 2) + 'px';
        lblX.style.top = (cy - pX.y * gizmoSize / 2) + 'px';
        lblY.style.left = (cx + pY.x * gizmoSize / 2) + 'px';
        lblY.style.top = (cy - pY.y * gizmoSize / 2) + 'px';
        lblZ.style.left = (cx + pZ.x * gizmoSize / 2) + 'px';
        lblZ.style.top = (cy - pZ.y * gizmoSize / 2) + 'px';
        lblX.style.display = lblY.style.display = lblZ.style.display = 'block';
    } else {
        if (lblX) lblX.style.display = lblY.style.display = lblZ.style.display = 'none';
    }
}

// 폭격용 하방 시야를 포함한 모든 시야일 때, 무유도 항공폭탄의 자유낙하 탄도와 탄착 지점을 실시간 물리 연산하여 바닥에 평평한 3D 조준선(CCIP)을 그립니다.
function _drawCCIP(camera, spaceship) {
    if (!_ccipMarker3D) return;

    // 기체가 파괴되었거나 정지 중, 또는 지상에 착륙해 있을 때, 또는 폭격 뷰(s2)가 아닐 때 조준선 숨김
    const cameraMode = window.cameraMode || 's1';
    if (!spaceship || !spaceship.mesh || spaceship.destroyed || spaceship.frozen || spaceship.isGrounded || cameraMode !== 's2') {
        _ccipMarker3D.visible = false;
        return;
    }

    // 장착되어 있는 항공폭탄이 하나라도 있는지 검사
    const wm = window.WeaponManager;
    let hasBombs = false;
    if (wm) {
        for (const key in wm.mountedWeapons) {
            const w = wm.mountedWeapons[key];
            if (wm.getWeaponCategory && wm.getWeaponCategory(w) === 'bomb') {
                hasBombs = true;
                break;
            }
        }
    }
    if (!hasBombs) {
        _ccipMarker3D.visible = false;
        return;
    }

    const p0 = spaceship.mesh.position.clone();
    const q = spaceship.mesh.quaternion.clone();

    // 1. 초기 속도 벡터 V0 구하기 (weaponSystem.js 투하 물리 법칙과 동일하게 설정)
    const forwardDir = new THREE.Vector3(1, 0, 0).applyQuaternion(q);
    const downDir = new THREE.Vector3(0, -1, 0).applyQuaternion(q);
    const initialSpeed = spaceship.currentSpeed || 1000;

    const v0 = forwardDir.clone().multiplyScalar(initialSpeed);
    v0.add(downDir.multiplyScalar(80)); // 투하 이탈 속도 80 u/s 추가

    const p0y = p0.y;
    if (p0y <= 0) {
        _ccipMarker3D.visible = false;
        return;
    }

    const v0y = v0.y;
    // 이차방정식 판별식: -200 * t^2 + v0y * t + p0y = 0  ->  t = (v0y + sqrt(v0y^2 + 800 * p0y)) / 400
    const discriminant = v0y * v0y + 800 * p0y;
    if (discriminant < 0) {
        _ccipMarker3D.visible = false;
        return;
    }

    // 탄착까지 걸리는 도달 시간 (TOF)
    const t = (v0y + Math.sqrt(discriminant)) / 400;

    // 최종 연직 낙하 해수면(y = 0) 탄착 위치
    const impactPos = new THREE.Vector3(
        p0.x + v0.x * t,
        0,
        p0.z + v0.z * t
    );

    // 2. 3D 마커 위치 갱신 및 표시 활성화
    // 파도의 출렁임으로 인한 겹침(Z-fighting) 방지를 위해 y좌표를 약 10.0으로 띄워줍니다.
    _ccipMarker3D.position.copy(impactPos);
    _ccipMarker3D.position.y = 10.0;
    _ccipMarker3D.visible = true;

    // 3. 탄착 위치를 카메라 2D 화면 공간으로 투영하여 텍스트 정보 표시
    if (_hudCtx && _hudCanvas) {
        const width = _hudCanvas.width / (window.devicePixelRatio || 1);
        const height = _hudCanvas.height / (window.devicePixelRatio || 1);

        const localFuturePos = impactPos.clone().applyMatrix4(camera.matrixWorldInverse);

        // 카메라 전방에 탄착 지점이 잡힐 때만 렌더링
        if (localFuturePos.z < 0) {
            const projected = impactPos.clone().project(camera);
            const cx = (projected.x * 0.5 + 0.5) * width;
            const cy = (-projected.y * 0.5 + 0.5) * height;

            // 화면 영역 안에 탄착 지점이 포착될 때
            if (cx >= 0 && cx <= width && cy >= 0 && cy <= height) {
                _hudCtx.save();
                _applyHudShadow(_hudCtx);
                
                _hudCtx.fillStyle = '#00ff88'; // 군용 HUD 연초록 색상

                // C. 텍스트 정보 출력 (3D 마커와 가독성을 보존하기 위해 조준선 주변에 텍스트만 표시)
                _hudCtx.font = 'bold 11px Courier New';
                _hudCtx.textAlign = 'left';
                _hudCtx.textBaseline = 'middle';
                _hudCtx.fillText(`CCIP BOMB`, cx + 32, cy - 8);
                _hudCtx.fillText(`TOF ${t.toFixed(1)}S`, cx + 32, cy + 8);

                _hudCtx.restore();
            }
        }
    }
}

// 미사일 락온 허용 범위 (15도 탐지각)를 시각화하는 원형 가이드라인 그리기
function _drawRadarLockCone(camera, spaceship) {
    if (!camera || !spaceship || !spaceship.mesh || !_hudCtx || !_hudCanvas) return;

    const wm = window.WeaponManager;
    if (!wm || Object.keys(wm.mountedWeapons).length === 0) return;

    // 현재 카메라 모드가 폭격모드(s2) 이거나 남은 미사일이 없으면 조준 링을 그리지 않음
    const cameraMode = window.cameraMode || 's1';
    if (cameraMode === 's2') return;

    let hasMissiles = false;
    for (const key in wm.mountedWeapons) {
        const w = wm.mountedWeapons[key];
        if (wm.getWeaponCategory && wm.getWeaponCategory(w) === 'missile') {
            hasMissiles = true;
            break;
        }
    }
    if (!hasMissiles) return;

    const width = _hudCanvas.width / (window.devicePixelRatio || 1);
    const height = _hudCanvas.height / (window.devicePixelRatio || 1);

    // 기체 정면 10,000 유닛 앞쪽 좌표 계산
    const shipQuat = spaceship.mesh.quaternion;
    const forwardDir = new THREE.Vector3(1, 0, 0).applyQuaternion(shipQuat); // +X가 전진
    const forwardPoint = spaceship.mesh.position.clone().addScaledVector(forwardDir, 10000);

    // 카메라 전방에 위치하는지 확인 (Z < 0)
    const localPos = forwardPoint.clone().applyMatrix4(camera.matrixWorldInverse);
    if (localPos.z >= 0) return;

    // 2D 픽셀 좌표 투영
    const projected = forwardPoint.clone().project(camera);
    const cx = (projected.x * 0.5 + 0.5) * width;
    const cy = (-projected.y * 0.5 + 0.5) * height;

    // 16.26도(Math.acos(0.96)) 조준 반경 계산
    const theta = Math.acos(0.96); 
    const fovRad = (camera.fov * Math.PI) / 360; // vertical half-FOV
    const radius = (Math.tan(theta) / Math.tan(fovRad)) * (height / 2);

    _hudCtx.save();
    _applyHudShadow(_hudCtx);
    _hudCtx.globalAlpha = HUD_ALPHA * 0.7; // 대기 상태에서 조금 더 부드럽게 표현

    const lockStatus = wm.lockStatus || 'NONE';
    let color = '#00ff88'; // 기본 연초록색
    if (lockStatus === 'LOCKED') {
        color = '#ff3333'; // 락온 완료 시 붉은색
    }

    _hudCtx.strokeStyle = color;
    _hudCtx.lineWidth = 1.2;
    _hudCtx.setLineDash([4, 6]);

    // 조준 범위 원 렌더링
    _hudCtx.beginPath();
    _hudCtx.arc(cx, cy, radius, 0, Math.PI * 2);
    _hudCtx.stroke();
    _hudCtx.setLineDash([]);

    // 원형 사방 경계 가이드 틱 표시
    _hudCtx.lineWidth = 1.5;
    const tickLen = 8;
    // 상
    _hudCtx.beginPath(); _hudCtx.moveTo(cx, cy - radius - tickLen/2); _hudCtx.lineTo(cx, cy - radius + tickLen/2); _hudCtx.stroke();
    // 하
    _hudCtx.beginPath(); _hudCtx.moveTo(cx, cy + radius - tickLen/2); _hudCtx.lineTo(cx, cy + radius + tickLen/2); _hudCtx.stroke();
    // 좌
    _hudCtx.beginPath(); _hudCtx.moveTo(cx - radius - tickLen/2, cy); _hudCtx.lineTo(cx - radius + tickLen/2, cy); _hudCtx.stroke();
    // 우
    _hudCtx.beginPath(); _hudCtx.moveTo(cx + radius - tickLen/2, cy); _hudCtx.lineTo(cx + radius + tickLen/2, cy); _hudCtx.stroke();

    // 텍스트 라벨 (원 상단 경계 위에 표시)
    _hudCtx.fillStyle = color;
    _hudCtx.font = 'bold 9px Courier New';
    _hudCtx.textAlign = 'center';
    _hudCtx.textBaseline = 'bottom';
    _hudCtx.fillText('LOCK CONE 15°', cx, cy - radius - 8);

    _hudCtx.restore();
}

// HUD 상에 포착된 타겟(Nimitz carrier, F-18 등)의 락온 reticle 및 오프스크린 포인터 그리기
function _drawTargetLocks(camera, spaceship) {
    if (!window.lockableTargets || window.lockableTargets.length === 0 || !_hudCtx || !_hudCanvas) return;
    
    const width = _hudCanvas.width / (window.devicePixelRatio || 1);
    const height = _hudCanvas.height / (window.devicePixelRatio || 1);
    
    const wm = window.WeaponManager;
    const lockedTarget = wm ? wm.lockedTarget : null;
    const lockingTarget = wm ? wm.lockingTarget : null;
    const lockStatus = wm ? wm.lockStatus : 'NONE';
    const lockProgress = wm ? wm.lockProgress : 0;

    const hostileFactions = (spaceship.config && spaceship.config.hostileFactions) ? spaceship.config.hostileFactions : [];
    const playerFaction = (spaceship.config && spaceship.config.faction) ? spaceship.config.faction.toUpperCase() : 'BLUE';

    window.lockableTargets.forEach(target => {
        if (target.destroyed) return;

        // Faction color mapping:
        // Friendly / Allied: Green
        // Enemy / Hostile: Red
        // Neutral / Others: Yellow
        const faction = (target.faction || 'NEUTRAL').toUpperCase();
        const isHostile = hostileFactions.includes(faction) || faction === 'RED';
        const isAllied = faction === playerFaction;

        let baseColor = '#00ff88'; // green
        let alphaColor = 'rgba(0, 255, 136, 0.5)';
        let weakColor = 'rgba(0, 255, 136, 0.4)';

        if (isHostile) {
            baseColor = '#ff3333'; // red
            alphaColor = 'rgba(255, 51, 51, 0.5)';
            weakColor = 'rgba(255, 51, 51, 0.4)';
        } else if (isAllied) {
            baseColor = '#00ff88'; // green
            alphaColor = 'rgba(0, 255, 136, 0.5)';
            weakColor = 'rgba(0, 255, 136, 0.4)';
        } else {
            // Neutral
            baseColor = '#ffd000'; // yellow
            alphaColor = 'rgba(255, 208, 0, 0.5)';
            weakColor = 'rgba(255, 208, 0, 0.4)';
        }

        // 1. 타겟의 월드 좌표 가져오기
        const targetPos = new THREE.Vector3();
        target.getWorldPosition(targetPos);

        // 실제 기체와의 거리 계산
        const shipPos = spaceship.mesh.position;
        const distance = shipPos.distanceTo(targetPos);

        // 60,000 이상 원거리 타겟은 표시 제외
        if (distance > 60000) return;

        // 카메라 상대 로컬 좌표 계산
        const localPos = targetPos.clone().applyMatrix4(camera.matrixWorldInverse);
        
        // 화면 픽셀 좌표 투영
        const projected = targetPos.clone().project(camera);
        const x = (projected.x * 0.5 + 0.5) * width;
        const y = (-projected.y * 0.5 + 0.5) * height;

        // 화면 밖 또는 카메라 뒤에 있는지 판단 (off-screen)
        const isOffScreen = (localPos.z > 0) || (x < 0 || x > width || y < 0 || y > height);

        const isMainLock = (target === lockedTarget || target === lockingTarget);

        if (isOffScreen) {
            // --- 화면 밖/후방 기체 위치 오프스크린 포인터 그리기 ---
            let dx = localPos.x;
            let dy = -localPos.y; // 화면 상하 반전 대응

            // 후방에 있을 때 좌우 각도가 뒤바뀌는 것을 방지
            if (localPos.z > 0) {
                dx = -dx;
                dy = -dy;
                // 완전히 정뒤에 있어 연산이 0이 되는 경우의 기본값 지정
                if (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001) {
                    dy = 1.0;
                }
            }

            const centerX = width / 2;
            const centerY = height / 2;
            
            const len = Math.sqrt(dx * dx + dy * dy);
            const ndx = dx / (len || 1);
            const ndy = dy / (len || 1);

            const pad = 40;
            const boundaryX = centerX - pad;
            const boundaryY = centerY - pad;

            let rx, ry;
            // 화면 경계 테두리에 빔(레이) 교차 계산
            if (Math.abs(ndx) * boundaryY > Math.abs(ndy) * boundaryX) {
                rx = ndx > 0 ? boundaryX : -boundaryX;
                ry = (rx * ndy) / (ndx || 1);
            } else {
                ry = ndy > 0 ? boundaryY : -boundaryY;
                rx = (ry * ndx) / (ndy || 1);
            }

            const markerX = centerX + rx;
            const markerY = centerY + ry;

            _hudCtx.save();
            _hudCtx.shadowColor = 'rgba(0, 0, 0, 0.9)';
            _hudCtx.shadowBlur = 2;

            if (isMainLock) {
                _hudCtx.strokeStyle = baseColor;
                _hudCtx.fillStyle = baseColor;
            } else {
                _hudCtx.strokeStyle = alphaColor;
                _hudCtx.fillStyle = alphaColor;
            }
            _hudCtx.lineWidth = 2;

            // 오프스크린 방향을 가리키는 삼각형 포인터 그리기
            _hudCtx.translate(markerX, markerY);
            const angle = Math.atan2(ndy, ndx);
            _hudCtx.rotate(angle);

            _hudCtx.beginPath();
            _hudCtx.moveTo(8, 0);
            _hudCtx.lineTo(-6, -6);
            _hudCtx.lineTo(-3, 0);
            _hudCtx.lineTo(-6, 6);
            _hudCtx.closePath();
            _hudCtx.fill();

            _hudCtx.rotate(-angle);
            _hudCtx.translate(-markerX, -markerY);

            // 거리 및 이름 텍스트가 화면 밖으로 잘리지 않도록 테두리 안쪽 방향으로 오프셋 적용
            _hudCtx.font = 'bold 9px Courier New';
            const textOffsetX = -ndx * 32;
            const textOffsetY = -ndy * 22;

            _hudCtx.textAlign = ndx > 0.3 ? 'right' : (ndx < -0.3 ? 'left' : 'center');
            _hudCtx.textBaseline = ndy > 0.3 ? 'bottom' : (ndy < -0.3 ? 'top' : 'middle');
            _hudCtx.fillStyle = baseColor;
            _hudCtx.fillText(`${target.targetName} (${(distance * 0.1).toFixed(0)}m)`, markerX + textOffsetX, markerY + textOffsetY);

            _hudCtx.restore();

        } else {
            // --- 화면 안 (On-Screen) 기체 락온/조준 마커 그리기 ---
            _hudCtx.save();
            _hudCtx.shadowColor = 'rgba(0, 0, 0, 0.9)';
            _hudCtx.shadowBlur = 2;

            if (isMainLock) {
                if (lockStatus === 'LOCKED') {
                    // 락온 완료 상태 (실선 및 조준 마름모 선)
                    _hudCtx.strokeStyle = baseColor;
                    _hudCtx.fillStyle = baseColor;
                    _hudCtx.lineWidth = 2.5;

                    const size = 36;
                    _hudCtx.strokeRect(x - size/2, y - size/2, size, size);

                    // 내부 마름모 조준기
                    _hudCtx.beginPath();
                    _hudCtx.moveTo(x, y - size/3);
                    _hudCtx.lineTo(x + size/3, y);
                    _hudCtx.lineTo(x, y + size/3);
                    _hudCtx.lineTo(x - size/3, y);
                    _hudCtx.closePath();
                    _hudCtx.stroke();

                    // 텍스트 출력
                    _hudCtx.font = 'bold 12px Courier New';
                    _hudCtx.textAlign = 'left';
                    _hudCtx.textBaseline = 'middle';
                    _hudCtx.fillText(`LOCKED`, x + size/2 + 6, y - 8);
                    _hudCtx.fillText(`${target.targetName} (${(distance * 0.1).toFixed(0)}m)`, x + size/2 + 6, y + 8);
                } else if (lockStatus === 'LOCKING') {
                    // 조준 진행 중 상태 (점선 및 진행 링)
                    _hudCtx.strokeStyle = baseColor;
                    _hudCtx.fillStyle = baseColor;
                    _hudCtx.lineWidth = 1.5;
                    _hudCtx.setLineDash([4, 4]);

                    const size = 36;
                    _hudCtx.strokeRect(x - size/2, y - size/2, size, size);
                    _hudCtx.setLineDash([]); // 점선 해제

                    // 조준 게이지 원형 호
                    _hudCtx.beginPath();
                    _hudCtx.arc(x, y, size/2 + 4, -Math.PI/2, -Math.PI/2 + (Math.PI * 2 * lockProgress));
                    _hudCtx.stroke();

                    // 텍스트 출력
                    _hudCtx.font = 'bold 11px Courier New';
                    _hudCtx.textAlign = 'left';
                    _hudCtx.textBaseline = 'middle';
                    _hudCtx.fillText(`LOCKING (${(lockProgress * 100).toFixed(0)}%)`, x + size/2 + 8, y - 6);
                    _hudCtx.fillText(`${target.targetName}`, x + size/2 + 8, y + 8);
                }
            } else {
                // 일반 레이더 포착 상태 (세력별 꺾쇠 괄호)
                _hudCtx.strokeStyle = weakColor;
                _hudCtx.fillStyle = baseColor;
                _hudCtx.lineWidth = 1;

                const size = 28;
                const len = 6;
                
                // 좌상
                _hudCtx.beginPath();
                _hudCtx.moveTo(x - size/2, y - size/2 + len);
                _hudCtx.lineTo(x - size/2, y - size/2);
                _hudCtx.lineTo(x - size/2 + len, y - size/2);
                _hudCtx.stroke();
                // 우상
                _hudCtx.beginPath();
                _hudCtx.moveTo(x + size/2, y - size/2 + len);
                _hudCtx.lineTo(x + size/2, y - size/2);
                _hudCtx.lineTo(x + size/2 - len, y - size/2);
                _hudCtx.stroke();
                // 좌하
                _hudCtx.beginPath();
                _hudCtx.moveTo(x - size/2, y + size/2 - len);
                _hudCtx.lineTo(x - size/2, y + size/2);
                _hudCtx.lineTo(x - size/2 + len, y + size/2);
                _hudCtx.stroke();
                // 우하
                _hudCtx.beginPath();
                _hudCtx.moveTo(x + size/2, y + size/2 - len);
                _hudCtx.lineTo(x + size/2, y + size/2);
                _hudCtx.lineTo(x + size/2 - len, y + size/2);
                _hudCtx.stroke();

                // 거리 및 이름 텍스트 출력
                _hudCtx.font = '9px Courier New';
                _hudCtx.textAlign = 'center';
                _hudCtx.textBaseline = 'top';
                _hudCtx.fillText(`${target.targetName} (${(distance * 0.1).toFixed(0)}m)`, x, y + size/2 + 4);
            }

            _hudCtx.restore();
        }

        // --- 기관포 리드 서클 (M61 Gun Lead Computing) 그리기 ---
        if (isMainLock) {
            const bulletSpeed = (window.GunManager ? window.GunManager.bulletSpeed : 4500) + (spaceship.currentSpeed || 0);
            const targetVelocity = target.velocity ? target.velocity.clone() : new THREE.Vector3(0, 0, 0);
            const t = distance / bulletSpeed;
            const futurePos = targetPos.clone().addScaledVector(targetVelocity, t);
            const localFuturePos = futurePos.clone().applyMatrix4(camera.matrixWorldInverse);

            // 카메라 전방에 예측 지점이 있을 때
            if (localFuturePos.z < 0) {
                const projectedFuture = futurePos.clone().project(camera);
                const fx = (projectedFuture.x * 0.5 + 0.5) * width;
                const fy = (-projectedFuture.y * 0.5 + 0.5) * height;

                // 예측 지점이 화면 내에 보이는 경우
                if (fx >= 0 && fx <= width && fy >= 0 && fy <= height) {
                    _hudCtx.save();
                    _hudCtx.shadowColor = 'rgba(0, 0, 0, 0.9)';
                    _hudCtx.shadowBlur = 2;

                    const leadColor = lockStatus === 'LOCKED' ? baseColor : weakColor;
                    _hudCtx.strokeStyle = leadColor;
                    _hudCtx.fillStyle = leadColor;
                    _hudCtx.lineWidth = 1.5;

                    // 1. 적기 현재 픽셀 위치(x, y)와 미래 예측 픽셀 위치(fx, fy)를 잇는 예측 점선 가이드라인
                    // 적기가 화면 안에 있을 때만 라인을 그려 시인성 개선
                    if (!isOffScreen) {
                        _hudCtx.beginPath();
                        _hudCtx.setLineDash([3, 4]);
                        _hudCtx.moveTo(x, y);
                        _hudCtx.lineTo(fx, fy);
                        _hudCtx.stroke();
                        _hudCtx.setLineDash([]);
                    }

                    // 2. 미래 예측 위치 (fx, fy)에 조준 리드 서클 그리기
                    _hudCtx.beginPath();
                    _hudCtx.arc(fx, fy, 14, 0, Math.PI * 2);
                    _hudCtx.stroke();

                    // 리드 서클 중심 조준점 (Crosshair Dot)
                    _hudCtx.beginPath();
                    _hudCtx.arc(fx, fy, 2, 0, Math.PI * 2);
                    _hudCtx.fill();

                    // 3. 리드 서클 주변 십자 조준 틱 (Crosshair Ticks)
                    const tickLen = 6;
                    const gap = 14;
                    // 상
                    _hudCtx.beginPath(); _hudCtx.moveTo(fx, fy - gap); _hudCtx.lineTo(fx, fy - gap - tickLen); _hudCtx.stroke();
                    // 하
                    _hudCtx.beginPath(); _hudCtx.moveTo(fx, fy + gap); _hudCtx.lineTo(fx, fy + gap + tickLen); _hudCtx.stroke();
                    // 좌
                    _hudCtx.beginPath(); _hudCtx.moveTo(fx - gap, fy); _hudCtx.lineTo(fx - gap - tickLen, fy); _hudCtx.stroke();
                    // 우
                    _hudCtx.beginPath(); _hudCtx.moveTo(fx + gap, fy); _hudCtx.lineTo(fx + gap + tickLen, fy); _hudCtx.stroke();

                    // 4. "GUN LEAD" 텍스트 안내 표시
                    _hudCtx.font = 'bold 9px Courier New';
                    _hudCtx.textAlign = 'center';
                    _hudCtx.textBaseline = 'top';
                    _hudCtx.fillText("GUN LEAD", fx, fy + gap + tickLen + 4);

                    _hudCtx.restore();
                }
            }
        }
    });
}

function updateHUD(spaceship, camera, delta) {
    if (!spaceship || !spaceship.mesh) return;

    // A. 좌표 및 속도 (우하단 텍스트)
    if (coordinatesElement) {
        const speed = spaceship.currentSpeed || 0;
        const flareAmmo = window.WeaponManager ? window.WeaponManager.flareAmmo : 60;
        const maxFlareAmmo = window.WeaponManager ? window.WeaponManager.maxFlareAmmo : 60;
        coordinatesElement.innerHTML = `
            <div style="color: #ffaa00; font-size: 14px; font-weight: bold; margin-bottom: 2px;">
                FLARE: ${flareAmmo} / ${maxFlareAmmo}
            </div>
            <div style="color: #00ff88; font-size: 14px; font-weight: bold; margin-bottom: 2px;">
                SPEED: ${speed.toFixed(0)} u/s
            </div>
            <div style="color: #666666; font-size: 12px;">
                X: ${spaceship.mesh.position.x.toFixed(0)}
                Y: ${spaceship.mesh.position.y.toFixed(0)}
                Z: ${spaceship.mesh.position.z.toFixed(0)}
            </div>
        `;
    }

    // A-2. 조종 모드 UI 표시 업데이트
    const modeBox = document.getElementById('control-mode-box');
    if (modeBox) {
        const mode = window.controlMode || 'EASY';
        modeBox.innerHTML = `
            <span style="color: #00ff88; font-size: 11px; font-weight: bold; letter-spacing: 1px;">조종 모드</span>
            <span style="color: ${mode === 'EASY' ? '#00ffff' : '#ffaa00'}; font-size: 12px; font-weight: bold;">
                ${mode === 'EASY' ? 'EASY (이지)' : 'REALISTIC (리얼 3D)'} [C]
            </span>
        `;
    }

    // A-3. 미사일 감지 및 락온 경고 상자 업데이트
    if (_missileAlertBox && _lockWarningBox) {
        const incomingMissiles = (window.EnemySystem && window.EnemySystem.enemyWeapons) 
            ? window.EnemySystem.enemyWeapons.length 
            : 0;
        const isLocked = window.isPlayerLocked === true;

        // 미사일 감지 (노란색 상자)
        if (incomingMissiles > 0) {
            if (_missileAlertBox.style.display === 'none') {
                _missileAlertBox.style.display = 'flex';
            }
            const alertText = `⚠️ MISSILE DETECTED [${incomingMissiles}]`;
            if (_missileAlertBox.innerHTML !== alertText) {
                _missileAlertBox.innerHTML = alertText;
            }
        } else {
            if (_missileAlertBox.style.display !== 'none') {
                _missileAlertBox.style.display = 'none';
            }
        }

        // 레이더 락온 경고 (빨간색 상자)
        if (isLocked) {
            if (_lockWarningBox.style.display === 'none') {
                _lockWarningBox.style.display = 'flex';
            }
            const warningText = '🚨 WARNING: RADAR LOCK';
            if (_lockWarningBox.innerHTML !== warningText) {
                _lockWarningBox.innerHTML = warningText;
            }
        } else if (window.isPlayerBeingLocked === true) {
            if (_lockWarningBox.style.display === 'none') {
                _lockWarningBox.style.display = 'flex';
            }
            const warningText = '⚠️ WARNING: LOCK DETECTED';
            if (_lockWarningBox.innerHTML !== warningText) {
                _lockWarningBox.innerHTML = warningText;
            }
        } else {
            if (_lockWarningBox.style.display !== 'none') {
                _lockWarningBox.style.display = 'none';
            }
        }
    }

    // B. 키 가이드 하이라이트 업데이트
    const keyItems = document.querySelectorAll('.key-item');
    keyItems.forEach(item => {
        const key = item.dataset.key;
        let isActive = false;
        if (key === '←→↑↓') {
            isActive = spaceship.keys["ArrowLeft"] || spaceship.keys["ArrowRight"] || spaceship.keys["ArrowUp"] || spaceship.keys["ArrowDown"];
        } else if (key === 'Q/E') {
            isActive = spaceship.keys["q"] || spaceship.keys["Q"] || spaceship.keys["e"] || spaceship.keys["E"];
        } else if (key === 'C') {
            isActive = spaceship.keys["c"] || spaceship.keys["C"];
        } else if (key === 'Space') {
            isActive = spaceship.keys[" "];
        } else if (key === 'Shift/J') {
            isActive = spaceship.keys["Shift"] || spaceship.keys["j"] || spaceship.keys["J"];
        } else if (key === '1-5') {
            isActive = spaceship.keys['1'] || spaceship.keys['2'] || spaceship.keys['3'] || spaceship.keys['4'] || spaceship.keys['5'];
        } else {
            isActive = spaceship.keys[key.toLowerCase()] || spaceship.keys[key.toUpperCase()];
        }
        if (isActive) {
            item.style.background = '#ff9900';
            item.style.borderColor = '#ffffff';
            item.style.color = '#000000';
            item.style.boxShadow = '0 0 8px #ff9900';
        } else {
            item.style.background = 'rgba(255, 255, 255, 0.12)';
            item.style.borderColor = 'rgba(255, 255, 255, 0.2)';
            item.style.color = '#ffffff';
            item.style.boxShadow = 'none';
        }
    });

    // C. ★ 군사 HUD Canvas 업데이트
    if (!_hudCanvas || !camera) return;

    // 이 시뮬레이터는 +X 전진, Y축 Yaw, Z축 Pitch 의 비표준 좌표계를 사용하므로
    // spaceship의 내부 각도 값을 직접 읽어야 올바른 계기값이 나옵니다.
    const yaw   = spaceship.yawAngle;    // Y축 좌우 방향 (컴퍼스 헤딩)
    const pitch = -spaceship.pitchAngle; // Z축 상하 각도 (수평선, 부호 반전으로 nose-up = 양수)
    const altY  = spaceship.mesh.position.y;

    // 속도 스무딩 계산 (SpeedTracker 인라인)
    const dt = delta || 0.016;
    if (_speedPrevPos && dt > 0) {
        const dx = spaceship.mesh.position.x - _speedPrevPos.x;
        const dy = spaceship.mesh.position.y - _speedPrevPos.y;
        const dz = spaceship.mesh.position.z - _speedPrevPos.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz); // 3D airspeed (수직 성분 포함)
        const instant = dist / dt;
        _groundSpeed += (instant - _groundSpeed) * Math.min(1, SPEED_SMOOTH_RATE * dt);
    }
    _speedPrevPos = { x: spaceship.mesh.position.x, y: spaceship.mesh.position.y, z: spaceship.mesh.position.z };

    const hasActiveLockState = window.WeaponManager && window.WeaponManager.lockStatus !== 'NONE';

    // Option B: 인공수평선을 카메라가 아닌 기체의 실제 롤 각도(spaceship.rollAngle) 기준으로 회전시킵니다.
    // 기체가 우측으로 기울 때(+값) 캔버스는 반시계 방향(-값)으로 돌아가야 하므로 부호를 반전합니다.
    const shipRoll = -spaceship.rollAngle;

    const DIRTY_ROLL_THRESHOLD = 0.001;

    // Dirty 체크 — 변화가 없으면 재드로우 생략 (락온 진행 상태면 애니메이션을 위해 강제 재드로우 진행)
    // Dirty 체크 해제 조건에 락온 경고 및 미사일 감지 상태 포함
    const incomingMissilesCount = (window.EnemySystem && window.EnemySystem.enemyWeapons) ? window.EnemySystem.enemyWeapons.length : 0;
    const hasActiveMissiles = (window.WeaponManager && window.WeaponManager.launchedWeapons && window.WeaponManager.launchedWeapons.length > 0) || (incomingMissilesCount > 0);
    const hasPlayerWarning = window.isPlayerLocked || window.isPlayerBeingLocked || hasActiveMissiles || spaceship.isStalling;

    const cameraMode = window.cameraMode || 's1';
    if (
        !_forceRedraw &&
        !hasActiveLockState &&
        !hasPlayerWarning &&
        cameraMode === _prevCameraMode &&
        Math.abs(yaw - _prevYaw) < DIRTY_YAW_THRESHOLD &&
        Math.abs(pitch - _prevPitch) < DIRTY_PITCH_THRESHOLD &&
        Math.abs(shipRoll - _prevRoll) < DIRTY_ROLL_THRESHOLD &&
        Math.abs(altY - _prevAlt) < DIRTY_ALT_THRESHOLD &&
        Math.abs(_groundSpeed - _prevSpeed) < DIRTY_SPEED_THRESHOLD
    ) return;

    _prevYaw   = yaw;
    _prevPitch = pitch;
    _prevRoll  = shipRoll;
    _prevAlt   = altY;
    _prevSpeed = _groundSpeed;
    _prevCameraMode = cameraMode;
    _forceRedraw = false;

    _drawHUD(spaceship, yaw, pitch, altY, _groundSpeed, shipRoll);
    _drawRadarLockCone(camera, spaceship);
    _drawTargetLocks(camera, spaceship);
    _drawCCIP(camera, spaceship);
    _drawRadar(spaceship);

    // --- STALL WARNING 표시 ---
    if (spaceship.isStalling && window.selectedShip !== 'helicopter') {
        const timeNow = Date.now();
        // 400ms 주기로 깜빡임
        if (Math.floor(timeNow / 400) % 2 === 0) {
            _hudCtx.save();
            _hudCtx.font = 'bold 36px Courier New';
            _hudCtx.textAlign = 'center';
            _hudCtx.textBaseline = 'middle';
            _hudCtx.fillStyle = '#ff1100';
            _hudCtx.shadowColor = '#ff0000';
            _hudCtx.shadowBlur = 15;
            const w = _hudCanvas.width / (window.devicePixelRatio || 1);
            const h = _hudCanvas.height / (window.devicePixelRatio || 1);
            _hudCtx.fillText("STALL WARNING", w / 2, h / 2 - 140);
            _hudCtx.restore();
        }
    }

    // 콕핏 대시보드 렌더링 및 가시성 토글 (s3에서만 노출)
    const dashboard = document.getElementById('cockpit-dashboard');
    if (dashboard) {
        if (cameraMode === 's3') {
            if (dashboard.style.display !== 'flex') {
                dashboard.style.display = 'flex';
            }
            _renderSpeedGauge(_groundSpeed);
            _renderAttitudeGauge(pitch, spaceship.rollAngle);
            _renderAltitudeGauge(altY);
        } else {
            if (dashboard.style.display !== 'none') {
                dashboard.style.display = 'none';
            }
        }
    }
}

// --- 조종 안내 UI + 키 안내 ---
let shipSelectPanel;

function createShipSelectPanel() {
    shipSelectPanel = document.createElement('div');
    shipSelectPanel.id = 'ship-select-panel';
    shipSelectPanel.style.cssText = `
        position: absolute;
        bottom: 20px;
        left: 20px;
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 8px;
        z-index: 10000;
        font-family: 'Segoe UI', sans-serif;
        pointer-events: auto;
    `;

    // === 중간: 조종 모드 표시 영역 ===
    const modeBox = document.createElement('div');
    modeBox.id = 'control-mode-box';
    modeBox.style.cssText = `
        background: rgba(0, 0, 0, 0.6);
        border: 1px solid rgba(0, 255, 100, 0.25);
        border-radius: 8px;
        padding: 6px 12px;
        display: flex;
        align-items: center;
        gap: 8px;
        backdrop-filter: blur(6px);
        color: #ffffff;
    `;

    // === 중간-우측: 경고음 토글 표시 영역 ===
    const soundBox = document.createElement('div');
    soundBox.style.cssText = `
        background: rgba(0, 0, 0, 0.6);
        border: 1px solid rgba(255, 100, 100, 0.25);
        border-radius: 8px;
        padding: 6px 12px;
        display: flex;
        align-items: center;
        gap: 8px;
        backdrop-filter: blur(6px);
        color: #ffffff;
    `;
    const soundCheckbox = document.createElement('input');
    soundCheckbox.type = 'checkbox';
    soundCheckbox.id = 'warning-sound-toggle';
    soundCheckbox.checked = false; // 기본값: 꺼짐
    window.warningSoundEnabled = false; // 시작 시 경고음 꺼짐
    soundCheckbox.style.cursor = 'pointer';

    const soundLabel = document.createElement('label');
    soundLabel.htmlFor = 'warning-sound-toggle';
    soundLabel.style.cssText = 'color: #ffaaaa; font-size: 11px; font-weight: bold; letter-spacing: 0.5px; cursor: pointer;';
    soundLabel.innerText = '경고음 켜기';

    soundCheckbox.addEventListener('change', (e) => {
        window.warningSoundEnabled = e.target.checked;
        if (!e.target.checked && window.soundManager) {
            window.soundManager.stop('rwr-lock');
            window.soundManager.stop('rwr-tws');
            window.soundManager.stop('rwr-warning');
        }
    });

    soundBox.appendChild(soundCheckbox);
    soundBox.appendChild(soundLabel);

    // === 오른쪽: 조작키 안내 (2줄 분할) ===
    const keyBox = document.createElement('div');
    keyBox.id = 'hud-key-box';
    keyBox.style.cssText = `
        background: rgba(0, 0, 0, 0.6);
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 8px;
        padding: 6px 12px;
        display: flex;
        flex-direction: column;
        gap: 6px;
        backdrop-filter: blur(6px);
    `;

    shipSelectPanel.appendChild(modeBox);
    shipSelectPanel.appendChild(soundBox);

    const lobbyKeysContainer = document.getElementById('lobby-keys-container');
    if (lobbyKeysContainer) {
        lobbyKeysContainer.appendChild(keyBox);
    } else {
        shipSelectPanel.appendChild(keyBox);
    }

    document.body.appendChild(shipSelectPanel);

    // 키 가이드 동적 생성 함수 정의
    window.updateKeyGuides = function() {
        const targetKeyBox = document.getElementById('hud-key-box');
        if (!targetKeyBox) return;

        targetKeyBox.innerHTML = '';

        const isHelicopter = (window.selectedShip === 'helicopter');
        const currentMode = window.controlMode || 'EASY';

        let keysLine1, keysLine2;

        if (isHelicopter) {
            keysLine1 = [
                { key: 'Space', desc: '콜렉티브 업 (상승)' },
                { key: 'Shift', desc: '콜렉티브 다운 (하강)' },
                { key: '↑↓', desc: '사이클릭 피치 (전후)' },
                { key: '←→', desc: '사이클릭 롤 (좌우)' }
            ];
            keysLine2 = [
                { key: 'Q/E', desc: '테일 페달 (요)' },
                { key: 'C', desc: '조종 모드' },
                { key: 'S', desc: '무장 발사(순차)' },
                { key: 'V', desc: '플레어' },
                { key: 'R', desc: '재장전' },
                { key: 'B', desc: '브레이크' }
            ];
        } else {
            keysLine1 = [
                { key: '←→↑↓', desc: '피치/롤' },
                { key: 'Q/E', desc: '요(러더)' },
                { key: 'C', desc: '조종 모드' },
                { key: 'Space', desc: '애프터버너/사출' },
                { key: 'B', desc: '에어브레이크' },
                { key: 'A', desc: '기관포' }
            ];
            keysLine2 = [
                { key: 'S', desc: '무장 발사(순차)' },
                { key: 'V', desc: '플레어' },
                { key: 'R', desc: '무장 재장전' },
                { key: 'Shift/J', desc: '사출기 결속' },
                { key: 'T', desc: '정지/재개' },
                { key: 'D', desc: '시점 전환' }
            ];
        }

        const createKeyRow = (keysArray) => {
            const row = document.createElement('div');
            row.style.cssText = 'display: flex; gap: 10px; flex-wrap: wrap; justify-content: center;';
            keysArray.forEach(k => {
                const item = document.createElement('span');
                item.style.cssText = 'display: flex; align-items: center; gap: 3px;';

                const keyEl = document.createElement('span');
                keyEl.className = 'key-item';
                keyEl.dataset.key = k.key;
                keyEl.innerText = k.key;
                keyEl.style.cssText = `
                    background: rgba(255, 255, 255, 0.12);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    border-radius: 3px;
                    padding: 1px 5px;
                    color: #ffffff;
                    font-size: 10px;
                    font-family: monospace;
                    font-weight: bold;
                    transition: all 0.1s ease;
                `;

                const descEl = document.createElement('span');
                descEl.innerText = k.desc;
                descEl.style.cssText = 'color: #888888; font-size: 10px;';

                item.appendChild(keyEl);
                item.appendChild(descEl);
                row.appendChild(item);
            });
            return row;
        };

        targetKeyBox.appendChild(createKeyRow(keysLine1));
        targetKeyBox.appendChild(createKeyRow(keysLine2));

        // 조종 모드 텍스트 동적 업데이트
        const targetModeBox = document.getElementById('control-mode-box');
        if (targetModeBox) {
            let modeLabel = '';
            if (isHelicopter) {
                modeLabel = currentMode === 'EASY' ? 'EASY (자동호버)' : 'REALISTIC (수동호버)';
            } else {
                modeLabel = currentMode === 'EASY' ? 'EASY (이지)' : 'REALISTIC (리얼 3D)';
            }
            targetModeBox.innerHTML = `
                <span style="color: #00ff88; font-size: 11px; font-weight: bold; letter-spacing: 1px;">조종 모드</span>
                <span style="color: ${currentMode === 'EASY' ? '#00ffff' : '#ffaa00'}; font-size: 12px; font-weight: bold;">
                    ${modeLabel} [C]
                </span>
            `;
        }
    };

    window.updateKeyGuides();
}

// --- 2D 레이더 (Minimap) ---
function _drawRadar(spaceship) {
    if (!_hudCtx || !_hudCanvas || !spaceship || !spaceship.mesh) return;

    const ctx = _hudCtx;
    const radarRadius = 90;
    const radarRange = 60000;
    
    const w = _hudCanvas.width / (window.devicePixelRatio || 1);
    const h = _hudCanvas.height / (window.devicePixelRatio || 1);
    
    // 레이더 위치: 우측 하단 (좌표/속도 UI 바로 위)
    const cx = w - radarRadius - 30;
    const cy = h - radarRadius - 110; 

    ctx.save();

    // 기체 월드 위치 가져오기
    const shipPos = new THREE.Vector3();
    spaceship.mesh.getWorldPosition(shipPos);

    // 기체의 현재 전방 벡터 구하기 (+X가 전방) 및 수평(XZ) 평면으로 투영
    const forward = new THREE.Vector3(1, 0, 0).applyQuaternion(spaceship.mesh.quaternion);
    forward.y = 0;
    forward.normalize();

    // 기체의 수평 기준 우측 벡터 구하기 (Y축 기준 시계방향 90도 회전)
    const right = new THREE.Vector3(-forward.z, 0, forward.x).normalize();
    
    // 1. 레이더 배경 (초록색 원)
    ctx.beginPath();
    ctx.arc(cx, cy, radarRadius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 255, 0, 0.15)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(0, 255, 0, 0.7)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 2. 레이더 그리드 (십자선 및 내부 원)
    ctx.beginPath();
    ctx.moveTo(cx, cy - radarRadius);
    ctx.lineTo(cx, cy + radarRadius);
    ctx.moveTo(cx - radarRadius, cy);
    ctx.lineTo(cx + radarRadius, cy);
    ctx.strokeStyle = 'rgba(0, 255, 0, 0.3)';
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, radarRadius * 0.5, 0, Math.PI * 2);
    ctx.stroke();

    // 레이더 텍스트 표시
    ctx.fillStyle = '#0f0';
    ctx.font = 'bold 10px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText('RADAR', cx, cy - radarRadius - 5);
    ctx.fillText('60KM', cx + radarRadius + 15, cy + 3);

    // 3. 적기 마커 그리기 (수평 탐지 및 정면 12시 방향 매핑)
    if (window.lockableTargets) {
        window.lockableTargets.forEach(target => {
            if (target.destroyed) return;

            const targetPos = new THREE.Vector3();
            target.getWorldPosition(targetPos);
            const dist = shipPos.distanceTo(targetPos);
            
            if (dist > radarRange) return; // 레이더 탐지 거리 밖

            // 상대 위치 벡터 계산
            const diff = new THREE.Vector3().subVectors(targetPos, shipPos);
            
            // 수평면 기준 전방/우측 성분 내적
            const distForward = diff.dot(forward);
            const distRight = diff.dot(right);

            const scale = radarRange / radarRadius;
            const rx = distRight / scale;
            const ry = -distForward / scale; // 전방일수록 위(-Y)로 이동

            const faction = (target.faction || 'NEUTRAL').toUpperCase();
            const hostileFactions = (spaceship.config && spaceship.config.hostileFactions) ? spaceship.config.hostileFactions : [];
            const playerFaction = (spaceship.config && spaceship.config.faction) ? spaceship.config.faction.toUpperCase() : 'BLUE';
            
            const isHostile = hostileFactions.includes(faction) || faction === 'RED';
            const isAllied = faction === playerFaction;

            // 마커 색상 지정
            ctx.fillStyle = isHostile ? '#ff3333' : (isAllied ? '#00ff88' : '#ffd000');

            // 타겟을 작은 삼각형으로 그리기
            ctx.save();
            ctx.translate(cx + rx, cy + ry);
            
            // 타겟의 수평 전방 벡터
            const tForward = new THREE.Vector3(1, 0, 0).applyQuaternion(target.quaternion);
            tForward.y = 0;
            tForward.normalize();

            // 타겟 전방 벡터의 내 기체 기준 상대 방향 각도 계산
            const tfForward = tForward.dot(forward);
            const tfRight = tForward.dot(right);
            const relAngle = Math.atan2(tfRight, tfForward);

            ctx.rotate(relAngle);

            ctx.beginPath();
            ctx.moveTo(0, -5);
            ctx.lineTo(4, 4);
            ctx.lineTo(-4, 4);
            ctx.closePath();
            ctx.fill();
            
            ctx.restore();
        });
    }

    // 3.5. 미사일(아군 및 적군) 마커 그리기
    // 플레이어 미사일 (BLUE)
    if (window.WeaponManager && window.WeaponManager.launchedWeapons) {
        window.WeaponManager.launchedWeapons.forEach(missile => {
            if (!missile.mesh) return;

            const missilePos = new THREE.Vector3();
            missile.mesh.getWorldPosition(missilePos);
            const dist = shipPos.distanceTo(missilePos);
            if (dist > radarRange) return;

            const diff = new THREE.Vector3().subVectors(missilePos, shipPos);
            const distForward = diff.dot(forward);
            const distRight = diff.dot(right);

            const scale = radarRange / radarRadius;
            const rx = distRight / scale;
            const ry = -distForward / scale;

            // 아군 미사일은 하늘색(Cyan)으로 표시
            ctx.fillStyle = '#00ffff';
            ctx.strokeStyle = '#00ffff';

            // 작은 점과 속도 방향 선
            ctx.beginPath();
            ctx.arc(cx + rx, cy + ry, 2.5, 0, Math.PI * 2);
            ctx.fill();

            if (missile.velocity) {
                const velDir = missile.velocity.clone().normalize();
                velDir.y = 0;
                velDir.normalize();
                const mForward = velDir.dot(forward);
                const mRight = velDir.dot(right);
                const mAngle = Math.atan2(mRight, mForward);

                ctx.save();
                ctx.translate(cx + rx, cy + ry);
                ctx.rotate(mAngle);
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(0, -6); // 이동 방향으로 선 그리기
                ctx.lineWidth = 1;
                ctx.stroke();
                ctx.restore();
            }
        });
    }

    // 적 미사일 (RED)
    if (window.EnemySystem && window.EnemySystem.enemyWeapons) {
        window.EnemySystem.enemyWeapons.forEach(missile => {
            if (!missile.mesh) return;

            const missilePos = new THREE.Vector3();
            missile.mesh.getWorldPosition(missilePos);
            const dist = shipPos.distanceTo(missilePos);
            if (dist > radarRange) return;

            const diff = new THREE.Vector3().subVectors(missilePos, shipPos);
            const distForward = diff.dot(forward);
            const distRight = diff.dot(right);

            const scale = radarRange / radarRadius;
            const rx = distRight / scale;
            const ry = -distForward / scale;

            // 적 미사일은 빨간색(Red)으로 표시
            ctx.fillStyle = '#ff3333';
            ctx.strokeStyle = '#ff3333';

            // 작은 점과 속도 방향 선
            ctx.beginPath();
            ctx.arc(cx + rx, cy + ry, 2.5, 0, Math.PI * 2);
            ctx.fill();

            if (missile.velocity) {
                const velDir = missile.velocity.clone().normalize();
                velDir.y = 0;
                velDir.normalize();
                const mForward = velDir.dot(forward);
                const mRight = velDir.dot(right);
                const mAngle = Math.atan2(mRight, mForward);

                ctx.save();
                ctx.translate(cx + rx, cy + ry);
                ctx.rotate(mAngle);
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(0, -6);
                ctx.lineWidth = 1;
                ctx.stroke();
                ctx.restore();
            }
        });
    }

    // 4. 내 기체를 중앙에 표시 (항상 위를 향하는 흰색 삼각형)
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(cx, cy - 6);
    ctx.lineTo(cx + 4, cy + 5);
    ctx.lineTo(cx, cy + 2);
    ctx.lineTo(cx - 4, cy + 5);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
}


window.initUIManager = initUIManager;
window.updateHUD = updateHUD;
window.updateFPS = updateFPS;
window.renderGizmo = renderGizmo;