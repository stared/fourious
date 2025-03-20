<template>
  <div class="fourious-app">
    <h1>Fourious - Audio FFT Visualizer</h1>
    <p class="description">
      Real-time audio frequency analysis using the Web Audio API
    </p>

    <AudioAnalyzer />
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import AudioAnalyzer from "./components/AudioAnalyzer.vue";

export default defineComponent({
  name: "App",
  components: {
    AudioAnalyzer,
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
</style>
