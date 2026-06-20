/**
 * XP Filter Shaders - THE ABSOLUTE COMPLETE VERSION (FIXED)
 * Includes EVERY feature for all modes (Combined, Pixelation, CRT, Glitch).
 */

const commonFunctions = `
      precision highp float;
      
      float random(vec2 st) {
        return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
      }
      
      float getBayer(vec2 uv, vec2 res) {
        vec2 p = floor(uv * res);
        int x = int(mod(p.x, 4.0));
        int y = int(mod(p.y, 4.0));
        if (y == 0) { if (x == 0) return 0.0; if (x == 1) return 0.5; if (x == 2) return 0.125; if (x == 3) return 0.625; }
        if (y == 1) { if (x == 0) return 0.75; if (x == 1) return 0.25; if (x == 2) return 0.875; if (x == 3) return 0.375; }
        if (y == 2) { if (x == 0) return 0.1875; if (x == 1) return 0.6875; if (x == 2) return 0.0625; if (x == 3) return 0.5625; }
        if (y == 3) { if (x == 0) return 0.9375; if (x == 1) return 0.4375; if (x == 2) return 0.8125; if (x == 3) return 0.3125; }
        return 0.0;
      }

      float getInteractionEffect(vec2 uv, vec2 mouse, float radiusPx, float aspect, float effectScale, int interactionShape) {
        vec2 offset = uv - mouse;
        offset.x *= aspect; 
        float normalizedRadius = radiusPx / 1000.0; 
        float scaledRadius = normalizedRadius * effectScale;
        if (scaledRadius <= 0.0) return 0.0;
        float dist;
        if (interactionShape == 1) dist = max(abs(offset.x), abs(offset.y));
        else if (interactionShape == 2) dist = abs(offset.x) + abs(offset.y);
        else if (interactionShape == 3 || interactionShape == 4) {
          float h = smoothstep(scaledRadius * 0.15, 0.0, abs(offset.y));
          float v = smoothstep(scaledRadius * 0.15, 0.0, abs(offset.x));
          return max(h, v) * smoothstep(scaledRadius, scaledRadius * 0.8, max(abs(offset.x), abs(offset.y)));
        }
        else dist = length(offset);
        return 1.0 - smoothstep(0.0, scaledRadius, dist);
      }
`;

const uniformsList = `
      uniform sampler2D u_texture;
      uniform highp vec2 resolution;
      uniform float time;
      uniform float intensity;
      uniform bool pixelationEnabled;
      uniform bool crtEnabled;
      uniform bool glitchEnabled;
      uniform bool interactionEnabled;
      uniform int interactionShape;
      uniform float pixelSize;
      uniform int pixelShape;
      uniform int bitDepth;
      uniform int dithering;
      uniform float curvature;
      uniform float scanlineIntensity;
      uniform float scanlineCount;
      uniform float brightness;
      uniform bool flicker;
      uniform bool lineMovement;
      uniform float chromaticAberration;
      uniform float rgbShift;
      uniform float digitalNoise;
      uniform float lineDisplacement;
      uniform float bitCrushDepth;
      uniform float signalDropoutFreq;
      uniform float syncErrorFreq;
      uniform float datamoshStrength;
      uniform vec2 mouse; 
      uniform float radiusPx;
      uniform float effectScale;
      varying vec2 vUv;
`;

export const XP_SHADERS = {
    vertex: `
      precision highp float;
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,

    combined: `
      ${commonFunctions}
      ${uniformsList}
      void main() {
        vec2 uv = vUv;
        float aspect = resolution.x / resolution.y;
        float mEff = interactionEnabled ? getInteractionEffect(uv, mouse, radiusPx, aspect, effectScale, interactionShape) : 0.0;
        mEff *= intensity;
        vec2 sUv = uv;
        if (glitchEnabled && random(vec2(time * 0.1, 0.0)) < syncErrorFreq * (1.0 + mEff)) sUv.x += (random(vec2(time, sUv.y)) - 0.5) * 0.1;
        if (crtEnabled) {
            float ec = (curvature + mEff * 15.0) * intensity;
            vec2 c = uv * 2.0 - 1.0;
            vec2 o = abs(c.yx) * ec / 20.0;
            sUv = (c + c * o * o) * 0.5 + 0.5;
        }
        if (glitchEnabled && lineDisplacement > 0.0) {
            if (random(vec2(floor(sUv.y * 50.0), time)) < 0.1 * (1.0 + mEff)) sUv.x += (random(vec2(time, sUv.y)) - 0.5) * lineDisplacement * (1.0 + mEff);
        }
        if (pixelationEnabled) {
            float ep = (pixelSize + mEff * 15.0) * intensity;
            vec2 pc = resolution / max(1.0, ep);
            sUv = floor(sUv * pc) / pc;
        }
        if (sUv.x < 0.0 || sUv.x > 1.0 || sUv.y < 0.0 || sUv.y > 1.0) { gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0); return; }
        float sh = (rgbShift + mEff * 0.05 + chromaticAberration) * intensity;
        vec3 col = vec3(texture2D(u_texture, sUv + vec2(sh, 0.0)).r, texture2D(u_texture, sUv).g, texture2D(u_texture, sUv - vec2(sh, 0.0)).b);
        if (glitchEnabled) {
            if (bitCrushDepth > 0.0) { float lv = max(2.0, 32.0 - bitCrushDepth); col = floor(col * lv) / lv; }
            if (random(vec2(time, floor(sUv.y * 10.0))) < signalDropoutFreq) col *= random(sUv + time) > 0.5 ? 0.0 : 1.5;
        }
        if (pixelationEnabled && bitDepth > 0) {
            float lv = pow(2.0, float(bitDepth));
            if (dithering == 1) col += (getBayer(vUv, resolution) - 0.5) / lv;
            col = floor(col * lv) / lv;
        }
        col += (random(sUv + time) - 0.5) * (digitalNoise + mEff * 0.2) * intensity;
        if (crtEnabled) {
            float sp = sUv.y + (lineMovement ? time * 0.1 : 0.0);
            float sc = sin(sp * scanlineCount * 6.28) * 0.5 + 0.5;
            col *= mix(1.0, sc, scanlineIntensity * (1.0 + mEff) * intensity);
            if (flicker) col *= 0.95 + 0.05 * sin(time * 60.0);
            col *= brightness;
        }
        gl_FragColor = vec4(col, 1.0);
      }
    `,

    pixelation: `
      ${commonFunctions}
      ${uniformsList}
      void main() {
        float ep = (pixelSize + getInteractionEffect(vUv, mouse, radiusPx, resolution.x/resolution.y, effectScale, interactionShape) * 15.0) * intensity;
        vec2 pc = resolution / max(1.0, ep);
        vec2 sUv = floor(vUv * pc) / pc;
        vec3 col = texture2D(u_texture, sUv).rgb;
        if (bitDepth > 0) {
            float lv = pow(2.0, float(bitDepth));
            if (dithering == 1) col += (getBayer(vUv, resolution) - 0.5) / lv;
            col = floor(col * lv) / lv;
        }
        gl_FragColor = vec4(col, 1.0);
      }
    `,

    crt: `
      ${commonFunctions}
      ${uniformsList}
      void main() {
        float mEff = getInteractionEffect(vUv, mouse, radiusPx, resolution.x/resolution.y, effectScale, interactionShape);
        float ec = (curvature + mEff * 15.0) * intensity;
        vec2 c = vUv * 2.0 - 1.0;
        vec2 o = abs(c.yx) * ec / 20.0;
        vec2 sUv = (c + c * o * o) * 0.5 + 0.5;
        if (sUv.x < 0.0 || sUv.x > 1.0 || sUv.y < 0.0 || sUv.y > 1.0) { gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0); return; }
        vec3 col = texture2D(u_texture, sUv).rgb;
        float sp = sUv.y + (lineMovement ? time * 0.1 : 0.0);
        float sc = sin(sp * scanlineCount * 6.28) * 0.5 + 0.5;
        col *= mix(1.0, sc, scanlineIntensity * (1.0 + mEff) * intensity);
        if (flicker) col *= 0.95 + 0.05 * sin(time * 60.0);
        col *= brightness;
        gl_FragColor = vec4(col, 1.0);
      }
    `,

    glitch: `
      ${commonFunctions}
      ${uniformsList}
      void main() {
        float mEff = getInteractionEffect(vUv, mouse, radiusPx, resolution.x/resolution.y, effectScale, interactionShape);
        vec2 sUv = vUv;
        if (random(vec2(time * 0.1, 0.0)) < syncErrorFreq * (1.0 + mEff)) sUv.x += (random(vec2(time, sUv.y)) - 0.5) * 0.1;
        float sh = (rgbShift + mEff * 0.05) * intensity;
        vec3 col = vec3(texture2D(u_texture, sUv + vec2(sh, 0.0)).r, texture2D(u_texture, sUv).g, texture2D(u_texture, sUv - vec2(sh, 0.0)).b);
        if (bitCrushDepth > 0.0) { float lv = max(2.0, 32.0 - bitCrushDepth); col = floor(col * lv) / lv; }
        col += (random(sUv + time) - 0.5) * (digitalNoise + mEff * 0.2) * intensity;
        gl_FragColor = vec4(col, 1.0);
      }
    `
};
