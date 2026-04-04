<script setup lang="ts">
import type { ConversionProfile } from "@/domain/conversion";

defineProps<{
  profiles: ConversionProfile[];
  selectedProfileId: string | null;
}>();

defineEmits<{
  selectProfile: [profileId: string];
  createProfile: [];
  saveProfile: [saveAsNew?: boolean];
  deleteProfile: [profileId: string];
  duplicateProfile: [];
}>();
</script>

<template>
  <section class="panel">
    <div class="panel__header">
      <div>
        <h2 class="panel__title">Profiles</h2>
        <p class="panel__subtitle">
          Save, load, edit, and duplicate conversion presets as JSON-backed profiles.
        </p>
      </div>

      <div class="row">
        <button type="button" class="secondary" @click="$emit('createProfile')">New</button>
        <button type="button" class="secondary" @click="$emit('duplicateProfile')">Duplicate</button>
        <button type="button" @click="$emit('saveProfile', false)">Save</button>
        <button type="button" class="secondary" @click="$emit('saveProfile', true)">
          Save as new
        </button>
      </div>
    </div>

    <div class="panel__body">
      <div v-if="profiles.length" class="profile-list">
        <button
          v-for="profile in profiles"
          :key="profile.id"
          type="button"
          class="profile-item"
          :class="{ 'is-active': profile.id === selectedProfileId }"
          @click="$emit('selectProfile', profile.id)"
        >
          <strong>{{ profile.name }}</strong>
          <span class="profile-item__meta">
            {{ profile.container }} · {{ profile.video.codec }} / {{ profile.audio.codec }}
          </span>
        </button>
      </div>

      <div v-else class="empty-state">No saved profiles yet.</div>

      <div v-if="selectedProfileId" style="margin-top: 1rem">
        <button type="button" class="danger" @click="$emit('deleteProfile', selectedProfileId)">
          Delete selected profile
        </button>
      </div>
    </div>
  </section>
</template>
