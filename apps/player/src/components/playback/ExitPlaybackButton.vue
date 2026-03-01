<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const emit = defineEmits<{
  (e: 'exit'): void
}>()

const { t } = useI18n()

function handleExit(): void {
  emit('exit')
}
</script>

<template>
  <button
    class="exit-playback-button"
    type="button"
    :aria-label="t('exitPlayback')"
    @click="handleExit"
  >
    <span class="exit-playback-button_icon">&lt;</span>
  </button>
</template>

<style scoped>
.exit-playback-button {
  width: var(--size-12);
  height: var(--size-12);
  padding: 0;
  border: var(--border-width-thin) solid var(--border-tv);
  border-radius: var(--radius-tv-pill);
  background: color-mix(in oklab, var(--surface-tv-elevated) 88%, transparent);
  color: var(--text-tv);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--size-2);
}

.exit-playback-button:hover,
.exit-playback-button:focus-visible {
  border-color: var(--border-tv-strong);
  background: var(--surface-tv-accent);
}

.exit-playback-button_icon {
  font-size: var(--font-size-lg);
  line-height: 1;
}
</style>
