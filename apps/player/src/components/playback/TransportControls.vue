<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import BackwardIcon from '@/components/player/icons/BackwardIcon.vue'
import ForwardIcon from '@/components/player/icons/ForwardIcon.vue'

const emit = defineEmits<{
  (e: 'previous'): void
  (e: 'next'): void
}>()

const { t } = useI18n()

function handlePrevious(): void {
  emit('previous')
}

function handleNext(): void {
  emit('next')
}
</script>

<template>
  <div class="transport-controls">
    <button
      class="transport-controls_button"
      type="button"
      :aria-label="t('previousMedia')"
      @click="handlePrevious"
    >
      <BackwardIcon />
    </button>

    <button
      class="transport-controls_button"
      type="button"
      :aria-label="t('nextMedia')"
      @click="handleNext"
    >
      <ForwardIcon />
    </button>
  </div>
</template>

<style scoped>
.transport-controls {
  display: flex;
  align-items: center;
  gap: var(--space-tv-gap);
  padding: var(--size-2);
  border: var(--border-width-thin) solid var(--border-tv);
  border-radius: var(--radius-tv-pill);
  background: var(--surface-tv-elevated);
}

.transport-controls_button {
  width: var(--size-10);
  height: var(--size-10);
  display: grid;
  place-items: center;
  border: var(--border-width-thin) solid var(--border-tv);
  border-radius: var(--radius-tv-pill);
  background: var(--surface-tv);
  color: var(--text-tv);
}

.transport-controls_button:hover,
.transport-controls_button:focus-visible {
  border-color: var(--border-tv-strong);
  background: var(--surface-tv-accent);
}
</style>
