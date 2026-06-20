// fullscreenAppManager.js
// 이 파일은 전체화면 앱(화면보호기 등)을 관리합니다.

// 역할: 전체화면 앱 관리자 (특별 담당자)
// 책임:
// 1. 전체 화면을 차지하는 앱(화면보호기, 영화 플레이어 등)을 관리함
// 2. 제목 표시줄 없이 화면 전체를 사용함
// 3. ESC 키를 누르면 종료됨
// 4. 앱 내부에서 사용자 입력을 감지하면 종료됨 (postMessage를 통해)
// 5. 일반 창과는 다른 방식으로 동작함

class FullscreenAppManager {
  constructor() {
    // 관리되는 모든 전체화면 앱 목록
    this.windows = [];
    
    // message 이벤트 리스너 등록 (한 번만 등록)
    this.handleMessage = this.handleMessage.bind(this);
    window.addEventListener('message', this.handleMessage);
  }
  
  // message 이벤트 처리
  handleMessage(event) {
    // 메시지 데이터 확인
    const data = event.data;
    
    // type이 'exitFullscreenApp'인 메시지를 받았을 때
    if (data && data.type === 'exitFullscreenApp') {
      // 현재 활성화된 전체화면 앱을 찾아서 종료
      // (가장 최근에 생성된 전체화면 앱을 종료하도록 가정)
      const latestWindow = this.windows[this.windows.length - 1];
      if (latestWindow) {
        this.closeWindow(latestWindow.id);
      }
    }
  }
  
  // 전체화면 앱 실행
  // appLauncher.js에서 fullscreen: true인 앱이 실행될 때 호출됨
  launchApp(options) {
    // 고유한 창 ID 생성 (타임스탬프 기반)
    const windowId = 'window-' + Date.now();
    
    // 창 요소 생성
    const windowEl = document.createElement('div');
    windowEl.id = windowId;
    windowEl.className = 'window active fullscreen'; // fullscreen 클래스 추가
    
    // 전체화면 스타일 적용 (작업표시줄 영역 제외)
    // 전체 화면을 차지하되 작업표시줄 공간은 제외함
    windowEl.style.cssText = `width: 100%; height: calc(100%); position: absolute; top: 0; left: 0; display: flex; flex-direction: column;`;
    
    // 전체화면 앱의 HTML 구조 정의 (제목 표시줄이 없는 경우도 고려)
    // 일반적인 전체화면 앱은 제목 표시줄 없이 전체 화면을 차지함
    windowEl.innerHTML = `
      <div class="window-body" style="flex-grow: 1; margin: 0; padding: 0; width: 100%; height: 100%;">
        <iframe src="${options.iframeSrc}" style="width:100%; height:100%; border:0;"></iframe>
      </div>
    `;
    
    // 데스크톱 영역에 창 추가
    document.getElementById('desktop-area').appendChild(windowEl);
    
    // 창 정보 저장 (전체화면 앱용)
    const windowInfo = {
      id: windowId,
      element: windowEl,
      title: options.title,
      minimized: false
    };
    
    this.windows.push(windowInfo);
    
    // ESC 키로 전체화면 종료 기능 추가
    // ESC 키를 누르면 전체화면 앱이 종료됨
    this.setupFullscreenExit(windowId);
    
    // 작업표시줄에 탭 추가 및 활성화
    // 전체화면 앱도 작업표시줄에 탭을 표시하여 관리함
    this.setupTaskbarIntegration(windowId, options);
    
    // 전체화면 앱은 최상단에 표시
    this.focusWindow(windowId);
    
    return windowId;
  }
  
  // 창 포커스 함수
  focusWindow(windowId) {
    const windowInfo = this.windows.find(w => w.id === windowId);
    if (!windowInfo) return;
    
    // 전체화면 앱은 최상단에 표시
    windowInfo.element.style.zIndex = '10000';
    
    // 모든 다른 일반 창의 active 클래스 제거
    document.querySelectorAll('.window:not(.fullscreen)').forEach(win => {
      win.classList.remove('active');
    });
    
    // 현재 창에 active 클래스 추가
    windowInfo.element.classList.add('active');
    
    // 커스텀 이벤트 발생시켜 부모 창에 알림
    const event = new CustomEvent('windowFocus', {
      detail: { windowId: windowId }
    });
    window.dispatchEvent(event);
  }
  
  // 작업표시줄 연동 설정
  setupTaskbarIntegration(windowId, options) {
    const taskbarFrame = document.getElementById('taskbar-frame');
    if (taskbarFrame) {
      taskbarFrame.contentWindow.postMessage({ 
        type: 'addTaskbarTab', 
        windowId, 
        title: options.title, 
        iconUrl: options.iconUrl 
      }, '*');
      taskbarFrame.contentWindow.postMessage({ 
        type: 'activateTaskbarTab', 
        windowId 
      }, '*');
    }
  }
  
  // 창 닫기 함수
  closeWindow(windowId) {
    const windowInfo = this.windows.find(w => w.id === windowId);
    if (!windowInfo) return;
    
    // 창 요소 제거
    windowInfo.element.remove();
    
    // ESC 키 이벤트 리스너 제거
    if (windowInfo.exitFullscreenHandler) {
      document.removeEventListener('keydown', windowInfo.exitFullscreenHandler);
    }
    
    // 창 목록에서 제거
    this.windows = this.windows.filter(w => w.id !== windowId);
    
    // 작업표시줄에 탭 제거 요청
    const taskbarFrame = document.getElementById('taskbar-frame');
    if (taskbarFrame) {
      taskbarFrame.contentWindow.postMessage({
        type: 'removeTaskbarTab',
        windowId: windowId
      }, '*');
    }
  }
  
  // 전체화면 종료 설정
  setupFullscreenExit(windowId) {
    const exitFullscreen = (e) => {
      if (e.key === 'Escape') {
        this.closeWindow(windowId);
      }
    };
    
    document.addEventListener('keydown', exitFullscreen);
    
    // 창 정보에서 이벤트 리스너 제거를 위한 참조 저장
    const windowInfo = this.windows.find(w => w.id === windowId);
    if (windowInfo) {
      windowInfo.exitFullscreenHandler = exitFullscreen;
    }
  }
}

const fullscreenAppManager = new FullscreenAppManager();
export default fullscreenAppManager;