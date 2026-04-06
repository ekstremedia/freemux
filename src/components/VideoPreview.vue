<script setup lang="ts">
defineProps<{
  thumbnail: string | null;
  isProbing: boolean;
}>();

defineEmits<{
  openInPlayer: [];
}>();
</script>

<template>
  <div class="flex flex-col items-center justify-center rounded-2xl border border-white/5 bg-black/30">
    <template v-if="thumbnail">
      <img
        :src="thumbnail"
        alt="Video thumbnail"
        class="max-h-[360px] w-full rounded-t-2xl object-contain"
      />
      <button
        type="button"
        class="w-full rounded-b-2xl border-t border-white/5 bg-white/3 px-4 py-2.5 text-sm font-medium text-stone-300 transition hover:bg-white/8"
        @click="$emit('openInPlayer')"
      >
        Open in external player
      </button>
    </template>

    <div v-else-if="isProbing" class="px-6 py-16 text-center text-sm text-stone-500">
      Generating preview...
    </div>

    <div v-else class="px-6 py-16 text-center text-sm text-stone-500">
      Select a file to preview.
    </div>
  </div>
</template>
