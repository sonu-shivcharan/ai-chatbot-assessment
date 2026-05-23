# Frontend Application Setup

The frontend is a single-page React app configured with Vite, TypeScript, and TailwindCSS. It serves as the chat interface and includes a metrics dashboard.

---

## 1. Prerequisites
* [Node.js](https://nodejs.org) (v18+ recommended) or [Bun](https://bun.sh)
* Ensure that the backend service is running on [http://localhost:3000](http://localhost:3000) so the client can perform API fetches.

---

## 2. Installation

Install frontend dependencies:

### Using Bun
```bash
bun install
```

### Using Node.js / NPM
```bash
npm install
```

---

## 3. Running the Development Server

Start the Vite hot-reloading development server:

### Using Bun
```bash
bun run dev
```

### Using NPM
```bash
npm run dev
```

By default, the application will boot on [http://localhost:5173](http://localhost:5173) (or fallback to port `5174` if port 5173 is already in use). Open this URL in your web browser.

---

## 4. Production Build & Preview

To build and run the static production bundle locally:

### 1. Build the production assets
Compiles TypeScript and creates optimized static assets in the `/dist` directory:
```bash
bun run build
# OR using NPM
npm run build
```

### 2. Preview the production build locally
Hosts the built static assets on a local Vite preview server:
```bash
bun run preview
# OR using NPM
npm run preview
```
The preview will start on [http://localhost:4173](http://localhost:4173).
