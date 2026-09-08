# NodeSimulator - DSA Visualization Tool

A powerful visualization tool for Data Structures and Algorithms (DSA) simulations, featuring interactive step-by-step animation capabilities.

## Features

- **Stack Visualization**: Timeline view showing sequential dry-run states with U-shaped stack containers
- **Array & String Operations**: Drag-and-drop element swapping with visual feedback
- **Undo/Redo System**: Full Cmd+Z support for operations including position changes
- **Theme Integration**: Consistent color theming across all components
- **Step-Based Simulation**: Position preservation across simulation steps
- **Interactive Editor**: Create, edit, and animate DSA operations

## Tech Stack

- **UI**: React, TypeScript, Vite, Tailwind CSS, Zustand
- **Backend**: Node.js (Express) — API + production static UI
- **Database**: SQLite file (`data/simulator.db`)
- **Auth**: bcrypt passwords + HMAC session tokens (Node `crypto`)

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Dev (Vite UI + Node API):
- UI: http://localhost:5173
- API: http://localhost:3001 (`/api` is proxied from Vite)

Production (one Node process after `npm run build`):
- http://localhost:3001

### Build for Production

```bash
npm run build
npm start
```

Then open http://localhost:3001 (Node serves the UI and the API).

## Usage

1. **Create a Simulation**: Start with an empty canvas or import Java DSA code
2. **Add Visual Nodes**: Use the toolbar to add arrays, stacks, strings, variables, pointers, etc.
3. **Create Steps**: Use the timeline to create step-by-step animations
4. **Edit Operations**: Modify values, swap elements, or drag objects to new positions
5. **Play Animation**: Use the playback controls to visualize the algorithm execution
6. **Undo/Redo**: Use Cmd+Z to undo operations, Cmd+Shift+Z to redo

## Keyboard Shortcuts

- **Cmd+Z**: Undo last operation
- **Cmd+Shift+Z**: Redo undone operation
- **Space**: Play/pause simulation
- **Delete/Backspace**: Delete selected object
- **Cmd+D**: Duplicate selected object
- **Cmd+C**: Copy selected object
- **Cmd+V**: Paste copied object
- **Arrow Keys**: Move selected object (Shift for larger steps)

## Project Structure

```
src/                    # React UI (canvas, dashboard, playback)
server/                 # Node.js backend (Express API + SQLite)
data/simulator.db       # Saved users and simulations (created at runtime)
```

## Development

The project uses hot module replacement for rapid development. Changes to React components and styles are automatically reflected in the browser.

## License

MIT License