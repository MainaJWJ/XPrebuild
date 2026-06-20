// focusController.js
document.addEventListener('DOMContentLoaded', () => {
  // iframe 내부 어디든지 클릭 시 해당 창에 포커스를 주는 이벤트 리스너
  if (window.parent !== window) {
    // 현재 창이 iframe 내부일 경우
    document.addEventListener('click', (e) => {
      // iframe 요소를 찾아서 해당 창의 ID를 찾기
      const iframes = parent.document.querySelectorAll('iframe');
      let currentWindowId = null;

      for (let iframe of iframes) {
        if (iframe.contentWindow === window) {
          // 이 iframe의 부모 창 요소를 찾기
          const parentWindow = iframe.closest('.xp-window, #wmplayer-container');
          if (parentWindow) {
            currentWindowId = parentWindow.id;
            break;
          }
        }
      }

      if (currentWindowId) {
        // 부모 창에 포커스 요청 메시지 보내기
        parent.postMessage({
          type: 'focusWindow',
          windowId: currentWindowId
        }, '*');
      }
    });
  }
});