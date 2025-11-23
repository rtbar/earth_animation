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

export function updateClock(hours, minutes) {
    const clock = document.getElementById('clock');
    const h = String(Math.floor(hours)).padStart(2, '0');
    const m = String(Math.floor(minutes)).padStart(2, '0');
    clock.textContent = `${h}:${m}`;
}