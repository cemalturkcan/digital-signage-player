# Digital Signage Player

Tizen (öncelikli) ve Web'de çalışan production-grade bir digital signage çözümü. Node.js, TypeScript, Vue 3, Hono, MQTT ve Docker kullanılarak geliştirildi.

- Player: https://signage.cemalturkcan.com/
- API: https://signage.cemalturkcan.com/api
- Swagger: https://signage.cemalturkcan.com/api/docs

---

## Stack

Node.js 20, TypeScript, Vue 3, Vite, Pinia, Hono, PostgreSQL, MQTT (Mosquitto), Docker, Tizen Studio CLI

---

## Repo Yapısı

```
apps/
  player/     Vue 3 + Vite ile Tizen/Web player
  backend/    REST API + MQTT komut yönlendirici (Hono)
packages/
  contracts/  Frontend ve backend arasında paylaşılan tipler, şemalar, topic factory
docker/
  docker-compose.yml
  mosquitto/config/
.github/workflows/
  tizen-release.yml     WGT build + GitHub Release
  backend-pipeline.yml  Backend CI + Docker image push
  frontend-pipeline.yml
```

---

## Mimari

### Katman Yapısı

Player (`apps/player/src/app/`) şu katmanlardan oluşuyor:

- `bootstrap/` — cihaz kaydı ve MQTT bağlantısı başlatma
- `runtime/` — playlist fetch, komut handler'ları, network takibi
- `mqtt/` — MQTT client (reconnect/backoff), event publisher, topic factory
- `commands/` — CommandBus, CommandRegistry, idempotent dedup
- `cache/` — playlist cache (localStorage), media cache (Cache API), hash kontrolü
- `platform/` — PlatformAdapter interface'i ve Tizen/Browser implementasyonları
- `request/` — API katmanı (axios)
- `stores/` — Pinia store'ları (device, player, playlist, library)

Backend (`apps/backend/src/`) şu şekilde organize edildi:

- `routes/` — REST endpoint'leri (devices, playlist, command, health)
- `app/message-bus/` — MQTT bağlantısı, komut dispatch, cihaz provisioning
- `app/logger/` — pino logger (info/warn/error seviyeleri)

### Temel Kararlar

`createPlatformAdapter()` ortama göre Tizen ya da Browser adaptörünü döner. Volume API, screenshot gibi platform bağımlı her şey bu adaptörün arkasında; business logic platforma dokunmuyor.

Komutlar `commandBus` üzerinden alınır, `validateCommandEnvelope` ile doğrulanır, `CommandHandlerRegistry` ile ilgili handler'a yönlendirilir.

Playback event'leri store state'ini `watch` ile izleyerek MQTT'ye publish edilir; bileşenler birbirini doğrudan çağırmaz.

`contracts` paketi tip ve validation fonksiyonlarını hem frontend hem backend'e sağlar. Tip uyumsuzluğu derleme zamanında yakalanır. `mqttClientService`, `eventPublisher` ve backend `logger` singleton olarak çalışır.

---

## MQTT

### Broker

Yerel ortamda Mosquitto, Docker üzerinden ayağa kalkar. Player tarayıcı ortamında çalıştığı için WebSocket (9001) kullanır, backend TCP (1883). Her cihaz kayıt sırasında kendine özel MQTT kullanıcısı ve ACL kuralı alır.

### Topic Yapısı

```
players/{deviceId}/commands    Backend → Player  (komut gönder)
players/{deviceId}/responses   Player → Backend  (komut sonucu)
players/{deviceId}/events      Player → Backend  (durum olayları)
players/{deviceId}/status      Player → Backend  (LWT / offline)
```

`players` namespace'i `VITE_MQTT_TOPIC_NAMESPACE` env değişkeniyle değiştirilebilir.

### QoS Tercihi

Komutlar için **QoS 1** kullandım; iletilmesi garanti altında olmalı. Yinelenen mesajlar zaten `commandId` bazlı deduplication ile zararsız hale geliyor, QoS 2'nin getirdiği ek handshake maliyetine gerek yok. Event ve heartbeat'ler için **QoS 0** yeterli; telemetri kaybedilse de kritik değil.

### Örnek Payload'lar

Komut (Backend → Player):

```json
{
  "type": "command",
  "commandId": "550e8400-e29b-41d4-a716-446655440000",
  "command": "screenshot",
  "timestamp": 1700000000000
}
```

Başarılı komut sonucu (Player → Backend):

```json
{
  "type": "command_result",
  "command": "screenshot",
  "correlationId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "success",
  "timestamp": 1700000001000,
  "payload": {
    "base64": "<BASE64_PNG_DATA>",
    "mimeType": "image/png"
  }
}
```

Hata durumu:

```json
{
  "type": "command_result",
  "command": "screenshot",
  "correlationId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "error",
  "timestamp": 1700000001000,
  "error": {
    "code": "SCREENSHOT_FAILED",
    "message": "Screenshot capture unavailable"
  }
}
```

Event (Player → Backend):

```json
{
  "type": "event",
  "event": "network_status",
  "timestamp": 1700000000000,
  "payload": {
    "reason": "heartbeat",
    "online": true,
    "mqttConnected": true
  }
}
```

`set_volume` örneği:

```json
{
  "type": "command",
  "commandId": "abc-123",
  "command": "set_volume",
  "timestamp": 1700000000000,
  "params": { "level": 75 }
}
```

### Desteklenen Komutlar

- `reload_playlist` — playlist'i API'den yeniden çeker, cache'i günceller, oynatmayı güncel listeye göre sürdürür
- `restart_player` — player'ı soft-restart eder; state temizlenir, playlist yeniden yüklenir (crash yok)
- `play` — duraklatılmış içeriği devam ettirir
- `pause` — oynatmayı duraklatır
- `set_volume` — `params.level` (0–100) ile ses seviyesini ayarlar
- `screenshot` — `html2canvas` ile ekran görüntüsü alır, base64 encode eder, MQTT üzerinden döner

Tüm komutlar idempotent'tir. Aynı `commandId` ikinci kez gelirse sistem tekrar işlem yapmadan `{ duplicate: true }` döner.

### Reconnect Stratejisi

Bağlantı koptuğunda exponential backoff + jitter uygulanır:

```
delay = min(30s, 1s × 2^attempt) + random(0–400ms)
```

Her başarılı bağlantıda `attempt` sıfırlanır. Uygulamanın kendi başlattığı `disconnect()` çağrısında döngü durur.

---

## Offline-First

Açılışta önce localStorage'daki playlist cache'e bakılır. Cache varsa içerik hemen gösterilir (cold start, ağ beklenmez), arka planda ağdan yenileme yapılır. Cache yoksa ağdan yüklenir; ağ da yoksa hata gösterilir.

Medya dosyaları Cache API'ye indirilir. Ağ kesildiğinde player bu cache'ten `blob URL` üretip oynatmaya devam eder. Bileşen unmount olduğunda `URL.revokeObjectURL` ile bellek serbest bırakılır.

Hash bazlı invalidation: her playlist response'u hash'lenir. Ağdan gelen hash cache'tekiyle eşleşiyorsa UI ve medya cache'i güncellenmez. Değişiklik varsa media cache sıfırdan doldurulur.

---

## Hata Yönetimi

Uygulama şu senaryolarda crash etmez:

- Ağ hatası / timeout → cache'ten devam edilir
- Bozuk medya dosyası → `error` event'i yakalanır, bir sonraki öğeye geçilir
- JSON parse hatası → MQTT'ye `INVALID_PAYLOAD` döner, loop bozulmaz
- MQTT bağlantı kopması → exponential backoff ile yeniden bağlanır
- Bilinmeyen komut → `UNSUPPORTED_COMMAND` kodu ile hata döner
- Geçersiz komut şeması → `validateCommandEnvelope` ile erken yakalanır
- Hızlı playlist geçişi (race condition) → `playbackToken` ile eski async işlemler iptal edilir

---

## Logging

Backend tarafında `pino` ile info/warn/error seviyeli structured logging var. Production'da JSON çıktısı, local'de pretty-print. Player tarafında oynatma olayları, ağ durumu ve komut sonuçları MQTT `events` topic'ine publish edilir; bu eventler merkezi bir log altyapısına yönlendirilebilir.

---

## Local Kurulum

Gereksinimler: Node.js 20+, pnpm 8+, Docker

```bash
# Servisleri başlat (PostgreSQL + Mosquitto + Backend)
docker compose -f docker/docker-compose.yml --env-file docker/.env up -d postgres mosquitto backend

# Bağımlılıkları yükle
pnpm install

# Geliştirme modunu başlat
pnpm dev
```

Player `http://localhost:5173`, Swagger `http://localhost:3000/api/docs` adresinde açılır.

Device control panel: `http://localhost:3000/`

Player env değişkenleri (`apps/player/.env`):

- `VITE_API_BASE_URL` — backend API root, varsayılan `http://localhost:3000`
- `VITE_MQTT_TOPIC_NAMESPACE` — MQTT topic namespace, varsayılan `players`
- `VITE_RUNTIME_NAME` — `tizen` veya `web`

Gerçek cihaz ya da emulator kullanımında `VITE_API_BASE_URL`'i cihazın erişebileceği bir adrese güncelle.

---

## Tizen Build ve Kurulum

### Gereksinimler

[Tizen Studio CLI](https://developer.tizen.org/development/tizen-studio/download) kurulu olmalı. Kurulumdan sonra `tizen` ve `sdb` araçlarını PATH'e ekle:

```bash
# Linux / macOS
export PATH="$HOME/tizen-studio/tools/ide/bin:$HOME/tizen-studio/tools:$PATH"
```

Windows'ta aynı yolları System Environment Variables'a ekle (`C:\tizen-studio\tools\ide\bin`, `C:\tizen-studio\tools`).

### Sertifika ve İmzalama

`pnpm wgt:build` script'i sertifika yönetimini otomatik yapar. `apps/player/.env.tizen` dosyasını oluşturup profil adı ve şifresini ayarlamak yeterli:

```bash
# apps/player/.env.tizen
TIZEN_PROFILE="SignageProfile"
TIZEN_AUTHOR_CERT_PASSWORD="<şifre>"
VITE_RUNTIME_NAME=tizen
VITE_API_BASE_URL=https://signage.cemalturkcan.com/api
```

Script çalıştığında `~/tizen-studio-data/keystore/author/` altında sertifika arar. Bulamazsa sertifikayı kendisi oluşturmak isteyip istemediğini sorar. CI ortamında `TIZEN_AUTO_CREATE_AUTHOR_CERT=1` env değişkeni ile otomatik oluşturulur. Distributor sertifikası Tizen Studio'nun kendi `certificate-generator` klasöründen otomatik alınır, ayrıca bir şey yapman gerekmiyor.

Mevcut bir `.p12` kullanmak istersen `TIZEN_AUTHOR_CERT_PATH` değişkeniyle yolu belirtebilirsin.

### Build ve Kurulum

```bash
# Build + imzala → apps/player/digital_signage_player_0.1.0.wgt
pnpm wgt:build

# Emulator veya cihaz bağlantısını doğrula
sdb devices

# Kur ve çalıştır
pnpm wgt:install:run
```

GitHub Releases'tan hazır WGT kullanmak için:

```bash
pnpm --filter @signage/player exec tsx scripts/install-emulator.ts <path-to.wgt>
```

---

## CI/CD

- `tizen-release.yml` — `main`'e her push'ta signed `.wgt` üretir ve GitHub Release olarak yayınlar. Tag push'larında stabil release çıkar.
- `backend-pipeline.yml` — Backend image'ını build edip GHCR'ye push eder.
- `frontend-pipeline.yml` — Frontend image'ı için aynı süreç.

CI için gerekli GitHub secrets:

- `TIZEN_AUTHOR_CERT_B64` — `.p12` dosyasının base64 encode'u
- `TIZEN_AUTHOR_CERT_PASSWORD` — sertifika şifresi

Container image'ları:

- `ghcr.io/cemalturkcan/digital-signage-frontend:latest`
- `ghcr.io/cemalturkcan/digital-signage-backend:latest`

---

## API

Tam dokümantasyon Swagger UI'da mevcut: `http://localhost:3000/api/docs`

- `GET /api/health`
- `GET /api/devices`
- `POST /api/devices/register`
- `GET /api/playlists`
- `GET /api/playlists/{id}`
- `POST /api/commands`

