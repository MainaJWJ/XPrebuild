import { XP_SHADERS } from './xp-shaders.js';

/**
 * XP Filter Factory - MONSTER COMPLETE VERSION
 */
export const XPFilterFactory = {
    createMaterial(type, options = {}) {
        const shaderSource = XP_SHADERS[type];
        if (!shaderSource) return null;

        const uniforms = this.getDefaultUniforms(type);
        
        for (const key in options) {
            if (uniforms[key] !== undefined) {
                if (key === 'u_texture') {
                    uniforms[key].value = options[key];
                } else if (key === 'resolution' || key === 'mouse') {
                    if (options[key].isVector2) uniforms[key].value.copy(options[key]);
                    else uniforms[key].value.set(options[key].x, options[key].y);
                } else {
                    uniforms[key].value = options[key];
                }
            }
        }

        return new THREE.ShaderMaterial({
            uniforms: uniforms,
            vertexShader: XP_SHADERS.vertex,
            fragmentShader: shaderSource,
            transparent: true
        });
    },

    getDefaultUniforms(type) {
        return {
            u_texture: { value: null },
            resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
            time: { value: 0 },
            intensity: { value: 1.0 },
            pixelRatio: { value: window.devicePixelRatio || 1 },
            aspectCorrectionEnabled: { value: true },
            textureAspect: { value: 1.0 },
            interactionEnabled: { value: true },
            interactionShape: { value: 0 },
            mouse: { value: new THREE.Vector2(0.5, 0.5) },
            radiusPx: { value: 150 },
            effectScale: { value: 1.0 },
            
            // Pixelation Detailed
            pixelationEnabled: { value: true },
            pixelSize: { value: 2.0 },
            pixelShape: { value: 0 },
            bitDepth: { value: 0 },
            dithering: { value: 0 },
            
            // CRT Detailed
            crtEnabled: { value: true },
            curvature: { value: 5.0 },
            scanlineIntensity: { value: 0.7 },
            scanlineCount: { value: 240.0 },
            brightness: { value: 1.1 },
            flicker: { value: false },
            lineMovement: { value: false },
            chromaticAberration: { value: 0.0 },
            
            // Glitch Detailed
            glitchEnabled: { value: true },
            rgbShift: { value: 0.005 },
            digitalNoise: { value: 0.05 },
            lineDisplacement: { value: 0.0 },
            bitCrushDepth: { value: 0.0 },
            signalDropoutFreq: { value: 0.0 },
            syncErrorFreq: { value: 0.0 },
            datamoshStrength: { value: 0.0 }
        };
    }
};
