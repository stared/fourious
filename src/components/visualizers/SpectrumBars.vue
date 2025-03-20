<template>
  <div class="spectrum-bars">
    <canvas ref="canvas" width="800" height="500"></canvas>
  </div>
</template>

<script lang="ts">
import {
  defineComponent,
  onMounted,
  onUnmounted,
  ref,
  watch,
  PropType,
} from "vue";

type Props = {
  fftData: number[];
  fftHistory: number[][];
  options: {
    logScale: boolean;
    showPeaks: boolean;
  };
};

export default defineComponent({
  name: "SpectrumBars",

  props: {
    fftData: {
      type: Array as PropType<number[]>,
      required: true,
    },
    fftHistory: {
      type: Array as PropType<number[][]>,
      default: () => [],
    },
    options: {
      type: Object as PropType<{
        logScale: boolean;
        showPeaks: boolean;
      }>,
      required: true,
    },
  },

  setup(props: Props) {
    const canvas = ref<HTMLCanvasElement | null>(null);
    let canvasCtx: CanvasRenderingContext2D | null = null;
    let peakValues: number[] = [];
    let peakHoldFrames: number[] = [];

    const PEAK_HOLD_TIME = 30; // frames to hold peaks
    const PEAK_FALL_SPEED = 0.8; // fall speed after hold time

    // Initialize the canvas
    const initCanvas = () => {
      if (!canvas.value) return;

      canvasCtx = canvas.value.getContext("2d");
      if (!canvasCtx) return;

      resizeCanvas();
      window.addEventListener("resize", resizeCanvas);
    };

    // Resize canvas on window resize
    const resizeCanvas = () => {
      if (!canvas.value || !canvasCtx) return;

      const { width, height } =
        canvas.value.parentElement?.getBoundingClientRect() || {
          width: 800,
          height: 500,
        };
      canvas.value.width = width;
      canvas.value.height = height;

      draw();
    };

    // Draw the visualization
    const draw = () => {
      if (!canvasCtx || !canvas.value || !props.fftData.length) return;

      const { width, height } = canvas.value;

      // Clear the canvas
      canvasCtx.clearRect(0, 0, width, height);

      // Calculate bar width based on the number of data points
      const dataLength = props.fftData.length;
      const barWidth = width / dataLength;
      const barSpacing = Math.max(0, barWidth * 0.1); // 10% spacing between bars
      const actualBarWidth = barWidth - barSpacing;

      // Initialize peak arrays if needed
      if (peakValues.length !== dataLength) {
        peakValues = new Array(dataLength).fill(0);
        peakHoldFrames = new Array(dataLength).fill(0);
      }

      // Find the maximum value for normalization
      const maxValue = Math.max(...props.fftData, 1); // Avoid division by zero

      // Draw each bar
      for (let i = 0; i < dataLength; i++) {
        const value = props.fftData[i];
        const normalizedValue = value / maxValue;
        const barHeight = normalizedValue * height;

        // Bar position
        const x = i * barWidth;
        const y = height - barHeight;

        // Gradient color based on frequency (low to high)
        const hue = (i / dataLength) * 240; // blue to red

        // Draw the bar
        canvasCtx.fillStyle = `hsl(${hue}, 100%, 50%)`;
        canvasCtx.fillRect(x + barSpacing / 2, y, actualBarWidth, barHeight);

        // Handle peaks if enabled
        if (props.options.showPeaks) {
          // Update peak value
          if (barHeight > peakValues[i]) {
            peakValues[i] = barHeight;
            peakHoldFrames[i] = PEAK_HOLD_TIME;
          } else {
            if (peakHoldFrames[i] > 0) {
              peakHoldFrames[i]--;
            } else {
              peakValues[i] *= PEAK_FALL_SPEED;
            }
          }

          // Draw peak
          const peakY = height - peakValues[i];
          canvasCtx.fillStyle = "rgba(255, 255, 255, 0.8)";
          canvasCtx.fillRect(x + barSpacing / 2, peakY, actualBarWidth, 2);
        }
      }
    };

    // Watch for changes in FFT data
    watch(
      () => props.fftData,
      () => {
        draw();
      },
      { deep: true }
    );

    // Watch for changes in options
    watch(
      () => props.options,
      () => {
        draw();
      },
      { deep: true }
    );

    // Lifecycle hooks
    onMounted(() => {
      initCanvas();
    });

    onUnmounted(() => {
      window.removeEventListener("resize", resizeCanvas);
    });

    return {
      canvas,
    };
  },
});
</script>

<style scoped>
.spectrum-bars {
  width: 100%;
  height: 100%;
}

canvas {
  width: 100%;
  height: 100%;
}
</style>
