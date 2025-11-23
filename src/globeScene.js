import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// --- Configuration ---
// Fallback textures in case local files are missing.
const TEXTURE_DAY = '/textures/earth_day.jpg';
const TEXTURE_NIGHT = '/textures/earth_night.jpg';
// Use these online URLs if you don't have local files setup yet:
// const TEXTURE_DAY = 'https://upload.wikimedia.org/wikipedia/commons/c/c1/Earth_map_1024x512_%28equirectangular_projection%29.jpg';
// const TEXTURE_NIGHT = 'https://upload.wikimedia.org/wikipedia/commons/b/ba/The_earth_at_night.jpg';

let scene, camera, renderer, globeMesh, controls;
let uiStateRef = { rotationSpeed: 0.002 }; // Default fallback

// --- Custom Shader ---
// We use a custom shader to blend textures based on lighting direction.

const vertexShader = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;

  void main() {
    vUv = uv;
    // Calculate normal in world space to compare with fixed light direction
    vNormal = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = `
  uniform sampler2D dayTexture;
  uniform sampler2D nightTexture;
  uniform vec3 sunDirection;

  varying vec2 vUv;
  varying vec3 vNormal;

  void main() {
    // Calculate dot product between surface normal and sun direction
    // result is 1.0 facing sun, 0.0 at horizon, -1.0 facing away
    float intensity = dot(vNormal, sunDirection);

    // Smoothstep creates a soft transition zone (twilight)
    // between -0.25 (night starts) and 0.25 (day starts)
    float mixAmount = smoothstep(-0.25, 0.25, intensity);

    vec4 dayColor = texture2D(dayTexture, vUv);
    vec4 nightColor = texture2D(nightTexture, vUv);

    // Mix: 0.0 = Night, 1.0 = Day
    // Add a slight ambient boost to night so it's not pure black if desired,
    // but usually city lights (night texture) are enough.
    gl_FragColor = mix(nightColor, dayColor, mixAmount);
  }
`;

export async function initScene(uiState) {
    uiStateRef = uiState;

    // 1. Setup Basic Components
    scene = new THREE.Scene();

    // Camera setup
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0, 12); // Move back to see the whole globe

    // Renderer setup
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    document.body.appendChild(renderer.domElement);

    // Controls setup
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; // Smooth camera movement
    controls.dampingFactor = 0.05;
    controls.enablePan = false; // Keep camera centered on globe
    controls.minDistance = 5; // Prevent zooming inside the globe
    controls.maxDistance = 50; // Prevent zooming too far out
    controls.rotateSpeed = 0.5; // General sensitivity

    // 2. Load Textures
    const textureLoader = new THREE.TextureLoader();

    // Load both textures asynchronously
    const [dayTex, nightTex] = await Promise.all([
        new Promise(resolve => textureLoader.load(TEXTURE_DAY, resolve)),
        new Promise(resolve => textureLoader.load(TEXTURE_NIGHT, resolve))
    ]);

    // 3. Create Globe with Custom Shader
    const geometry = new THREE.SphereGeometry(4, 64, 64);

    // Sun direction: Fixed in World Space (coming from top-right-front)
    const sunDir = new THREE.Vector3(1, 0.5, 1).normalize();

    const material = new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: {
            dayTexture: { value: dayTex },
            nightTexture: { value: nightTex },
            sunDirection: { value: sunDir }
        }
    });

    globeMesh = new THREE.Mesh(geometry, material);
    scene.add(globeMesh);

    // Optional: Add a stars background
    addStars();

    // 4. Handle Window Resize
    window.addEventListener('resize', onWindowResize, false);
}

function addStars() {
    const starGeo = new THREE.BufferGeometry();
    const count = 2000;
    const posArray = new Float32Array(count * 3);

    for (let i = 0; i < count * 3; i++) {
        posArray[i] = (Math.random() - 0.5) * 100; // Spread stars far out
    }

    starGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.1 });
    const stars = new THREE.Points(starGeo, starMat);
    scene.add(stars);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

export function animate() {
    requestAnimationFrame(animate);

    if (controls) {
        controls.update();
        // Adaptive rotation speed: slower when closer
        // Distance ranges from 5 to 50.
        // At 5 (closest), speed ~ 0.1
        // At 50 (farthest), speed ~ 1.0
        const dist = camera.position.distanceTo(controls.target);
        controls.rotateSpeed = dist * 0.02;
    }

    if (globeMesh) {
        // Apply rotation from UI state
        globeMesh.rotation.y += uiStateRef.rotationSpeed;
    }

    renderer.render(scene, camera);
}
