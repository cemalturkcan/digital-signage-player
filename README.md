# Digital Signage Case Çalışması

## Demo

Aşağıda doğrudan demo videosu ve ekran görüntülerini bulabilirsiniz.

### Demo Video

<video src="<demo-video-url>" controls muted playsinline width="960"></video>

### Ekran Görüntüleri

![Player](docs/media/player.png)

![Panel](docs/media/panel.png)

## Description

Tizen öncelikli Smart TV player, backend komut bus katmanı ve kontrol panelinden oluşan bir Digital Signage çözümü.
Live links: Player https://signage.cemalturkcan.com/ , Panel https://signage.cemalturkcan.com/panel/ , API https://signage.cemalturkcan.com/api , Swagger https://signage.cemalturkcan.com/api/docs

## Stack

Bu projede Node.js 20 ve TypeScript kullanıldı. Player ve panel tarafı Vue 3 + Vite + Pinia ile, backend tarafı Hono + PostgreSQL + MQTT (Mosquitto) ile geliştirildi. Dağıtım tarafında Docker, Docker Swarm, Traefik ve GitHub Actions kullanılıyor. Shared types ve topic structure `packages/contracts` içinde tutuluyor. Logging backend'de `pino` ile yapılıyor, player ise operational events'i MQTT üzerinden publish ediyor.

## WGT Build (Tizen)

### Release links

- Son WGT release: https://github.com/cemalturkcan/digital-signage-player/releases/latest
- Tüm release'ler: https://github.com/cemalturkcan/digital-signage-player/releases

### Docker latest build'leri

- Backend: [`ghcr.io/cemalturkcan/digital-signage-backend:latest`](https://github.com/users/cemalturkcan/packages/container/digital-signage-backend)
- Player frontend: [`ghcr.io/cemalturkcan/digital-signage-frontend:latest`](https://github.com/users/cemalturkcan/packages/container/digital-signage-frontend)
- Panel frontend: [`ghcr.io/cemalturkcan/digital-signage-panel:latest`](https://github.com/users/cemalturkcan/packages/container/digital-signage-panel)

### Tizen adapter note

Platform bağımlı API'ler player platform katmanında izole edilmiştir (`apps/player/src/app/platform`).
`createPlatformAdapter()` runtime'da Tizen veya web adapter'ını seçer; iş kuralları platformdan bağımsız kalır.

### Local WGT build

Ön koşul: Tizen Studio CLI araçları (`tizen`, `sdb`) PATH içinde olmalıdır.

```bash
pnpm install
pnpm wgt:build
```

Çıktı: `apps/player/*.wgt`

Emulator kurulum/çalıştırma:

```bash
sdb devices
pnpm wgt:install:run
```

## MQTT

### Topic structure

```text
players/{deviceId}/commands
players/{deviceId}/responses
players/{deviceId}/events
players/{deviceId}/status
```

### QoS

- Commands: QoS 1 (teslim garantisi + idempotent command handling)
- Events/telemetry: QoS 0

### Reconnect ve jitter

Reconnect stratejisi exponential backoff + jitter:

```text
delay = min(30s, 1s * 2^attempt) + random(0-400ms)
```

### Presence

Player, `.../status` topic'ine retained `online/offline` bilgisi publish eder. Backend bu bilgiyi tüketip cihaz durumunu günceller.

## Payloads

Komut örneği:

```json
{
  "type": "command",
  "commandId": "550e8400-e29b-41d4-a716-446655440000",
  "command": "screenshot",
  "timestamp": 1700000000000
}
```

Screenshot başarı response örneği:

```json
{
  "type": "command_result",
  "command": "screenshot",
  "correlationId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "success",
  "timestamp": 1700000001000,
  "payload": {
    "format": "image/png",
    "base64": "<BASE64_IMAGE_DATA>"
  }
}
```

Screenshot hata response örneği:

```json
{
  "type": "command_result",
  "command": "screenshot",
  "correlationId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "error",
  "error": {
    "code": "SCREENSHOT_FAILED",
    "message": "Platform screenshot API not available"
  }
}
```

## Commands

- `reload_playlist`
- `restart_player`
- `play`
- `pause`
- `set_volume`
- `screenshot`

## Offline-first

- Playlist ve medya dosyaları lokal cache'e alınır.
- Network kesildiğinde oynatma cache üzerinden devam eder.
- Playlist güncellemesi hash/version kontrolü ile yapılır.
- MQTT kopmalarında reconnect stratejisi devrededir.

## Local setup

Gereksinimler: Node.js 20+, pnpm 8+, Docker

```bash
pnpm install
docker compose -f docker/docker-compose.yml --env-file docker/.env up -d
pnpm dev
```

Local endpoints:

- Player dev: http://localhost:5173
- Panel dev: http://localhost:5174
- Backend API: http://localhost:3000/api
- Swagger: http://localhost:3000/api/docs

## CI/CD

- `tizen-release.yml`: signed WGT build + GitHub Release
- `backend-pipeline.yml`: backend image build/push/deploy
- `frontend-pipeline.yml`: player image build/push/deploy
- `panel-pipeline.yml`: panel image build/push/deploy
