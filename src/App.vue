<script setup lang="ts">
import { onMounted, onUnmounted } from "vue";
import AppHeader from "@/components/AppHeader.vue";
import CommandPreview from "@/components/CommandPreview.vue";
import ConversionProgressPanel from "@/components/ConversionProgressPanel.vue";
import ConversionOptionsPanel from "@/components/ConversionOptionsPanel.vue";
import ProfilesPanel from "@/components/ProfilesPanel.vue";
import SourceInspector from "@/components/SourceInspector.vue";
import ToolStatusBanner from "@/components/ToolStatusBanner.vue";
import { createConverterStore } from "@/stores/useConverterStore";

const store = createConverterStore();

onMounted(() => {
  void store.initialize();
});

onUnmounted(() => {
  store.dispose();
});
</script>

<template>
  <div class="app-shell">
    <AppHeader />

    <main class="workspace">
      <ToolStatusBanner :tooling="store.state.tooling" />

      <section class="workspace-grid">
        <div class="left-column">
          <SourceInspector
            :input-path="store.state.inputPath"
            :output-path="store.state.outputPath"
            :probe="store.state.probe"
            :is-probing="store.state.isProbing"
            :last-error="store.state.lastError"
            @pick-input="store.pickInputFile"
            @pick-output="store.pickOutputFile"
            @probe="store.probeInput"
          />
        </div>

        <div class="right-column">
          <ProfilesPanel
            :profiles="store.state.profiles"
            :selected-profile-id="store.state.selectedProfileId"
            @select-profile="store.selectProfile"
            @create-profile="store.createNewProfile"
            @save-profile="store.saveCurrentProfile"
            @delete-profile="store.deleteProfile"
            @duplicate-profile="store.duplicateCurrentProfile"
          />

          <ConversionOptionsPanel
            :profile="store.currentProfile.value"
            :is-converting="store.state.isConverting"
            :output-path="store.state.outputPath"
            @update-profile="store.updateCurrentProfile"
            @convert="store.runConversion"
          />

          <ConversionProgressPanel
            :progress="store.state.conversionProgress"
            :is-converting="store.state.isConverting"
          />

          <CommandPreview :command="store.commandPreview.value" />
        </div>
      </section>
    </main>
  </div>
</template>
