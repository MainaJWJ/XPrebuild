// appengine.js
// 이 파일은 데스크톱의 핵심 동작을 조정하는 엔진입니다.
// 역할: OS 커널 및 메인 컨트롤러 (바탕화면, 작업표시줄, 앱 실행 총괄)

import windowManager from './windowManager.js';
import startMenu from './startMenu.js';
import fullscreenAppManager from './fullscreenAppManager.js';
import logonManager from './app/logon/logonManager.js';
import biosManager from './app/logon/bios/biosManager.js';
import updateManager from './app/logon/updateManager.js';
import FolderEnhancer from './folderEnhancer.js';
import { APPS, getDesktopIcons } from './appRegistry.js';
import { computeDefaultPositions, isSnapToGrid, setSnapToGrid, getNextAvailablePosition } from './desktopState.js';
import wmplayerManager from './app/wmplayer/wmplayerManager.js';

import { initIconDragger } from './iconDragger.js';

// =============================================================================
// Constants & State
// =============================================================================

// 작업표시줄 메시지 타입 상수
const TASKBAR_MESSAGE_TYPES = {
  ADD_TAB: 'addTaskbarTab',
  REMOVE_TAB: 'removeTaskbarTab',
  ACTIVATE_TAB: 'activateTaskbarTab',
  DEACTIVATE_TAB: 'deactivateTaskbarTab',
  DEACTIVATE_ALL_TABS: 'deactivateAllTaskbarTabs',
  LAUNCH_APP: 'launchApp',
  OPEN_START_MENU: 'openStartMenu',
  TASKBAR_TAB_CLICK: 'taskbarTabClick'
};

// 데스크톱 상태
let taskbarFrame = null;

// =============================================================================
// Core Functions: App Launching
// =============================================================================

/**
 * 앱을 실행합니다.
 * @param {Object} iconData - 아이콘 데이터 (id 필수)
 * @returns {string} windowId - 생성된 창의 ID
 */
export function launchApp(iconData) {
  // 1. 데이터에 직접 실행 옵션이 포함되어 있으면 그것을 사용 (실시간 생성 아이콘용)
  // 2. 없으면 APPS 레지스트리에서 ID로 조회 (기존 정적 아이콘용)
  const appConfig = iconData.launchOptions ? iconData : APPS[iconData.id];

  if (!appConfig || !appConfig.launchOptions) {
    console.error(`앱 실행 옵션을 찾을 수 없습니다: ${iconData.id}`);
    return;
  }

  // WMPlayer 처리 (통합 매니저 우회)
  if (iconData.id === 'wmplayer') {
    wmplayerManager.launchWMPlayer(appConfig);
    return 'wmplayer-window';
  }

  const options = appConfig.launchOptions;

  // 전체화면 앱 처리
  if (options.fullscreen === true) {
    return fullscreenAppManager.launchApp(options);
  }

  // 일반 창 앱 처리
  const windowId = windowManager.createWindow(options);

  // Payload 처리 (앱 로딩 후 메시지 전달)
  if (iconData.payload) {
    const win = windowManager.windows.find(w => w.id === windowId);
    if (win && win.element) {
      const iframe = win.element.querySelector('iframe');
      if (iframe) {
        iframe.onload = () => {
          console.log(`App loaded (${iconData.id}), sending payload:`, iconData.payload);
          iframe.contentWindow.postMessage(iconData.payload, '*');
        };
      }
    }
  }

  // 작업표시줄에 탭 추가
  const taskbar = document.getElementById('taskbar-frame');
  if (taskbar && taskbar.contentWindow) {
    taskbar.contentWindow.postMessage({
      type: TASKBAR_MESSAGE_TYPES.ADD_TAB,
      windowId,
      title: options.title,
      iconUrl: options.iconUrl
    }, '*');
    taskbar.contentWindow.postMessage({
      type: TASKBAR_MESSAGE_TYPES.ACTIVATE_TAB,
      windowId
    }, '*');
  }

  return windowId;
}

// =============================================================================
// Desktop Icon Manager
// =============================================================================

// 아이콘 위치 상태 (desktopState의 positions 객체)
let iconPositions = {};


function initializeDesktopIcons() {
  const container = document.getElementById('desktop-icons');
  const desktopArea = document.getElementById('desktop-area');

  if (!container || !desktopArea) {
    console.warn('필수 데스크톱 요소를 찾을 수 없습니다.');
    return;
  }

  // FolderEnhancer 초기화 (드래그 선택 + 우클릭 메뉴 + 키보드 이동 통합)
  new FolderEnhancer({
    container: desktopArea,
    selectableItems: '.desktop-icon',
    selectionClass: 'selected',
    cssPath: './contextMenu.css'
  }).initialize();

  // 바탕화면 빈 공간 클릭 시 창 비활성화 및 시작 메뉴 닫기
  desktopArea.addEventListener('click', (e) => {
    if (e.target === desktopArea || e.target === container) {
      windowManager.deactivateAllWindows();
      startMenu.close();
      const taskbar = document.getElementById('taskbar-frame');
      if (taskbar) taskbar.contentWindow.postMessage({ type: 'deactivateAllTaskbarTabs' }, '*');
    }
  });

  desktopArea.addEventListener('mousedown', (e) => {
    if (e.target === desktopArea && startMenu.isOpen) startMenu.close();
  });

  // 바탕화면 우클릭 메뉴 액션 처리
  desktopArea.addEventListener('context-menu-action', (e) => {
    const action = e.detail;
    switch (action) {
      case 'properties':
        launchApp({ id: 'display-properties' });
        break;
      case 'new':
        addDesktopIcon({
          id: 'documents' + Date.now(),
          title: 'New Folder',
          iconUrl: './image/folder.png',
          launchOptions: {
            title: 'New Folder (Documents)',
            iframeSrc: './app/documents.html',
            width: 800,
            height: 600,
            iconUrl: './image/folder.png'
          }
        });
        break;
      default:
        console.log(`Context menu action triggered: ${action}`);
    }
  });

  // === 그리드 기반 아이콘 렌더링 ===
  const desktopApps = getDesktopIcons(); // flat array

  // appRegistry의 desktopColumn 정보를 기반으로 기본 좌표 계산
  iconPositions = computeDefaultPositions(desktopApps);

  // 아이콘 엘리먼트 생성 및 배치
  container.innerHTML = '';
  desktopApps.forEach(iconData => {
    const pos = iconPositions[iconData.id];
    if (!pos) return;

    const iconEl = createIconElement(iconData, pos);
    container.appendChild(iconEl);
  });

  // 드래그 앤 드롭 초기화 (아이콘 위치 상태 객체를 공유합니다)
  initIconDragger(container, iconPositions);
}

/**
 * 바탕화면 아이콘 엘리먼트를 생성합니다.
 * @param {Object} iconData - 아이콘 정보
 * @param {Object} pos - { left, top } 좌표
 * @returns {HTMLElement} 생성된 아이콘 엘리먼트
 */
function createIconElement(iconData, pos) {
  const iconEl = document.createElement('div');
  iconEl.className = 'desktop-icon';
  iconEl.id = iconData.id;
  iconEl.style.left = `${pos.left}px`;
  iconEl.style.top = `${pos.top}px`;

  const img = document.createElement('img');
  img.src = iconData.iconUrl;
  img.ondragstart = (e) => e.preventDefault(); // 브라우저 기본 드래그 방지

  const span = document.createElement('span');
  span.textContent = iconData.title;

  iconEl.addEventListener('dblclick', () => {
    if (iconData.id === 'icon-webamp') {
      windowManager.openWebamp(iconData.launchOptions);
    } else {
      launchApp(iconData);
    }
  });

  iconEl.appendChild(img);
  iconEl.appendChild(span);
  
  return iconEl;
}

/**
 * 실시간으로 바탕화면에 아이콘을 추가합니다.
 * @param {Object} iconData - 추가할 아이콘 데이터 { id, title, iconUrl, launchOptions }
 */
export function addDesktopIcon(iconData) {
  const container = document.getElementById('desktop-icons');
  if (!container) return;

  // 1. 이미 존재하는 아이콘이면 중단
  if (document.getElementById(iconData.id)) {
    console.warn(`아이콘이 이미 존재합니다: ${iconData.id}`);
    return;
  }

  // 2. 비어있는 위치 계산
  const pos = getNextAvailablePosition(iconPositions);
  iconPositions[iconData.id] = pos;

  // 3. 엘리먼트 생성 및 추가
  const iconEl = createIconElement(iconData, pos);
  container.appendChild(iconEl);

  console.log(`새 아이콘 추가됨: ${iconData.title} at (${pos.left}, ${pos.top})`);
}

// =============================================================================
// Taskbar Manager
// =============================================================================

function handleTaskbarMessage(data) {
  // 메시지 중계: appengine -> taskbar iframe
  if (taskbarFrame && taskbarFrame.contentWindow) {
    taskbarFrame.contentWindow.postMessage(data, '*');
  }
}

// =============================================================================
// Main Initialization & Event Listeners
// =============================================================================

function initializeDesktop() {
  biosManager.initializeBiosScreen(() => {
    logonManager.initializeLogonScreen();
  });
  updateManager.initialize();
  initializeDesktopIcons();

  // taskbar iframe은 load 이후에 접근 가능
  window.addEventListener('load', () => {
    taskbarFrame = document.getElementById('taskbar-frame');
  });

  // 시작 메뉴 & 전체화면 앱에 launchApp 함수 주입
  if (startMenu.setLauncher) startMenu.setLauncher(launchApp);
  if (fullscreenAppManager.setLauncher) fullscreenAppManager.setLauncher(launchApp);

  // ======================================================
  // 전역 API 등록
  // 나중에 UI(예: Display Properties)에서 아래와 같이 호출하여 사용합니다:
  //   window.setSnapToGrid(true)   → Snap 모드 켜기
  //   window.setSnapToGrid(false)  → 자유 배치 모드
  //   window.setSnapToGrid()       → 현재 모드 토글
  //   window.isSnapToGrid()        → 현재 상태 조회 (boolean)
  // ======================================================
  window.setSnapToGrid = setSnapToGrid;
  window.isSnapToGrid  = isSnapToGrid;
  window.addDesktopIcon = addDesktopIcon; // 실시간 아이콘 추가 API
  window.launchApp = launchApp;           // 커스텀 앱 실행 API 등록
  window.startUpdate   = () => updateManager.showUpdateScreen();

  // 메시지 리스너
  setupMessageListener();

  // 창 포커스 리스너
  window.addEventListener('windowFocus', (event) => {
    if (taskbarFrame && taskbarFrame.contentWindow) {
      taskbarFrame.contentWindow.postMessage({
        type: 'activateTaskbarTab',
        windowId: event.detail.windowId
      }, '*');
    }
  });
}

function setupMessageListener() {
  window.addEventListener('message', (event) => {
    const data = event.data;

    // Taskbar Message Relay
    if ([
      TASKBAR_MESSAGE_TYPES.OPEN_START_MENU,
      TASKBAR_MESSAGE_TYPES.TASKBAR_TAB_CLICK, // 주의: taskbarTabClick은 아래 case에서 별도 처리됨
      TASKBAR_MESSAGE_TYPES.ADD_TAB,
      TASKBAR_MESSAGE_TYPES.REMOVE_TAB,
      TASKBAR_MESSAGE_TYPES.ACTIVATE_TAB,
      TASKBAR_MESSAGE_TYPES.DEACTIVATE_TAB,
      TASKBAR_MESSAGE_TYPES.DEACTIVATE_ALL_TABS
    ].includes(data.type)) {
      // 일부 메시지는 중계 필요
      if (data.type !== TASKBAR_MESSAGE_TYPES.TASKBAR_TAB_CLICK && data.type !== 'openStartMenu') {
        handleTaskbarMessage(data);
      }
    }

    // Main Action Switching
    switch (data.type) {
      case 'openStartMenu':
        startMenu.toggle();
        handleTaskbarMessage(data); // Taskbar 버튼 상태 동기화용일 수 있음
        break;
      case 'taskbarTabClick':
        windowManager.handleTaskbarTabClick(data.windowId);
        handleTaskbarMessage(data);
        break;
      case 'launchApp':
        launchApp({ id: data.appId, payload: data.payload });
        break;
      case 'focusWindow':
        windowManager.focusWindow(data.windowId);
        break;
      case 'deactivateAllWindows':
        windowManager.deactivateAllWindows();
        break;
      case 'startUpdate':
        updateManager.showUpdateScreen();
        break;

      // Existing Specific Open Handlers (Refactored to be cleaner)
      case 'openImageViewer': case 'openTextFile': case 'openPdfFile':
        relayMessageToApp(data.type === 'openImageViewer' ? ['Microsoft Image Viewer', 'Windows Picture Viewer', 'Image Viewer'] :
          data.type === 'openTextFile' ? ['Microsoft notepad'] : ['Adobe PDF Reader'],
          data);
        break;

      case 'openVideo':
        handleOpenVideo(data);
        break;

      case 'closeWindow':
        handleCloseWindow(event.source);
        break;
    }
  });
}

// --- Helper for Message Relaying ---
function relayMessageToApp(titles, data) {
  const wins = Object.values(windowManager.windows).filter(w => titles.includes(w.title));
  if (wins.length > 0) {
    const last = wins[wins.length - 1];
    if (last.element) {
      const iframe = last.element.querySelector('iframe');
      if (iframe && iframe.contentWindow) iframe.contentWindow.postMessage(data, '*');
    }
  }
}

function handleOpenVideo(data) {
  // 앱이 이미 실행 중인지 확인 (기존 iframe 존재 여부)
  const isAlreadyOpen = !!wmplayerManager.container;
  
  // WMP 전용 매니저를 사용하여 앱 실행
  wmplayerManager.launchWMPlayer(APPS['wmplayer']);

  // 메시지 전송 헬퍼 함수
  const sendMessage = () => {
    if (wmplayerManager.iframe && wmplayerManager.iframe.contentWindow) {
      console.log('AppEngine: Sending video data to WMP:', data);
      wmplayerManager.iframe.contentWindow.postMessage(data, '*');
    }
  };

  if (isAlreadyOpen) {
    // 이미 실행 중인 경우 즉시 전송
    sendMessage();
  } else {
    // 새로 실행하는 경우, iframe 로딩 완료 시점을 기다림
    wmplayerManager.iframe.onload = () => {
      console.log('AppEngine: WMP Iframe loaded, sending video data.');
      sendMessage();
      // 일회성 실행 후 핸들러 제거
      wmplayerManager.iframe.onload = null;
    };
  }
}

function handleCloseWindow(sourceWindow) {
  const targetWin = windowManager.windows.find(win =>
    win.element.querySelector('iframe') && win.element.querySelector('iframe').contentWindow === sourceWindow
  );
  if (targetWin) {
    windowManager.closeWindow(targetWin.id);
    if (taskbarFrame && taskbarFrame.contentWindow) {
      taskbarFrame.contentWindow.postMessage({ type: 'removeTaskbarTab', windowId: targetWin.id }, '*');
    }
  }
}

document.addEventListener('DOMContentLoaded', initializeDesktop);

// Export for other modules if needed (though mostly internal now)
export default {
  launchApp,
  initializeDesktop
};