<script setup lang="ts">
import type { ToolingStatus } from "@/domain/media";

defineProps<{
  tooling: ToolingStatus | null;
}>();
</script>

<template>
  <section class="banner">
    <strong>Tool discovery</strong>
    <p class="panel__subtitle">
      This starter can use bundled binaries, explicit environment variables, or system-installed
      tools.
    </p>

    <div v-if="tooling" class="banner__list">
      <span class="pill">
        <span :class="tooling.ffmpeg.available ? 'status-ok' : 'status-error'">ffmpeg</span>
        <span>{{ tooling.ffmpeg.source }}</span>
      </span>
      <span class="pill">
        <span :class="tooling.ffprobe.available ? 'status-ok' : 'status-error'">ffprobe</span>
        <span>{{ tooling.ffprobe.source }}</span>
      </span>
    </div>

    <small v-if="tooling?.ffmpeg.path || tooling?.ffprobe.path">
      {{ tooling.ffmpeg.path || tooling.ffprobe.path }}
    </small>
  </section>
</template>
