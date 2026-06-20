/**
 * volumeManager.js
 * 작업 표시줄의 볼륨 아이콘을 클릭했을 때 나타나는 볼륨 조절 UI를 관리하는 모듈입니다.
 * 스타일, HTML 구조 생성, 이벤트 처리를 모두 이 파일 하나에서 담당합니다.
 */

class VolumeManager {
    constructor() {
        this.popup = null;
        this.isVisible = false;
        this.taskbarFrame = null;

        // 채널별 상태 관리
        this.channels = {
            'Master': { volume: 50, muted: false, lastVolume: 50 },
            'Wave': { volume: 50, muted: false, lastVolume: 50 },
            'SW Synth': { volume: 50, muted: false, lastVolume: 50 },
            'CD Player': { volume: 50, muted: false, lastVolume: 50 }
        };
    }

    /**
     * 초기화 함수
     * DOM 로드 시 메인 스크립트에서 호출해야 합니다.
     */
    initialize() {
        this._injectStyles();
        this._createPopup();
        this._setupTaskbarListener();
        this._setupGlobalCloseListener();
    }

    /**
     * 작업 표시줄(iframe)이 로드되기를 기다렸다가 아이콘에 이벤트를 바인딩합니다.
     */
    _setupTaskbarListener() {
        this.taskbarFrame = document.getElementById('taskbar-frame');

        if (!this.taskbarFrame) {
            console.error('VolumeManager: taskbar-frame을 찾을 수 없습니다.');
            return;
        }

        // iframe이 이미 로드되었는지 확인
        if (this.taskbarFrame.contentDocument && this.taskbarFrame.contentDocument.readyState === 'complete') {
            this._bindIconClick();
        } else {
            this.taskbarFrame.addEventListener('load', () => {
                this._bindIconClick();
            });
        }
    }

    /**
     * 실제 볼륨 아이콘에 클릭 이벤트를 연결합니다.
     */
    _bindIconClick() {
        try {
            const doc = this.taskbarFrame.contentDocument;
            // alt="볼륨" 속성을 가진 이미지를 찾습니다. (taskbar.html 참조)
            const volumeIcon = doc.querySelector('img[alt="볼륨"]') || doc.querySelector('.volume-icon');

            if (volumeIcon) {
                // 커서를 포인터로 변경
                volumeIcon.style.cursor = 'pointer';

                volumeIcon.addEventListener('click', (e) => {
                    e.stopPropagation(); // iframe 내 전파 방지
                    this._togglePopup();
                });
            } else {
                console.warn('VolumeManager: 볼륨 아이콘을 찾을 수 없습니다.');
            }
        } catch (e) {
            console.error('VolumeManager: 작업 표시줄 접근 중 오류 발생', e);
        }
    }

    /**
     * 팝업을 열거나 닫습니다.
     */
    _togglePopup() {
        if (this.isVisible) {
            this._hide();
        } else {
            this._show();
        }
    }

    /**
     * 팝업을 표시합니다. 위치를 계산하여 아이콘 위에 띄웁니다.
     */
    _show() {
        this.popup.style.display = 'flex';

        // 위치 계산
        // iframe의 위치는 고정되어 있다고 가정하지만, 정확성을 위해 계산할 수도 있습니다.
        // 여기서는 작업 표시줄 높이(30px) 만큼 띄웁니다.
        // 가로 위치는 오른쪽에서 적당한 위치 (트레이 아이콘 위치 고려)
        // taskbar.css를 보면 .taskbar-items-right는 flex shrink 없이 고정 영역입니다.
        // 볼륨 아이콘의 정확한 위치를 iframe 좌표계에서 가져오면 좋겠지만, 
        // iframe이 cross-origin이 아니므로 접근 가능합니다.

        try {
            const doc = this.taskbarFrame.contentDocument;
            const volumeIcon = doc.querySelector('img[alt="볼륨"]');

            if (volumeIcon) {
                const rect = volumeIcon.getBoundingClientRect();
                // iframe의 위치(화면 하단) + iframe 내 아이콘의 x 좌표
                // iframe은 bottom:0, right:0 이므로...
                // 간단하게 화면 오른쪽에서 일정 거리(트레이 위치)에 맞춥니다.
                // 또는 rect.left + iframe.offsetLeft ...

                // 메인 창 기준 iframe의 위치
                const iframeRect = this.taskbarFrame.getBoundingClientRect();

                // 팝업 가로 위치: iframe 왼쪽 시작점 + 아이콘의 x값 - (팝업 너비/2) + (아이콘 너비/2)
                const popupWidth = 300; // CSS에 정의된 너비
                let left = iframeRect.left + rect.left - (popupWidth / 2) + (rect.width / 2);

                // 화면 벗어남 방지 (오른쪽)
                if (left + popupWidth > window.innerWidth) {
                    left = window.innerWidth - popupWidth - 10; // 10px 여백
                }
                // 화면 벗어남 방지 (왼쪽)
                if (left < 0) {
                    left = 10;
                }

                this.popup.style.left = `${left}px`;
                this.popup.style.bottom = '32px'; // 작업표시줄 높이 + 여백
            } else {
                // 아이콘을 못 찾으면 대략적인 위치 (오른쪽 하단)
                this.popup.style.right = '60px'; // 시계 옆 정도
                this.popup.style.bottom = '32px';
            }
        } catch (e) {
            this.popup.style.right = '60px';
            this.popup.style.bottom = '32px';
        }

        this.isVisible = true;

        // 애니메이션 효과 (선택 사항)
    }

    /**
     * 팝업을 숨깁니다.
     */
    _hide() {
        this.popup.style.display = 'none';
        this.isVisible = false;
    }

    /**
     * 메인 화면 어디든 클릭하면 팝업을 닫는 리스터
     */
    _setupGlobalCloseListener() {
        // 메인 document 클릭
        document.addEventListener('mousedown', (e) => {
            if (this.isVisible && !this.popup.contains(e.target)) {
                this._hide();
            }
        });

        // iframe 내부 클릭 시에도 닫혀야 함
        // (taskbarFrame load 이벤트 내에서 처리해야 함)
        if (this.taskbarFrame) {
            this.taskbarFrame.addEventListener('load', () => {
                this.taskbarFrame.contentDocument.addEventListener('mousedown', () => {
                    // 아이콘 클릭이 아닌 경우에만 (아이콘 클릭은 토글이므로)
                    // 하지만 이벤트 전파 속도 차이로 인해 토글 로직과 겹칠 수 있음.
                    // 여기서는 단순히 외부 클릭으로 간주하고 닫기 시도
                    // (toggle 메서드에서 stopPropagation을 했으므로, 여기까지 오면 아이콘 밖임)
                    if (this.isVisible) this._hide();
                });
            });
        }
    }

    /**
     * 볼륨 조절 UI HTML 생성
     */
    /**
     * 볼륨 조절 UI HTML 생성
     */
    _createPopup() {
        if (document.getElementById('volume-popup-container')) return;

        const container = document.createElement('div');
        container.id = 'volume-popup-container';
        // xp-window 클래스 제거, 심플한 팝업 클래스만 유지
        container.className = 'volume-popup';

        // 4개의 슬라이더 그룹 생성
        // 각 그룹은: 슬라이더 + 눈금 + 아이콘
        const sliderGroupHTML = `
            <div class="slider-group" style="display: flex; flex-direction: column; align-items: center; margin: 0 10px;">
                <div style="display: flex; flex-direction: row; align-items: center; height: 110px;">
                    <div class="vertical-slider-wrapper">
                        <input type="range" class="vertical-input-range" min="0" max="100" value="50" orient="vertical">
                    </div>
                    <div class="volume-scale">
                        <div class="tick long"></div>
                        <div class="tick short"></div>
                        <div class="tick long"></div>
                        <div class="tick short"></div>
                        <div class="tick long"></div>
                        <div class="tick short"></div>
                        <div class="tick long"></div>
                        <div class="tick short"></div>
                        <div class="tick long"></div>
                    </div>
                </div>
                <!-- 볼륨 아이콘 추가 -->
                <img class="volume-icon-img" src="./image/volume.png" alt="Volume" style="width: 16px; height: 16px; margin-top: 5px; cursor: pointer;">
                <div class="slider-label" style="font-size: 11px; margin-top: 5px; font-family: 'Tahoma', sans-serif;">Volume</div>
            </div>
        `;

        // 4개 복사 및 채널 데이터 속성 추가
        const labels = ['Master', 'Wave', 'SW Synth', 'CD Player'];
        let innerBody = '';

        labels.forEach(label => {
            // HTML 생성 시 data-channel 속성 주입
            let html = sliderGroupHTML.replace('Volume</div>', `${label}</div>`);
            // 슬라이더 input에 data-channel 추가
            html = html.replace('class="vertical-input-range"', `class="vertical-input-range" data-channel="${label}"`);
            // 아이콘 img에 data-channel 추가
            html = html.replace('class="volume-icon-img"', `class="volume-icon-img" data-channel="${label}"`);
            innerBody += html;
        });

        container.innerHTML = `
            <div class="window-body" style="display: flex; flex-direction: row; justify-content: center; align-items: flex-start; padding: 10px 5px 5px 5px; height: 100%;">
                ${innerBody}
            </div>
        `;

        document.body.appendChild(container); // 메인 바디에 추가
        this.popup = container;

        // 슬라이더 이벤트 연결 (모든 슬라이더)
        const sliders = container.querySelectorAll('.vertical-input-range');
        const iconImgs = container.querySelectorAll('.volume-icon-img');

        sliders.forEach(slider => {
            // 초기값 반영
            const channel = slider.dataset.channel;
            if (this.channels[channel]) {
                slider.value = this.channels[channel].volume;
                this._updateChannelUI(channel, this.channels[channel].volume);
            }

            // 입력 시 실시간 조절
            slider.addEventListener('input', (e) => {
                const val = Number(e.target.value);
                const ch = e.target.dataset.channel;

                // 상태 업데이트
                if (this.channels[ch]) {
                    this.channels[ch].volume = val;
                    // 사용자가 직접 조절하면 lastVolume 업데이트 (뮤트 해제를 위해)
                    if (val > 0) this.channels[ch].lastVolume = val;

                    // 뮤트 상태 해제 (소리를 키웠으므로)
                    if (val > 0 && this.channels[ch].muted) {
                        this.channels[ch].muted = false;
                    }
                }

                // UI 업데이트 (해당 채널만)
                this._updateChannelUI(ch, val);

                // Master 채널인 경우에만 전역 볼륨 조절
                if (ch === 'Master') {
                    this._setGlobalVolume(val);
                }
            });
        });

        // 초기값 설정을 위해 한 번 호출
        if (sliders.length > 0) {
            // Master 채널의 초기 볼륨으로 전역 볼륨 설정
            this._setGlobalVolume(this.channels['Master'].volume);
        }

        // 아이콘 클릭 시 뮤트 토글
        iconImgs.forEach(iconImg => {
            iconImg.addEventListener('click', (e) => {
                const ch = e.target.dataset.channel;
                this._toggleMute(ch);
            });
        });
    }

    /**
     * 특정 채널 뮤트 토글
     * @param {string} channel 
     */
    _toggleMute(channel) {
        if (!this.channels[channel]) return;

        const state = this.channels[channel];

        if (state.volume > 0) {
            // 뮤트 수행
            state.lastVolume = state.volume;
            state.volume = 0;
            state.muted = true;
        } else {
            // 복원
            state.volume = state.lastVolume > 0 ? state.lastVolume : 50;
            state.muted = false;
        }

        // UI 및 전역 볼륨 적용
        this._updateChannelUI(channel, state.volume);

        if (channel === 'Master') {
            this._setGlobalVolume(state.volume);
        }
    }

    /**
     * 특정 채널 UI 업데이트
     * @param {string} channel 
     * @param {number} value 
     */
    _updateChannelUI(channel, value) {
        // 해당 채널의 슬라이더와 아이콘 찾기
        const slider = this.popup.querySelector(`.vertical-input-range[data-channel="${channel}"]`);
        const iconImg = this.popup.querySelector(`.volume-icon-img[data-channel="${channel}"]`);

        if (slider && Number(slider.value) !== value) {
            slider.value = value;
        }

        if (iconImg) {
            if (value == 0) {
                iconImg.src = './image/mute.png';
            } else {
                iconImg.src = './image/volume.png';
            }
        }
    }

    /**
     * 전역 볼륨 설정 (메인 페이지 + 모든 iframe)
     * @param {number|string} value - 0~100 사이의 볼륨 값
     */
    _setGlobalVolume(value) {
        // 0~1 사이 실수로 변환
        const volume = Math.max(0, Math.min(1, Number(value) / 100));

        // 1. 메인 페이지의 오디오/비디오 요소 조절
        this._applyVolumeToDocument(document, volume);

        // 2. 모든 iframe 내부의 오디오/비디오 요소 조절
        const iframes = document.querySelectorAll('iframe');
        iframes.forEach(iframe => {
            try {
                // cross-origin 접근 제한이 없는 경우에만
                if (iframe.contentDocument) {
                    this._applyVolumeToDocument(iframe.contentDocument, volume);
                }
            } catch (e) {
                // Cross-origin iframe은 접근 불가 (무시)
                console.warn('VolumeManager: iframe 접근 불가', e);
            }
        });
    }

    /**
     * 특정 문서 내의 미디어 요소 볼륨 조절 헬퍼 함수
     * @param {Document} doc 
     * @param {number} volume 
     */
    _applyVolumeToDocument(doc, volume) {
        // 1. 표준 오디오/비디오 태그
        const mediaElements = doc.querySelectorAll('audio, video');
        mediaElements.forEach(media => {
            media.volume = volume;
        });

        // 2. WMPlayer (Shadow DOM 사용 커스텀 엘리먼트)
        // WMPlayerElement는 volume 속성을 내부 media 요소와 연결해두었으므로 직접 제어 가능
        const wmPlayers = doc.querySelectorAll('wm-player');
        wmPlayers.forEach(player => {
            player.volume = volume;
        });

        // 3. Webamp (전역 매니저 사용)
        if (window.webampManager && typeof window.webampManager.setVolume === 'function') {
            window.webampManager.setVolume(volume);
        }
    }

    /**
     * 필요한 CSS 스타일 주입
     * (xpdesign.css의 슬라이더 스타일을 인라인화하여 포함)
     */
    _injectStyles() {
        const style = document.createElement('style');
        style.innerHTML = `
            .volume-popup {
                position: absolute;
                width: 300px; /* 4개 들어갈 너비 (약 70 * 4 + 여백) */
                height: 180px; /* 라벨 추가로 높이 증가 */
                display: none; /* 기본 숨김 */
                z-index: 9999;
                flex-direction: column;
                
                /* 심플한 패널 스타일 테두리 + 3D 효과 (Outset) */
                padding: 3px;
                background-color: #ece9d8;
                
                /* 3D 튀어나온 효과 (Light Top/Left, Dark Bottom/Right) */
                border-top: 1px solid #fff;
                border-left: 1px solid #fff;
                border-right: 1px solid #aca899;
                border-bottom: 1px solid #aca899;
                
                box-shadow: 1px 1px 2px rgba(0,0,0,0.3);
                border-radius: 0;
            }

            .vertical-slider-wrapper {
                position: relative;
                width: 30px;
                height: 100px;
                display: flex;
                justify-content: center;
            }

            /* 
             * 표준 input[type=range]를 회전시키는 방식 (xpdesign 방식) 
             * 브라우저 호환성을 위해 회전 사용 
             */
            .vertical-input-range {
                transform: rotate(270deg);
                width: 100px; /* 실제 높이가 됨 */
                height: 20px; /* 실제 너비가 됨 */
                position: absolute;
                top: 40px; /* 회전 중심축 보정 (width/2 - height/2) */
                left: -35px; /* 회전 중심축 보정 */
                margin: 0;
                
                /* 기본 스타일 초기화 */
                -webkit-appearance: none;
                appearance: none;
                background: transparent;
            }

            .vertical-input-range:focus {
                outline: 1px dotted #000;
            }

            /* --- 트랙 스타일 (Windows XP) --- */
            .vertical-input-range::-webkit-slider-runnable-track {
                height: 4px;
                background: #ece9d8;
                border-top: 1px solid #8f8f91;
                border-left: 1px solid #8f8f91;
                border-bottom: 1px solid #fff;
                border-right: 1px solid #fff;
                box-shadow: 1px 1px 0px #f0f0f0; 
                border-radius: 0;
                cursor: pointer;
            }
            .vertical-input-range::-moz-range-track {
                height: 4px;
                background: #ece9d8;
                border-top: 1px solid #8f8f91;
                border-left: 1px solid #8f8f91;
                border-bottom: 1px solid #fff;
                border-right: 1px solid #fff;
                border-radius: 0;
                cursor: pointer;
            }

            /* --- 썸(핸들) 스타일 (Windows XP) --- */
            .vertical-input-range::-webkit-slider-thumb {
                -webkit-appearance: none;
                margin-top: -10px; /* 트랙 중앙 정렬 (height/2 - trackHeight/2 ?) xpdesign값 사용 */
                width: 11px;
                height: 22px;
                background: #ece9d8;
                border-top: 1px solid #fff;
                border-left: 1px solid #fff;
                border-right: 1px solid #aca899;
                border-bottom: 1px solid #aca899;
                /* 녹색 디자인 복원 (#48CB46) */
                box-shadow: inset 0 2px #48CB46, inset 0 -2px #48CB46; 
                border-radius: 3px; /* xpdesign은 3px */
                cursor: pointer;
            }
            .vertical-input-range::-webkit-slider-thumb:hover {
                box-shadow: inset 0 2px #F9B435, inset 0 -2px #F9B435; /* 호버 시 노란색 */
            }
            .vertical-input-range::-webkit-slider-thumb:active {
                box-shadow: inset 0 2px #229512, inset 0 -2px #229512; /* 클릭 시 진한 녹색 */
            }
            
            .vertical-input-range::-moz-range-thumb {
                width: 11px;
                height: 22px;
                background: #ece9d8;
                border: 1px solid #778892; /* mozilla fallback styled border */
                border-top: 1px solid #B5C4CD;
                border-left: 1px solid #B5C4CD;
                /* 녹색 디자인 복원 */
                box-shadow: inset 0 2px #48CB46, inset 0 -2px #48CB46;
                border-radius: 2px;
                cursor: pointer;
            }
            .vertical-input-range::-moz-range-thumb:hover {
                 box-shadow: inset 0 2px #F9B435, inset 0 -2px #F9B435;
            }
            .vertical-input-range::-moz-range-thumb:active {
                 box-shadow: inset 0 2px #229512, inset 0 -2px #229512;
            }
            .vertical-input-range::-moz-range-thumb:active {
                 box-shadow: inset 0 2px #229512, inset 0 -2px #229512;
            }

            /* --- 볼륨 눈금 스타일 --- */
            .volume-scale {
                display: flex;
                flex-direction: column;
                justify-content: space-between;
                height: 94px; /* 슬라이더 트랙 높이와 비슷하게 조정 */
                margin-left: 5px; /* 슬라이더와 간격 */
                padding-top: 4px;
                padding-bottom: 4px;
            }

            .tick {
                background-color: #000;
                height: 1px;
            }
            .tick.long {
                width: 5px;
            }
            .tick.short {
                width: 3px;
            }
        `;
        document.head.appendChild(style);
    }
}

// 자동 초기화 (메인 페이지에서 import 시 자동 실행)
const volumeManager = new VolumeManager();
// DOMContentLoaded가 이미 발생했을 수도 있으므로 체크
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => volumeManager.initialize());
} else {
    volumeManager.initialize();
}

export default volumeManager;
