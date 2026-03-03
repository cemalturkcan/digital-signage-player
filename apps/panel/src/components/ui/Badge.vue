<script setup lang="ts">
interface Props {
  variant?: 'default' | 'success' | 'error'
}

withDefaults(defineProps<Props>(), {
  variant: 'default',
})
</script>

<template>
  <span class="ui-badge" :class="`ui-badge--${variant}`">
    <slot />
  </span>
</template>

<style scoped>
.ui-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  border: 1px solid var(--border);
  border-radius: 0;
  padding: 0.4rem 0.8rem;
  font-size: 1.1rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.ui-badge--default {
  color: #d4d4d8;
  border-color: #2a2a2a;
}

.ui-badge--success {
  color: #86efac;
  border-color: #14532d;
}

.ui-badge--error {
  color: #fca5a5;
  border-color: #7f1d1d;
}
</style>
