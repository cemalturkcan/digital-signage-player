<template>
  <div class="ui-card">
    <slot />
  </div>
</template>

<style scoped>
.ui-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 0;
  padding: var(--size-4);
}
</style>
