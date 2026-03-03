# Digital Signage Player

Digital signage solution that runs on both Tizen and Web.

## Live Access

- [Player (Production)](https://signage.cemalturkcan.com/)
- [API (Production)](https://signage.cemalturkcan.com/api)
- [Swagger (Production)](https://signage.cemalturkcan.com/api/docs)
- [Swagger (Local)](http://localhost:3000/api/docs)

## Tech Stack

Node.js 20, TypeScript, Vue 3, Vite, Pinia, Hono, PostgreSQL, MQTT (Mosquitto), Docker, Tizen Studio CLI

## Repository Structure

```bash
apps/
  backend/
  player/
packages/
  contracts/
```

## Local Setup

1. Start required services:

```bash
docker compose -f docker/docker-compose.yml --env-file docker/.env up -d postgres mosquitto backend
```

2. Install dependencies:

```bash
pnpm install
```

3. Start development mode:

```bash
pnpm dev
```

## Player API Base URL (Important)

- The project works locally with default values.
- For real device/emulator usage, update `apps/player/.env` and set `VITE_API_BASE_URL` to a URL that the device can reach.
- `VITE_API_BASE_URL` must point to the API root (example: `https://signage.cemalturkcan.com/api`).

## Tizen Build and Install

Prerequisites:

- Tizen Studio CLI installed
- `tizen` and `sdb` available in `PATH`

Build and install from this repository:

```bash
pnpm wgt:build
pnpm wgt:install
pnpm wgt:install:run
```

Install a `.wgt` downloaded from GitHub Releases:

1. Download the latest `.wgt` from [Releases](https://github.com/cemalturkcan/digital-signage-player/releases/latest).
2. Install it directly with:

```bash
pnpm --filter @signage/player exec tsx scripts/install-emulator.ts <path-to-wgt>
```

## API Endpoints

- `GET /api/health`
- `POST /api/devices/register`
- `GET /api/playlists`
- `GET /api/playlists/{id}`
- `POST /api/commands`

## Container Images

- Frontend: `ghcr.io/cemalturkcan/digital-signage-frontend:latest`
- Backend: `ghcr.io/cemalturkcan/digital-signage-backend:latest`

Image packages:

- [Frontend package](https://github.com/cemalturkcan/digital-signage-player/pkgs/container/digital-signage-frontend)
- [Backend package](https://github.com/cemalturkcan/digital-signage-player/pkgs/container/digital-signage-backend)
