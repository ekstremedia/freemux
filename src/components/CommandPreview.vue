<script setup lang="ts">
defineProps<{
  command: string;
}>();
</script>

<template>
  <section class="overflow-hidden rounded-[24px] border border-amber-200/15 bg-zinc-900/80 shadow-[0_24px_60px_rgba(0,0,0,0.32)] backdrop-blur-xl">
    <div class="flex items-start justify-between gap-4 px-5 pt-5">
      <div>
        <h2 class="m-0 text-lg font-semibold text-stone-100">Command Preview</h2>
        <p class="mt-1 text-sm text-stone-400">
          Generated in TypeScript from the selected profile and current input/output paths.
        </p>
      </div>
    </div>

    <div class="p-5">
      <pre class="overflow-x-auto rounded-2xl border border-white/5 bg-black/50 p-4 font-mono text-sm whitespace-pre-wrap text-stone-200">{{ command }}</pre>
    </div>
  </section>
</template>
