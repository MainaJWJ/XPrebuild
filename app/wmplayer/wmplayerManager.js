// app/wmplayer/wmplayerManager.js
// Windows Media Player의 완전히 독립된 frameless 실행을 관리하는 매니저입니다.
const WMPLAYER_WINDOW_ID = 'wmplayer-window';

class WMPlayerManager {
    constructor() {
        this.container = null;
        this.iframe = null;
        this.isDragging = false;
        this.startX = 0;
        this.startY = 0;
        this.startLeft = 0;
        this.startTop = 0;
        this.isResizing = false;
        this.startWidth = 0;
        this.startHeight = 0;
        
        // Listen to messages from the iframe for drag control
        window.addEventListener('message', this.handleMessage.bind(this));
    }

    launchWMPlayer(iconData) {
        const existingContainer = document.getElementById('wmplayer-container');
        if (existingContainer) {
            if (existingContainer.style.display === 'none') {
                existingContainer.style.display = '';
                this.sendTaskbarMessage({ type: 'activateTaskbarTab', windowId: WMPLAYER_WINDOW_ID });
            } else {
                this.sendTaskbarMessage({ type: 'activateTaskbarTab', windowId: WMPLAYER_WINDOW_ID });
            }
            this.bringToFront();
            return;
        }

        // 컨테이너 생성
        this.container = document.createElement('div');
        this.container.id = 'wmplayer-container';
        // 기본 시작 위치 및 z-index 설정 (너비/높이는 앱 컨텐츠 크기와 동일하게 640x552 지정)
        this.container.style.cssText = 'position: absolute; top: 30px; left: 150px; z-index: 101; width: 640px; height: 553px; border: none; background: transparent; display: flex; align-items: center; justify-content: center;';
        
        // 클릭 시 최상단
        this.container.addEventListener('mousedown', () => this.bringToFront());
        
        // iframe 생성
        this.iframe = document.createElement('iframe');
        // frameless & 투명 배경 & 전체화면 허용
        this.iframe.style.cssText = 'width: 100%; height: 100%; border: none; background: transparent;';
        this.iframe.src = './app/wmplayer/index.html';
        this.iframe.setAttribute('allowfullscreen', 'true');
        this.iframe.setAttribute('allow', 'fullscreen');
        
        this.container.appendChild(this.iframe);
        document.getElementById('desktop-area').appendChild(this.container);

        // 작업표시줄 등록
        this.sendTaskbarMessage({
            type: 'addTaskbarTab',
            windowId: WMPLAYER_WINDOW_ID,
            title: iconData ? iconData.title : 'Windows Media Player',
            iconUrl: iconData ? iconData.iconUrl : './image/mediaplayer.png'
        });
        this.sendTaskbarMessage({
            type: 'activateTaskbarTab',
            windowId: WMPLAYER_WINDOW_ID
        });
        
        this.bringToFront();
    }

    toggleWMPlayer() {
        if (!this.container) return;
        if (this.container.style.display === 'none') {
            this.container.style.display = '';
            this.sendTaskbarMessage({ type: 'activateTaskbarTab', windowId: WMPLAYER_WINDOW_ID });
            this.bringToFront();
        } else {
            this.container.style.display = 'none';
            this.sendTaskbarMessage({ type: 'deactivateTaskbarTab', windowId: WMPLAYER_WINDOW_ID });
        }
    }

    closeWMPlayer() {
        if (this.container) {
            this.container.remove();
            this.container = null;
            this.iframe = null;
            this.sendTaskbarMessage({ type: 'removeTaskbarTab', windowId: WMPLAYER_WINDOW_ID });
        }
    }

    bringToFront() {
        if (!this.container) return;
        // windowManager의 최고 zIndex 정책에 맞춤
        import('../../windowManager.js').then(module => {
            const wm = module.default;
            if(wm) {
                wm.highestZIndex++;
                this.container.style.zIndex = wm.highestZIndex;
            }
        });
    }

    handleMessage(e) {
        if (e.data.type === 'focusWindow' && e.data.windowId === 'wmplayer-window') {
            this.bringToFront();
        }

        // 드래그 제어 로직 
        if (e.data.type === 'wmplayerDragStart') {
            // iframe 위로 마우스가 지나갈 때 버벅임(이벤트 뺏김) 방지용 투명판
            if (!document.getElementById('wm-drag-glass')) {
                const glass = document.createElement('div');
                glass.id = 'wm-drag-glass';
                glass.style.cssText = 'position: absolute; top:0; left:0; width:100%; height:100%; z-index:999999; cursor: move;';
                document.body.appendChild(glass);
            }
            this.isDragging = true;
            this.startX = e.data.x;
            this.startY = e.data.y;
            this.startLeft = this.container.offsetLeft;
            this.startTop = this.container.offsetTop;
            this.bringToFront();
        } else if (e.data.type === 'wmplayerDrag') {
            if (this.isDragging && this.container) {
                const dx = e.data.x - this.startX;
                const dy = e.data.y - this.startY;
                this.container.style.left = (this.startLeft + dx) + 'px';
                this.container.style.top = (this.startTop + dy) + 'px';
            }
        } else if (e.data.type === 'wmplayerDragEnd') {
            this.isDragging = false;
            const glass = document.getElementById('wm-drag-glass');
            if (glass) glass.remove();
        } else if (e.data.type === 'wmplayerClose') {
            this.closeWMPlayer();
        } else if (e.data.type === 'wmplayerMinimize') {
            this.toggleWMPlayer();
        } else if (e.data.type === 'wmplayerResizeStart') {
            if (!document.getElementById('wm-drag-glass')) {
                const glass = document.createElement('div');
                glass.id = 'wm-drag-glass';
                glass.style.cssText = 'position: absolute; top:0; left:0; width:100%; height:100%; z-index:999999; cursor: se-resize;';
                document.body.appendChild(glass);
            }
            this.isResizing = true;
            this.startX = e.data.x;
            this.startY = e.data.y;
            this.startWidth = parseInt(this.container.style.width, 10) || 640;
            this.startHeight = parseInt(this.container.style.height, 10) || 560;
            this.bringToFront();
        } else if (e.data.type === 'wmplayerResize') {
            if (this.isResizing && this.container) {
                const dx = e.data.x - this.startX;
                const dy = e.data.y - this.startY;
                let newWidth = this.startWidth + dx;
                let newHeight = this.startHeight + dy;
                        
                // 최소 200x200 제한
                if (newWidth < 200) newWidth = 200;
                if (newHeight < 200) newHeight = 200;
                        
                this.container.style.width = newWidth + 'px';
                this.container.style.height = newHeight + 'px';
            }
        } else if (e.data.type === 'wmplayerResizeEnd') {
            this.isResizing = false;
            const glass = document.getElementById('wm-drag-glass');
            if (glass) glass.remove();
        } else if (e.data.type === 'wmplayerToggleSkinMode') {
            if (this.container) {
                if (e.data.isMiniplayer) {
                    // 미니플레이어 모드: 크기 축소
                    this.originalWidth = this.container.style.width;
                    this.originalHeight = this.container.style.height;
                    this.container.style.width = '360px';
                    this.container.style.height = '185px';
                } else {
                    // 일반 모드: 크기 복구
                    this.container.style.width = this.originalWidth || '640px';
                    this.container.style.height = this.originalHeight || '553px';
                }
            }
        }
    }

    sendTaskbarMessage(data) {
        const taskbarFrame = document.getElementById('taskbar-frame');
        if (taskbarFrame && taskbarFrame.contentWindow) {
            taskbarFrame.contentWindow.postMessage(data, '*');
        }
    }
}

const wmplayerManager = new WMPlayerManager();
window.wmplayerManager = wmplayerManager;
export default wmplayerManager;
