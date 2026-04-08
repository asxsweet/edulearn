
  # Educational Platform UI Design

  This is a code bundle for Educational Platform UI Design. The original project is available at https://www.figma.com/design/dZ1X63L0PYoMHvohMqptEF/Educational-Platform-UI-Design.

  ## Running the code

  From the repository root:

  - `npm install` — installs the root helper (concurrently).
  - `npm run install:all` — installs dependencies for `frontend/` and `server/`.
  - `npm run dev` — starts the Vite app (`frontend`) and the API (`server`) together.
  - `npm run dev:frontend` or `npm run dev:server` — only one side.

  **Vercel:** set the project **Root Directory** to `frontend` (build: `npm run build`, output: `frontend/dist`). Set `VITE_API_URL` to your Render API URL.
  