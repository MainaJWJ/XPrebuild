// webampManager.js
// Webamp 관련 모든 로직을 관리하는 모듈 (통합본)

import Webamp from "./webamp.js";

// Webamp 창 ID 상수
const WEBAMP_WINDOW_ID = 'webamp-window';

class WebampManager {
    constructor() {
        this.webamp = null;
        this.container = null;
        this.isInitialized = false;
    }

    /**
     * Webamp 실행 (또는 이미 실행 중이면 토글/활성화)
     * @param {Object} iconData - 아이콘 데이터
     */
    launchWebamp(iconData) {
        const existingContainer = document.getElementById('webamp-container');

        if (existingContainer) {
            // 이미 생성된 경우, 숨겨져 있다면 다시 보여주고 활성화
            if (existingContainer.style.display === 'none') {
                existingContainer.style.display = '';
                // 작업표시줄에 활성화 메시지 전송
                this.sendTaskbarMessage({ type: 'activateTaskbarTab', windowId: WEBAMP_WINDOW_ID });
            } else {
                // 이미 보여지고 있다면 포커스만
                this.sendTaskbarMessage({ type: 'activateTaskbarTab', windowId: WEBAMP_WINDOW_ID });
            }
            return;
        }

        // --- 초기화 로직 ---

        // 작업표시줄 프레임 참조
        const taskbarFrame = document.getElementById('taskbar-frame');

        // Webamp 컨테이너 생성
        this.container = document.createElement('div');
        this.container.id = 'webamp-container';
        this.container.style.cssText = 'position: absolute; top: 0px; left: 0px; z-index: 200;';
        document.getElementById('desktop-area').appendChild(this.container);

        // Webamp 인스턴스 생성
        this.webamp = new Webamp({
            initialTracks: [
                {
                    metaData: {
                        artist: "Wolfgang Amadeus Mozart",
                        title: "Turkish March",
                    },
                    url: "./app/webamp/Turkish March.mp3",
                },
                {
                    metaData: {
                        artist: "Johann Pachelbel",
                        title: "Canon",
                    },
                    url: "./app/webamp/canon.mp3",
                },
            ]
        });

        // 이벤트 핸들러 연결
        // 닫기
        this.webamp.onClose(() => {
            this.container.remove();
            this.container = null;
            this.webamp.dispose();
            this.webamp = null;
            if (taskbarFrame) {
                this.sendTaskbarMessage({ type: 'removeTaskbarTab', windowId: WEBAMP_WINDOW_ID });
            }
        });

        // 최소화
        this.webamp.onMinimize(() => {
            this.container.style.display = 'none';
            if (taskbarFrame) {
                this.sendTaskbarMessage({ type: 'deactivateTaskbarTab', windowId: WEBAMP_WINDOW_ID });
            }
        });

        // 렌더링 후 컨테이너로 이동 (중요: Webamp가 body에 붙는 문제 해결)
        this.webamp.renderWhenReady(this.container).then(() => {
            const webampElement = document.getElementById('webamp');
            if (webampElement) {
                this.container.appendChild(webampElement);
            }
        });

        // 작업표시줄에 탭 추가 및 활성화
        if (taskbarFrame) {
            this.sendTaskbarMessage({
                type: 'addTaskbarTab',
                windowId: WEBAMP_WINDOW_ID,
                title: iconData ? iconData.title : 'Webamp',
                iconUrl: iconData ? iconData.iconUrl : './image/mediaplayer.png'
            });
            this.sendTaskbarMessage({
                type: 'activateTaskbarTab',
                windowId: WEBAMP_WINDOW_ID
            });
        }
    }

    /**
     * Webamp 가시성 토글 (작업표시줄 탭 클릭 시 호출됨)
     */
    toggleWebamp() {
        const existingContainer = document.getElementById('webamp-container');
        if (!existingContainer) return;

        if (existingContainer.style.display === 'none') {
            // 보이기
            existingContainer.style.display = '';
            this.sendTaskbarMessage({ type: 'activateTaskbarTab', windowId: WEBAMP_WINDOW_ID });
        } else {
            // 숨기기 (최소화)
            existingContainer.style.display = 'none';
            this.sendTaskbarMessage({ type: 'deactivateTaskbarTab', windowId: WEBAMP_WINDOW_ID });
        }
    }

    /**
     * Webamp 볼륨 조절
     * @param {number} volume - 0.0 ~ 1.0 사이의 값
     */
    setVolume(volume) {
        if (!this.webamp) return;

        // 값 범위 보정
        const vol = Math.max(0, Math.min(1, volume));
        const volPercent = Math.round(vol * 100);

        // 방법 1: Webamp 인스턴스가 setVolume 메서드를 지원하는지 확인 (비표준)
        try {
            if (typeof this.webamp.setVolume === 'function') {
                this.webamp.setVolume(volPercent);
            }
            // 방법 2: Webamp Store dispatch (Redux 액션 추측)
            else if (this.webamp.store && typeof this.webamp.store.dispatch === 'function') {
                this.webamp.store.dispatch({ type: 'SET_VOLUME', volume: volPercent });
            }
        } catch (e) {
            console.warn('Webamp setVolume API Error:', e);
        }

        // 방법 3: DOM 직접 제어 (Webamp가 <audio> 태그를 사용하는 경우)
        // Webamp는 보통 #webamp-container 내부에 렌더링됨
        if (this.container) {
            const audioElements = this.container.querySelectorAll('audio');
            audioElements.forEach(audio => {
                audio.volume = vol;
            });
        }
    }

    /**
     * 작업표시줄 메시지 전송
     * @param {Object} data - 전송할 메시지 데이터
     */
    sendTaskbarMessage(data) {
        const taskbarFrame = document.getElementById('taskbar-frame');
        if (taskbarFrame && taskbarFrame.contentWindow) {
            taskbarFrame.contentWindow.postMessage(data, '*');
        }
    }
}

// 싱글톤 인스턴스 생성 및 내보내기
const webampManager = new WebampManager();
// 전역 접근 가능하도록 노출 (volumeManager 등에서 사용)
window.webampManager = webampManager;

export default webampManager;
