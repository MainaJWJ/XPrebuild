// oceanSystem.js
// High-fidelity ocean system adapted from Three.js-Ocean-Scene-main.
// fft-ocean-master 디자인 원리 적용:
//   - transparent: false → 배 아랫부분이 완전히 가려짐
//   - alpha 항상 1.0 → 수면이 불투명한 실제 바다처럼 보임
//   - HDR tone-mapping + Fresnel 공식으로 반사/광택 효과를 시각적으로 표현
//   - oceanColor(깊은 바다색) + reflectionColor 혼합으로 풍부한 수면 표현
//   - [날씨 시스템] 하늘색, 바다색, 파도 속도를 WeatherSystem이 동적으로 제어

const OceanSystem = (() => {
    // --- Configuration Constants (Scaled for Flight Simulator) ---
    const OCEAN_HALF_SIZE = 700000;
    const OCEAN_DEPTH = 50000;

    // --- Shaders ---
    const OCEAN_SURFACE_VERTEX_SHADER = /* glsl */`
        #include <ocean>
        varying vec2 _worldPos;
        varying vec2 _uv;
        varying vec3 _vWorldPosition;

        void main() {
            vec4 worldPos = modelMatrix * vec4(position, 1.0);
            _worldPos = worldPos.xz;
            _vWorldPosition = worldPos.xyz;
            _uv = _worldPos * NORMAL_MAP_SCALE;
            gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
    `;

    const OCEAN_SURFACE_FRAGMENT_SHADER = /* glsl */`
        #include <ocean>
        varying vec2 _worldPos;
        varying vec2 _uv;
        varying vec3 _vWorldPosition;

        // fft-ocean 스타일 HDR tone-mapping
        vec3 hdr(vec3 color, float exposure) {
            return 1.0 - exp(-color * exposure);
        }

        void main() {
            vec3 viewVec = vec3(_worldPos.x, 0.0, _worldPos.y) - cameraPosition;
            float viewLen = length(viewVec);
            vec3 viewDir = normalize(viewVec);

            // --- 법선 벡터 (노멀맵 2장 합성, 파도 속도 uniform 적용) ---
            vec3 normal = texture2D(_NormalMap1, _uv + VELOCITY_1 * _WaveSpeed * _Time).xyz * 2.0 - 1.0;
            normal += texture2D(_NormalMap2, _uv + VELOCITY_2 * _WaveSpeed * _Time).xyz * 2.0 - 1.0;
            normal *= NORMAL_MAP_STRENGTH;
            normal += vec3(0.0, 0.0, 1.0);
            normal = normalize(normal).xzy;

            // --- Fresnel 계수 (fft-ocean 방식: pow(1 - NdotV, 2.0)) ---
            float NdotV = max(0.0, dot(normal, -viewDir));
            float fresnel = pow(1.0 - NdotV, 2.0);

            // --- Specular (햇빛 반짝임) ---
            vec3 halfWayDir = normalize(_DirToLight - viewDir);
            float specular = pow(max(0.0, dot(normal, halfWayDir)), SPECULAR_SHARPNESS) * _SpecularVisibility;

            // --- 반사색 (하늘색 — 날씨에 따라 동적으로 변경) ---
            vec3 skyReflection = sampleSkybox(reflect(viewDir, normal));

            // --- 깊은 바다 기본색 (날씨에 따라 동적으로 변경) ---
            vec3 oceanColor = _OceanColor;

            // --- Half-Lambert 확산광 ---
            float diffuse = dot(normal, _DirToLight) * 0.25 + 0.8;

            // --- fft-ocean 스타일 색상 혼합 ---
            float skyFactor = (fresnel + 0.2) * 8.0;
            vec3 waterColor = (1.0 - fresnel) * oceanColor * diffuse;

            // 최종 색상 = 하늘반사 * 반사색 + 수면색 + 스페큘러
            vec3 color = (skyFactor * skyReflection + waterColor) * skyReflection * 0.5 + waterColor;
            color += specular * vec3(1.0, 0.98, 0.9) * 1.8;

            // HDR tone-mapping (exposure = 날씨에 따라 동적 변경)
            color = hdr(color, _Exposure);

            // 항상 완전 불투명 (alpha = 1.0) → 배 아랫부분이 보이지 않음
            gl_FragColor = vec4(color, 1.0);
        }
    `;

    const OCEAN_VOLUME_VERTEX_SHADER = /* glsl */`
        varying vec3 _worldPos;

        void main() {
            vec4 worldPos = modelMatrix * vec4(position, 1.0);
            _worldPos = worldPos.xyz;
            gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
    `;

    const OCEAN_VOLUME_FRAGMENT_SHADER = /* glsl */`
        #include <ocean>
        varying vec3 _worldPos;

        void main() {
            vec3 viewVec = _worldPos - cameraPosition;
            float viewLen = length(viewVec);
            vec3 viewDir = viewVec / viewLen;
            float originY = cameraPosition.y;

            if (cameraPosition.y > 0.0) {
                float distAbove = cameraPosition.y / -viewDir.y;
                viewLen -= distAbove;
                originY = 0.0;
            }
            viewLen = min(viewLen, MAX_VIEW_DEPTH);

            float sampleY = originY + viewDir.y * viewLen;
            vec3 light = exp((sampleY - viewLen * DENSITY) * ABSORPTION);
            light *= _Light;
            
            gl_FragColor = vec4(light, 1.0);
        }
    `;

    // --- GLSL Shaders Library Chunks Injection ---
    function setupShaderChunks() {
        THREE.ShaderChunk.skybox = /* glsl */`
            #include <common>
            const vec3 UP = vec3(0.0, 1.0, 0.0);

            uniform vec3 _DirToLight;
            uniform vec3 _Light;
            uniform float _SpecularVisibility;

            // [날씨 시스템] 하늘 그라디언트 uniform
            uniform vec3 _SkyTop;
            uniform vec3 _SkyHorizon;

            vec3 sampleSkybox(vec3 dir) {
                float t = clamp(dir.y * 0.5 + 0.5, 0.0, 1.0);
                return mix(_SkyHorizon, _SkyTop, t);
            }
        `;

        THREE.ShaderChunk.ocean = /* glsl */`
            #include <skybox>

            const float NORMAL_MAP_SCALE = 0.0005;
            const float NORMAL_MAP_STRENGTH = 2.5;
            const vec2 VELOCITY_1 = vec2(0.1, 0.0);
            const vec2 VELOCITY_2 = vec2(0.0, 0.1);
            const float SPECULAR_SHARPNESS = 200.0;
            const float MAX_VIEW_DEPTH = 5000.0;
            const float DENSITY = 0.01;
            const float MAX_VIEW_DEPTH_DENSITY = MAX_VIEW_DEPTH * DENSITY;
            const vec3 ABSORPTION = vec3(1.0) / vec3(10.0, 40.0, 100.0);
            const float CRITICAL_ANGLE = asin(1.0 / 1.33) / PI_HALF;

            uniform float _Time;
            uniform sampler2D _NormalMap1;
            uniform sampler2D _NormalMap2;

            // [날씨 시스템] 동적 ocean 파라미터
            uniform vec3 _OceanColor;
            uniform float _WaveSpeed;
            uniform float _Exposure;
        `;
    }

    // --- State and Mesh References ---
    let oceanSurfaceMesh = null;
    let oceanVolumeMesh = null;
    let surfaceMaterial = null;

    // --- Uniforms Objects ---
    const dirToLightUniform   = { value: new THREE.Vector3(1000, 2000, 1000).normalize() };
    const lightUniform        = { value: new THREE.Vector3(1, 1, 1) };
    const specularVisibilityUniform = { value: 1.0 };
    const timeUniform         = { value: 0.0 };

    // [날씨 시스템] 동적 uniform 객체 — WeatherSystem이 직접 수정
    const oceanColorUniform   = { value: new THREE.Vector3(0.04, 0.18, 0.38) };
    const skyTopUniform       = { value: new THREE.Vector3(0.25, 0.58, 0.92) };
    const skyHorizonUniform   = { value: new THREE.Vector3(0.65, 0.82, 0.98) };
    const waveSpeedUniform    = { value: 1.0 };
    const exposureUniform     = { value: 0.35 };

    let normalMap1 = null;
    let normalMap2 = null;

    function applyOceanUniforms(materialUniforms) {
        materialUniforms._DirToLight        = dirToLightUniform;
        materialUniforms._Light             = lightUniform;
        materialUniforms._SpecularVisibility = specularVisibilityUniform;
        materialUniforms._SkyTop            = skyTopUniform;
        materialUniforms._SkyHorizon        = skyHorizonUniform;
        materialUniforms._OceanColor        = oceanColorUniform;
        materialUniforms._WaveSpeed         = waveSpeedUniform;
        materialUniforms._Exposure          = exposureUniform;
    }

    // ================================================================
    // [날씨 시스템] 공개 API — WeatherSystem이 호출
    // ================================================================
    function setWeatherUniforms(config) {
        if (config.oceanColor) {
            oceanColorUniform.value.set(config.oceanColor.x, config.oceanColor.y, config.oceanColor.z);
        }
        if (config.skyTop) {
            skyTopUniform.value.set(config.skyTop.x, config.skyTop.y, config.skyTop.z);
        }
        if (config.skyHorizon) {
            skyHorizonUniform.value.set(config.skyHorizon.x, config.skyHorizon.y, config.skyHorizon.z);
        }
        if (config.waveSpeed !== undefined) {
            waveSpeedUniform.value = config.waveSpeed;
        }
        if (config.exposure !== undefined) {
            exposureUniform.value = config.exposure;
        }
        if (config.dirToLight) {
            dirToLightUniform.value.copy(config.dirToLight).normalize();
        }
    }

    // --- Initialization ---
    function init(scene, renderer) {
        // A. Setup Shader Chunks
        setupShaderChunks();

        // B. Load Textures
        let maxAnisotropy = 1;
        if (renderer && renderer.capabilities) {
            maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
        }

        normalMap1 = new THREE.TextureLoader().load("./images/waterNormal1.png");
        normalMap1.wrapS = THREE.RepeatWrapping;
        normalMap1.wrapT = THREE.RepeatWrapping;
        normalMap1.minFilter = THREE.LinearMipmapLinearFilter;
        normalMap1.generateMipmaps = true;
        normalMap1.anisotropy = maxAnisotropy;

        normalMap2 = new THREE.TextureLoader().load("./images/waterNormal2.png");
        normalMap2.wrapS = THREE.RepeatWrapping;
        normalMap2.wrapT = THREE.RepeatWrapping;
        normalMap2.minFilter = THREE.LinearMipmapLinearFilter;
        normalMap2.generateMipmaps = true;
        normalMap2.anisotropy = maxAnisotropy;

        // C. Create Ocean Surface Mesh
        const surfaceGeom = new THREE.PlaneGeometry(OCEAN_HALF_SIZE * 2, OCEAN_HALF_SIZE * 2, 128, 128);
        surfaceGeom.rotateX(-Math.PI / 2);

        surfaceMaterial = new THREE.ShaderMaterial({
            vertexShader: OCEAN_SURFACE_VERTEX_SHADER,
            fragmentShader: OCEAN_SURFACE_FRAGMENT_SHADER,
            side: THREE.FrontSide,
            transparent: false,
            depthWrite: true,
        });
        surfaceMaterial.uniforms._Time = timeUniform;
        surfaceMaterial.uniforms._NormalMap1 = { value: normalMap1 };
        surfaceMaterial.uniforms._NormalMap2 = { value: normalMap2 };
        applyOceanUniforms(surfaceMaterial.uniforms);

        oceanSurfaceMesh = new THREE.Mesh(surfaceGeom, surfaceMaterial);
        scene.add(oceanSurfaceMesh);

        // D. Create Ocean Volume Mesh (Underwater Effect)
        const volumeGeom = new THREE.BufferGeometry();
        const volumeVerts = new Float32Array([
            -OCEAN_HALF_SIZE, -OCEAN_DEPTH, -OCEAN_HALF_SIZE,
             OCEAN_HALF_SIZE, -OCEAN_DEPTH, -OCEAN_HALF_SIZE,
            -OCEAN_HALF_SIZE, -OCEAN_DEPTH,  OCEAN_HALF_SIZE,
             OCEAN_HALF_SIZE, -OCEAN_DEPTH,  OCEAN_HALF_SIZE,

            -OCEAN_HALF_SIZE, 0, -OCEAN_HALF_SIZE,
             OCEAN_HALF_SIZE, 0, -OCEAN_HALF_SIZE,
            -OCEAN_HALF_SIZE, 0,  OCEAN_HALF_SIZE,
             OCEAN_HALF_SIZE, 0,  OCEAN_HALF_SIZE
        ]);
        const volumeIndices = [
            2, 3, 0, 3, 1, 0,
            0, 1, 4, 1, 5, 4,
            1, 3, 5, 3, 7, 5,
            3, 2, 7, 2, 6, 7,
            2, 0, 6, 0, 4, 6
        ];
        volumeGeom.setAttribute("position", new THREE.BufferAttribute(volumeVerts, 3));
        volumeGeom.setIndex(volumeIndices);

        const volumeMaterial = new THREE.ShaderMaterial({
            vertexShader: OCEAN_VOLUME_VERTEX_SHADER,
            fragmentShader: OCEAN_VOLUME_FRAGMENT_SHADER,
            side: THREE.DoubleSide
        });
        applyOceanUniforms(volumeMaterial.uniforms);

        oceanVolumeMesh = new THREE.Mesh(volumeGeom, volumeMaterial);
        oceanVolumeMesh.parent = oceanSurfaceMesh;
        oceanSurfaceMesh.add(oceanVolumeMesh);

        console.log('[OceanSystem] Opaque Ocean (fft-ocean style, weather-ready) initialized! 🌊');
    }

    // --- Update Frame ---
    function update(delta, camera) {
        if (!camera) return;

        // 1. Update Time
        timeUniform.value += delta;

        // 2. Keep Ocean Surface centered on Camera X/Z
        if (oceanSurfaceMesh) {
            oceanSurfaceMesh.position.set(camera.position.x, 0, camera.position.z);
        }
    }

    return { init, update, setWeatherUniforms };
})();

window.OceanSystem = OceanSystem;
