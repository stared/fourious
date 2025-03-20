<template>
  <div class="audio-analyzer">
    <div class="controls">
      <button class="analyze-btn" @click="toggleAnalysis" :disabled="isLoading">
        {{ isAnalyzing ? "Stop" : "Analyze" }}
      </button>
      <span class="status-message">{{ statusMessage }}</span>
    </div>

    <div class="visualizer-container" ref="visualizerContainer">
      <div v-if="isLoading" class="loading-overlay">Initializing...</div>

      <component
        :is="activeVisualizer"
        :fft-data="fftData"
        :fft-history="fftHistory"
        :options="visualizerOptions"
        ref="visualizerComponent"
      />
    </div>

    <VisualizerControls
      v-model:visualizer-type="visualizerType"
      v-model:log-scale="options.logScale"
      v-model:show-peaks="options.showPeaks"
    />
  </div>
</template>

<script lang="ts">
import {
  defineComponent,
  ref,
  computed,
  onMounted,
  onUnmounted,
  watch,
} from "vue";
import FFT from "fft.js";
import VisualizerControls from "./VisualizerControls.vue";
import SpectrumBars from "./visualizers/SpectrumBars.vue";
import SpectrumLine from "./visualizers/SpectrumLine.vue";
import Spectrogram from "./visualizers/Spectrogram.vue";

// Constants
const FFT_SIZE = 1024;
const SAMPLE_RATE = 44100;
const MAX_HISTORY = 200;

export default defineComponent({
  name: "AudioAnalyzer",

  components: {
    VisualizerControls,
    SpectrumBars,
    SpectrumLine,
    Spectrogram,
  },

  setup() {
    // State
    const isAnalyzing = ref(false);
    const isLoading = ref(false);
    const statusMessage = ref("Click 'Analyze' to start microphone input");
    const visualizerContainer = ref<HTMLElement | null>(null);
    const visualizerComponent = ref<any>(null);
    const visualizerType = ref("bars");
    const options = ref({
      logScale: true,
      showPeaks: true,
    });

    // Audio related state
    const fftProcessor = new FFT(FFT_SIZE);
    const fftData = ref<number[]>([]);
    const fftHistory = ref<number[][]>([]);
    let audioContext: AudioContext | null = null;
    let analyserNode: AnalyserNode | null = null;
    let sourceNode: MediaStreamAudioSourceNode | null = null;
    let animationFrame: number | null = null;

    // Computed
    const activeVisualizer = computed(() => {
      switch (visualizerType.value) {
        case "bars":
          return SpectrumBars;
        case "line":
          return SpectrumLine;
        case "spectrogram":
          return Spectrogram;
        default:
          return SpectrumBars;
      }
    });

    const visualizerOptions = computed(() => ({
      logScale: options.value.logScale,
      showPeaks: options.value.showPeaks,
    }));

    // Methods
    const getMicrophoneInput = async (): Promise<MediaStream> => {
      try {
        updateStatus("Requesting microphone access...");
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
        updateStatus("Microphone access granted");
        return stream;
      } catch (error) {
        console.error("Error accessing microphone:", error);
        updateStatus(
          `Error: ${error instanceof Error ? error.message : String(error)}`
        );
        throw error;
      }
    };

    const initAudio = async (stream: MediaStream): Promise<void> => {
      // Create audio context
      audioContext = new AudioContext({
        sampleRate: SAMPLE_RATE,
      });

      // Create analyzer node
      analyserNode = audioContext.createAnalyser();
      analyserNode.fftSize = FFT_SIZE * 2; // Must be power of 2
      analyserNode.smoothingTimeConstant = 0.5;

      // Using microphone input
      sourceNode = audioContext.createMediaStreamSource(stream);
      sourceNode.connect(analyserNode);
      // Don't connect to destination to avoid feedback
    };

    const processAudioData = (): void => {
      if (!analyserNode) return;

      // Get frequency data from analyzer
      const frequencyData = new Uint8Array(analyserNode.frequencyBinCount);
      analyserNode.getByteFrequencyData(frequencyData);

      // Convert to magnitudes
      const magnitudes: number[] = [];
      const maxFrequencies = Math.min(256, frequencyData.length); // Limit for better visualization

      for (let i = 0; i < maxFrequencies; i++) {
        let magnitude = frequencyData[i];

        // Apply log scale if selected (audio data is already logarithmic, but we can enhance it)
        if (options.value.logScale && magnitude > 0) {
          magnitude = Math.log10(magnitude + 1) * 50;
        }

        magnitudes.push(magnitude);
      }

      // Update reactive data
      fftData.value = [...magnitudes];

      // Add to history (clone the array to avoid reference issues)
      fftHistory.value.push([...magnitudes]);
      if (fftHistory.value.length > MAX_HISTORY) {
        fftHistory.value.shift();
      }
    };

    const startAnalysis = (): void => {
      if (isAnalyzing.value) return;

      isAnalyzing.value = true;

      // Start animation loop
      const loop = () => {
        if (!isAnalyzing.value) return;

        processAudioData();
        animationFrame = requestAnimationFrame(loop);
      };

      loop();
    };

    const stopAnalysis = (): void => {
      if (!isAnalyzing.value) return;

      isAnalyzing.value = false;

      if (animationFrame !== null) {
        cancelAnimationFrame(animationFrame);
        animationFrame = null;
      }

      // Stop audio
      if (audioContext && audioContext.state !== "closed") {
        audioContext.suspend();
      }
    };

    const cleanupAudio = (): void => {
      if (sourceNode) {
        sourceNode.disconnect();
        sourceNode = null;
      }

      if (analyserNode) {
        analyserNode.disconnect();
        analyserNode = null;
      }

      if (audioContext && audioContext.state !== "closed") {
        audioContext.close();
        audioContext = null;
      }
    };

    const updateStatus = (message: string): void => {
      statusMessage.value = message;
    };

    const toggleAnalysis = async (): Promise<void> => {
      try {
        // If already running, stop analysis
        if (isAnalyzing.value) {
          stopAnalysis();
          updateStatus("Analysis stopped");
          return;
        }

        // Initialize microphone input
        updateStatus("Initializing microphone...");
        isLoading.value = true;

        // Reset data
        fftData.value = [];
        fftHistory.value = [];

        try {
          // Get microphone input
          const stream = await getMicrophoneInput();
          await initAudio(stream);

          updateStatus("Audio processing started");
          isLoading.value = false;

          // Start analysis
          startAnalysis();
        } catch (micError) {
          console.error("Microphone initialization failed:", micError);
          updateStatus(
            "Could not access microphone. Check browser permissions."
          );
          isLoading.value = false;
        }
      } catch (error) {
        console.error("Error in analysis:", error);
        updateStatus(
          `Error: ${error instanceof Error ? error.message : String(error)}`
        );
        isLoading.value = false;
      }
    };

    // Lifecycle hooks
    onMounted(() => {
      console.log("AudioAnalyzer mounted");
    });

    onUnmounted(() => {
      stopAnalysis();
      cleanupAudio();
    });

    // Return the refs, computed properties, and methods for the template
    return {
      isAnalyzing,
      isLoading,
      statusMessage,
      visualizerContainer,
      visualizerComponent,
      visualizerType,
      options,
      fftData,
      fftHistory,
      activeVisualizer,
      visualizerOptions,
      toggleAnalysis,
    };
  },
});
</script>

<style scoped>
.audio-analyzer {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.controls {
  display: flex;
  align-items: center;
  gap: 15px;
}

.status-message {
  font-size: 14px;
  color: var(--text-secondary);
}

.visualizer-container {
  background-color: var(--visualizer-bg);
  position: relative;
  height: 500px;
  border-radius: 4px;
  overflow: hidden;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(255, 255, 255, 0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 16px;
  z-index: 10;
}
</style>
