<script setup lang="ts">
import { ref } from "vue";

defineProps<{
  command: string;
}>();

const copied = ref(false);

async function copyCommand(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    copied.value = true;
    setTimeout(() => {
      copied.value = false;
    }, 2000);
  } catch {
    // Clipboard API may not be available in all webview contexts
  }
}
</script>

<template>
  <div class="rounded-2xl border border-white/5 bg-white/3 p-4">
    <div class="mb-2 flex items-center justify-between">
      <span class="text-xs font-medium tracking-wide text-stone-500 uppercase">Command preview</span>
      <button
        type="button"
        class="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-stone-300 transition hover:border-amber-300/20 hover:bg-white/8"
        @click="copyCommand(command)"
      >
        {{ copied ? "Copied!" : "Copy" }}
      </button>
    </div>
    <pre class="overflow-x-auto rounded-xl border border-white/5 bg-black/50 p-3 font-mono text-sm whitespace-pre-wrap text-stone-200">{{ command }}</pre>
  </div>
</template>
