# NodeSimulator - DSA Visualization Tool

A powerful visualization tool for Data Structures and Algorithms (DSA) simulations, featuring interactive step-by-step animation capabilities.

<img width="3024" height="1712" alt="image" src="https://github.com/user-attachments/assets/2ee6e730-20fa-40ff-bba2-ee58f4bf9481" />


## Features

- **Stack Visualization**: Timeline view showing sequential dry-run states with U-shaped stack containers
- **Array & String Operations**: Drag-and-drop element swapping with visual feedback
- **Undo/Redo System**: Full Cmd+Z support for operations including position changes
- **Theme Integration**: Consistent color theming across all components
- **Step-Based Simulation**: Position preservation across simulation steps
- **Interactive Editor**: Create, edit, and animate DSA operations

<img width="1512" height="858" alt="Screenshot 2026-09-09 at 10 11 57 PM" src="https://github.com/user-attachments/assets/e9c742c6-e142-4ad5-a29d-e59abb24bbab" />

<img width="1511" height="857" alt="Screenshot 2026-09-09 at 10 11 49 PM" src="https://github.com/user-attachments/assets/afcf8bd4-cb5e-4910-9e6e-32c31cc7135a" />

## Tech Stack

- **UI**: React, TypeScript, Vite, Tailwind CSS, Zustand
- **Backend**: Node.js (Express) — API + production static UI
- **Database**: MySQL on your PC (`node_simulator`)
- **Auth**: bcrypt passwords + HMAC session tokens (Node `crypto`)

## MySQL on your PC (do this first)

Data lives in MySQL, not in the app folder. Redeploying or updating the Node app does **not** erase simulations, as long as MySQL keeps running on this machine.

### 1. Install and start MySQL (macOS)

```bash
brew install mysql
brew services start mysql
```

If `brew` is missing: https://brew.sh

Confirm it is running:

```bash
mysql --version
brew services list
```

### 2. Set a root password (if you do not have one yet)

```bash
mysql -u root
```

In the MySQL prompt:

```sql
ALTER USER 'root'@'localhost' IDENTIFIED BY 'pick_a_strong_password';
FLUSH PRIVILEGES;
EXIT;
```

(If that login fails, try `mysql -u root -p` and use the password you already set.)

The app will create the `node_simulator` database and tables on first start. You do not need to run `schema.sql` unless you want to create tables by hand (MySQL Workbench is fine).

### 3. Point the app at MySQL

```bash
cp .env.example .env
```

Edit `.env` and set **your** password:

```
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=pick_a_strong_password
MYSQL_DATABASE=node_simulator
```

### 4. Start the app

```bash
npm install
npm run dev
```

You should see: `MySQL: 127.0.0.1/node_simulator`

### Deploy vs data

- **App updates** (git pull, rebuild, restart Node) → MySQL data stays.
- **MySQL on this PC** + **website hosted somewhere else** → that host cannot see `127.0.0.1` on your laptop unless you expose MySQL to the internet (do not). Keep Node and MySQL on the **same machine**, or use a hosted MySQL and put that host in `.env`.

## Getting Started

### Prerequisites

- Node.js 18+
- MySQL running locally
- npm or yarn

### Installation

```bash
cp .env.example .env   # then edit MYSQL_PASSWORD
npm install
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
server/                 # Node.js backend (Express API)
server/db/              # MySQL connection + schema
.env                    # MySQL host/user/password (not committed)
```

## Development

The project uses hot module replacement for rapid development. Changes to React components and styles are automatically reflected in the browser.

## License

MIT License
