// biosManager.js
// 이 파일은 초기 BIOS 부팅 화면 표시 및 처리를 담당합니다.

class BiosManager {
    constructor() {
        this.isInitialized = false;
    }

    // 초기 BIOS 화면 표시
    initializeBiosScreen(onComplete) {
        if (this.isInitialized) return;

        // DOM이 준비된 후 실행
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.createBiosContainer();
                this.setupMessageListener(onComplete);
                this.isInitialized = true;
            });
        } else {
            this.createBiosContainer();
            this.setupMessageListener(onComplete);
            this.isInitialized = true;
        }
    }

    // BIOS 컨테이너 생성
    createBiosContainer() {
        const biosContainer = document.createElement('div');
        biosContainer.id = 'bios-container';
        biosContainer.innerHTML = `
            <iframe id="bios-frame" src="app/logon/bios/index.html"></iframe>
        `;

        // CSS 스타일 적용 (화면 전체 덮기)
        biosContainer.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 2000; /* 로그인 화면보다 위에 표시 */
            background-color: #000000;
        `;

        const biosFrame = biosContainer.querySelector('#bios-frame');
        biosFrame.style.cssText = `
            width: 100%;
            height: 100%;
            border: none;
        `;

        document.body.appendChild(biosContainer);
    }

    // 메시지 리스너 설정
    setupMessageListener(onComplete) {
        const handler = (event) => {
            const data = event.data;

            if (data && data.type === 'bios-boot-complete') {
                window.removeEventListener('message', handler);
                this.hideBiosScreen();
                if (onComplete) onComplete();
            }
        };
        window.addEventListener('message', handler);
    }

    // BIOS 화면 제거
    hideBiosScreen() {
        const biosContainer = document.getElementById('bios-container');
        if (biosContainer) {
            biosContainer.style.display = 'none';
            biosContainer.remove();
        }
    }
}

const biosManager = new BiosManager();
export default biosManager;
