// soundManager.js
// Three.js의 AudioListener와 AudioLoader를 사용하여 3D 게임 오디오를 통합 관리합니다.
// 전역 객체(window.soundManager)로 노출되며, ES 모듈 대신 바닐라 스크립트로 동작합니다.

class SoundManager {
    constructor() {
        this.listener = new THREE.AudioListener();
        this.sounds = new Map();
        this.loader = new THREE.AudioLoader();
        this._voicePool = [];
        this._activeOneShots = new Set();
        this._lastRandom = {};
    }

    init(camera) {
        camera.add(this.listener);
        console.log("[SoundManager] AudioListener added to the main camera.");
    }

    async loadSound(name, url, loop = false, volume = 0.5, playbackRate = 1.0) {
        return new Promise((resolve, reject) => {
            this.loader.load(url, (buffer) => {
                const sound = new THREE.Audio(this.listener);
                sound.setBuffer(buffer);
                sound.setLoop(loop);
                sound.setVolume(volume);
                sound.setPlaybackRate(playbackRate);
                sound._baseVolume = volume;
                sound._isLooping = loop;
                sound._playbackRate = playbackRate;
                this.sounds.set(name, sound);
                resolve(sound);
            }, undefined, (err) => {
                console.error(`[SoundManager] Failed to load sound: ${name} (${url})`, err);
                reject(err);
            });
        });
    }

    async loadAllSounds() {
        const soundList = [
            { name: 'boost', url: './sounds/boost.mp3', loop: true, volume: 0.35 },
            { name: 'throttle', url: './sounds/throttle.mp3', loop: false, volume: 0.4 },
            { name: 'explosion-1', url: './sounds/explosion-1.mp3', loop: false, volume: 0.65 },
            { name: 'explosion-2', url: './sounds/explosion-2.mp3', loop: false, volume: 0.65 },
            { name: 'explosion-3', url: './sounds/explosion-3.mp3', loop: false, volume: 0.65 },
            { name: 'weapon-warning', url: './sounds/warning.mp3', loop: false, volume: 0.5 },
            { name: 'jet-engine', url: './sounds/jet-engine.mp3', loop: true, volume: 0.25 },
            { name: 'spawn', url: './sounds/spawn.mp3', loop: false, volume: 0.5 },
            { name: 'weapon-switch', url: './sounds/weapon-switch.mp3', loop: false, volume: 0.4 },
            { name: 'missile-fire', url: './sounds/missile-firing-1.mp3', loop: false, volume: 0.5 },
            { name: 'm61-firing', url: './sounds/m61-firing.mp3', loop: true, volume: 0.45 },
            { name: 'rwr-tws', url: './sounds/rwr-tws.mp3', loop: true, volume: 0.15, playbackRate: 0.4 },
            { name: 'rwr-lock', url: './sounds/rwr-lock.mp3', loop: true, volume: 0.20, playbackRate: 0.4 },
            { name: 'wind', url: './sounds/wind.mp3', loop: true, volume: 0.12 },
            { name: 'terrain-pull-up', url: './sounds/terrain-pull-up.mp3', loop: false, volume: 0.9 }
        ];

        console.log("[SoundManager] Starting audio preloading sequence...");
        const promises = soundList.map(s => this.loadSound(s.name, s.url, s.loop, s.volume, s.playbackRate || 1.0));
        await Promise.all(promises);
        console.log("[SoundManager] All 15 audio channels initialized.");
    }

    _getVoice() {
        return this._voicePool.pop() || new THREE.Audio(this.listener);
    }

    _releaseVoice(voice) {
        if (voice.isPlaying) voice.stop();
        this._activeOneShots.delete(voice);
        this._voicePool.push(voice);
    }

    play(name, fadeInDuration = 0) {
        const originalName = name;

        // -random 접미사가 붙으면 여러 개 중 무작위 선택 (예: explosion-random -> explosion-1, 2, 3)
        if (name.endsWith('-random')) {
            const prefix = name.replace('-random', '-');
            const variants = Array.from(this.sounds.keys()).filter(k => k.startsWith(prefix));

            if (variants.length > 0) {
                const lastIdx = this._lastRandom[name] ?? -1;
                let idx = Math.floor(Math.random() * variants.length);

                if (variants.length > 1 && idx === lastIdx) {
                    idx = (idx + 1) % variants.length;
                }

                this._lastRandom[name] = idx;
                name = variants[idx];
            }
        }

        const sound = this.sounds.get(name);
        if (!sound) return;

        const { context } = sound;
        if (context && context.state === 'suspended') {
            context.resume();
        }

        const targetVolume = sound._baseVolume ?? 0.5;

        // 루프되지 않는 음원(One-shot)은 보이스 풀에서 꺼내어 중첩 재생 가능하게 처리
        if (!sound._isLooping) {
            const voice = this._getVoice();
            voice.setBuffer(sound.buffer);
            voice.setVolume(targetVolume);
            voice.setPlaybackRate(sound._playbackRate ?? 1.0);
            voice.play();

            voice._parentName = originalName || name;
            this._activeOneShots.add(voice);

            voice.source.onended = () => {
                if (!voice._isPaused) {
                    this._releaseVoice(voice);
                }
            };
            return;
        }

        // 루프 음원은 고정 객체 재생 및 볼륨 페이드인 적용
        if (!sound.isPlaying) {
            sound.setPlaybackRate(sound._playbackRate ?? 1.0);
            sound.play();
            if (fadeInDuration > 0 && sound.gain) {
                sound.setVolume(0);
                const now = context.currentTime;
                sound.gain.gain.cancelScheduledValues(now);
                sound.gain.gain.setValueAtTime(0, now);
                sound.gain.gain.linearRampToValueAtTime(targetVolume, now + fadeInDuration);
            } else {
                sound.setVolume(targetVolume);
            }
        }
    }

    stop(name, fadeOutDuration = 0) {
        const sound = this.sounds.get(name);
        if (!sound) return;

        if (sound.isPlaying) {
            if (fadeOutDuration > 0 && sound.gain) {
                const now = sound.context.currentTime;
                sound.gain.gain.cancelScheduledValues(now);
                sound.gain.gain.linearRampToValueAtTime(0, now + fadeOutDuration);
                setTimeout(() => {
                    if (sound.isPlaying) {
                        sound.stop();
                        sound.setVolume(sound._baseVolume ?? 0.5);
                    }
                }, fadeOutDuration * 1000 + 50);
            } else {
                sound.stop();
            }
        }

        this._activeOneShots.forEach(voice => {
            if (voice._parentName === name) {
                voice.source.onended = null;
                this._releaseVoice(voice);
            }
        });
    }

    setVolume(name, volume) {
        const sound = this.sounds.get(name);
        if (sound && sound.gain) {
            sound.gain.gain.setValueAtTime(volume, sound.context.currentTime);
        }
    }

    isPlaying(name) {
        const sound = this.sounds.get(name);
        if (!sound) return false;
        if (sound.isPlaying) return true;

        for (const voice of this._activeOneShots) {
            if (voice._parentName === name && (voice.isPlaying || voice._isPaused)) return true;
        }
        return false;
    }

    pauseAll() {
        this.sounds.forEach(sound => {
            if (sound.isPlaying) {
                sound.pause();
                sound._wasPlaying = true;
            }
        });

        this._activeOneShots.forEach(voice => {
            if (voice.isPlaying) {
                voice.pause();
                voice._isPaused = true;
            }
        });
    }

    resumeAll() {
        this.sounds.forEach(sound => {
            if (sound._wasPlaying) {
                sound.play();
                sound._wasPlaying = false;
            }
        });

        this._activeOneShots.forEach(voice => {
            if (voice._isPaused) {
                voice.play();
                voice._isPaused = false;
            }
        });
    }

    stopAll(fadeOutDuration = 0) {
        this.sounds.forEach((_, name) => this.stop(name, fadeOutDuration));
    }
}

// 전역 객체 노출
window.soundManager = new SoundManager();
