// 창 관리 모듈
// 이 모듈은 Windows XP 스타일의 창 생성 및 관리를 담당합니다.

// 역할: 일반 창 관리자 (창 모드 전용)
// 책임:
// 1. 일반적인 창(프로그램)들을 생성하고 관리함
// 2. 창을 이동시키고, 크기를 조절하고, 최대화/최소화함
// 3. 창에 제목 표시줄, 크기 조절 핸들 등을 붙여줌
// 4. 크기 조절이 불가능한 창도 처리할 수 있음

// =============================================================================
// 상수 및 전역 설정
// =============================================================================

// 포커스 상태 상수
const FOCUSING = {
    WINDOW: 'WINDOW',
    DESKTOP: 'DESKTOP'
};

// 작업표시줄 메시지 타입 상수 정의
const TASKBAR_MESSAGE_TYPES = {
    ADD_TAB: 'addTaskbarTab',
    REMOVE_TAB: 'removeTaskbarTab',
    ACTIVATE_TAB: 'activateTaskbarTab',
    DEACTIVATE_TAB: 'deactivateTaskbarTab',
    DEACTIVATE_ALL_TABS: 'deactivateAllTaskbarTabs'
};

// =============================================================================
// WindowManager 클래스 정의
// =============================================================================

class WindowManager {
    // 생성자: 창 관리자를 초기화합니다.
    constructor() {
        // 창의 z-index를 관리하기 위한 카운터 (가장 높은 z-index 값)
        this.highestZIndex = 100;
        // 현재 포커스 상태
        this.focusing = FOCUSING.WINDOW;
        // 관리되는 모든 창 목록
        this.windows = [];
    }

    // =============================================================================
    // 창 생성 및 기본 관리 기능
    // =============================================================================

    // 새 창 생성 함수
    // options: 창 생성에 필요한 옵션들 (제목, iframe 소스, 너비, 높이 등)
    createWindow(options) {
        // 고유한 창 ID 생성 (타임스탬프 기반)
        const windowId = 'window-' + Date.now();

        // 창 요소 생성
        const windowEl = document.createElement('div');
        windowEl.id = windowId;
        // 활성 창 클래스 추가 (새 창은 기본적으로 활성 상태)
        windowEl.className = 'xp-window active';

        // 창의 위치와 크기 설정 (기본값 또는 옵션값 사용)
        windowEl.style.cssText = `width: ${options.width || 660}px; height: ${options.height || 500}px; position: absolute; top: 40px; left: 250px; display: flex; flex-direction: column;`;

        // display: flex; flex-direction: column; 추가 설명:
        // - display: flex; 는 windowEl을 플렉스 컨테이너로 만듭니다.
        // - flex-direction: column; 은 플렉스 요소들을 수직 방향으로 배치합니다.
        // 이를 통해 내부 window-body의 flex-grow: 1 스타일이 정상적으로 동작하여
        // window-body가 창 높이를 채우고, 그 안의 iframe이 window-body를 100% 채우도록 합니다.
        // @@@@@ 폴더창 내부 꽉 차게 하는 코드@@@@@

        // 창의 HTML 구조 정의
        // 제목 표시줄과 iframe 포함
        windowEl.innerHTML = `
            <div class="title-bar">
                ${options.iconUrl ? `<img src="${options.iconUrl}" class="title-bar-icon" alt="">` : ''}
                <div class="title-bar-text">${options.title}</div>
                <div class="title-bar-buttons">
                    <button aria-label="Minimize" data-minimize></button>
                    <button aria-label="Maximize" data-maximize ${options.resizable === false ? 'style="pointer-events: none; opacity: 0.5;"' : ''}></button>
                    <button aria-label="Close" data-close></button>
                </div>
            </div>
            <div class="window-body">
                <iframe src="${options.iframeSrc}" style="width:100%; height:100%; border:0;"></iframe>
            </div>
            <!-- 크기 조절 핸들 추가 -->
            ${options.resizable !== false ? `
            <div class="resize-handle resize-nw"></div>
            <div class="resize-handle resize-ne"></div>
            <div class="resize-handle resize-sw"></div>
            <div class="resize-handle resize-se"></div>
            <div class="resize-handle resize-n"></div>
            <div class="resize-handle resize-s"></div>
            <div class="resize-handle resize-w"></div>
            <div class="resize-handle resize-e"></div>
            ` : ''}
        `;

        // 데스크톱 영역에 창 추가
        document.getElementById('desktop-area').appendChild(windowEl);

        // 창 정보 저장
        const windowInfo = {
            id: windowId,
            element: windowEl,
            title: options.title,
            minimized: false,
            maximized: false, // 기본적으로 최대화되지 않은 상태
            resizable: options.resizable !== false // 크기 조절 가능 여부 (기본값은 true)
        };
        this.windows.push(windowInfo);

        // 버튼 이벤트 리스너 추가
        this.addWindowEventListeners(windowEl, options);

        // 창 클릭 시 최상단으로 bringToFront
        windowEl.addEventListener('mousedown', () => {
            this.focusWindow(windowId);
        });

        // 창을 최상단으로 올리고 포커스
        this.focusWindow(windowId);

        // 크기 조절 기능 추가 (크기 조절이 가능한 경우)
        if (options.resizable !== false) {
            this.addResizeHandles(windowEl);
        }

        // 창 이동 기능 추가
        this.addWindowDrag(windowEl);

        return windowId;
    }

    // =============================================================================
    // 창 상태 관리 기능
    // =============================================================================

    // 창 포커스 함수
    focusWindow(windowId) {
        const windowInfo = this.windows.find(w => w.id === windowId);
        if (!windowInfo) return;

        // z-index 카운터 증가
        this.highestZIndex++;

        // 창에 새로운 z-index 할당
        windowInfo.element.style.zIndex = this.highestZIndex;

        // 모든 창의 active 클래스 제거
        document.querySelectorAll('.xp-window').forEach(win => {
            win.classList.remove('active');
        });

        // 현재 창에 active 클래스 추가
        windowInfo.element.classList.add('active');

        // 포커스 상태를 창으로 변경
        this.focusing = FOCUSING.WINDOW;

        // 커스텀 이벤트 발생시켜 부모 창에 알림
        const event = new CustomEvent('windowFocus', {
            detail: { windowId: windowId }
        });
        window.dispatchEvent(event);
    }

    // 모든 창 비활성화 함수
    deactivateAllWindows() {
        // 모든 창의 active 클래스 제거
        document.querySelectorAll('.xp-window').forEach(win => {
            win.classList.remove('active');
        });

        // 포커스 상태를 데스크톱으로 변경
        this.focusing = FOCUSING.DESKTOP;
    }

    // 창 최소화 함수 (실제 Windows XP 스타일 애니메이션)
    // 창이 작업표시줄 방향(아래쪽)으로 납작해지면서 내려갑니다.
    minimizeWindow(windowId) {
        const windowInfo = this.windows.find(w => w.id === windowId);
        if (!windowInfo) return;

        const windowEl = windowInfo.element;

        // 이미 최소화 중이면 중복 실행 방지
        if (windowInfo.minimized) return;

        // 창을 최소화 상태로 기록
        windowInfo.minimized = true;

        // 창의 현재 위치에서 작업표시줄까지의 거리 계산
        const rect = windowEl.getBoundingClientRect();
        const taskbarCenter = window.innerHeight - 20; // 작업표시줄 중앙 (높이 40px)
        const translateY = taskbarCenter - rect.bottom;

        // 수평 이동: 화면 가로 1/4 위치(작업표시줄 버튼 영역)로 이동
        const targetX = window.innerWidth * 0.25;
        const windowCenterX = rect.left + rect.width / 2;
        const translateX = targetX - windowCenterX;

        // 1단계: 인라인 스타일로 애니메이션 타겟 설정 (CSS transition이 부드럽게 처리)
        windowEl.style.transformOrigin = 'bottom center';
        windowEl.style.opacity = '0';
        windowEl.style.transform = `translate(${translateX}px, ${translateY}px) scaleX(0.3) scaleY(0)`;
        windowEl.classList.add('minimizing');

        // 2단계: 애니메이션 완료 후 완전히 숨김 처리
        setTimeout(() => {
            windowEl.classList.remove('minimizing');
            windowEl.classList.add('minimized');
        }, 150); // CSS transition 시간(0.15s)과 일치
    }

    // 창 복원 함수 (실제 Windows XP 스타일 애니메이션)
    // 작업표시줄에서 원래 위치로 올라오면서 펼쳐집니다.
    restoreWindow(windowId) {
        const windowInfo = this.windows.find(w => w.id === windowId);
        if (!windowInfo) return;

        const windowEl = windowInfo.element;

        // 창을 복원 상태로 기록
        windowInfo.minimized = false;

        // 1단계: visibility 복원하되, 인라인 스타일이 축소 상태를 유지
        windowEl.classList.remove('minimized');
        windowEl.classList.add('minimizing');

        // 2단계: 다음 프레임에서 인라인 스타일 제거 → 원래 위치/크기로 애니메이션
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                windowEl.classList.remove('minimizing');
                windowEl.style.opacity = '';
                windowEl.style.transform = '';
                // transformOrigin은 애니메이션 완료 후 정리
                setTimeout(() => {
                    windowEl.style.transformOrigin = '';
                }, 300);
            });
        });

        // 창을 최상단으로 올리고 포커스
        this.focusWindow(windowId);
    }

    // 창 최대화 토글 함수
    toggleMaximizeWindow(windowId) {
        const windowInfo = this.windows.find(w => w.id === windowId);
        if (!windowInfo) return;

        // 크기 조절이 불가능한 창이면 아무 동작도 하지 않음
        if (!windowInfo.resizable) {
            return;
        }

        const windowEl = windowInfo.element;

        // 현재 최대화 상태인지 확인하여 분기
        if (windowInfo.maximized) {
            // 복원 로직: 저장된 이전 상태로 되돌림
            if (windowInfo.previousState) {
                windowEl.style.top = windowInfo.previousState.top;
                windowEl.style.left = windowInfo.previousState.left;
                windowEl.style.width = windowInfo.previousState.width;
                windowEl.style.height = windowInfo.previousState.height;
            }
            windowEl.classList.remove('maximized');
            windowInfo.maximized = false;
        } else {
            // 최대화 로직: 현재 상태를 저장하고 최대화
            windowInfo.previousState = {
                top: windowEl.style.top,
                left: windowEl.style.left,
                width: windowEl.style.width,
                height: windowEl.style.height,
            };
            windowEl.classList.add('maximized');
            windowInfo.maximized = true;
        }

        // 최대화 버튼의 aria-label 변경
        const maximizeButton = windowEl.querySelector('[data-maximize]');
        if (maximizeButton) {
            maximizeButton.setAttribute('aria-label', windowInfo.maximized ? 'Restore' : 'Maximize');
        }
    }

    // 창 닫기 함수
    closeWindow(windowId) {
        const windowInfo = this.windows.find(w => w.id === windowId);
        if (!windowInfo) return;

        // 창 요소 제거
        windowInfo.element.remove();

        // 창 목록에서 제거
        this.windows = this.windows.filter(w => w.id !== windowId);
    }

    // 작업표시줄 탭 클릭 처리 함수
    handleTaskbarTabClick(windowId) {
        // Webamp 처리 (특수 케이스)
        if (windowId === 'webamp-window') {
            webampManager.toggleWebamp();
            return;
        }

        // WMPlayer 처리 (특수 케이스)
        if (windowId === 'wmplayer-window') {
            import('./app/wmplayer/wmplayerManager.js').then(m => m.default.toggleWMPlayer());
            return;
        }

        const windowInfo = this.windows.find(w => w.id === windowId);
        if (!windowInfo) return;

        // 창이 최소화되어 있으면 복원
        if (windowInfo.minimized) {
            this.restoreWindow(windowId);
        } else {
            // 이미 포커스된 창이면 최소화
            const isActive = windowInfo.element.classList.contains('active');
            if (isActive) {
                this.minimizeWindow(windowId);
                // 작업표시줄에 탭 비활성화 요청
                const taskbarFrame = document.getElementById('taskbar-frame');
                if (taskbarFrame) {
                    taskbarFrame.contentWindow.postMessage({
                        type: TASKBAR_MESSAGE_TYPES.DEACTIVATE_TAB,
                        windowId: windowId
                    }, '*');
                }
            } else {
                // 포커스되지 않은 창이면 포커스
                this.focusWindow(windowId);
            }
        }
    }

    // =============================================================================
    // 창 이동 기능
    // =============================================================================

    // 창 이동 기능 추가 함수
    // windowEl: 이동할 창 요소
    addWindowDrag(windowEl) {
        const titleBar = windowEl.querySelector('.title-bar');
        const windowBody = windowEl.querySelector('.window-body');

        let isDragging = false;
        let startX, startY;
        let startLeft, startTop;

        // 제목 표시줄 마우스 다운 이벤트
        titleBar.addEventListener('mousedown', (e) => {
            // 버튼 클릭 시에는 드래그하지 않음
            if (e.target.closest('.title-bar-buttons')) return;

            // 이벤트가 바탕화면 컨테이너까지 버블링되도록 허용 (포커스 등 신호 전달을 위해)
            // 대신 dragSelector에서 .xp-window 클릭 시 사각형이 생기지 않게 처리함
            // e.stopPropagation(); // 제거됨

            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            startLeft = windowEl.offsetLeft;
            startTop = windowEl.offsetTop;

            // 드래그 중에는 선택 방지
            document.body.style.userSelect = 'none';
            document.body.style.cursor = 'move';

            // 드래그 중에는 전환 애니메이션 비활성화 (인풋랙 방지)
            windowEl.classList.add('dragging');

            // 드래그 중에는 iframe의 포인터 이벤트 비활성화
            if (windowBody) {
                windowBody.style.pointerEvents = 'none';
            }

            // 전역 이벤트 리스너 추가
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });

        // 마우스 이동 이벤트 핸들러
        const onMouseMove = (e) => {
            if (!isDragging) return;

            const dx = e.clientX - startX;
            const dy = e.clientY - startY;

            windowEl.style.left = (startLeft + dx) + 'px';
            windowEl.style.top = (startTop + dy) + 'px';
        };

        // 마우스 업 이벤트 핸들러
        const onMouseUp = () => {
            if (!isDragging) return;

            isDragging = false;
            document.body.style.userSelect = '';
            document.body.style.cursor = '';

            // 드래그 종료 후 전환 애니메이션 복원
            windowEl.classList.remove('dragging');

            // 드래그 종료 후에는 iframe의 포인터 이벤트 복원
            if (windowBody) {
                windowBody.style.pointerEvents = '';
            }

            // 전역 이벤트 리스너 제거
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };
    }

    // =============================================================================
    // 창 크기 조절 기능
    // =============================================================================

    // 크기 조절 핸들 추가 함수
    // windowEl: 크기 조절 핸들을 추가할 창 요소
    addResizeHandles(windowEl) {
        // 크기 조절 핸들 요소들
        const resizeHandles = {
            nw: windowEl.querySelector('.resize-nw'),
            ne: windowEl.querySelector('.resize-ne'),
            sw: windowEl.querySelector('.resize-sw'),
            se: windowEl.querySelector('.resize-se'),
            n: windowEl.querySelector('.resize-n'),
            s: windowEl.querySelector('.resize-s'),
            w: windowEl.querySelector('.resize-w'),
            e: windowEl.querySelector('.resize-e')
        };

        // 각 핸들에 대한 이벤트 리스너 추가
        Object.keys(resizeHandles).forEach(direction => {
            const handle = resizeHandles[direction];
            if (handle) {
                handle.addEventListener('mousedown', (e) => {
                    e.preventDefault();
                    e.stopPropagation();

                    // 크기 조절 시작
                    this.startResizing(windowEl, direction, e.clientX, e.clientY);
                });
            }
        });
    }

    // 크기 조절 시작 함수
    // windowEl: 크기 조절할 창 요소
    // direction: 크기 조절 방향 (nw, ne, sw, se, n, s, w, e)
    // startX, startY: 마우스 시작 좌표
    startResizing(windowEl, direction, startX, startY) {
        // 크기 조절 시작 시, 창에 'resizing' 클래스를 추가합니다.
        // 이 클래스는 CSS에서 크기 조절 핸들의 스타일을 변경하는 데 사용됩니다.
        windowEl.classList.add('resizing');

        // 시작 시점의 창 크기와 위치 저장
        const startWidth = parseInt(window.getComputedStyle(windowEl).width, 10);
        const startHeight = parseInt(window.getComputedStyle(windowEl).height, 10);
        const startXPos = windowEl.offsetLeft;
        const startYPos = windowEl.offsetTop;

        // 최소 창 크기 설정
        const minWidth = 200;
        const minHeight = 100;

        // 마우스 이동 이벤트 리스너
        const onMouseMove = (e) => {
            // 마우스 위치에 따른 창 크기 조절
            switch (direction) {
                case 'nw': // 북서 (좌상단)
                    const widthChangeNW = startX - e.clientX;
                    const heightChangeNW = startY - e.clientY;

                    if (startWidth + widthChangeNW >= minWidth) {
                        windowEl.style.width = (startWidth + widthChangeNW) + 'px';
                        windowEl.style.left = (startXPos - widthChangeNW) + 'px';
                    }

                    if (startHeight + heightChangeNW >= minHeight) {
                        windowEl.style.height = (startHeight + heightChangeNW) + 'px';
                        windowEl.style.top = (startYPos - heightChangeNW) + 'px';
                    }
                    break;

                case 'ne': // 북동 (우상단)
                    const widthChangeNE = e.clientX - startX;
                    const heightChangeNE = startY - e.clientY;

                    if (startWidth + widthChangeNE >= minWidth) {
                        windowEl.style.width = (startWidth + widthChangeNE) + 'px';
                    }

                    if (startHeight + heightChangeNE >= minHeight) {
                        windowEl.style.height = (startHeight + heightChangeNE) + 'px';
                        windowEl.style.top = (startYPos - heightChangeNE) + 'px';
                    }
                    break;

                case 'sw': // 남서 (좌하단)
                    const widthChangeSW = startX - e.clientX;
                    const heightChangeSW = e.clientY - startY;

                    if (startWidth + widthChangeSW >= minWidth) {
                        windowEl.style.width = (startWidth + widthChangeSW) + 'px';
                        windowEl.style.left = (startXPos - widthChangeSW) + 'px';
                    }

                    if (startHeight + heightChangeSW >= minHeight) {
                        windowEl.style.height = (startHeight + heightChangeSW) + 'px';
                    }
                    break;

                case 'se': // 남동 (우하단)
                    const widthChangeSE = e.clientX - startX;
                    const heightChangeSE = e.clientY - startY;

                    if (startWidth + widthChangeSE >= minWidth) {
                        windowEl.style.width = (startWidth + widthChangeSE) + 'px';
                    }

                    if (startHeight + heightChangeSE >= minHeight) {
                        windowEl.style.height = (startHeight + heightChangeSE) + 'px';
                    }
                    break;

                case 'n': // 북 (상단)
                    const heightChangeN = startY - e.clientY;

                    if (startHeight + heightChangeN >= minHeight) {
                        windowEl.style.height = (startHeight + heightChangeN) + 'px';
                        windowEl.style.top = (startYPos - heightChangeN) + 'px';
                    }
                    break;

                case 's': // 남 (하단)
                    const heightChangeS = e.clientY - startY;

                    if (startHeight + heightChangeS >= minHeight) {
                        windowEl.style.height = (startHeight + heightChangeS) + 'px';
                    }
                    break;

                case 'w': // 서 (좌측)
                    const widthChangeW = startX - e.clientX;

                    if (startWidth + widthChangeW >= minWidth) {
                        windowEl.style.width = (startWidth + widthChangeW) + 'px';
                        windowEl.style.left = (startXPos - widthChangeW) + 'px';
                    }
                    break;

                case 'e': // 동 (우측)
                    const widthChangeE = e.clientX - startX;

                    if (startWidth + widthChangeE >= minWidth) {
                        windowEl.style.width = (startWidth + widthChangeE) + 'px';
                    }
                    break;
            }
        };

        // 마우스 업 이벤트 리스너
        const onMouseUp = () => {
            // 크기 조절이 끝나면 'resizing' 클래스를 제거합니다.
            windowEl.classList.remove('resizing');

            // 전역 이벤트 리스너를 제거하여 메모리 누수를 방지합니다.
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };

        // 이벤트 리스너 등록
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    }

    // =============================================================================
    // 창 이벤트 처리 기능
    // =============================================================================

    // 창 이벤트 리스너 추가 함수
    // windowEl: 이벤트 리스너를 추가할 창 요소
    // options: 창 생성 옵션
    addWindowEventListeners(windowEl, options) {
        // 제목 표시줄 버튼들 참조
        const titleBar = windowEl.querySelector('.title-bar');
        const minimizeButton = windowEl.querySelector('[data-minimize]');
        const maximizeButton = windowEl.querySelector('[data-maximize]');
        const closeButton = windowEl.querySelector('[data-close]');

        // 제목 표시줄 더블 클릭 이벤트 (최대화/복원 토글)
        titleBar.addEventListener('dblclick', (e) => {
            // 버튼 클릭 시에는 동작하지 않도록 함
            if (e.target.closest('.title-bar-buttons')) return;

            // 현재 창 ID를 찾아서 최대화 토글
            const windowId = windowEl.id;

            // 크기 조절이 불가능한 창이면 아무 동작도 하지 않음
            const windowInfo = this.windows.find(w => w.id === windowId);
            if (windowInfo && !windowInfo.resizable) {
                return;
            }

            this.toggleMaximizeWindow(windowId);
        });

        // 최소화 버튼 클릭 이벤트
        minimizeButton.addEventListener('click', () => {
            // 현재 창 ID를 찾아서 최소화
            const windowId = windowEl.id;
            this.minimizeWindow(windowId);

            // 작업표시줄에 탭 비활성화 요청
            const taskbarFrame = document.getElementById('taskbar-frame');
            if (taskbarFrame) {
                taskbarFrame.contentWindow.postMessage({
                    type: TASKBAR_MESSAGE_TYPES.DEACTIVATE_TAB,
                    windowId: windowId
                }, '*');
            }
        });

        // 최대화 버튼 클릭 이벤트
        maximizeButton.addEventListener('click', () => {
            // 현재 창 ID를 찾아서 최대화 토글
            const windowId = windowEl.id;

            // 크기 조절이 불가능한 창이면 아무 동작도 하지 않음
            const windowInfo = this.windows.find(w => w.id === windowId);
            if (windowInfo && !windowInfo.resizable) {
                return;
            }

            this.toggleMaximizeWindow(windowId);
        });

        // 닫기 버튼 클릭 이벤트
        closeButton.addEventListener('click', () => {
            // 현재 창 ID를 찾아서 닫기
            const windowId = windowEl.id;
            this.closeWindow(windowId);

            // 작업표시줄에 탭 제거 요청
            const taskbarFrame = document.getElementById('taskbar-frame');
            if (taskbarFrame) {
                taskbarFrame.contentWindow.postMessage({
                    type: TASKBAR_MESSAGE_TYPES.REMOVE_TAB,
                    windowId: windowId
                }, '*');
            }
        });
    }
}

// =============================================================================
// WindowManager 인스턴스 생성 및 내보내기
// =============================================================================

// webampManager import
import webampManager from './app/webamp/webampManager.js';

// WindowManager 인스턴스 생성 및 내보내기
// 다른 모듈에서 import하여 사용할 수 있도록 기본 내보내기 설정
const windowManager = new WindowManager();

// Webamp 실행 함수 추가 (외부에서 사용 가능하도록)
windowManager.openWebamp = (iconData) => {
    webampManager.launchWebamp(iconData);
};

export default windowManager;