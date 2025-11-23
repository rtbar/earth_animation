# 3D Day/Night Globe

A 3D Earth simulation featuring a fixed sun position, smooth day-to-night texture transitions using a custom shader, and UI controls for rotation speed.

## Technology Stack
- **Three.js**: For 3D rendering, scene graph management, and texture handling.
- **Vite**: For a fast, no-config development server and bundling.

## Setup & Run

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Texture Setup**
   Download high-resolution Earth textures (Day and Night) and place them in the `public/textures/` folder.
   - Rename them to `earth_day.jpg` and `earth_night.jpg`.
   - *Note: The code includes fallback URLs to external images so it runs immediately, but local files are preferred for performance.*

3. **Run Development Server**
   ```bash
   npm run dev
   ```
   Open the local URL provided (usually `http://localhost:5173`).

## Project Structure
- `src/globeScene.js`: Handles the 3D logic, shader code, and rendering loop.
- `src/ui.js`: Handles the HTML slider input.
- `src/main.js`: Bootstrap file wiring the Scene and UI together.
