<template>
  <div class="youtube-analyzer">
    <div class="controls">
      <div class="url-input-container">
        <label for="youtube-url">YouTube URL:</label>
        <input
          type="text"
          id="youtube-url"
          v-model="youtubeUrl"
          placeholder="Enter YouTube URL"
          :disabled="isAnalyzing"
        />
        <button
          class="load-btn"
          @click="loadVideo"
          :disabled="isAnalyzing || !youtubeUrl"
        >
          Load
        </button>
      </div>
      <button class="analyze-btn" @click="toggleAnalysis" :disabled="isLoading">
        {{ isAnalyzing ? "Stop" : "Analyze" }}
      </button>
      <span class="status-message">{{ statusMessage }}</span>
    </div>

    <div class="youtube-container">
      <div v-if="isLoading" class="loading-overlay">Initializing...</div>
      <div id="youtube-player" ref="youtubePlayerContainer"></div>
    </div>

    <div class="visualizer-container" ref="visualizerContainer">
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
const DEFAULT_YOUTUBE_URL = "https://www.youtube.com/watch?v=hKRUPYrAQoE";

// YouTube IFrame API type
declare global {
  interface Window {
    YT: {
      Player: any;
      PlayerState: {
        PLAYING: number;
        PAUSED: number;
        ENDED: number;
      };
    };
    onYouTubeIframeAPIReady: () => void;
  }
}

export default defineComponent({
  name: "YoutubeAnalyzer",

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
    const statusMessage = ref("Enter a YouTube URL and click 'Load'");
    const visualizerContainer = ref<HTMLElement | null>(null);
    const visualizerComponent = ref<any>(null);
    const youtubePlayerContainer = ref<HTMLElement | null>(null);
    const youtubeUrl = ref(DEFAULT_YOUTUBE_URL);
    const visualizerType = ref("spectrogram"); // Default to spectrogram
    const options = ref({
      logScale: true,
      showPeaks: true,
    });

    // YouTube related state
    let youtubePlayer: any = null;
    let youtubeApiLoaded = false;

    // Audio related state
    const fftProcessor = new FFT(FFT_SIZE);
    const fftData = ref<number[]>([]);
    const fftHistory = ref<number[][]>([]);
    let audioContext: AudioContext | null = null;
    let analyserNode: AnalyserNode | null = null;
    let animationFrame: number | null = null;
    let microphoneStream: MediaStream | null = null;

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
          return Spectrogram;
      }
    });

    const visualizerOptions = computed(() => ({
      logScale: options.value.logScale,
      showPeaks: options.value.showPeaks,
    }));

    // Methods
    const loadYouTubeApi = (): Promise<void> => {
      return new Promise((resolve, reject) => {
        if (youtubeApiLoaded) {
          resolve();
          return;
        }

        // Create script tag
        const tag = document.createElement("script");
        tag.src = "https://www.youtube.com/iframe_api";
        const firstScriptTag = document.getElementsByTagName("script")[0];
        firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

        // Define callback for when API is ready
        window.onYouTubeIframeAPIReady = () => {
          youtubeApiLoaded = true;
          resolve();
        };

        // Handle error
        tag.onerror = () => {
          reject(new Error("Failed to load YouTube IFrame API"));
        };
      });
    };

    const extractVideoId = (url: string): string => {
      const regExp =
        /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
      const match = url.match(regExp);
      return match && match[7].length === 11 ? match[7] : url;
    };

    const initYouTubePlayer = async (videoId: string): Promise<void> => {
      if (!youtubePlayerContainer.value) return;

      youtubePlayer = new window.YT.Player(youtubePlayerContainer.value, {
        height: "360",
        width: "640",
        videoId: videoId,
        playerVars: {
          autoplay: 0,
          controls: 1,
        },
        events: {
          onReady: onPlayerReady,
          onStateChange: onPlayerStateChange,
        },
      });
    };

    const onPlayerReady = (event: any): void => {
      updateStatus("YouTube player ready. Click 'Analyze' to start");
      isLoading.value = false;
    };

    const onPlayerStateChange = (event: any): void => {
      // YT.PlayerState.PLAYING = 1
      if (event.data === 1) {
        if (!isAnalyzing.value) {
          startAnalysis();
        }
      } else if (event.data === 2 || event.data === 0) {
        // PAUSED or ENDED
        if (isAnalyzing.value) {
          stopAnalysis();
        }
      }
    };

    const initAudio = async (): Promise<void> => {
      try {
        // Create audio context
        audioContext = new AudioContext({
          sampleRate: SAMPLE_RATE,
        });

        // Create analyzer node
        analyserNode = audioContext.createAnalyser();
        analyserNode.fftSize = FFT_SIZE * 2; // Must be power of 2
        analyserNode.smoothingTimeConstant = 0.5;

        // To capture YouTube audio, we'll need to capture system audio
        // This requires user permission to access their microphone
        updateStatus("Requesting microphone access to capture system audio...");

        try {
          // Try to get microphone stream to capture system audio
          microphoneStream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: false,
              noiseSuppression: false,
              autoGainControl: false,
            },
          });

          // Create source from microphone stream
          const micSource =
            audioContext.createMediaStreamSource(microphoneStream);
          micSource.connect(analyserNode);

          updateStatus(
            "System audio capture ready. Turn up your volume and play the video"
          );
        } catch (micError) {
          console.error("Couldn't access microphone:", micError);
          updateStatus(
            "Could not access microphone. Please check permissions."
          );
          throw micError;
        }
      } catch (error) {
        console.error("Error initializing audio:", error);
        updateStatus(
          `Error: ${error instanceof Error ? error.message : String(error)}`
        );
        throw error;
      }
    };

    const processAudioData = (): void => {
      if (!analyserNode) return;

      try {
        // Get real frequency data from the analyzer
        const frequencyData = new Uint8Array(analyserNode.frequencyBinCount);
        analyserNode.getByteFrequencyData(frequencyData);

        // Convert to magnitudes
        const magnitudes: number[] = [];
        const maxFrequencies = Math.min(256, frequencyData.length);

        for (let i = 0; i < maxFrequencies; i++) {
          let magnitude = frequencyData[i];

          // Apply log scale if selected
          if (options.value.logScale && magnitude > 0) {
            magnitude = Math.log10(magnitude + 1) * 50;
          }

          magnitudes.push(magnitude);
        }

        // Update reactive data
        fftData.value = [...magnitudes];

        // Add to history
        fftHistory.value.push([...magnitudes]);
        if (fftHistory.value.length > MAX_HISTORY) {
          fftHistory.value.shift();
        }
      } catch (error) {
        console.error("Error processing audio data:", error);
      }
    };

    const startAnalysis = async (): Promise<void> => {
      if (isAnalyzing.value) return;

      try {
        // Initialize audio processing if not done yet
        if (!audioContext || !analyserNode) {
          await initAudio();
        }

        isAnalyzing.value = true;

        // Start animation loop
        const loop = () => {
          if (!isAnalyzing.value) return;

          processAudioData();
          animationFrame = requestAnimationFrame(loop);
        };

        loop();
      } catch (error) {
        console.error("Error starting analysis:", error);
        updateStatus(
          `Error: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    };

    const stopAnalysis = (): void => {
      if (!isAnalyzing.value) return;

      isAnalyzing.value = false;

      if (animationFrame !== null) {
        cancelAnimationFrame(animationFrame);
        animationFrame = null;
      }
    };

    const cleanupAudio = (): void => {
      stopAnalysis();

      // Stop the microphone stream
      if (microphoneStream) {
        microphoneStream.getTracks().forEach((track) => track.stop());
        microphoneStream = null;
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

    const loadVideo = async (): Promise<void> => {
      if (!youtubeUrl.value) {
        updateStatus("Please enter a YouTube URL");
        return;
      }

      try {
        // Clean up previous player if exists
        if (youtubePlayer && typeof youtubePlayer.destroy === "function") {
          youtubePlayer.destroy();
          youtubePlayer = null;
        }

        // Clean up audio
        cleanupAudio();

        updateStatus("Loading YouTube player...");
        isLoading.value = true;

        // Reset data
        fftData.value = [];
        fftHistory.value = [];

        // Load YouTube API
        await loadYouTubeApi();
        const videoId = extractVideoId(youtubeUrl.value);
        await initYouTubePlayer(videoId);
      } catch (error) {
        console.error("Error loading video:", error);
        updateStatus(
          `Error: ${error instanceof Error ? error.message : String(error)}`
        );
        isLoading.value = false;
      }
    };

    const toggleAnalysis = async (): Promise<void> => {
      try {
        // If already running, stop analysis
        if (isAnalyzing.value) {
          stopAnalysis();
          updateStatus("Analysis stopped");
          return;
        }

        // Initialize YouTube player if not done yet
        if (!youtubePlayer) {
          updateStatus("Please load a YouTube video first");
          return;
        }

        // Start analysis
        await startAnalysis();

        // Prompt user about system audio
        updateStatus(
          "Analysis started - Make sure your system audio is playing through speakers"
        );

        // Play the YouTube video
        youtubePlayer.playVideo();
      } catch (error) {
        console.error("Error in analysis:", error);
        updateStatus(
          `Error: ${error instanceof Error ? error.message : String(error)}`
        );
        isLoading.value = false;
      }
    };

    // Initialize on mount
    onMounted(async () => {
      console.log("YoutubeAnalyzer mounted");
      // Load default video
      await loadVideo();
    });

    onUnmounted(() => {
      stopAnalysis();
      cleanupAudio();

      // Clean up YouTube player
      if (youtubePlayer && typeof youtubePlayer.destroy === "function") {
        youtubePlayer.destroy();
        youtubePlayer = null;
      }
    });

    // Return the refs, computed properties, and methods for the template
    return {
      isAnalyzing,
      isLoading,
      statusMessage,
      visualizerContainer,
      visualizerComponent,
      youtubePlayerContainer,
      youtubeUrl,
      visualizerType,
      options,
      fftData,
      fftHistory,
      activeVisualizer,
      visualizerOptions,
      toggleAnalysis,
      loadVideo,
    };
  },
});
</script>

<style scoped>
.youtube-analyzer {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 15px;
}

.url-input-container {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-grow: 1;
}

.url-input-container input {
  flex-grow: 1;
  padding: 8px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background: var(--input-bg);
  color: var(--text-primary);
}

.status-message {
  font-size: 14px;
  color: var(--text-secondary);
}

.youtube-container {
  position: relative;
  width: 100%;
  height: 360px;
  background-color: #000;
  border-radius: 4px;
  overflow: hidden;
}

.visualizer-container {
  background-color: var(--visualizer-bg);
  position: relative;
  height: 200px;
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

button {
  padding: 8px 16px;
  border: 1px solid var(--border-color);
  background-color: var(--button-bg);
  color: var(--text-primary);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
}

button:hover:not(:disabled) {
  background-color: var(--button-hover-bg);
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
