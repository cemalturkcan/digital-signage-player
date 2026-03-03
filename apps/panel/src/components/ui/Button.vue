<script setup lang="ts">
interface Props {
  variant?: 'default' | 'outline' | 'ghost' | 'danger'
  size?: 'default' | 'sm' | 'lg'
  disabled?: boolean
  block?: boolean
}

withDefaults(defineProps<Props>(), {
  variant: 'default',
  size: 'default',
  disabled: false,
  block: false,
})
</script>

<template>
  <button
    class="ui-button"
    :class="[`ui-button--${variant}`, `ui-button--${size}`, { 'ui-button--block': block }]"
    :disabled="disabled"
  >
    <slot />
  </button>
</template>

<style scoped>
.ui-button {
  border: 1px solid var(--border);
  background: var(--surface-2);
  color: var(--text);
  border-radius: 0;
  cursor: pointer;
  font-family: var(--font-sans);
  font-weight: 600;
  transition: background 140ms ease;
}

.ui-button:hover:enabled {
  background: #1a1a1a;
}

.ui-button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.ui-button--default {
  border-color: #2a2a2a;
  background: #ffffff;
  color: #000000;
}

.ui-button--default:hover:enabled {
  background: #e5e7eb;
}

.ui-button--outline {
  background: transparent;
  border-color: #2a2a2a;
  color: var(--text);
}

.ui-button--ghost {
  background: transparent;
  border-color: transparent;
}

.ui-button--danger {
  background: transparent;
  border-color: #7f1d1d;
  color: #fca5a5;
}

.ui-button--sm {
  padding: 0.7rem 1rem;
  font-size: 1.2rem;
}

.ui-button--default,
.ui-button--outline,
.ui-button--ghost,
.ui-button--danger {
  padding: 0.95rem 1.3rem;
  font-size: 1.3rem;
}

.ui-button--lg {
  padding: 1.1rem 1.6rem;
  font-size: 1.4rem;
}

.ui-button--block {
  width: 100%;
}
</style>
