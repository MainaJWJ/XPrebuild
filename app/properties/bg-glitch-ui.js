/**
 * UI Logic for Background GL Glitch tab
 */
window.addEventListener('DOMContentLoaded', () => {
    // 1. Sliders definition (Master Intensity gl-intensity is removed)
    const sliders = [
        { id: 'gl-pixelSize', valId: 'val-gl-pixelSize', param: 'pixelSize', step: 0 },
        { id: 'gl-curvature', valId: 'val-gl-curvature', param: 'curvature', step: 1 },
        { id: 'gl-rgbShift', valId: 'val-gl-rgbShift', param: 'rgbShift', step: 3 },
        { id: 'gl-digitalNoise', valId: 'val-gl-digitalNoise', param: 'digitalNoise', step: 2 },
        { id: 'gl-lineDisplacement', valId: 'val-gl-lineDisplacement', param: 'lineDisplacement', step: 3 }
    ];

    const formatNum = (val, step) => parseFloat(val).toFixed(step);

    // 2. Initialize Sliders
    sliders.forEach(slider => {
        const input = document.getElementById(slider.id);
        const valSpan = document.getElementById(slider.valId);
        
        if (input) {
            input.addEventListener('input', () => {
                if (valSpan) valSpan.textContent = formatNum(input.value, slider.step);
                
                window.parent.postMessage({ 
                    type: 'updateBgGlitchParam', 
                    id: slider.param, 
                    value: input.value 
                }, '*');
            });
        }
    });

    // 3. Master Toggle
    const masterToggle = document.getElementById('gl-masterEnabled');
    if (masterToggle) {
        masterToggle.addEventListener('change', () => {
            const state = masterToggle.checked;
            window.parent.postMessage({ 
                type: 'toggleBgGlitchMaster', 
                state: state 
            }, '*');
        });
    }

    // 4. Reset Defaults
    const btnReset = document.getElementById('btn-gl-reset');
    if (btnReset) {
        btnReset.addEventListener('click', () => {
            // Reset Master Toggle
            if (masterToggle) {
                masterToggle.checked = false;
                window.parent.postMessage({ 
                    type: 'toggleBgGlitchMaster', 
                    state: false 
                }, '*');
            }

            // Reset slider default values
            const defaults = {
                'gl-pixelSize': 2,
                'gl-curvature': 4.0,
                'gl-rgbShift': 0.015,
                'gl-digitalNoise': 0.15,
                'gl-lineDisplacement': 0.02
            };

            const paramMap = {
                'gl-pixelSize': 'pixelSize',
                'gl-curvature': 'curvature',
                'gl-rgbShift': 'rgbShift',
                'gl-digitalNoise': 'digitalNoise',
                'gl-lineDisplacement': 'lineDisplacement'
            };

            const stepMap = {
                'gl-pixelSize': 0,
                'gl-curvature': 1,
                'gl-rgbShift': 3,
                'gl-digitalNoise': 2,
                'gl-lineDisplacement': 3
            };

            Object.entries(defaults).forEach(([id, val]) => {
                const input = document.getElementById(id);
                const valSpan = document.getElementById('val-' + id);
                if (input) {
                    input.value = val;
                    if (valSpan) valSpan.textContent = formatNum(val, stepMap[id]);
                    
                    // Notify background of the reset value
                    window.parent.postMessage({ 
                        type: 'updateBgGlitchParam', 
                        id: paramMap[id], 
                        value: val 
                    }, '*');
                }
            });

            // Reset relocated CRT params (Electrical Noise, Brightness, Vignette)
            const crtDefaults = {
                'input-roll': 1.0,
                'input-brightness': 1.0,
                'input-vignette': 0.4
            };

            Object.entries(crtDefaults).forEach(([id, val]) => {
                const input = document.getElementById(id);
                const valSpan = document.getElementById('val-' + id.split('-')[1]);
                if (input) {
                    input.value = val;
                    if (valSpan) valSpan.textContent = parseFloat(val).toFixed(2);
                    
                    // Notify CRT Engine
                    window.parent.postMessage({ 
                        type: 'updateCRTParam', 
                        id: id, 
                        value: val 
                    }, '*');
                }
            });

            // Reset relocated checkboxes (Enable CRT, Grayscale)
            const chkEnable = document.getElementById('chk-enable-filter');
            const chkGrayscale = document.getElementById('chk-grayscale');
            if (chkEnable) {
                chkEnable.checked = false;
                window.parent.postMessage({ type: 'toggleCRT', state: false }, '*');
            }
            if (chkGrayscale) {
                chkGrayscale.checked = false;
                window.parent.postMessage({ type: 'toggleCRTGrayscale', state: false }, '*');
            }
        });
    }
});
