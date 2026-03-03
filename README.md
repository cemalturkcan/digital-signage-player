# Digital Signage Player

Tizen öncelikli digital signage player çözümü.

## Canlı Erişim

- Player (Prod): `https://signage.cemalturkcan.com/`
- API (Prod): `https://signage.cemalturkcan.com/api`
- Swagger (Prod): `https://signage.cemalturkcan.com/api/docs`
- Swagger (Lokal): `http://localhost:3000/api/docs`

## Teknolojiler

Node.js 20, TypeScript, Vue 3, Vite, Pinia, Hono, PostgreSQL, MQTT (Mosquitto), Docker, Tizen Studio CLI

## Proje Yapısı

```bash
apps/
  backend/   # Cihaz kaydı, playlist servisi, komut gönderimi
  player/    # Oynatma motoru, MQTT istemcisi, offline cache
packages/
  contracts/ # Paylaşılan tipler ve topic yardımcıları
```

## Mimari

- Player runtime
- MQTT katmanı
- Network/request katmanı
- Storage ve cache katmanı
- Platform adapter (Tizen/Web)
- Backend service/repository katmanları

## Kurulum ve Çalıştırma Sırası

1. Docker servislerini başlat

```bash
docker compose -f docker/docker-compose.yml --env-file docker/.env up -d postgres mosquitto backend
```

2. Bağımlılıkları kur

```bash
pnpm install
```

3. Geliştirme modunu çalıştır

```bash
pnpm dev
```

4. Cihaz/Emülatör build-kurulum-çalıştırma

```bash
pnpm wgt:build
pnpm wgt:install
pnpm wgt:install:run
```

## Ortam Dosyaları

- `docker/.env`
- `apps/backend/.env`
- `apps/player/.env`
- `apps/player/.env.tizen`
- `apps/player/.env.prod`

Notlar:

- Varsayılan ayarlarla proje lokalde doğrudan çalışır.
- Gerçek cihaz/emülatör kullanımında `apps/player/.env` içindeki `VITE_API_BASE_URL`, cihazın erişebileceği network URL olacak şekilde güncellenmelidir.
- `VITE_API_BASE_URL` değeri API kökünü göstermelidir (örnek: `https://signage.cemalturkcan.com/api`).

## API

Swagger: `http://localhost:3000/api/docs`

OpenAPI: `http://localhost:3000/api/openapi.json`

REST endpointler:

- `GET /api/health`
- `POST /api/devices/register`
- `GET /api/playlists`
- `GET /api/playlists/{id}`
- `POST /api/commands`

## Playlist Oynatma

- İçerikler sıralı oynatılır.
- Görsellerde `duration` uygulanır.
- Video bittiğinde otomatik geçiş yapılır.
- `loop` değerine göre döngü davranışı yönetilir.

## MQTT

Varsayılan namespace: `players`

Topic yapısı:

- Subscribe: `players/{deviceId}/commands`
- Publish: `players/{deviceId}/responses`
- Publish: `players/{deviceId}/events`
- Publish: `players/{deviceId}/status`

QoS tercihi:

- Komut ve komut sonucu: QoS 1
- Event/telemetry: QoS 0

Desteklenen komutlar:

- `reload_playlist`
- `restart_player`
- `play`
- `pause`
- `set_volume`
- `screenshot`

## Screenshot Akışı

- Player `screenshot` komutunu alır.
- Ekran görüntüsünü base64 olarak üretir.
- Sonucu `command_result` formatında MQTT üzerinden yayınlar.
- Backend sonucu dosya olarak `public/screenshots/{deviceId}` altına kaydeder.

## Offline-First Yaklaşım

- Playlist yanıtı local storage’da cache’lenir.
- Playlist hash kontrolü ile güncelleme tespiti yapılır.
- Medya dosyaları Cache API ile saklanır.
- Ağ kesintisinde cache üzerinden oynatma devam eder.

## Hata Yönetimi ve Dayanıklılık

- Geçersiz JSON/komut payload’larında kontrollü hata sonucu döner.
- MQTT kopmalarında reconnect/backoff uygulanır.
- Medya hatalarında uygulama çökmez, sonraki içeriğe geçer.

## Loglama ve İzleme

- Backend: pino (`info`, `warn`, `error`)
- Player: MQTT event/status yayını
- Heartbeat: periyodik durum yayını

## Tizen Gereksinimi

Zorunlu adımlar:

- Tizen Studio CLI kurulumu
- `tizen` ve `sdb` komutlarının PATH’e eklenmesi

PATH’e eklenmesi gereken dizinler:

- Linux/macOS: `$HOME/tizen-studio/tools/ide/bin`
- Linux/macOS: `$HOME/tizen-studio/tools`
- Windows: `C:\tizen-studio\tools\ide\bin`
- Windows: `C:\tizen-studio\tools`

Tizen build akışında kullanılan temel env anahtarları:

- `apps/player/.env`: `VITE_API_BASE_URL`
- `apps/player/.env.tizen`: `TIZEN_PROFILE`, `TIZEN_AUTHOR_CERT_PASSWORD`, `VITE_RUNTIME_NAME`, `VITE_MQTT_TOPIC_NAMESPACE`
- `apps/player/.env.tizen` (opsiyonel): `TIZEN_AUTHOR_CERT_PATH`, `TIZEN_AUTO_CREATE_AUTHOR_CERT`

CLI + PATH hazır olduktan sonra WGT build, emülatöre kurulum ve çalıştırma scriptler ile otomatik yürütülür.

## CI Çıktıları

### Frontend Pipeline

- Workflow: `Frontend Pipeline`
- Image formatı: `ghcr.io/<github_owner_lower>/digital-signage-frontend:<commit_sha>`
- Metadata artifact: `frontend-image-<short_sha>`
- Bu yayın web doğrulama/test amaçlıdır; ana teslim çıktısı Tizen `.wgt` paketidir.

Son frontend image çıktısını alma:

1. GitHub `Actions` > `Frontend Pipeline` son başarılı run’ı aç.
2. `Artifacts` bölümünden `frontend-image-<short_sha>` dosyasını indir.
3. Artifact içindeki `image_tag` değeriyle image çek.

### Backend Pipeline

- Docker package: `https://github.com/cemalturkcan/digital-signage-player/pkgs/container/digital-signage-backend`
- Image formatı: `ghcr.io/<github_owner_lower>/digital-signage-backend:<commit_sha>`
- Metadata artifact: `backend-image-<short_sha>`

Son Docker build çıktısını alma:

1. GitHub `Actions` > `Backend Pipeline` son başarılı run’ı aç.
2. `Artifacts` bölümünden `backend-image-<short_sha>` dosyasını indir.
3. Artifact içindeki `image_tag` değeriyle image çek.

### Tizen Release Pipeline

- Tags/Release listesi: `https://github.com/cemalturkcan/digital-signage-player/tags`
- Workflow artifact: `tizen-wgt-<short_sha>`
- Üretilen dosyalar:
  - `apps/player/digital_signage_player_<short_sha>.wgt`
  - `apps/player/digital_signage_player_<short_sha>.wgt.sha256`

Son WGT build çıktısını alma:

1. GitHub `Actions` > `Tizen Release` son başarılı run’ı aç.
2. `Artifacts` bölümünden `tizen-wgt-<short_sha>` paketini indir.
3. Alternatif olarak tags/release sayfasından son sürüm asset dosyalarını indir.

## Pipeline ve Stack Akışı

Frontend akışı:

1. Frontend image GHCR’a push edilir.
2. Deploy job, stack env içine yeni `FRONTEND_IMAGE` değerini yazar.
3. Sadece frontend stack dosyası uygulanır: `apps/player/docker-stack.yaml`
4. Aynı stack adı (`digital-signage`) altında yalnızca frontend servisi güncellenir.

Backend akışı:

1. Backend image GHCR’a push edilir.
2. Deploy job, image tag’i ile remote Docker context üzerinde stack deploy yapar.
3. Root stack dosyası uygulanır: `docker/docker-stack.yaml`
4. Bu akış frontend image’a bağlı değildir; backend deploy frontend’i `latest` ile çekmez.

Tizen akışı:

1. Tizen CLI ve Java 8 hazırlanır.
2. İmzalı WGT build alınır.
3. WGT ve SHA256 artifact olarak yüklenir.
4. Release koşulu sağlandığında GitHub Releases altında bir sürüm açılır ve `.wgt` ile `.sha256` dosyaları bu sürüme eklenir.
