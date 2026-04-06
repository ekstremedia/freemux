<script setup lang="ts">
import type { SourceFile } from "@/domain/media";
import { formatDuration, formatFileSize } from "@/utils/formatters";
import { basename } from "@/utils/pathing";

defineProps<{
  files: SourceFile[];
  selectedFileId: string | null;
}>();

defineEmits<{
  selectFile: [fileId: string];
  removeFile: [fileId: string];
}>();

function streamSummary(file: SourceFile): string {
  if (!file.probe) {
    return "";
  }

  const parts: string[] = [];
  const video = file.probe.streams.find((s) => s.codecType === "video");
  const audio = file.probe.streams.find((s) => s.codecType === "audio");

  if (video?.width && video?.height) {
    parts.push(`${video.width}x${video.height}`);
  }

  if (file.probe.format.durationSeconds !== null) {
    parts.push(formatDuration(file.probe.format.durationSeconds));
  }

  if (file.probe.format.sizeBytes !== null) {
    parts.push(formatFileSize(file.probe.format.sizeBytes));
  }

  const codecs: string[] = [];
  if (video?.codecName) {
    codecs.push(video.codecName);
  }
  if (audio?.codecName) {
    codecs.push(audio.codecName);
  }
  if (codecs.length > 0) {
    parts.push(codecs.join("/"));
  }

  return parts.join(" \u00B7 ");
}
</script>

<template>
  <div class="grid gap-1">
    <div
      v-for="file in files"
      :key="file.id"
      role="button"
      tabindex="0"
      :aria-pressed="file.id === selectedFileId"
      class="group grid gap-0.5 rounded-xl border px-3 py-2.5 text-left transition"
      :class="
        file.id === selectedFileId
          ? 'border-amber-300/25 bg-amber-300/10'
          : 'border-white/5 bg-white/3 hover:border-white/10 hover:bg-white/5'
      "
      @click="$emit('selectFile', file.id)"
      @keydown.enter.prevent="$emit('selectFile', file.id)"
      @keydown.space.prevent="$emit('selectFile', file.id)"
    >
      <div class="flex items-center justify-between gap-2">
        <span class="truncate text-sm font-medium text-stone-100">
          {{ basename(file.inputPath) }}
        </span>
        <button
          type="button"
          class="shrink-0 rounded-lg p-1 text-stone-500 opacity-0 transition hover:bg-white/10 hover:text-rose-300 group-hover:opacity-100"
          title="Remove file"
          @click.stop="$emit('removeFile', file.id)"
        >
          <svg class="h-3.5 w-3.5" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M1 1l12 12M13 1L1 13" />
          </svg>
        </button>
      </div>

      <span v-if="file.isProbing" class="text-xs text-stone-500">Probing...</span>
      <span v-else-if="file.probe" class="truncate text-xs text-stone-500">
        {{ streamSummary(file) }}
      </span>
    </div>

    <div v-if="files.length === 0" class="rounded-xl border border-dashed border-amber-200/15 px-3 py-4 text-center text-sm text-stone-500">
      No files added yet.
    </div>
  </div>
</template>
