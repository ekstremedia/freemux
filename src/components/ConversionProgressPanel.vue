<script setup lang="ts">
import type { ConversionProgress } from "@/domain/media";
import { formatDuration } from "@/utils/formatters";

defineProps<{
  progress: ConversionProgress | null;
  isConverting: boolean;
}>();
</script>

<template>
  <section class="panel">
    <div class="panel__header">
      <div>
        <h2 class="panel__title">Conversion Progress</h2>
        <p class="panel__subtitle">Live progress during the active FFmpeg job.</p>
      </div>
      <span class="pill" :class="isConverting ? 'status-warn' : 'status-ok'">
        {{ isConverting ? "Running" : progress?.phase ?? "idle" }}
      </span>
    </div>

    <div class="panel__body stack">
      <template v-if="progress">
        <div>
          <div class="progress-track">
            <div class="progress-fill" :style="{ width: `${progress.percent ?? 0}%` }" />
          </div>
          <small>{{ progress.percent !== null ? `${progress.percent.toFixed(1)}%` : "Estimating progress..." }}</small>
        </div>

        <div class="info-grid">
          <div class="info-card">
            <div class="info-card__label">Encoded time</div>
            <div class="info-card__value">{{ formatDuration(progress.outputTimeSeconds) }}</div>
          </div>
          <div class="info-card">
            <div class="info-card__label">Total duration</div>
            <div class="info-card__value">{{ formatDuration(progress.totalDurationSeconds) }}</div>
          </div>
          <div class="info-card">
            <div class="info-card__label">Frame</div>
            <div class="info-card__value">{{ progress.frame ?? "n/a" }}</div>
          </div>
          <div class="info-card">
            <div class="info-card__label">FPS</div>
            <div class="info-card__value">{{ progress.fps?.toFixed(2) ?? "n/a" }}</div>
          </div>
          <div class="info-card">
            <div class="info-card__label">Speed</div>
            <div class="info-card__value">{{ progress.speed ? `${progress.speed.toFixed(2)}x` : "n/a" }}</div>
          </div>
          <div class="info-card">
            <div class="info-card__label">Phase</div>
            <div class="info-card__value">{{ progress.phase }}</div>
          </div>
        </div>

        <div class="path-box mono">{{ progress.rawLine || "Waiting for FFmpeg output..." }}</div>
      </template>

      <div v-else class="empty-state">No active conversion yet.</div>
    </div>
  </section>
</template>
