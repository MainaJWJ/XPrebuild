// notification.js
// Windows XP 스타일 알림 시스템
// 이 파일은 Windows XP 운영체제의 알림 시스템과 유사한 말풍선 알림 UI를 구현합니다.
// 알림 표시, 타이머 관리, 닫기 기능 등을 제공합니다.

const riskIconSrc = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAAXJJREFUOE+tkz1Lw0AUhvN/GYuFlYhFpLGdIqKFwVZWqaIiKkKnYJdC49/QyVFwcBCrIHgJXAodpYJAFcEgcBQhEVEriC5O1yQ9g92k20t/OHD33HN37iUhnj/yA4w9Aqvq8YchoA+u2j47wBwAgP0XAGi9gE4B2I4P4LgP5gM41wG4P4BYDN4P8GgB1PZdzt/qOt7G9gFQuC9gBMsB7AYAvB9gqgdoEwDqBfL8eQd3NchPAOIC0AEgEwB4AEACABIBoEwB6G4E5w+g8wA2sLpC7A3M5wD8BwAfASgA0I8AJAJw+AAqA9g/APoAuP0A+wBGc4gGgNeA3gA8A+BsAagLwA9AD4C0A/gGACABIAJAJSBf/yAfgM0F6C2A9UuSXq/N9AF4eQCbAfgSQA2A9wB8A6j5A/wD4FwA9i+A+waAjAPgKwD/AfgDQAQAXwP4XwB/AfgBwA9g8gNoA/AIAHgBwAOA3QBc/QEAZgL4A9ANAOd/AfdXwP9PAAAA//8DAAUAASkAAAAFAAAAAAAA/wAAAAEAAAAAAAIAAAAFAAAAAQAA/wEAAAEAAAAAAAEAAAAA//8AAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';

// 말풍선의 상태(타이머 ID, DOM 요소)를 관리하는 객체
const balloonManager = {
  element: null,
  openTimer: null,
  fadeTimer: null,
  closeTimer: null,
};

/**
 * 말풍선을 숨기고 제거하는 함수
 */
function hideBalloon() {
  if (!balloonManager.element) return;

  // 모든 예정된 타이머를 취소
  clearTimeout(balloonManager.openTimer);
  clearTimeout(balloonManager.fadeTimer);
  clearTimeout(balloonManager.closeTimer);

  // 페이드 아웃 애니메이션 시작
  balloonManager.element.classList.remove('show');
  balloonManager.element.classList.add('hide');

  // 애니메이션(1초)이 끝난 후 DOM에서 완전히 제거
  balloonManager.closeTimer = setTimeout(() => {
    if (balloonManager.element) {
      balloonManager.element.remove();
      balloonManager.element = null;
    }
  }, 1000);
}

/**
 * 말풍선을 생성하고 표시하는 메인 함수
 * @param {object|string} options - 옵션 객체 또는 메시지 문자열
 * @param {number} options.startAfter - 표시 전 지연 시간 (ms)
 * @param {number} options.duration - 표시 시간 (ms)
 * @param {string} options.title - 알림 제목
 * @param {string} options.message - 알림 내용
 * @param {string} options.icon - 아이콘 URL (선택적)
 */
function showBalloon(options) {
  // 옵션이 문자열인 경우 메시지로 간주
  if (typeof options === 'string') {
    options = {
      startAfter: 0,
      duration: 15000,
      title: 'System - CRT Monitor Settings',
      message: options,
      icon: riskIconSrc
    };
  }

  // 기본값 설정
  const {
    startAfter = 0,
    duration = 15000,
    title,
    message,
    icon = riskIconSrc
  } = options;

  // 이미 말풍선이 있다면 기존 것을 제거
  if (balloonManager.element) {
    hideBalloon();
  }

  // JSX를 document.createElement로 변환
  const balloon = document.createElement('div');
  balloon.className = 'balloon';
  balloonManager.element = balloon;

  const container = document.createElement('div');
  container.className = 'balloon__container';

  const closeBtn = document.createElement('button');
  closeBtn.className = 'balloon__close';
  closeBtn.onclick = hideBalloon; // X 버튼 클릭 시 숨김 처리

  const header = document.createElement('div');
  header.className = 'balloon__header';

  const img = document.createElement('img');
  img.className = 'balloon__header__img';
  img.src = icon;
  img.alt = 'notification';

  const headerText = document.createElement('span');
  headerText.className = 'balloon__header__text';

  // 텍스트에서 'System' 부분을 찾아 이미지로 대체
  if (title.includes('System')) {
    // 'System' 앞에 panel.png 이미지를 삽입
    const parts = title.split('System');
    const iconImg = document.createElement('img');
    iconImg.src = './image/panel.png';
    iconImg.alt = 'system';
    iconImg.style.width = '14px';
    iconImg.style.height = '14px';
    iconImg.style.marginRight = '4px';
    iconImg.style.verticalAlign = 'middle';
    iconImg.style.marginTop = '-1px';

    if (parts[0]) {
      headerText.appendChild(document.createTextNode(parts[0]));
    }
    headerText.appendChild(iconImg);
    headerText.appendChild(document.createTextNode('System'));
    if (parts[1]) {
      headerText.appendChild(document.createTextNode(parts[1]));
    }
  } else {
    headerText.textContent = title;
  }

  const text1 = document.createElement('p');
  text1.className = 'balloon__text__first';
  text1.textContent = message;

  const text2 = document.createElement('p');
  text2.className = 'balloon__text__second';
  text2.style.marginTop = '5px';
  text2.style.color = '#555';
  text2.textContent = 'To turn off display effects, click this icon in the taskbar.';

  // 요소들을 조립
  header.append(img, headerText);
  container.append(closeBtn, header, text1, text2);
  balloon.appendChild(container);

  // useEffect의 타이머 로직을 setTimeout으로 구현
  balloonManager.openTimer = setTimeout(() => {
    document.body.appendChild(balloon);
    balloon.classList.add('show'); // 페이드 인 애니메이션 시작

    // --- 🎵 오디오 재생 코드 추가 부분 ---
    // 'path/to/your/audio.mp3'를 실제 오디오 파일 경로로 변경하세요.
    const notificationSound = new Audio('./audio/baloon.wav');
    notificationSound.play();
    // ------------------------------------


    // duration 이후에 페이드 아웃 시작
    balloonManager.fadeTimer = setTimeout(hideBalloon, duration);
  }, startAfter);
}

// CSS 스타일을 JS에서 동적으로 추가
function addBalloonStyles() {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes fadein {
      0% {
        opacity: 0;
      }
      100% {
        opacity: 1;
      }
    }

    @keyframes fadeout {
      0% {
        opacity: 1;
      }
      100% {
        opacity: 0;
        /* 애니메이션 후 클릭 방지를 위해 visibility hidden 처리 */
        visibility: hidden; 
      }
    }

    .balloon {
      position: fixed; /* 전체 화면 기준 위치 */
      right: 50px; /* 오른쪽 여백을 40px로 증가 */
      bottom: 42px; /* 하단 여백을 40px로 증가 */
      opacity: 0; /* 기본적으로 투명 */
      filter: drop-shadow(2px 2px 1px rgba(0, 0, 0, 0.4));
      z-index: 2000;
    }
    
    /* JS에서 클래스를 추가하여 애니메이션을 제어 */
    .balloon.show {
      animation: fadein 1s forwards;
    }

    .balloon.hide {
      animation: fadeout 1s forwards;
    }

    .balloon__container {
      position: relative; /* 꼬리 부분의 기준점 */
      border: 1px solid black;
      border-radius: 7px;
      padding: 6px 28px 10px 10px;
      background-color: #ffffe1;
      font-size: 11px;
      white-space: nowrap;
    }

    /* 말풍선 꼬리 (테두리) */
    .balloon__container:before {
      content: '';
      position: absolute;
      display: block;
      bottom: -19px;
      right: 14px;
      width: 0;
      height: 0;
      border-style: solid;
      border-width: 0 19px 19px 0;
      border-color: transparent black transparent transparent;
    }

    /* 말풍선 꼬리 (채우기) */
    .balloon__container:after {
      content: '';
      position: absolute;
      display: block;
      bottom: -17px;
      right: 15px;
      width: 0;
      height: 0;
      border-style: solid;
      border-width: 0 18px 18px 0;
      border-color: transparent #ffffe1 transparent transparent;
    }
    
    .balloon__close {
      outline: none;
      position: absolute;
      right: 4px;
      top: 4px;
      width: 14px;
      height: 14px;
      border: 1px solid rgba(0, 0, 0, 0.1);
      border-radius: 3px;
      background-color: transparent;
      cursor: pointer;
    }

    .balloon__close:hover {
      background-color: #ffa90c;
      border-color: white;
      box-shadow: 1px 1px rgba(0, 0, 0, 0.1);
    }

    .balloon__close:hover:before,
    .balloon__close:hover:after {
      background-color: white;
    }

    /* X 모양의 왼쪽 대각선 */
    .balloon__close:before {
      content: '';
      position: absolute;
      left: 5px;
      top: 2px;
      transform: rotate(45deg);
      height: 8px;
      width: 2px;
      background-color: rgba(170, 170, 170);
    }
    
    /* X 모양의 오른쪽 대각선 */
    .balloon__close:after {
      content: '';
      position: absolute;
      left: 5px;
      top: 2px;
      transform: rotate(-45deg);
      height: 8px;
      width: 2px;
      background-color: rgba(170, 170, 170);
    }

    .balloon__header {
      display: flex;
      align-items: center;
      font-weight: 700;
      transform: translateX(-24px); /* 전체 헤더를 왼쪽으로 10px 이동 */
    }

    .balloon__header__img {
      width: 14px;
      height: 14px;
      margin-right: 8px;
    }

    .balloon__text__first {
      margin: 5px 0 5px; /* 아래쪽 여백을 10px에서 15px로 증가 */
    }

    .balloon__text__second {
      margin: 0; /* 두 번째 텍스트의 여백 추가 */
    }
  `;
  document.head.appendChild(style);
}

// 페이지 로드 시 스타일 추가
document.addEventListener('DOMContentLoaded', function () {
  addBalloonStyles();
});

// 외부에서 사용할 수 있도록 함수들을 내보내기
window.showBalloon = showBalloon;
window.hideBalloon = hideBalloon;

// 조건별/메시지별 특화 함수들
window.showWelcomeNotification = function () {
  showBalloon({
    startAfter: 0,
    duration: 15000,
    title: 'System - Monitor Properties',
    message: 'CRT Filter has been initialized for realistic simulation.'
  });
};

window.showSecurityNotification = function () {
  showBalloon({
    startAfter: 0,
    duration: 15000,
    title: 'System - Visual Health Warning',
    message: 'High flicker intensity can cause eye fatigue. Please use responsibly.'
  });
};

window.showCustomNotification = function (title, message) {
  showBalloon({
    startAfter: 0,
    duration: 15000,
    title: title,
    message: message
  });
};



// 로그인 성공 시 환영 알림 표시
// logonManager.js에서 'logonSuccess' 메시지를 받을 때 알림 표시
window.addEventListener('message', (event) => {
  // 로그인 성공 메시지 처리
  if (event.data === 'logonSuccess' ||
    (typeof event.data === 'object' && event.data !== null && event.data.type === 'logonSuccess')) {
    // 로그인 성공 후 4초 뒤에 환영 알림 표시
    setTimeout(() => {
      window.showWelcomeNotification();
    }, 4000);  // 4초 뒤에 표시
  }
});