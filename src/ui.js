/**
 * Initializes the UI controls.
 * Returns a state object that holds the current configuration.
 */
export function initUI() {
    const slider = document.getElementById('speed-slider');

    // State object shared with the scene
    const state = {
        rotationSpeed: parseFloat(slider.value)
    };

    // Update state when slider changes
    slider.addEventListener('input', (e) => {
        state.rotationSpeed = parseFloat(e.target.value);
    });

    return state;
}
