// shutdownPrompt.js
// Windows XP 종료 프롬프트 모듈
// 이 파일은 Windows XP 운영체제의 종료 프롬프트와 유사한 UI를 제공합니다.
// 대기 모드, 종료, 재시작 옵션을 포함하며, 모듈 방식으로 사용할 수 있습니다.
// 사용 예시는 파일 하단의 주석을 참고하세요.
const imageBase = new URL('../../image/', import.meta.url).href;

class ShutdownPrompt {
    constructor() {
        this.active = false;
        this.init();
    }

    init() {
        // 필요한 CSS 스타일 추가
        this.addStyles();

        // 종료 프롬프트 HTML 생성
        this.createShutdownPrompt();

        // 이벤트 리스너 등록
        this.addEventListeners();
    }

    // CSS 스타일 추가
    addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            /* 종료 프롬프트 오버레이 */
            #shutdown-prompt-overlay {
                display: none;
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(64, 64, 64, 0.1);
                z-index: 10000;
            }

            #shutdown-prompt-overlay.active {
                display: flex;
                justify-content: center;
                align-items: center;
            }

            /* 종료 프롬프트 컨테이너 */
            #shutdown-prompt {
                display: flex;
                flex-direction: column;
                background: linear-gradient(to right, #5A7EDC, #90a9e9, #5A7EDC);
                border: 1px solid black;
                width: 320px;
                height: 200px;
                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
                font-family: sans-serif;
                color: white;
            }

            /* 헤더 */
            #shutdown-prompt-header {
                width: 100%;
                height: 40px;
                background-color: #00309C;
                display: flex;
                flex-direction: row;
                justify-content: space-between;
                align-items: center;
                padding: 0 10px;
                box-sizing: border-box;
            }
            
            /* 헤더 로고 스타일 */
            .header-logo {
                height: 38px;
                width: 38px;
            }

            #shutdown-prompt-header-stripe {
                width: 100%;
                height: 2px;
                background: linear-gradient(45deg, #466DCD, #C7DDFF, #B0C9F7, #5A7EDC);
            }

            /* 옵션 영역 */
            #shutdown-prompt-options {
                font-size: 12px;
                flex-grow: 1;
                display: flex;
                flex-direction: row;
                justify-content: space-evenly;
                align-items: center;
            }

            .shutdown-prompt-option {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                cursor: pointer;
            }

            .shutdown-prompt-option > *:first-child {
                margin-bottom: 8px;
            }

            .shutdown-prompt-option .img-button {
                height: 32px;
                width: 32px;
                filter: drop-shadow(1px 1px 1px rgba(0, 0, 0, 0.5));
            }

            .shutdown-prompt-option .img-button:hover {
                filter: drop-shadow(1px 1px 1px rgba(0, 0, 0, 0.5)) brightness(1.1);
            }

            .shutdown-prompt-option .img-button:active {
                filter: drop-shadow(1px 1px 1px rgba(0, 0, 0, 0.5)) brightness(0.9);
            }
            
            /* 로그오프 모드에서는 가운데 옵션(Shutdown)을 숨김 */
            #shutdown-prompt-options.logoff-mode #shutdown-option {
                display: none;
            }
            
            /* 로그오프 모드일 때 나머지 두 옵션을 더 넓게 배치하여 대칭을 맞춤 */
            #shutdown-prompt-options.logoff-mode {
                justify-content: center;
                gap: 60px; /* 두 버튼 사이의 간격을 일정하게 유지 */
            }
            
            /* 로그오프 모드에서 첫 번째와 세 번째 옵션만 보이도록 설정 */
            #shutdown-prompt-options.logoff-mode #standby-option,
            #shutdown-prompt-options.logoff-mode #restart-option {
                flex: 0 0 auto; /* 자동 크기 조절 방지 */
            }

            /* 푸터 */
            #shutdown-prompt-footer {
                width: 100%;
                height: 40px;
                background-color: #00309C;
                display: flex;
                flex-direction: row;
                justify-content: flex-end;
                align-items: center;
                padding: 0 10px;
                box-sizing: border-box;
            }

            /* 취소 버튼 */
            #shutdown-cancel-button-outline {
                width: min-content;
                height: min-content;
                padding: 1px;
                border-radius: 2px;
                background: linear-gradient(170deg, #043292 35%, #C3C3DF);
            }

            #shutdown-cancel-button-border {
                width: min-content;
                height: min-content;
                padding: 1px;
                border: solid 1px #003C74;
                border-radius: 3px;
                background: linear-gradient(#F7F3EF, #E5F0E2 90%, #D6D3C6 95%);
                cursor: pointer;
            }

            #shutdown-cancel-button-border:hover {
                background: linear-gradient(#FFF0CF, #E59700);
            }

            #shutdown-cancel-button-border:active {
                background: linear-gradient(#CEE7FF, #6982EE);
            }

            #shutdown-cancel-button {
                color: black;
                font-size: 12px;
                outline: none;
                border: none;
                padding: 0px 8px 0px 8px;
                background: transparent;
                text-shadow: none;
                cursor: pointer;
            }

            /* 회색 효과 애니메이션 */
            @keyframes grayFadeIn {
                0% {
                    filter: grayscale(0);
                }
                15% {
                    filter: grayscale(0);
                }
                100% {
                    filter: grayscale(0.90);
                }
            }

            .grayscale {
                animation: grayFadeIn 2.5s;
                animation-fill-mode: forwards;
                animation-timing-function: steps(16, end);
            }
            
            /* 오른쪽 상단 윈도우 로고 */
            #windows-logo-topright {
                position: fixed;
                top: 24px;
                right: 32px;
                width: 80px;
                height: auto;
                z-index: 100;
            }
        `;
        document.head.appendChild(style);
    }

    // 종료 프롬프트 HTML 생성
    createShutdownPrompt() {
        // 이미 존재하는지 확인
        if (document.getElementById('shutdown-prompt-overlay')) {
            return;
        }

        const overlay = document.createElement('div');
        overlay.id = 'shutdown-prompt-overlay';
        overlay.innerHTML = `
            <div id="shutdown-prompt">
                <div id="shutdown-prompt-header">
                    <span>Turn off computer</span>
                    <img src="${imageBase}windowslogo.png" id="logo-small" class="header-logo"/>
                </div>
                <div id="shutdown-prompt-header-stripe"></div>
                <div id="shutdown-prompt-options">
                    <div class="shutdown-prompt-option" id="standby-option">
                        <img src="${imageBase}standby.png" class="img-button" alt="Stand By"/>
                        <span>Stand By</span>
                    </div>
                    <div class="shutdown-prompt-option" id="shutdown-option">
                        <img src="${imageBase}turnoff.png" class="img-button" alt="Turn Off"/>
                        <span>Turn Off</span>
                    </div>
                    <div class="shutdown-prompt-option" id="restart-option">
                        <img src="${imageBase}restart.png" class="img-button" alt="Restart"/>
                        <span>Restart</span>
                    </div>
                </div>
                <div id="shutdown-prompt-footer">
                    <div id="shutdown-cancel-button-outline">
                        <div id="shutdown-cancel-button-border">
                            <div id="shutdown-cancel-button">
                                Cancel
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);
    }

    // 이벤트 리스너 등록
    addEventListeners() {
        // ESC 키로 종료 프롬프트 닫기
        document.addEventListener("keydown", (event) => {
            if (this.active && event.key === "Escape") {
                this.hide();
            }
        });

        // 취소 버튼 클릭 이벤트
        document.addEventListener('click', (e) => {
            if (e.target.closest('#shutdown-cancel-button') ||
                e.target.closest('#shutdown-cancel-button-border') ||
                e.target.closest('#shutdown-cancel-button-outline')) {
                this.hide();
            }

            // 각 옵션 클릭 이벤트
            if (e.target.closest('#standby-option')) {
                // 현재 표시된 텍스트에 따라 다른 옵션 선택
                const standbyText = document.querySelector('#standby-option span');
                if (standbyText && standbyText.textContent === 'Log Off') {
                    this.onOptionSelect('logoff');
                } else {
                    this.onOptionSelect('standby');
                }
            }

            if (e.target.closest('#shutdown-option')) {
                // 현재 표시된 텍스트에 따라 다른 옵션 선택
                // logoff 모드에서는 이 버튼이 표시되지 않지만, 혹시나 있을 상황을 대비
                const optionsContainer = document.querySelector('#shutdown-prompt-options');
                if (optionsContainer && optionsContainer.classList.contains('logoff-mode')) {
                    // Logoff 모드에서는 가운데 버튼이 락 기능이므로
                    this.onOptionSelect('lock');
                } else {
                    const shutdownText = document.querySelector('#shutdown-option span');
                    if (shutdownText && shutdownText.textContent === 'Lock') {
                        this.onOptionSelect('lock');
                    } else {
                        this.onOptionSelect('shutdown');
                    }
                }
            }

            if (e.target.closest('#restart-option')) {
                // 현재 표시된 텍스트에 따라 다른 옵션 선택
                const restartText = document.querySelector('#restart-option span');
                if (restartText && restartText.textContent === 'Switch User') {
                    this.onOptionSelect('switchuser');
                } else {
                    this.onOptionSelect('restart');
                }
            }
        });
    }

    // 옵션 선택 시 호출되는 함수 (사용자 정의 가능)
    // option: 'standby', 'shutdown', 'restart', 'logoff', 'lock', 'switchuser' 중 하나
    onOptionSelect(option) {
        console.log('Selected option:', option);
        // 여기에 실제 기능 구현 (옵션에 따라 다른 동작)
        this.hide();
    }

    // 종료 프롬프트 표시
    show() {
        const overlay = document.getElementById('shutdown-prompt-overlay');
        if (overlay) {
            // 헤더 텍스트를 "Turn off computer"로 설정
            const header = overlay.querySelector('#shutdown-prompt-header span');
            if (header) {
                header.textContent = 'Turn off computer';
            }

            // 옵션 이미지와 텍스트를 원래 상태로 복원
            const standbyImg = overlay.querySelector('#standby-option .img-button');
            const standbyText = overlay.querySelector('#standby-option span');
            const shutdownImg = overlay.querySelector('#shutdown-option .img-button');
            const shutdownText = overlay.querySelector('#shutdown-option span');
            const restartImg = overlay.querySelector('#restart-option .img-button');
            const restartText = overlay.querySelector('#restart-option span');

            if (standbyImg) standbyImg.src = `${imageBase}standby.png`;
            if (standbyText) standbyText.textContent = 'Stand By';
            if (shutdownImg) shutdownImg.src = `${imageBase}turnoff.png`;
            if (shutdownText) shutdownText.textContent = 'Turn Off';
            if (restartImg) restartImg.src = `${imageBase}restart.png`;
            if (restartText) restartText.textContent = 'Restart';

            // Turn Off 모드에서는 기본 모드 클래스를 적용하여 모든 버튼을 표시
            const optionsContainer = overlay.querySelector('#shutdown-prompt-options');
            if (optionsContainer) {
                optionsContainer.className = '';
            }

            overlay.classList.add('active');
            let targetElement = document.getElementById('desktop-wrapper');
            if (!targetElement) {
                targetElement = document.getElementById('main-content');
            }
            if (targetElement) {
                targetElement.classList.add('grayscale');
            }

            this.active = true;
        }
    }

    // 로그오프 프롬프트 표시
    showLogoff() {
        const overlay = document.getElementById('shutdown-prompt-overlay');
        if (overlay) {
            // 헤더 텍스트를 "Log Off"로 변경
            const header = overlay.querySelector('#shutdown-prompt-header span');
            if (header) {
                header.textContent = 'Log Off';
            }

            // 옵션 이미지와 텍스트를 로그오프 관련으로 변경
            const standbyImg = overlay.querySelector('#standby-option .img-button');
            const standbyText = overlay.querySelector('#standby-option span');
            const shutdownImg = overlay.querySelector('#shutdown-option .img-button');
            const shutdownText = overlay.querySelector('#shutdown-option span');
            const restartImg = overlay.querySelector('#restart-option .img-button');
            const restartText = overlay.querySelector('#restart-option span');

            if (standbyImg) standbyImg.src = `${imageBase}logoff.png`;
            if (standbyText) standbyText.textContent = 'Log Off';
            if (shutdownImg) shutdownImg.src = `${imageBase}lock.png`;
            if (shutdownText) shutdownText.textContent = 'Lock';
            if (restartImg) restartImg.src = `${imageBase}switchuser.png`;
            if (restartText) restartText.textContent = 'Switch User';

            // Log Off 모드에서는 logoff-mode 클래스를 추가하여 가운데 버튼 숨김
            const optionsContainer = overlay.querySelector('#shutdown-prompt-options');
            if (optionsContainer) {
                optionsContainer.className = 'logoff-mode';
            }

            overlay.classList.add('active');
            let targetElement = document.getElementById('desktop-wrapper');
            if (!targetElement) {
                targetElement = document.getElementById('main-content');
            }
            if (targetElement) {
                targetElement.classList.add('grayscale');
            }

            this.active = true;
        }
    }

    // 종료 프롬프트 숨김
    hide() {
        const overlay = document.getElementById('shutdown-prompt-overlay');
        if (overlay) {
            overlay.classList.remove('active');
            // 회색 효과 제거
            // taskbar.html에서는 document.body 대신 다른 요소를 사용할 수 있도록 조정
            const targetElement = document.getElementById('desktop-wrapper') || document.getElementById('main-content');
            if (targetElement) {
                targetElement.classList.remove('grayscale');
            }

            this.active = false;
        }
    }

    // 옵션 선택 이벤트 리스너 설정
    setOnOptionSelect(callback) {
        this.onOptionSelect = callback;
    }
}

// 전역 변수로 인스턴스 생성
const shutdownPrompt = new ShutdownPrompt();

/*
 * ======================================================================
 * 사용 예시:
 * 
 * // 모듈 import
 * import shutdownPrompt from './shutdownPrompt.js';
 * 
 * // 버튼 클릭 시 종료 프롬프트 표시
 * document.getElementById('my-button').addEventListener('click', () => {
 *   shutdownPrompt.show();
 * });
 * 
 * // 옵션 선택 시 동작 정의 (선택사항)
 * shutdownPrompt.setOnOptionSelect((option) => {
 *   console.log('Selected:', option);
 *   switch(option) {
 *     case 'standby':
 *       // 대기 모드 처리
 *       break;
 *     case 'shutdown':
 *       // 종료 처리
 *       break;
 *     case 'restart':
 *       // 재시작 처리
 *       break;
 *   }
 * });
 * 
 * // 프로그래밍 방식으로 종료 프롬프트 숨기기
 * // shutdownPrompt.hide();
 * ======================================================================
 */

// 모듈로 내보내기
export default shutdownPrompt;
