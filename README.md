# OutsideHub

OutsideHub is a React/Vite web app with an Express API and an Electron desktop wrapper.

## Stack

- React 19 + Vite
- TypeScript
- Express
- Local JSON persistence in `data/db.json`
- Electron + electron-builder for the Windows installer

## Development

```powershell
pnpm install
pnpm run dev
```

Web: `http://localhost:5173`  
API: `http://localhost:3333/api`

The development seed creates the initial admin user:

```text
username: 540
password: 3526
```

## Useful Scripts

```powershell
pnpm run check
pnpm run build
pnpm run build:electron
pnpm run dist:win
```

`pnpm run dist:win` builds the web app, bundles the server for Electron, installs Electron dependencies, and creates the Windows installer in `release/`.

## Runtime Data

The web/API development runtime stores data in:

```text
data/db.json
```

The packaged Electron app stores data in the user's app data directory, not in the source tree.

## Environment

Copy `.env.example` to `.env` and adjust values as needed. Discord OAuth and scraper provider credentials are optional for local UI work.
