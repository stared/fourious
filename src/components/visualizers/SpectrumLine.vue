<template>
  <div class="spectrum-line">
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
  name: "SpectrumLine",

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

      // Calculate point spacing based on the number of data points
      const dataLength = props.fftData.length;
      const pointSpacing = width / (dataLength - 1);

      // Initialize peak arrays if needed
      if (peakValues.length !== dataLength) {
        peakValues = new Array(dataLength).fill(0);
        peakHoldFrames = new Array(dataLength).fill(0);
      }

      // Find the maximum value for normalization
      const maxValue = Math.max(...props.fftData, 1); // Avoid division by zero

      // Begin the path for the line
      canvasCtx.beginPath();
      canvasCtx.strokeStyle = "hsl(180, 100%, 50%)"; // Cyan
      canvasCtx.lineWidth = 2;

      // Draw the line
      for (let i = 0; i < dataLength; i++) {
        const value = props.fftData[i];
        const normalizedValue = value / maxValue;
        const y = height - normalizedValue * height;
        const x = i * pointSpacing;

        if (i === 0) {
          canvasCtx.moveTo(x, y);
        } else {
          canvasCtx.lineTo(x, y);
        }

        // Handle peaks if enabled
        if (props.options.showPeaks) {
          const barHeight = normalizedValue * height;

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
        }
      }

      // Stroke the line
      canvasCtx.stroke();

      // Draw peaks if enabled
      if (props.options.showPeaks) {
        canvasCtx.beginPath();
        canvasCtx.strokeStyle = "rgba(255, 255, 255, 0.5)";
        canvasCtx.lineWidth = 1;

        for (let i = 0; i < dataLength; i++) {
          const x = i * pointSpacing;
          const y = height - peakValues[i];

          if (i === 0) {
            canvasCtx.moveTo(x, y);
          } else {
            canvasCtx.lineTo(x, y);
          }
        }

        canvasCtx.stroke();
      }

      // Add gradient fill beneath the line
      const gradient = canvasCtx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, "rgba(0, 255, 255, 0.5)");
      gradient.addColorStop(1, "rgba(0, 255, 255, 0)");

      canvasCtx.lineTo(width, height);
      canvasCtx.lineTo(0, height);
      canvasCtx.closePath();
      canvasCtx.fillStyle = gradient;
      canvasCtx.fill();
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
.spectrum-line {
  width: 100%;
  height: 100%;
}

canvas {
  width: 100%;
  height: 100%;
}
</style>
