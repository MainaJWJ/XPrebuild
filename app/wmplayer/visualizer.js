/**
 * WMPVisualizer Module
 * Handles the rendering of music visualizations on a canvas.
 */
class WMPVisualizer {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.analyser = null;
        this.animationId = null;
        this.barColor = '#00f900';
    }

    /**
     * Initialize the visualizer with a canvas element
     * @param {HTMLCanvasElement} canvas 
     */
    init(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        // 부모 요소로부터 기본 색상 가져오기
        this.barColor = getComputedStyle(document.documentElement).getPropertyValue('--visualizerBars').trim() || '#00f900';
    }

    /**
     * Start the visualization loop
     * @param {AnalyserNode} analyser 
     */
    start(analyser) {
        this.analyser = analyser;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        this.draw();
    }

    /**
     * Stop the visualization loop
     */
    stop() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        if (this.ctx && this.canvas) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
    }

    /**
     * The main drawing loop
     */
    draw() {
        this.animationId = requestAnimationFrame(() => this.draw());
        
        if (!this.analyser || !this.ctx || !this.canvas) return;

        const bufferLength = this.analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        this.analyser.getByteFrequencyData(dataArray);

        // Resize handling
        if (this.canvas.width !== this.canvas.clientWidth || this.canvas.height !== this.canvas.clientHeight) {
            this.canvas.width = this.canvas.clientWidth;
            this.canvas.height = this.canvas.clientHeight;
        }

        const width = this.canvas.width;
        const height = this.canvas.height;

        this.ctx.clearRect(0, 0, width, height);

        // --- Drawing Logic (Bars Style) ---
        // 이 부분을 나중에 다른 스타일로 교체할 수 있습니다.
        const barWidth = (width / bufferLength) * 2.5;
        let barHeight;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
            barHeight = (dataArray[i] / 255) * height;

            this.ctx.fillStyle = this.barColor;
            this.ctx.globalAlpha = 0.8;
            
            // WMP 8 감성의 픽셀 바 스타일
            this.ctx.fillRect(x, height - barHeight, barWidth - 1, barHeight);
            
            x += barWidth;
        }
        this.ctx.globalAlpha = 1.0;
    }
}

// Global instance for easy access
window.wmpVisualizer = new WMPVisualizer();
