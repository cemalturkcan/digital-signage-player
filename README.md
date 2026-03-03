# Digital Signage Case Çalışması

Bu repo, Tizen odaklı bir dijital signage çözümünü uçtan uca gösteren bir case çalışmasıdır. Player, panel ve backend birlikte çalışır; komut akışı MQTT üzerinden yürür, yönetim tarafı ise REST API ile ilerler. Player tarafındaki platform adapter yapısı sayesinde aynı mimariyi farklı Smart TV platformlarına taşımak mümkündür.

## Demo

Player uygulaması için canlı adres: [https://signage.cemalturkcan.com/](https://signage.cemalturkcan.com/). Panel için canlı adres: [https://signage.cemalturkcan.com/panel/](https://signage.cemalturkcan.com/panel/). API erişimi: [https://signage.cemalturkcan.com/api](https://signage.cemalturkcan.com/api). Swagger dokümantasyonu: [https://signage.cemalturkcan.com/api/docs](https://signage.cemalturkcan.com/api/docs).

Demo videosu:

https://github.com/user-attachments/assets/8395ac53-13da-462e-ae19-b47a896b2ef3

Player ekranı:

<img width="1600" height="843" alt="Player" src="https://github.com/user-attachments/assets/75036b7d-d33a-4f4b-8e5b-caadf377388c" />

Player playback ekranı:

<img width="1600" height="842" alt="Player Playback" src="https://github.com/user-attachments/assets/a7475e29-9490-46b5-b53b-ddb283717752" />

Panel ekranı:

<img width="1600" height="842" alt="Panel" src="https://github.com/user-attachments/assets/d1f27ebb-b219-4956-ac75-b100a9bde480" />

## Teknoloji Özeti

Runtime tarafında Node.js 20 ve TypeScript kullanıldı. Player ve panel Vue 3, Vite, Pinia ve Axios ile geliştirildi. Backend tarafında Hono, PostgreSQL ve Mosquitto (MQTT) bulunuyor. Altyapıda Docker, Docker Swarm, Traefik ve GitHub Actions kullanılıyor. Frontend ve backend arasındaki command, topic ve payload tipleri `packages/contracts` içinde ortak bir kaynaktan yönetiliyor.

## Mimari Yaklaşım

Player yaşam döngüsü `bootstrap -> registration -> MQTT connect -> command handling -> playback` akışıyla ilerler. Player içinde `platform`, `mqtt`, `commands`, `runtime`, `cache`, `request` ve `stores` katmanları ayrıştırılmıştır. Backend tarafında REST API ve MQTT command bus birbirinden ayrıdır; panelden gelen `POST /api/commands` isteği backend içinde MQTT dispatch'e dönüştürülür. Panel doğrudan player ile konuşmaz, aktif cihazları `GET /api/devices/active` ile okur ve komutları `POST /api/commands` ile gönderir.

## Tasarım Kararları ve Trade-off'lar

Komut tesliminde QoS 1 tercih edildi; bu seçim QoS 2'ye göre daha düşük gecikme ve daha az operasyonel yükle yeterli güvenilirlik sağlıyor. Panel tarafında cihaz listesi için 1 saniyelik polling modeli kullanıldı; WebSocket veya SSE'ye göre daha sade ve stabil bir işletim davranışı veriyor. Presence bilgisini yalnızca instance belleğinde tutmak yerine MQTT + shared DB yaklaşımı benimsendi; bu sayede multi-instance backend yapısında durum tutarlılığı korunuyor. Screenshot yanıtında görüntü verisi korunurken panel tarafında önizleme backend public path üzerinden servis ediliyor; payload yönetimi sade kalıyor. Platforma bağlı kod, adapter katmanında izole edilerek iş kurallarının platformdan bağımsız kalması sağlanıyor.

## Varsayımlar

Her cihazın stabil ve benzersiz bir `deviceId` ile kayıt olduğu, MQTT broker tarafında retained message ve LWT desteğinin bulunduğu, Tizen build ve kurulum akışı için host ortamında `tizen` ve `sdb` CLI araçlarının erişilebilir olduğu varsayılmıştır.

## Tizen ve WGT Süreci

En güncel WGT release bağlantısı: [https://github.com/cemalturkcan/digital-signage-player/releases/latest](https://github.com/cemalturkcan/digital-signage-player/releases/latest).

Docker imajları için backend: `ghcr.io/cemalturkcan/digital-signage-backend:latest`, player frontend: `ghcr.io/cemalturkcan/digital-signage-frontend:latest`, panel frontend: `ghcr.io/cemalturkcan/digital-signage-panel:latest`.

Player tarafında platform bağımlı API'ler `apps/player/src/app/platform` altında izole edilmiştir. `createPlatformAdapter()` çalışma anında Tizen veya web adapter seçer ve iş kuralları platformdan bağımsız kalır.

Yerelde WGT almak için önce bağımlılıkların kurulması ve ardından paketleme adımının çalıştırılması yeterlidir.

```bash
pnpm install
pnpm wgt:build
```

Bu akış sonunda çıktı `apps/player/*.wgt` olarak üretilir.

Emülatör veya gerçek cihaz kurulumu için temel akış:

```bash
sdb devices
pnpm wgt:install:run
```

İsterseniz belirli bir `.wgt` dosyasını doğrudan vererek de kurulum yapabilirsiniz:

```bash
pnpm -C apps/player exec tsx scripts/install-emulator.ts "/home/<user>/Downloads/digital_signage_player_<build>.wgt"
```

Script akışı `apps/player/package.json` altında `wgt:build`, `wgt:install`, `wgt:run` ve `wgt:install:run` komutlarıyla yönetilir. `package-wgt.ts`, `config.xml` sürümünü `package.json` ile senkronlar, Tizen build alır, gerekli signing profile işlemlerini yapar, paketi üretir ve çıktıyı `apps/player` altına taşır. `install-emulator.ts` hedef cihazı `sdb` üzerinden seçer, kurulum yapar ve olası sertifika hatalarında yeniden deneme/yeniden paketleme fallback'i uygular. `run-emulator.ts` uygulama kimliğini çözerek `app_launcher` ile uygulamayı başlatır.

## Emülatör ve Cihaz İçin Ağ Planı

Bu projeyi dev ortamından emülatör veya fiziksel TV ortamına taşırken zorunlu olarak değiştirmeniz gereken tek değer API adresidir. TV emülatörü veya cihaz üzerinde `localhost` cihazın kendisini işaret ettiği için backend'e erişim sağlamaz. Bu nedenle `apps/player/.env` dosyasındaki `VITE_API_BASE_URL` değeri, backend'i çalıştıran makinenin aynı ağdaki IP adresi ile ayarlanmalıdır.

```bash
VITE_API_BASE_URL=http://192.168.1.4:3000/api
```

Yukarıdaki IP sadece örnektir; herkes kendi ağındaki gerçek IP'yi yazmalıdır. Prod veya demo ortamında ise bu değer `.env.prod` içindeki public API adresiyle yönetilir.

## MQTT İletişimi

Topic yapısı aşağıdaki gibidir:

```text
players/{deviceId}/commands
players/{deviceId}/responses
players/{deviceId}/events
players/{deviceId}/status
```

Komutlar `commandId` ile gönderilir ve response tarafında aynı değer `correlationId` olarak döner. Backend, `POST /api/commands` akışında payload'a `replyTopic` ekler ve `backend/<instance-id>/responses/#` pattern'ini dinleyerek doğru `correlationId` geldiğinde isteği tamamlar. Player tarafında `replyTopic` gelmezse varsayılan olarak `players/{deviceId}/responses` kullanılır.

Komutlar QoS 1 ile gönderilir, event ve telemetry tarafında QoS 0 kullanılır. Reconnect stratejisi exponential backoff ve jitter kombinasyonu ile ilerler:

```text
delay = min(30s, 1s * 2^attempt) + random(0-400ms)
```

Player, retained presence bilgisini `.../status` topic'ine `online` veya `offline` olarak yayınlar. Backend bu bilgiyi tüketip cihaz durumunu veritabanına yazar. Bu projede `$share/...` shared subscription kullanılmaz; her backend instance durum topic'lerini dinler ve ortak veritabanına yazar.

## Panel Çalışma Modeli

Panel, aktif cihaz listesini `GET /api/devices/active` endpoint'inden 1 saniye aralıkla çeker. Komut gönderimi `POST /api/commands` ile backend command bus'a yapılır. `screenshot` komutunun sonucu panelde önizleme olarak gösterilir ve görsel backend public path üzerinden alınır.

## Payload Örnekleri

Komut payload örneği:

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

## API Response Örnekleri

Player kritik akışında kullanılan `POST /api/devices/register` endpoint'inin örnek dönüşü:

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

`GET /api/playlists?deviceId=<id>&page=1&pageSize=100` endpoint'inin örnek dönüşü:

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

## Komut Seti

Sistemde desteklenen komutlar `reload_playlist`, `restart_player`, `play`, `pause`, `set_volume` ve `screenshot` olarak tanımlıdır.

## Offline-first Davranışı

Playlist ve medya dosyaları local cache'e alınır. Ağ bağlantısı kesildiğinde oynatma cache üzerinden sürer. Playlist güncellemeleri hash veya versiyon kontrolü ile yapılır. MQTT bağlantısı düştüğünde reconnect stratejisi devreye girer.

## Local Kurulum

Geliştirme ortamı için Node.js 20+, pnpm 8+ ve Docker gereklidir. Kurulum ve çalıştırma akışı aşağıdaki komutlarla tamamlanır:

```bash
pnpm install
docker compose -f docker/docker-compose.yml --env-file docker/.env up -d
pnpm dev
```

Local adresler sırasıyla player için [http://localhost:5173](http://localhost:5173), panel için [http://localhost:5174](http://localhost:5174), backend API için [http://localhost:3000/api](http://localhost:3000/api) ve Swagger için [http://localhost:3000/api/docs](http://localhost:3000/api/docs) şeklindedir.

## CI/CD

CI/CD tarafında `tizen-release.yml` signed WGT build ve GitHub Release sürecini, `backend-pipeline.yml` backend image build/push/deploy sürecini, `frontend-pipeline.yml` player image build/push/deploy sürecini, `panel-pipeline.yml` ise panel image build/push/deploy sürecini yönetir.
