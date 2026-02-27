# Delivery Checklist

Pre-submission verification steps for case evaluator.

## Environment Setup

```bash
# 1. Start infrastructure
cd docker
docker-compose up -d

# 2. Verify services
docker-compose ps
# Expected: postgres, mosquitto healthy

# 3. Check MQTT broker
mosquitto_pub -h localhost -p 1883 -u admin -P admin1234567 -t test -m ok
```

## Backend Verification

```bash
cd apps/backend

# 1. Type check
pnpm typecheck
# Expected: No errors

# 2. Start backend
pnpm dev

# 3. Test health endpoint
curl http://localhost:3000/api/health
# Expected: {"status":"ok"}
```

## Player Verification

```bash
cd apps/player-tizen

# 1. Type check
pnpm typecheck
# Expected: No errors

# 2. Configure environment
cat .env
# Expected: VITE_API_BASE_URL=http://YOUR_IP:3000

# 3. Start dev server
pnpm dev
```

## Functional Tests

### Test 1: Device Registration

```bash
# Register device
curl -X POST http://localhost:3000/api/register \
  -H "Content-Type: application/json" \
  -d '{"deviceId":"test-device-001"}'

# Expected response:
# {
#   "mqtt": {
#     "host": "...",
#     "port": 9001,
#     "clientId": "test-device-001",
#     ...
#   }
# }
```

### Test 2: Playlist Fetch

```bash
curl "http://localhost:3000/api/playlist?deviceId=test-device-001"

# Expected: Playlist with 2 items (image + video)
```

### Test 3: MQTT Commands

```bash
# Terminal 1: Subscribe to responses
mosquitto_sub -h localhost -p 1883 -u admin -P admin1234567 \
  -t signage/test-device-001/responses

# Terminal 2: Send ping command
mosquitto_pub -h localhost -p 1883 -u admin -P admin1234567 \
  -t signage/test-device-001/commands \
  -m '{"type":"command","commandId":"cmd-001","command":"ping","timestamp":'$(date +%s%3N)'}'

# Expected in Terminal 1:
# {"type":"command_result","command":"ping","correlationId":"cmd-001","status":"success",...}
```

### Test 4: Player Playback Loop

1. Open player in browser: http://localhost:5173
2. Verify:
   - Device registers (status shows "connected")
   - Playlist loads (image displays first)
   - Image transitions after 10s
   - Video plays after image
   - Loop restarts after video ends

### Test 5: Screenshot Command

```bash
# Send screenshot command (returns base64 image in response)
mosquitto_pub -h localhost -p 1883 -u admin -P admin1234567 \
  -t signage/test-device-001/commands \
  -m '{
    "type": "command",
    "commandId": "cmd-screenshot-001",
    "command": "screenshot",
    "timestamp": '$(date +%s%3N)'
  }'

# Verify response contains base64 image payload:
# {"type":"command_result","command":"screenshot","payload":{"base64":"...","mimeType":"image/png"}}
```

### Test 6: Offline Behavior

1. Load player in browser, let it cache content
2. Disconnect network (DevTools → Network → Offline)
3. Verify:
   - Playback continues from cache
   - No errors in console
4. Reconnect network
5. Verify:
   - MQTT reconnects automatically
   - Commands resume working

### Test 7: Volume Command

```bash
mosquitto_pub -h localhost -p 1883 -u admin -P admin1234567 \
  -t signage/test-device-001/commands \
  -m '{
    "type": "command",
    "commandId": "cmd-vol-001",
    "command": "set_volume",
    "timestamp": '$(date +%s%3N)',
    "params": {"level": 50}
  }'

# Expected: success response
```

## WGT Build Verification

```bash
cd apps/player-tizen

# 1. Configure .env.tizen
cat .env.tizen
# Expected: TIZEN_CLI, TIZEN_PROFILE, TIZEN_AUTHOR_CERT_PASSWORD set

# 2. Build WGT
pnpm build

# 3. Verify output
ls -la digital_signage_player_0.1.0.wgt
# Expected: File exists, ~500KB+

# 4. Verify WGT is signed
unzip -l digital_signage_player_0.1.0.wgt | grep signature
# Expected: Contains author-signature.xml
```

## Emulator Deployment (Optional)

```bash
# 1. Start Tizen emulator from Tizen Studio

# 2. Install WGT
tizen install -n digital_signage_player_0.1.0.wgt -t <emulator-name>

# 3. Launch app on emulator
# 4. Verify same functionality as browser
```

## Checklist Summary

| Test                        | Status | Notes |
| --------------------------- | ------ | ----- |
| Backend typecheck           | [ ]    |       |
| Player typecheck            | [ ]    |       |
| Device registration         | [ ]    |       |
| Playlist fetch              | [ ]    |       |
| MQTT ping command           | [ ]    |       |
| Playback loop               | [ ]    |       |
| Screenshot command          | [ ]    |       |
| Offline playback            | [ ]    |       |
| Volume command              | [ ]    |       |
| WGT build                   | [ ]    |       |
| WGT signed                  | [ ]    |       |
| Emulator run (if available) | [ ]    |       |

## Known Issues

Document any deviations from expected behavior:

- **Issue**: **\*\***\_\_\_**\*\***
- **Workaround**: **\*\***\_\_\_**\*\***
- **Severity**: [ ] Critical [ ] Minor

## Submission Artifacts

Required files for evaluator:

1. `digital_signage_player_0.1.0.wgt` - Signed package
2. Screenshot of player running (browser or emulator)
3. Screenshot of MQTT command/response flow
4. This checklist with completed items marked
