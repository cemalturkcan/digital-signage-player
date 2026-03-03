<script setup lang="ts">
import type { CommandType } from '@signage/contracts'
import { storeToRefs } from 'pinia'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useCommandsStore } from '@/app/stores/commands/store'
import { useDevicesStore } from '@/app/stores/devices/store'
import Badge from '@/components/ui/Badge.vue'
import Button from '@/components/ui/Button.vue'
import Card from '@/components/ui/Card.vue'
import { BACKEND_URL } from '@/config'

const devicesStore = useDevicesStore()
const commandsStore = useCommandsStore()
const { t } = useI18n()

const { items, selectedDeviceId, selectedDevice, lastUpdatedAt } = storeToRefs(devicesStore)
const { sending, error, lastResult } = storeToRefs(commandsStore)

const volumeLevel = ref(50)

const quickCommands: Array<{ type: CommandType, labelKey: string }> = [
  { type: 'reload_playlist', labelKey: 'reloadPlaylist' },
  { type: 'restart_player', labelKey: 'restartPlayer' },
  { type: 'play', labelKey: 'play' },
  { type: 'pause', labelKey: 'pause' },
  { type: 'screenshot', labelKey: 'screenshot' },
]

const canSend = computed(() => Boolean(selectedDevice.value?.deviceId) && !sending.value)
const hasSelectedDevice = computed(() => Boolean(selectedDevice.value))

interface ScreenshotResultPayload {
  publicPath?: string
}

function resolveBackendOrigin(): string {
  if (/^https?:\/\//.test(BACKEND_URL)) {
    return BACKEND_URL.replace(/\/api\/?$/, '')
  }

  if (typeof window !== 'undefined') {
    return window.location.origin
  }

  return ''
}

function isScreenshotPayload(value: unknown): value is ScreenshotResultPayload {
  if (!value || typeof value !== 'object') {
    return false
  }

  const payload = value as Record<string, unknown>
  return typeof payload.publicPath === 'string' && payload.publicPath.trim().length > 0
}

const screenshotUrl = computed(() => {
  const result = lastResult.value
  if (!result || result.command !== 'screenshot' || result.status !== 'success') {
    return null
  }

  if (!isScreenshotPayload(result.payload)) {
    return null
  }

  const path = result.payload.publicPath!
  if (/^https?:\/\//.test(path)) {
    return path
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${resolveBackendOrigin()}${normalizedPath}`
})

function selectDevice(deviceId: string): void {
  devicesStore.setSelectedDevice(deviceId)
}

async function sendCommand(command: CommandType, params?: Record<string, unknown>): Promise<void> {
  if (!selectedDevice.value)
    return

  await commandsStore.send(selectedDevice.value.deviceId, command, params)
}

async function sendVolume(): Promise<void> {
  await sendCommand('set_volume', { level: volumeLevel.value })
}

function formatTimestamp(value: string | null): string {
  if (!value)
    return '-'

  try {
    return new Date(value).toLocaleTimeString()
  }
  catch {
    return value
  }
}
</script>

<template>
  <section class="panel-page">
    <header class="panel-header">
      <p class="panel-kicker">
        {{ t('panelKicker') }}
      </p>
      <h1 class="panel-title">
        {{ t('panelTitle') }}
      </h1>
      <p class="panel-subtitle">
        {{ t('panelSubtitle') }}
      </p>
      <p class="panel-updated">
        {{ t('lastSeen') }}: {{ formatTimestamp(lastUpdatedAt) }}
      </p>
    </header>

    <div class="panel-grid">
      <Card>
        <div class="section-head">
          <h2>{{ t('activeDevices') }} ({{ items.length }})</h2>
          <Badge variant="success">
            {{ t('live') }}
          </Badge>
        </div>
        <p v-if="items.length === 0" class="muted">
          {{ t('noActiveDevices') }}
        </p>

        <ul v-else class="device-list">
          <li v-for="item in items" :key="item.deviceId">
            <Button
              variant="outline"
              size="lg"
              block
              class="device-button"
              :class="{ 'device-button--active': item.deviceId === selectedDeviceId }"
              @click="selectDevice(item.deviceId)"
            >
              <span class="device-id">{{ item.deviceId }}</span>
              <span class="device-meta">{{ t('lastSeen') }}: {{ formatTimestamp(item.lastSeenAt) }}</span>
            </Button>
          </li>
        </ul>
      </Card>

      <Card>
        <div class="section-head">
          <h2>{{ t('sendCommand') }}</h2>
          <Badge :variant="selectedDevice ? 'success' : 'default'">
            {{ selectedDevice ? t('selected') : t('idle') }}
          </Badge>
        </div>
        <p class="muted">
          {{ selectedDevice?.deviceId || t('selectDevice') }}
        </p>

        <div class="command-grid">
          <Button
            v-for="entry in quickCommands"
            :key="entry.type"
            variant="default"
            :disabled="!canSend"
            @click="sendCommand(entry.type)"
          >
            {{ t(entry.labelKey) }}
          </Button>
        </div>

        <div v-if="hasSelectedDevice" class="volume-box">
          <label for="volume-level">{{ t('volume') }}: {{ volumeLevel }}</label>
          <input id="volume-level" v-model.number="volumeLevel" type="range" min="0" max="100">
          <Button variant="outline" :disabled="!canSend" @click="sendVolume">
            {{ t('setVolume') }}
          </Button>
        </div>

        <div v-if="sending" class="status status--info">
          {{ t('sending') }}
        </div>
        <div v-else-if="error" class="status status--error">
          {{ t('resultError') }}: {{ error }}
        </div>
        <div
          v-else-if="lastResult"
          class="status"
          :class="lastResult.status === 'success' ? 'status--success' : 'status--error'"
        >
          {{ t('commandResult') }}: {{ lastResult.command }} -
          {{ lastResult.status === 'success' ? t('resultSuccess') : t('resultError') }}
        </div>

        <div v-if="screenshotUrl" class="screenshot-wrap">
          <p class="muted">
            {{ t('screenshotPreview') }}
          </p>
          <img
            :src="screenshotUrl"
            :alt="t('screenshotPreview')"
            class="screenshot-preview"
            loading="lazy"
          >
        </div>
      </Card>
    </div>
  </section>
</template>

<style scoped>
.panel-page {
  min-height: 100vh;
  min-height: 100dvh;
  padding: clamp(var(--size-4), 3vw, var(--size-10));
}

.panel-header {
  margin-bottom: var(--size-6);
}

.panel-kicker {
  font-size: var(--font-size-xs);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--muted);
}

.panel-title {
  font-size: clamp(2.4rem, 4vw, 4.4rem);
  line-height: 1.15;
  color: var(--text);
}

.panel-subtitle {
  margin-top: var(--size-2);
  color: var(--muted);
}

.panel-updated {
  margin-top: var(--size-2);
  color: var(--muted);
  font-size: var(--font-size-sm);
}

.panel-grid {
  display: grid;
  gap: var(--size-4);
  grid-template-columns: 1fr;
}

@media (min-width: 980px) {
  .panel-grid {
    grid-template-columns: 1fr 1.4fr;
  }
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--size-2);
}

.device-list {
  margin-top: var(--size-3);
  list-style: none;
  display: grid;
  gap: var(--size-2);
}

.device-button {
  text-align: left;
  display: grid;
  gap: 0.4rem;
}

.device-button--active {
  border-color: #ffffff !important;
  background: #ffffff !important;
  color: #000000 !important;
}

.device-id {
  font-family: var(--font-mono);
  font-size: 1.3rem;
}

.device-meta {
  font-size: 1.2rem;
  color: var(--muted);
}

.device-button--active .device-meta {
  color: #111111;
}

.command-grid {
  margin-top: var(--size-3);
  display: grid;
  gap: var(--size-2);
  grid-template-columns: repeat(auto-fill, minmax(15rem, 1fr));
}

.volume-box {
  margin-top: var(--size-4);
  display: grid;
  gap: var(--size-2);
}

.volume-box input[type='range'] {
  accent-color: #ffffff;
}

.muted {
  color: var(--muted);
  margin-top: var(--size-2);
}

.status {
  margin-top: var(--size-4);
  padding: var(--size-2) var(--size-3);
  border-radius: var(--radius-md);
  border: 1px solid transparent;
}

.status--info {
  background: #111111;
  border-color: #2a2a2a;
  color: #e5e7eb;
}

.status--success {
  background: #0b1a11;
  border-color: #14532d;
  color: #86efac;
}

.status--error {
  background: #1a0b0b;
  border-color: #7f1d1d;
  color: #fca5a5;
}

.screenshot-wrap {
  margin-top: var(--size-4);
  display: grid;
  gap: var(--size-2);
}

.screenshot-preview {
  display: block;
  width: 100%;
  max-width: 64rem;
  max-height: 36rem;
  object-fit: contain;
  border: 1px solid var(--border);
  background: #000000;
}
</style>
