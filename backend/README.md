# Backend Service Setup

The backend service is a Node.js/TypeScript application powered by Express and Mongoose. It can be run using either **Bun** (the default runner) or **Node.js** (via TypeScript execution).

---

## 1. Prerequisites
Make sure you have either of the following installed:
* [Bun](https://bun.sh) (Recommended)
* [Node.js](https://nodejs.org) (v20+ recommended)
* A running MongoDB database (local or MongoDB Atlas connection string)

---

## 2. Environment Configuration
Copy the `.env.sample` file to `.env`:
```bash
cp .env.sample .env
```

Open `.env` and fill in your API keys:
```env
GROQ_API_KEY="your-actual-groq-api-key"
GEMINI_API_KEY="your-actual-gemini-api-key"
```

*Note: Restrict models are enforced at runtime:*
* *Gemini provider only accepts: `gemini-2.5-flash`*
* *Groq provider only accepts: `groq/compound` and `llama-3.1-8b-instant`*

---

## 3. Installation

Install all required dependencies:

### Using Bun (Default)
```bash
bun install
```

### Using Node.js / NPM
```bash
npm install
```

---

## 4. Running the Development Server

### Using Bun (Watches files dynamically)
```bash
bun run dev
```

### Using Node.js (Executes TypeScript directly using tsx)
```bash
npx tsx src/index.ts
```

The backend server will start on [http://localhost:3000](http://localhost:3000).

---

## 5. Compiling & Running in Production Mode

To simulate the production container build locally:

### 1. Build the JavaScript Bundle
Bundle all TypeScript source files into a single, clean ES module at `dist/index.js` using `esbuild`:
```bash
bun run build
# OR using NPM
npm run build
```

### 2. Run the Compiled Bundle with Node.js
If running with standard Node.js locally, feed the environment file flag:
```bash
node --env-file=.env dist/index.js
```
*(In Docker/Production environments, variables will be fed directly via container orchestration, so you simply run `node dist/index.js`)*.
