import DragSelector from './dragSelector.js';
import { isSnapToGrid, setSnapToGrid } from './desktopState.js';

/**
 * folderEnhancer.js
 * 폴더 창에 드래그 선택 기능과 우클릭 메뉴(Context Menu) 기능을 한 번에 추가해주는 모듈입니다.
 */
class FolderEnhancer {
    /**
     * @param {object} options
     * @param {HTMLElement} options.container - 기능이 적용될 메인 컨텐츠 영역 (예: contentRight)
     * @param {string} options.selectableItems - 드래그로 선택할 아이템들의 CSS 선택자
     * @param {string} options.selectionClass - 선택된 아이템에 붙을 클래스명 (기본값: 'selected')
     * @param {string} options.cssPath - contextMenu.css 파일의 경로 (기본값: '../contextMenu.css')
     */
    constructor({ container, selectableItems, selectionClass = 'selected', cssPath = '../contextMenu.css' }) {
        this.container = container;
        this.selectableItems = selectableItems;
        this.selectionClass = selectionClass;
        this.cssPath = cssPath;
        this.dragSelector = null;
    }

    /**
     * 모든 기능을 초기화합니다.
     */
    initialize() {
        this._injectContextMenuCSS();
        this._injectContextMenuHTML();
        this._initDragSelector();
        this._initContextMenuEvents();
        this._initKeyboardEvents();
        this._initClickEvents(); // Single click selection
    }

    /**
     * DragSelector를 초기화합니다.
     * @private
     */
    _initDragSelector() {
        this.dragSelector = new DragSelector({
            container: this.container,
            selectableItems: this.selectableItems,
            selectionClass: this.selectionClass
        });
        this.dragSelector.initialize();
    }

    /**
     * 우클릭 메뉴에 필요한 CSS를 동적으로 로드합니다.
     * @private
     */
    _injectContextMenuCSS() {
        // 이미 로드되어 있는지 확인
        if (document.querySelector('link[href*="contextMenu.css"]')) return;

        const link = document.createElement('link');
        link.rel = 'stylesheet';
        // 현재 스크립트 위치나 html 위치에 따라 경로가 다를 수 있으므로, 
        // 옵션으로 받은 경로를 사용합니다.
        link.href = this.cssPath;
        document.head.appendChild(link);
    }

    /**
     * 우클릭 메뉴 HTML을 body에 추가합니다.
     * @private
     */
    _injectContextMenuHTML() {
        if (document.getElementById('context-menu')) return;

        const menuHTML = `
            <ul id="context-menu" role="menu">
                <li data-action="arrange">Arrange Icons By</li>
                <li data-action="refresh">Refresh</li>
                <li data-action="snap-grid" id="menu-snap-grid">Snap to Grid</li>
                <li role="separator"></li>
                <li data-action="paste">Paste</li>
                <li data-action="paste-shortcut">Paste Shortcut</li>
                <li role="separator"></li>
                <li data-action="new">New</li>
                <li role="separator"></li>
                <li data-action="properties">Properties</li>
            </ul>
        `;
        document.body.insertAdjacentHTML('beforeend', menuHTML);
    }

    /**
     * 우클릭 메뉴 관련 이벤트를 설정합니다.
     * @private
     */
    _initContextMenuEvents() {
        // 컨테이너 우클릭 시 메뉴 표시
        this.container.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            const contextMenu = document.getElementById('context-menu');
            if (!contextMenu) return;

            // 메뉴 열기 전 Snap to Grid 체크 상태 갱신
            const snapItem = document.getElementById('menu-snap-grid');
            if (snapItem) {
                snapItem.textContent = isSnapToGrid() ? '✓ Snap to Grid' : 'Snap to Grid';
            }

            contextMenu.classList.add('visible');

            // 위치 계산
            let x = e.clientX;
            let y = e.clientY;

            const menuWidth = contextMenu.offsetWidth;
            const menuHeight = contextMenu.offsetHeight;
            const windowWidth = window.innerWidth;
            const windowHeight = window.innerHeight;

            if (x + menuWidth > windowWidth) x -= menuWidth;
            if (y + menuHeight > windowHeight) y -= menuHeight;

            contextMenu.style.left = `${x}px`;
            contextMenu.style.top = `${y}px`;
        });

        // 빈 공간 클릭 시 메뉴 숨기기 (DragSelector와 충돌 방지 위해 캡처링 사용 고려했으나, 
        // DragSelector가 클릭을 막아주므로 버블링 단계에서도 괜찮음)
        // 빈 공간 클릭(mousedown) 시 메뉴 숨기기
        // click보다 mousedown이 더 반응성이 좋고, 드래그 시작 전에도 닫힘
        const closeMenu = () => {
            const contextMenu = document.getElementById('context-menu');
            if (contextMenu && contextMenu.classList.contains('visible')) {
                contextMenu.classList.remove('visible');
            }
        };

        document.addEventListener('mousedown', (e) => {
            // 메뉴 내부 클릭은 무시
            if (e.target.closest('#context-menu')) return;
            closeMenu();
        });

        // 윈도우가 포커스를 잃을 때도 닫기 (iframe 간 전환 등)
        window.addEventListener('blur', closeMenu);

        // 메뉴 아이템 클릭 이벤트 (Action 처리)
        // context-menu가 동적으로 생성되므로 document level에서 위임하거나, 
        // 생성 시점에 참조를 가져와야 하지만, 여기서는 간편하게 document delegation 사용
        document.addEventListener('mousedown', (e) => {
            const menuItem = e.target.closest('#context-menu li[data-action]');
            if (menuItem) {
                const action = menuItem.dataset.action;
                // 메뉴 닫기
                closeMenu();

                // 각 액션에 따른 알림 표시 대신 커스텀 이벤트 발생
                // 엔진(appengine.js 또는 외부 파일)에서 이 이벤트를 잡아서 처리하도록 위임

                // snap-grid는 여기서 직접 처리 (전역 상태 변경)
                if (action === 'snap-grid') {
                    setSnapToGrid(); // 토글
                    return;
                }

                this.container.dispatchEvent(new CustomEvent('context-menu-action', {
                    detail: action,
                    bubbles: true
                }));
            }
        });
    }

    /**
     * 키보드 네비게이션 이벤트를 설정합니다.
     * 바탕화면(appengine.js)과 동일한 거리 기반 알고리즘을 사용합니다.
     * @private
     */
    _initKeyboardEvents() {
        // 컨테이너가 포커스를 받을 수 있도록 설정 (필요 시)
        // 하지만 보통 창 전체나 document에서 이벤트를 잡아야 할 수도 있습니다.
        // 여기서는 document에 붙이되, 현재 컨테이너가 보이는 상태(활성 창)인지 체크하는 로직이 필요할 수 있습니다.
        // 간단한 구현을 위해, 이 FolderEnhancer가 적용된 창이 'active' 클래스를 가질 때만 동작하도록 조건부 처리합니다.

        document.addEventListener('keydown', (e) => {
            // 1. 현재 창이 활성화 상태인지 확인
            // iframe 내부인 경우, 키보드 이벤트가 발생했다는 것은 이미 포커스가 있다는 의미이므로 별도 체크 불필요
            // 단, 메인 창(index.html)에서 직접 쓰이는 경우를 위해 기존 로직 유지
            if (window.parent === window) {
                const windowEl = this.container.closest('.xp-window');
                // 창 안에 있으면 active 체크, 창이 아니면(바탕화면) 그냥 진행
                if (windowEl && !windowEl.classList.contains('active')) return;
            }

            // 2. 입력 필드(검색 등)에 포커스가 있다면 무시
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

            const items = Array.from(this.container.querySelectorAll(this.selectableItems));
            if (items.length === 0) return;

            const selectedItem = this.container.querySelector(`${this.selectableItems}.${this.selectionClass}`);

            // --- Esc: 선택 해제 ---
            if (e.key === 'Escape') {
                this._clearAllSelections();
                return;
            }

            // --- Enter: 실행 (더블클릭 시뮬레이션) ---
            if (e.key === 'Enter' && selectedItem) {
                // 더블클릭 이벤트 트리거
                const dblClickEvent = new MouseEvent('dblclick', {
                    bubbles: true,
                    cancelable: true,
                    view: window
                });
                selectedItem.dispatchEvent(dblClickEvent);
                return;
            }

            // --- 방향키 네비게이션 ---
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                e.preventDefault();

                // 선택된 아이템이 없으면 첫 번째 아이템 선택
                if (!selectedItem) {
                    this._clearAllSelections();
                    items[0].classList.add(this.selectionClass);
                    return;
                }

                const currentRect = selectedItem.getBoundingClientRect();
                let bestCandidate = null;
                let minDist = Infinity;

                items.forEach(item => {
                    if (item === selectedItem) return;

                    const r = item.getBoundingClientRect();
                    let valid = false;

                    // 방향성 판단
                    if (e.key === 'ArrowUp') valid = r.bottom <= currentRect.top + 5; // +5 여유값
                    if (e.key === 'ArrowDown') valid = r.top >= currentRect.bottom - 5;
                    if (e.key === 'ArrowLeft') valid = r.right <= currentRect.left + 5;
                    if (e.key === 'ArrowRight') valid = r.left >= currentRect.right - 5;

                    if (valid) {
                        // 유클리드 거리 계산 (중심점 기준)
                        const centerDist = Math.sqrt(
                            Math.pow((r.left + r.right) / 2 - (currentRect.left + currentRect.right) / 2, 2) +
                            Math.pow((r.top + r.bottom) / 2 - (currentRect.top + currentRect.bottom) / 2, 2)
                        );

                        if (centerDist < minDist) {
                            minDist = centerDist;
                            bestCandidate = item;
                        }
                    }
                });

                if (bestCandidate) {
                    this._clearAllSelections();
                    bestCandidate.classList.add(this.selectionClass);
                    // 스크롤이 필요하면 아이템으로 이동
                    bestCandidate.scrollIntoView({ block: 'nearest', inline: 'nearest' });
                }
            }
        });
    }

    /**
     * 모든 선택을 해제합니다.
     * @private
     */
    _clearAllSelections() {
        const selected = this.container.querySelectorAll(`${this.selectableItems}.${this.selectionClass}`);
        selected.forEach(el => el.classList.remove(this.selectionClass));
    }
    /**
     * 아이콘 클릭(선택) 이벤트를 설정합니다.
     * @private
     */
    _initClickEvents() {
        // 단일 클릭 위임 (Event Delegation)
        this.container.addEventListener('click', (e) => {
            const item = e.target.closest(this.selectableItems);

            if (item) {
                // 메뉴 닫기 (중요: 아래에서 stopPropagation을 하므로 여기서 닫아야 함)
                const contextMenu = document.getElementById('context-menu');
                if (contextMenu) contextMenu.classList.remove('visible');

                // 아이콘 클릭 시
                // Ctrl/Shift/Command 키가 눌리지 않았다면 기존 선택 해제
                if (!e.ctrlKey && !e.shiftKey && !e.metaKey) {
                    this._clearAllSelections();
                }

                // 해당 아이콘 선택
                item.classList.add(this.selectionClass);

                // 이벤트 전파 중단 (바탕화면 클릭으로 인한 해제 방지)
                e.stopPropagation();
            }
        });
    }
}

// initialize 메서드에 _initKeyboardEvents 호출 추가를 위해 상속이나 prototype 수정 대신
// 원본 클래스의 initialize 메서드를 수정해야 합니다. 
// 위쪽 initialize 메서드 수정이 필요하므로, 이 파일 전체를 덮어쓰거나 
// initialize 메서드 부분만 정교하게 교체해야 합니다.
// 하지만 replace_file_content는 블록 교체이므로, 
// initialize 메서드를 포함한 위쪽 코드도 함께 수정했어야 합니다.
// 현재 도구 호출은 하단부에 메서드를 추가하는 것만 하고 있습니다.
// 따라서 initialize 내부에서 _initKeyboardEvents를 호출하도록 수정합니다.

export default FolderEnhancer;
