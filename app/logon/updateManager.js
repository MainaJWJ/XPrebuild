// updateManager.js
// 이 파일은 윈도우 업데이트 화면 관리 및 메시지 처리를 담당합니다.

class UpdateManager {
    constructor() {
        this.updateWindowId = 'update-window';
        this.isInitialized = false;
        this.updateContainer = null;
    }

    // 초기화 (필요시)
    initialize() {
        if (this.isInitialized) return;
        this.setupMessageListener();
        this.isInitialized = true;
    }

    // 업데이트 컨테이너 생성 및 표시
    showUpdateScreen() {
        if (!this.updateContainer) {
            this.updateContainer = document.createElement('div');
            this.updateContainer.id = 'update-container';
            this.updateContainer.innerHTML = `
                <iframe id="update-frame" src="app/logon/update.html"></iframe>
            `;

            // CSS 스타일 적용 (logonManager와 유사하게)
            this.updateContainer.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: 1100; /* 로그인 화면보다 위에 표시되도록 함 */
                background-color: #5A7EDC;
            `;

            const updateFrame = this.updateContainer.querySelector('#update-frame');
            updateFrame.style.cssText = `
                width: 100%;
                height: 100%;
                border: none;
            `;

            document.body.appendChild(this.updateContainer);
        } else {
            this.updateContainer.style.display = 'block';
            const frame = this.updateContainer.querySelector('iframe');
            if (frame) {
                frame.src = frame.src; // 리로드
            }
        }

        // 초기화가 안 되어 있다면 수행
        if (!this.isInitialized) {
            this.initialize();
        }
    }

    // 업데이트 화면 제거
    hideUpdateScreen() {
        if (this.updateContainer) {
            this.updateContainer.style.display = 'none';
            // 필요하다면 여기서 DOM에서 완전히 제거할 수도 있음
        }
    }

    // 메시지 리스너 설정
    setupMessageListener() {
        window.addEventListener('message', (event) => {
            const data = event.data;

            // 업데이트 완료 메시지 처리
            if (data === 'updateComplete' || (typeof data === 'object' && data !== null && data.type === 'updateComplete')) {
                console.log("Update complete received in manager");
                this.hideUpdateScreen();
                
                // 업데이트 완료 후 로그온 화면을 보여주고 싶다면 여기서 호출 가능
                // window.dispatchEvent(new CustomEvent('updateFinished'));
            }
        });
    }
}

// 싱글톤 인스턴스 생성 및 내보내기
const updateManager = new UpdateManager();
export default updateManager;
