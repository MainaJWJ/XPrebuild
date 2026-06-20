// clippyManager.js
// 클리피 동적 파일 로드 및 초기화 모듈
// index.html을 지저분하게 만들지 않기 위해 필요한 파일(CSS, JS)들을 자바스크립트가 알아서 불러옵니다.
//
// ⚠️ 이 파일은 의도적으로 일반 <script>로 로드됩니다 (type="module" 아님).
//    이유: Clippy는 jQuery($)를 전역 변수로 필요로 하며, ES Module 환경에서는
//          동적으로 로드한 clippy.min.js가 전역 jQuery를 인식하지 못합니다.
//          따라서 전통적인 전역 스크립트 방식으로 유지합니다.


(function () {
    let isClippyLoaded = false;

    // 1. Clippy용 CSS 스타일시트 동적 추가
    const cssLink = document.createElement('link');
    cssLink.rel = 'stylesheet';
    cssLink.href = './app/clippy.js/build/clippy.css';
    cssLink.media = 'all';
    document.head.appendChild(cssLink);

    // 2. jQuery 동적 로드 (Clippy 구동에 필수)
    const jqScript = document.createElement('script');
    jqScript.src = './app/jspaint/lib/jquery-3.4.1.min.js';
    document.head.appendChild(jqScript);

    // 제이쿼리가 로딩 완료된 후에 실행할 내용
    jqScript.onload = () => {
        // 3. Clippy 핵심 JS 동적 로드
        const clippyScript = document.createElement('script');
        clippyScript.src = './app/clippy.js/build/clippy.min.js';
        document.head.appendChild(clippyScript);

        // 클리피 JS까지 로드가 완료되면 에이전트 생성 시작
        clippyScript.onload = () => {
            // S3 외부 링크 대신 로컬 에이전트 경로 지정
            window.clippy.BASE_PATH = './app/clippy.js/agents/';

            // Clippy 종이클립 캐릭터 메모리 탑재
            window.clippy.load('Clippy', function (agent) {
                // 다른 곳에서도 쓸 수 있게 전역 변수에 등록
                window.clippyAgent = agent;
                isClippyLoaded = true;

                // 캐릭터를 화면에 등장시키는 함수
                const showAgent = () => {
                    agent.show();
                    // 잠시 후 첫 인사 (자연스러운 딜레이)
                    setTimeout(() => {
                        agent.speak("안녕하세요! 바탕화면이 켜졌습니다. 도움이 필요하신가요?");
                        agent.animate();
                    }, 1000);
                };

                // 현재 바이오스 및 로그인 화면 상태 확인
                const biosContainer = document.getElementById('bios-container');
                const logonContainer = document.getElementById('logon-container');

                const isBiosGone = !biosContainer || biosContainer.style.display === 'none';
                const isLogonGone = !logonContainer || logonContainer.style.display === 'none';

                // 바이오스 화면과 로그인 화면 둘 다 없거나 숨겨진 경우 바로 등장
                if (isBiosGone && isLogonGone) {
                    showAgent();
                } else {
                    // 로그인 성공 메시지를 기다림 (바이오스 → 로그인 → 바탕화면 순서 완료 후)
                    const logonListener = (event) => {
                        const data = event.data;
                        if (data === 'logonSuccess' || (typeof data === 'object' && data !== null && data.type === 'logonSuccess')) {
                            showAgent();
                            // 한 번 나타나면 리스너 제거
                            window.removeEventListener('message', logonListener);
                        }
                    };
                    window.addEventListener('message', logonListener);
                }
            });
        };
    };

    /**
     * 외부(다른 앱, 콘솔 등)에서 클리피에게 말을 시키기 위한 유틸리티 함수
     * @param {string} text - 말할 내용
     */
    window.speakClippy = function (text) {
        if (window.clippyAgent && isClippyLoaded) {
            window.clippyAgent.speak(text);
        }
    };
})();
