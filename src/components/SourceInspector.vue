<script setup lang="ts">
import type { MediaProbe } from "@/domain/media";
import { formatBitrate, formatDuration, formatFileSize, formatFrameRate } from "@/utils/formatters";

defineProps<{
  inputPath: string;
  outputPath: string;
  probe: MediaProbe | null;
  isProbing: boolean;
  lastError: string | null;
}>();

defineEmits<{
  pickInput: [];
  pickOutput: [];
  probe: [];
}>();
</script>

<template>
  <section class="panel">
    <div class="panel__header">
      <div>
        <h2 class="panel__title">Source Inspector</h2>
        <p class="panel__subtitle">
          Open a file, run `ffprobe`, and inspect container, duration, bitrate, and stream details.
        </p>
      </div>

      <div class="row">
        <button type="button" class="secondary" @click="$emit('pickInput')">Open video</button>
        <button type="button" class="secondary" @click="$emit('pickOutput')">Choose output</button>
        <button type="button" :disabled="!inputPath || isProbing" @click="$emit('probe')">
          {{ isProbing ? "Probing..." : "Probe now" }}
        </button>
      </div>
    </div>

    <div class="panel__body stack">
      <div>
        <small>Input path</small>
        <div class="path-box mono">{{ inputPath || "No input selected yet." }}</div>
      </div>

      <div>
        <small>Output path</small>
        <div class="path-box mono">{{ outputPath || "No output path selected yet." }}</div>
      </div>

      <p v-if="lastError" class="status-error" style="margin: 0">{{ lastError }}</p>

      <template v-if="probe">
        <div class="info-grid">
          <div class="info-card">
            <div class="info-card__label">Container</div>
            <div class="info-card__value">{{ probe.format.container }}</div>
          </div>
          <div class="info-card">
            <div class="info-card__label">Duration</div>
            <div class="info-card__value">{{ formatDuration(probe.format.durationSeconds) }}</div>
          </div>
          <div class="info-card">
            <div class="info-card__label">File size</div>
            <div class="info-card__value">{{ formatFileSize(probe.format.sizeBytes) }}</div>
          </div>
          <div class="info-card">
            <div class="info-card__label">Overall bitrate</div>
            <div class="info-card__value">{{ formatBitrate(probe.format.bitRate) }}</div>
          </div>
        </div>

        <div class="stack">
          <h3 style="margin: 0">Streams</h3>

          <div class="stream-list">
            <article v-for="stream in probe.streams" :key="stream.index" class="stream-card">
              <div class="row row--between">
                <strong>#{{ stream.index }} {{ stream.codecType }}</strong>
                <span class="pill">{{ stream.codecName || "unknown codec" }}</span>
              </div>

              <div class="info-grid" style="margin-top: 0.75rem">
                <div class="info-card">
                  <div class="info-card__label">Resolution</div>
                  <div class="info-card__value">
                    {{ stream.width && stream.height ? `${stream.width}x${stream.height}` : "n/a" }}
                  </div>
                </div>
                <div class="info-card">
                  <div class="info-card__label">Frame rate</div>
                  <div class="info-card__value">{{ formatFrameRate(stream.frameRate) }}</div>
                </div>
                <div class="info-card">
                  <div class="info-card__label">Pixel format</div>
                  <div class="info-card__value">{{ stream.pixelFormat || "n/a" }}</div>
                </div>
                <div class="info-card">
                  <div class="info-card__label">Stream bitrate</div>
                  <div class="info-card__value">{{ formatBitrate(stream.bitRate) }}</div>
                </div>
                <div class="info-card">
                  <div class="info-card__label">Channels</div>
                  <div class="info-card__value">{{ stream.channels ?? "n/a" }}</div>
                </div>
                <div class="info-card">
                  <div class="info-card__label">Sample rate</div>
                  <div class="info-card__value">{{ stream.sampleRate ?? "n/a" }}</div>
                </div>
              </div>
            </article>
          </div>
        </div>
      </template>

      <div v-else class="empty-state">
        Probe results will appear here after selecting a source file.
      </div>
    </div>
  </section>
</template>
