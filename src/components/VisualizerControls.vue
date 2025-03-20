<template>
  <div class="visualizer-controls">
    <div class="control-group">
      <label for="visualizer-type">Visualization Type:</label>
      <select
        id="visualizer-type"
        :value="visualizerType"
        @change="$emit('update:visualizerType', $event.target.value)"
      >
        <option value="bars">Bars</option>
        <option value="line">Line</option>
        <option value="spectrogram">Spectrogram</option>
      </select>
    </div>

    <div class="control-group checkbox">
      <input
        type="checkbox"
        id="log-scale"
        :checked="logScale"
        @change="$emit('update:logScale', $event.target.checked)"
      />
      <label for="log-scale">Log Scale</label>
    </div>

    <div class="control-group checkbox">
      <input
        type="checkbox"
        id="show-peaks"
        :checked="showPeaks"
        @change="$emit('update:showPeaks', $event.target.checked)"
      />
      <label for="show-peaks">Show Peaks</label>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";

type Props = {
  visualizerType: string;
  logScale: boolean;
  showPeaks: boolean;
};

export default defineComponent({
  name: "VisualizerControls",

  props: {
    visualizerType: {
      type: String,
      required: true,
    },
    logScale: {
      type: Boolean,
      required: true,
    },
    showPeaks: {
      type: Boolean,
      required: true,
    },
  },

  emits: ["update:visualizerType", "update:logScale", "update:showPeaks"],
});
</script>

<style scoped>
.visualizer-controls {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
  margin-bottom: 10px;
}

.control-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.control-group.checkbox {
  cursor: pointer;
}

label {
  font-size: 14px;
  color: var(--text-secondary);
}

select {
  background-color: var(--input-bg);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  padding: 6px 10px;
  color: var(--text-primary);
  font-size: 14px;
}

input[type="checkbox"] {
  margin: 0;
}
</style>
