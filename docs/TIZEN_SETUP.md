# Tizen Setup Guide

## Prerequisites

- Tizen Studio 5.0+ with TV extensions
- Windows 10/11 or WSL2 with Windows host
- Samsung certificate for device deployment

## Tizen Studio Installation

1. Download from https://developer.tizen.org/
2. Install with TV Extension (required for TV apps)
3. Note installation path (e.g., `C:\tizen-studio`)

## Development Environment

### 1. Configure Player Environment

```bash
cd apps/player

# Create player .env
cat > .env <<EOF
VITE_API_BASE_URL=http://YOUR_IP:3000
VITE_MQTT_BROKER_URL=ws://YOUR_IP:9001
EOF
```

Replace `YOUR_IP` with your machine's IP address (not localhost, for emulator/device access).

### 2. Configure Tizen Build Environment

```bash
# Create .env.tizen
cat > .env.tizen <<EOF
TIZEN_CLI=C:/tizen-studio/tools/ide/bin/tizen.bat
TIZEN_PROFILE=SignageProfile
TIZEN_AUTHOR_CERT_PASSWORD=yourpassword
EOF
```

### WSL/Windows Path Handling

The build script auto-detects WSL and handles path conversion:

- WSL paths converted to Windows format via `wslpath -m`
- Commands executed through `cmd.exe /c`
- Works with Tizen Studio installed on Windows host

## Build Process

### Development Build

```bash
cd apps/player
pnpm dev
```

Runs Vite dev server at http://localhost:5173

### Production Build (WGT Package)

```bash
cd apps/player
pnpm build
```

This script:

1. Reads `.env.tizen` for Tizen CLI path
2. Runs `vite build --mode tizen`
3. Creates/uses security profile for signing
4. Packages signed WGT to `digital_signage_player_0.1.0.wgt`

## Emulator Testing

### Launch Emulator

1. Open Tizen Studio
2. Tools → Emulator Manager
3. Create TV emulator (1080p recommended)
4. Start emulator

### Install WGT on Emulator

```bash
# Via Tizen CLI
tizen install -n digital_signage_player_0.1.0.wgt -t <emulator-name>

# Or drag WGT file to emulator window
```

### Debug on Emulator

1. Right-click emulator → Control Panel
2. Enable "Debug mode"
3. Open Chrome: `chrome://inspect`
4. Find emulator device, click "Inspect"

## Device Deployment

### Enable Developer Mode on TV

1. TV Settings → General → External Device Manager
2. Device Connect Manager → Access Notification → Off
3. Device Connect Manager → IP Settings → Enter your PC IP
4. Restart TV

### Connect to Device

```bash
# Connect via SDB
sdb connect <tv-ip-address>

# Verify connection
sdb devices
```

### Install on Device

```bash
# Install WGT
tizen install -n digital_signage_player_0.1.0.wgt -t <device-id>

# Or via Tizen Studio: right-click project → Run As → Tizen Web Application
```

## Platform Capabilities

### Supported Features

| Feature        | Tizen API                      | Fallback               |
| -------------- | ------------------------------ | ---------------------- |
| Volume Control | `tizen.tvfw.setVolume()`       | In-memory state        |
| Device Info    | `tizen.productinfo.getModel()` | Browser user agent     |
| Screenshot     | `tizen.tvfw.captureScreen()`   | Canvas-based (limited) |
| Storage        | Cache API + localStorage       | Same                   |

### Known Limitations

1. **Screenshot**: Native Tizen screenshot requires `tvfw` privilege not available to web apps. Implementation falls back to canvas-based capture (viewport only, no video frames).

2. **Memory**: Large media files may exceed TV memory. Recommendation: optimize videos to <50MB each.

3. **CORS**: Media URLs must allow CORS for Cache API to work. Use `access origin="*"` in config.xml.

## config.xml Reference

```xml
<?xml version="1.0" encoding="UTF-8"?>
<widget xmlns="http://www.w3.org/ns/widgets"
        xmlns:tizen="http://tizen.org/ns/widgets"
        id="com.signage.player"
        version="0.1.0"
        viewmodes="maximized">
    <tizen:application id="SgnPlayer0.DigitalSignage"
                       package="SgnPlayer0"
                       required_version="10.0"/>
    <name>Digital Signage Player</name>
    <content src="index.html"/>
    <icon src="icon.png"/>

    <!-- Required privileges -->
    <tizen:privilege name="http://tizen.org/privilege/internet"/>
    <tizen:privilege name="http://tizen.org/privilege/network.get"/>

    <!-- Settings -->
    <tizen:setting screen-orientation="landscape"
                   context-menu="disable"
                   background-support="enable"
                   encryption="disable"
                   install-location="auto"/>

    <!-- CORS access -->
    <access origin="*" subdomains="true"/>
</widget>
```

## Troubleshooting

### Build Fails: "TIZEN_CLI is not set"

Ensure `.env.tizen` exists and `TIZEN_CLI` points to valid `tizen.bat`.

### WSL: "command not found"

Tizen CLI must be Windows path (e.g., `C:/tizen-studio/...`). WSL path won't work.

### Emulator: Black Screen

Check that `VITE_API_BASE_URL` uses your machine IP, not localhost.

### Device: "Certificate error"

Create Samsung certificate in Tizen Studio Certificate Manager, reference it in `.env.tizen`.

### Install Fails: "Author signature invalid"

Ensure same certificate used for packaging and device. Reset device to factory if certificate changed.
