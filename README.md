# Digital Signage Case Çalışması

## Demo

Aşağıda doğrudan demo videosu ve ekran görüntülerini bulabilirsiniz.

### Demo Video

<video src="https://cdn.cemalturkcan.com/videos/screenrecording-2026-03-04_00-05-08_optimized.mp4" controls muted playsinline width="960"></video>

### Ekran Görüntüleri

#### Player

<img width="1600" height="843" alt="Player" src="https://github.com/user-attachments/assets/75036b7d-d33a-4f4b-8e5b-caadf377388c" />

#### Panel

<img width="1600" height="842" alt="Panel" src="https://github.com/user-attachments/assets/d1f27ebb-b219-4956-ac75-b100a9bde480" />

#### Panel (Command View)

<img width="1600" height="842" alt="Panel Command View" src="https://github.com/user-attachments/assets/a7475e29-9490-46b5-b53b-ddb283717752" />

## Description

Bu projede Tizen implementasyonu yer alır.
Aynı player mimarisi ve command flow, platform adapter katmanı üzerinden farklı Smart TV platformlarına adapte edilebilir.

- Player: [https://signage.cemalturkcan.com/](https://signage.cemalturkcan.com/)
- Panel: [https://signage.cemalturkcan.com/panel/](https://signage.cemalturkcan.com/panel/)
- API: [https://signage.cemalturkcan.com/api](https://signage.cemalturkcan.com/api)
- Swagger: [https://signage.cemalturkcan.com/api/docs](https://signage.cemalturkcan.com/api/docs)

## Stack

- Runtime: Node.js 20, TypeScript
- Player/Panel: Vue 3, Vite, Pinia, Axios
- Backend: Hono, PostgreSQL, MQTT (Mosquitto)
- Infra: Docker, Docker Swarm, Traefik, GitHub Actions
- Shared contracts: `packages/contracts`
- Logging: backend `pino`, player MQTT `events`

## Mimari açıklama

- Player tarafında lifecycle `bootstrap -> registration -> MQTT connect -> command handling -> playback` akışıyla ilerler.
- Player katmanları ayrıdır: `platform adapter`, `mqtt`, `commands`, `runtime`, `cache`, `request`, `stores`.
- Backend tarafında REST API ile MQTT command bus ayrıdır. REST `POST /api/commands` çağrısı backend içinde MQTT dispatch'e çevrilir.
- Panel doğrudan player'a değil backend API'ye konuşur: aktif cihazları `/api/devices/active` ile okur, komutları `/api/commands` ile gönderir.
- Shared contract modeli (`packages/contracts`) ile command/topic/payload tipleri frontend-backend arasında tek kaynaktan yönetilir.

## Trade-off kararları

- **QoS 1 seçimi:** command delivery için yeterli güvenilirlik sağlar; QoS 2'ye göre daha düşük latency/overhead.
- **Panel polling (1s) seçimi:** implementasyonu basit ve stabil; WebSocket/SSE'ye göre operasyonel karmaşıklığı daha düşük.
- **Presence için MQTT + DB seçimi:** instance-local memory yerine shared DB kullanımı multi-instance backend'de tutarlılık sağlar.
- **Screenshot response yaklaşımı:** command sonucu korunur, panel tarafında görüntü preview için backend public path kullanılır; payload yönetimi sade kalır.
- **Platform abstraction:** platforma bağlı kod adapter katmanında izole edildi, business logic tarafı sade kaldı.

## Varsayımlar

- Her cihazın stabil ve unique bir `deviceId` ile register olduğu varsayılır.
- MQTT broker retained message + LWT destekler.
- Reverse proxy tarafında en az `/api` ve `/public` path routing açıktır.
- Tizen build/install için host ortamında `tizen` ve `sdb` CLI araçları erişilebilir durumdadır.
- Panel ile backend arasında saatlik değil, saniyelik polling trafiğini kaldırabilecek ağ/servis kapasitesi vardır.

## WGT Build (Tizen)

### Release links

- Son WGT release: [https://github.com/cemalturkcan/digital-signage-player/releases/latest](https://github.com/cemalturkcan/digital-signage-player/releases/latest)

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

Belirli bir `.wgt` dosyasını (ör. `Downloads`) kurmak için:

```bash
pnpm -C apps/player exec tsx scripts/install-emulator.ts "/home/<user>/Downloads/digital_signage_player_<build>.wgt"
```

Sadece install (run etmeden):

```bash
pnpm -C apps/player run wgt:install
```

### WGT script flow

`apps/player/package.json` altında Tizen script zinciri şöyle çalışır:

- `pnpm wgt:build` -> `tsx scripts/package-wgt.ts`
- `pnpm wgt:install` -> `tsx scripts/install-emulator.ts`
- `pnpm wgt:run` -> `tsx scripts/run-emulator.ts`
- `pnpm wgt:install:run` -> install + run

`package-wgt.ts` adımları:

- `config.xml` widget version değerini `apps/player/package.json` version ile sync eder.
- `npx vite build --mode tizen` ile Tizen build alır.
- Signing profile oluşturur/günceller (`tizen security-profiles`), gerekiyorsa author cert create eder.
- `tizen package -t wgt -s <profile>` ile paketler.
- Son oluşan `.wgt` dosyasını `digital_signage_player_<version>.wgt` adıyla `apps/player/` altına taşır.

`install-emulator.ts` adımları:

- `sdb devices` çıktısından hedef serial bekler/seçer.
- WGT install eder; author mismatch veya signature validation hatasında retry/rebuild fallback uygular.

`run-emulator.ts` adımları:

- `config.xml` içinden app id çözer.
- `sdb shell app_launcher -s <appId>` ile app'i başlatır.

Environment dosyaları:

- `.env.tizen`: `TIZEN_PROFILE`, `TIZEN_AUTHOR_CERT_PATH`, `TIZEN_AUTHOR_CERT_PASSWORD`, `VITE_RUNTIME_NAME`, `VITE_API_BASE_URL`
- `.env.prod`: CI/prod build için API gibi runtime değerleri

## MQTT

### Topic structure

```text
players/{deviceId}/commands
players/{deviceId}/responses
players/{deviceId}/events
players/{deviceId}/status
```

### Reply topic ve correlationId akışı

- Her command `commandId` ile gelir, response tarafında aynı değer `correlationId` olarak döner.
- Backend `POST /api/commands` akışında command payload'ına `replyTopic` ekler:
  - `backend/<instance-id>/responses/<commandId>`
- Backend aynı anda `backend/<instance-id>/responses/#` pattern'ine subscribe olur ve doğru `correlationId` geldiğinde request'i tamamlar.
- Player tarafında `replyTopic` yoksa fallback olarak `players/{deviceId}/responses` kullanılır.

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

### Multi-instance notu

Bu projede `$share/...` shared subscription kullanılmıyor. Her backend instance `status` topic pattern'ine ayrı subscribe olur ve presence bilgisini shared DB'ye yazar. Böylece state tek instance memory'sine bağlı kalmaz. (`$share` kullanılsaydı aynı message bir consumer group içinde tek instance'a düşerdi.)

## Panel çalışma modeli

- Panel, active devices listesini `GET /api/devices/active` ile 1 saniye aralıkla poll eder.
- Komut gönderimi `POST /api/commands` üzerinden backend command bus'a yapılır.
- `screenshot` sonucu panelde preview olarak gösterilir; görüntü backend `public` path'i üzerinden alınır.

## Payloads

Komut örneği:

```json
{
  "type": "command",
  "commandId": "550e8400-e29b-41d4-a716-446655440000",
  "command": "screenshot",
  "replyTopic": "backend/instance-1/responses/550e8400-e29b-41d4-a716-446655440000",
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

## Önemli API response body örnekleri

Player tarafında kritik akışta kullanılan iki endpoint için örnek response body aşağıda:

### `POST /api/devices/register` response

```json
{
  "data": {
    "mqtt": {
      "host": "signage.cemalturkcan.com",
      "port": 443,
      "ssl": true,
      "path": "/mqtt",
      "clientId": "device-001",
      "username": "device_device-001",
      "password": "<device-password>",
      "keepalive": 60,
      "connectTimeout": 30000,
      "reconnectPeriod": 5000,
      "clean": true,
      "will": {
        "topic": "players/device-001/status",
        "payload": "{\"type\":\"presence\",\"status\":\"offline\",\"reason\":\"lwt\"}",
        "qos": 1,
        "retain": true
      }
    }
  },
  "meta": {
    "code": "200",
    "message": "Success"
  }
}
```

### `GET /api/playlists?deviceId=<id>&page=1&pageSize=100` response

```json
{
  "data": {
    "size": 1,
    "total": 1,
    "currentPage": 1,
    "totalPages": 1,
    "content": [
      {
        "id": "1",
        "loop": true,
        "createdAt": 1700000000000,
        "updatedAt": 1700000000000,
        "items": [
          {
            "id": "1",
            "type": "image",
            "url": "https://example.com/image1.jpg",
            "duration": 10,
            "order": 1
          },
          {
            "id": "2",
            "type": "video",
            "url": "https://example.com/video.mp4",
            "order": 2
          }
        ]
      }
    ]
  },
  "meta": {
    "code": "200",
    "message": "Success"
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

- Player dev: [http://localhost:5173](http://localhost:5173)
- Panel dev: [http://localhost:5174](http://localhost:5174)
- Backend API: [http://localhost:3000/api](http://localhost:3000/api)
- Swagger: [http://localhost:3000/api/docs](http://localhost:3000/api/docs)

## CI/CD

- `tizen-release.yml`: signed WGT build + GitHub Release
- `backend-pipeline.yml`: backend image build/push/deploy
- `frontend-pipeline.yml`: player image build/push/deploy
- `panel-pipeline.yml`: panel image build/push/deploy
