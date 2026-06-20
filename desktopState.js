/**
 * desktopState.js
 * 바탕화면 아이콘의 픽셀 좌표 상태를 관리합니다.
 * 세션 내에서만 위치를 유지합니다 (localStorage 미사용).
 */

// 그리드 설정 (픽셀 단위)
export const GRID_CONFIG = {
    CELL_WIDTH: 80,   // 아이콘 셀 가로 간격
    CELL_HEIGHT: 80,  // 아이콘 셀 세로 간격
    MARGIN_LEFT: 10,  // 바탕화면 좌측 여백
    MARGIN_TOP: 10,   // 바탕화면 상단 여백
};

// ============================================================
// Snap-to-Grid 모드 상태
// ============================================================
let _snapToGrid = true; // 기본값: 그리드 스냅

/**
 * 현재 Snap-to-Grid 모드 여부를 반환합니다.
 * @returns {boolean}
 */
export function isSnapToGrid() {
    return _snapToGrid;
}

/**
 * Snap-to-Grid 모드를 켜거나 끕니다.
 * @param {boolean} [value] - 명시하면 해당 값으로, 생략하면 현재 값을 토글
 */
export function setSnapToGrid(value) {
    _snapToGrid = (value !== undefined) ? value : !_snapToGrid;
}

// ============================================================
// 초기 위치 계산
// ============================================================

/**
 * appRegistry.js의 desktopColumn 정보를 기반으로
 * 각 아이콘의 초기 픽셀 좌표 { left, top }를 자동 계산합니다.
 * @param {Array} apps - desktopColumn을 가진 앱 배열
 * @returns {Object} { appId: { left, top }, ... }
 */
export function computeDefaultPositions(apps) {
    const positions = {};
    const colCounts = {};

    const desktopApps = apps.filter(app => app.desktopColumn != null);

    desktopApps.forEach(app => {
        const col = app.desktopColumn; // 1-based
        if (colCounts[col] === undefined) colCounts[col] = 0;

        const gridX = col - 1;          // 0-indexed 열 인덱스
        const gridY = colCounts[col];   // 같은 열 내 순서

        positions[app.id] = {
            left: GRID_CONFIG.MARGIN_LEFT + gridX * GRID_CONFIG.CELL_WIDTH,
            top:  GRID_CONFIG.MARGIN_TOP  + gridY * GRID_CONFIG.CELL_HEIGHT,
        };
        colCounts[col]++;
    });

    return positions;
}

/**
 * 현재 아이콘 위치들을 고려하여 비어있는 다음 그리드 위치를 찾습니다.
 * @param {Object} currentPositions - 현재 아이콘들의 위치 정보 { appId: { left, top } }
 * @returns {{ left: number, top: number }}
 */
export function getNextAvailablePosition(currentPositions) {
    const occupied = new Set();
    Object.values(currentPositions).forEach(pos => {
        const grid = pixelToGrid(pos.left, pos.top);
        occupied.add(`${grid.gridX},${grid.gridY}`);
    });

    // 0번 열부터 시작하여 아래쪽으로, 그 다음 열로 이동하며 빈 자리 찾기
    // 세로로는 최대 7개(0~6)까지만 배치되도록 제한
    for (let x = 0; x < 50; x++) {
        for (let y = 0; y < 7; y++) {
            if (!occupied.has(`${x},${y}`)) {
                return gridToPixel(x, y);
            }
        }
    }
    return gridToPixel(0, 0); // 모든 자리가 꽉 찼을 경우 기본값
}

// ============================================================
// 좌표 변환 유틸리티 (Snap 모드에서 사용)
// ============================================================

/**
 * 그리드 좌표를 픽셀 좌표로 변환합니다.
 * @param {number} gridX
 * @param {number} gridY
 * @returns {{ left: number, top: number }}
 */
export function gridToPixel(gridX, gridY) {
    return {
        left: GRID_CONFIG.MARGIN_LEFT + gridX * GRID_CONFIG.CELL_WIDTH,
        top:  GRID_CONFIG.MARGIN_TOP  + gridY * GRID_CONFIG.CELL_HEIGHT,
    };
}

/**
 * 픽셀 좌표를 가장 가까운 그리드 좌표로 변환합니다 (Snap-to-Grid).
 * @param {number} pixelLeft
 * @param {number} pixelTop
 * @returns {{ gridX: number, gridY: number }}
 */
export function pixelToGrid(pixelLeft, pixelTop) {
    const gridX = Math.max(0, Math.round((pixelLeft - GRID_CONFIG.MARGIN_LEFT) / GRID_CONFIG.CELL_WIDTH));
    const gridY = Math.max(0, Math.round((pixelTop  - GRID_CONFIG.MARGIN_TOP)  / GRID_CONFIG.CELL_HEIGHT));
    return { gridX, gridY };
}
