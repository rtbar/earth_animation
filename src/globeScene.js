import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// --- Configuration ---
// Fallback textures in case local files are missing.
const TEXTURE_DAY = 'textures/earth_day.jpg';
const TEXTURE_NIGHT = 'textures/earth_night.jpg';
// Use these online URLs if you don't have local files setup yet:
// const TEXTURE_DAY = 'https://upload.wikimedia.org/wikipedia/commons/c/c1/Earth_map_1024x512_%28equirectangular_projection%29.jpg';
// const TEXTURE_NIGHT = 'https://upload.wikimedia.org/wikipedia/commons/b/ba/The_earth_at_night.jpg';

let scene, camera, renderer, globeMesh, controls;
// let uiStateRef = { rotationSpeed: 0.001 }; // Removed dependency on UI state
const ROTATION_SPEED = 0.001; // Fixed rotation speed set here exclusively
let onTickCallback = null;
const markers = []; // Store markers to toggle visibility

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

export async function initScene(uiState, onTick) {
    // uiStateRef = uiState; // Ignored, using local constant
    onTickCallback = onTick;

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

    // Add Spain Marker (Lat: 40.4N, Lon: 3.7W)
    addMarker(40.4168, -3.7038, "1");

    // Add Turkey Marker (Lat: 39.9N, Lon: 32.9E)
    addMarker(39.9334, 32.8597, "5");

    // Add North Pole Marker (Lat: 90N)
    addMarker(90.0, 0.0, "2");

    // Optional: Add a stars background
    addStars();

    // 4. Handle Window Resize
    window.addEventListener('resize', onWindowResize, false);
}

function addMarker(lat, lon, text) {
    const radius = 4;
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);

    const x = -radius * Math.sin(phi) * Math.cos(theta);
    const y = radius * Math.cos(phi);
    const z = radius * Math.sin(phi) * Math.sin(theta);

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 128;
    canvas.height = 128;

    ctx.font = 'bold 100px Arial';
    ctx.fillStyle = 'red';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 64, 64);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        side: THREE.DoubleSide
    });

    const geometry = new THREE.PlaneGeometry(0.2, 0.2);
    const marker = new THREE.Mesh(geometry, material);

    marker.position.set(x, y, z);
    // Orient the marker to face away from the center of the globe
    marker.lookAt(new THREE.Vector3(x * 2, y * 2, z * 2));
    // Push it out slightly to avoid z-fighting
    marker.position.multiplyScalar(1.01);

    globeMesh.add(marker);
    markers.push(marker);
}

function addStars() {
    const starGeo = new THREE.BufferGeometry();
    const count = 2000;
    const posArray = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
        // Generate stars in a spherical shell far away
        // Camera maxDistance is 50, so we start at 60 to be safe
        const r = 60 + Math.random() * 140; // Radius between 60 and 200
        const theta = 2 * Math.PI * Math.random();
        const phi = Math.acos(2 * Math.random() - 1);

        const x = r * Math.sin(phi) * Math.cos(theta);
        const y = r * Math.sin(phi) * Math.sin(theta);
        const z = r * Math.cos(phi);

        posArray[i * 3] = x;
        posArray[i * 3 + 1] = y;
        posArray[i * 3 + 2] = z;
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

        // Toggle marker visibility based on distance
        // Visible when at 90% of closest zoom (distance ~ 9.5)
        // Min dist 5, Max dist 50. 90% zoom = 5 + (45 * 0.1) = 9.5
        const markersVisible = dist < 6;
        markers.forEach(marker => {
            marker.visible = markersVisible;
        });
    }

    if (globeMesh) {
        // Apply rotation from local constant
        globeMesh.rotation.y += ROTATION_SPEED;

        // Calculate Time
        // One full rotation (2*PI) = 24 hours
        // Offset calculation:
        // Sun is at (1, 0.5, 1) -> Angle in XZ plane is PI/4 (45 deg)
        // Sunrise happens when surface normal is perpendicular to sun direction (-90 deg relative to sun)
        // So sunrise angle is PI/4 - PI/2 = -PI/4 (-45 deg)
        // We want this angle (-PI/4) to correspond to 07:00
        // Formula: Time = (RotationY * 12/PI + Offset) % 24
        // 7 = (-PI/4 * 12/PI + Offset)
        // 7 = -3 + Offset => Offset = 10

        const hoursPerRadian = 12 / Math.PI;
        const offset = 10;

        // Normalize rotation to 0..2PI equivalent for time calculation
        // We use modulo logic on the hours directly
        let rawHours = (globeMesh.rotation.y * hoursPerRadian + offset) % 24;
        if (rawHours < 0) rawHours += 24;

        const hours = Math.floor(rawHours);
        const minutes = Math.floor((rawHours - hours) * 60);

        if (onTickCallback) {
            onTickCallback({ hours, minutes });
        }
    }

    renderer.render(scene, camera);
}
