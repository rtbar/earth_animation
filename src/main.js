import { animate, initScene } from './globeScene.js';
import { initUI } from './ui.js';

// 1. Initialize the UI and get the initial state
const uiState = initUI();

// 2. Initialize the 3D Scene, passing the UI state object
//    The scene will read the 'speed' property from this object every frame.
initScene(uiState).then(() => {
    // 3. Start the animation loop once assets are ready
    animate();
}).catch(err => {
    console.error("Failed to initialize scene:", err);
});
