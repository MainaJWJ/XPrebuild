/**
 * iconDragger.js
 * 바탕화면 아이콘의 드래그 앤 드롭 기능을 담당합니다.
 * isSnapToGrid() 값에 따라 자유 배치 / Snap-to-Grid 모드를 동적으로 전환합니다.
 * DragSelector(마키 선택)와 충돌하지 않도록 설계되었습니다.
 */

import { isSnapToGrid, gridToPixel, pixelToGrid } from './desktopState.js';

// 드래그에 필요한 최소 이동 거리 (픽셀).
// 이 값보다 적게 움직이면 클릭으로 간주 (선택/더블클릭 방해 방지)
const DRAG_THRESHOLD = 5;

/**
 * IconDragger를 바탕화면 컨테이너에 초기화합니다.
 * @param {HTMLElement} container - #desktop-icons 컨테이너
 * @param {Object} positions - desktopState의 positions 객체 (참조)
 */
export function initIconDragger(container, positions) {
    let dragging = false;          // 현재 드래그 중인지 여부
    let dragTarget = null;         // 드래그 중인 .desktop-icon 엘리먼트
    let startMouseX = 0;           // 드래그 시작 마우스 X
    let startMouseY = 0;           // 드래그 시작 마우스 Y
    let startElemLeft = 0;         // 드래그 시작 시 아이콘의 left
    let startElemTop = 0;          // 드래그 시작 시 아이콘의 top
    let didMove = false;           // 실제로 DRAG_THRESHOLD 이상 움직였는지

    // --- mousedown: 드래그 준비 ---
    container.addEventListener('mousedown', (e) => {
        // 우클릭이면 무시
        if (e.button !== 0) return;

        const icon = e.target.closest('.desktop-icon');
        if (!icon) return; // 아이콘 위가 아니면 DragSelector에게 위임

        dragTarget = icon;
        startMouseX = e.clientX;
        startMouseY = e.clientY;
        startElemLeft = parseInt(icon.style.left, 10) || 0;
        startElemTop = parseInt(icon.style.top, 10) || 0;
        dragging = false;
        didMove = false;

        // DragSelector가 마키를 그리지 않도록 이벤트 전파 중단
        // (아이콘 위에서 시작된 드래그임을 명시)
        e.stopPropagation();
    }, true); // 캡처링 단계에서 처리하여 우선순위 확보

    // --- mousemove: 아이콘 실시간 이동 ---
    document.addEventListener('mousemove', (e) => {
        if (!dragTarget) return;

        const dx = e.clientX - startMouseX;
        const dy = e.clientY - startMouseY;

        // Threshold를 넘어야 드래그로 인식
        if (!didMove && Math.sqrt(dx * dx + dy * dy) < DRAG_THRESHOLD) return;

        if (!dragging) {
            dragging = true;
            didMove = true;
            dragTarget.classList.add('dragging');
            dragTarget.classList.add('selected'); // 드래그 중에도 파란색 선택 효과 유지
        }

        // 마우스 위치에 맞춰 아이콘을 자유롭게 이동
        dragTarget.style.left = `${startElemLeft + dx}px`;
        dragTarget.style.top  = `${startElemTop  + dy}px`;
    });

    // --- mouseup: 모드에 따라 자유 배치 또는 Snap-to-Grid ---
    document.addEventListener('mouseup', () => {
        if (!dragTarget) return;

        if (dragging && didMove) {
            const currentLeft = parseInt(dragTarget.style.left, 10) || 0;
            const currentTop  = parseInt(dragTarget.style.top,  10) || 0;
            const appId = dragTarget.id;

            if (isSnapToGrid()) {
                // ✦ Snap-to-Grid 모드: 가장 가까운 그리드 칸으로 이동
                const { gridX, gridY } = pixelToGrid(currentLeft, currentTop);
                const snapped = gridToPixel(gridX, gridY);
                dragTarget.style.left = `${snapped.left}px`;
                dragTarget.style.top  = `${snapped.top}px`;
                if (appId) positions[appId] = { left: snapped.left, top: snapped.top };
            } else {
                // ✦ 자유 배치 모드: 놓은 자리 그대로 유지
                if (appId) positions[appId] = { left: currentLeft, top: currentTop };
            }

            // 드래그가 발생했으면 클릭/더블클릭 이벤트 차단
            dragTarget.addEventListener('click', stopEventOnce, { capture: true, once: true });
        }

        dragTarget.classList.remove('dragging');
        dragTarget = null;
        dragging = false;
        didMove = false;
    });
}

/**
 * 드래그 직후 발생하는 불필요한 click 이벤트를 한 번만 차단합니다.
 */
function stopEventOnce(e) {
    e.stopImmediatePropagation();
    e.preventDefault();
}
