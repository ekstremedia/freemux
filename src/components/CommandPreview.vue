<script setup lang="ts">
defineProps<{
  command: string;
}>();
</script>

<template>
  <section class="panel">
    <div class="panel__header">
      <div>
        <h2 class="panel__title">Command Preview</h2>
        <p class="panel__subtitle">
          Generated in TypeScript from the selected profile and current input/output paths.
        </p>
      </div>
    </div>

    <div class="panel__body">
      <pre class="command-preview mono">{{ command }}</pre>
    </div>
  </section>
</template>
