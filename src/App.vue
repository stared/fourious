<template>
  <div class="fourious-app">
    <h1>Fourious - Audio FFT Visualizer</h1>
    <p class="description">
      Real-time audio frequency analysis using the Web Audio API
    </p>

    <div class="tabs">
      <button
        class="tab-button"
        :class="{ active: activeTab === 'microphone' }"
        @click="activeTab = 'microphone'"
      >
        Microphone
      </button>
      <button
        class="tab-button"
        :class="{ active: activeTab === 'youtube' }"
        @click="activeTab = 'youtube'"
      >
        YouTube
      </button>
    </div>

    <AudioAnalyzer v-if="activeTab === 'microphone'" />
    <YoutubeAnalyzer v-if="activeTab === 'youtube'" />
  </div>
</template>

<script lang="ts">
import { defineComponent, ref } from "vue";
import AudioAnalyzer from "./components/AudioAnalyzer.vue";
import YoutubeAnalyzer from "./components/YoutubeAnalyzer.vue";

export default defineComponent({
  name: "App",
  components: {
    AudioAnalyzer,
    YoutubeAnalyzer,
  },
  setup() {
    const activeTab = ref("youtube");

    return {
      activeTab,
    };
  },
});
</script>

<style scoped>
.fourious-app {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.description {
  color: var(--text-secondary);
  margin-top: 0;
}

.tabs {
  display: flex;
  gap: 10px;
  margin-bottom: 10px;
}

.tab-button {
  padding: 8px 16px;
  border: 1px solid var(--border-color);
  background-color: transparent;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.tab-button.active {
  background-color: var(--accent-color);
  color: white;
  border-color: var(--accent-color);
}
</style>
