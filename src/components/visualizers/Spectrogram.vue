<template>
  <div class="spectrogram">
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
  name: "Spectrogram",

  props: {
    fftData: {
      type: Array as PropType<number[]>,
      required: true,
    },
    fftHistory: {
      type: Array as PropType<number[][]>,
      required: true,
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
    let imageData: ImageData | null = null;

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

      // Create new image data
      imageData = canvasCtx.createImageData(width, height);

      draw();
    };

    // Map value to color
    const valueToColor = (
      value: number
    ): { r: number; g: number; b: number } => {
      value = Math.min(255, Math.max(0, value));

      if (value < 85) {
        return {
          r: 0,
          g: Math.floor(value * 3),
          b: 255,
        };
      } else if (value < 170) {
        value -= 85;
        return {
          r: Math.floor(value * 3),
          g: 255,
          b: 255 - Math.floor(value * 3),
        };
      } else {
        value -= 170;
        return {
          r: 255,
          g: 255 - Math.floor(value * 3),
          b: 0,
        };
      }
    };

    // Draw the visualization
    const draw = () => {
      if (!canvasCtx || !canvas.value || !imageData || !props.fftHistory.length)
        return;

      const { width, height } = canvas.value;

      // Get the current history data
      const history = props.fftHistory;
      const historyLength = history.length;
      const frequencyBins = Math.min(height, history[0]?.length || 0);

      // Find global max value for normalization
      let maxValue = 1; // Avoid division by zero
      for (const frame of history) {
        const frameMax = Math.max(...frame, 0);
        maxValue = Math.max(maxValue, frameMax);
      }

      // Shift existing image data to the left
      const shiftLeft = () => {
        if (!imageData) return;

        const data = imageData.data;
        const rowSize = width * 4;

        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width - 1; x++) {
            const sourceIndex = (y * width + x + 1) * 4;
            const targetIndex = (y * width + x) * 4;

            data[targetIndex] = data[sourceIndex];
            data[targetIndex + 1] = data[sourceIndex + 1];
            data[targetIndex + 2] = data[sourceIndex + 2];
            data[targetIndex + 3] = data[sourceIndex + 3];
          }
        }
      };

      // Shift the image to the left
      shiftLeft();

      // Add new column from current FFT data
      const data = imageData.data;
      const rightColumnX = width - 1;

      for (let y = 0; y < height; y++) {
        // Map canvas Y coordinate to frequency bin
        const bin = Math.floor((height - y - 1) * (frequencyBins / height));

        if (bin >= 0 && bin < frequencyBins) {
          // Get value from most recent FFT data
          const value = props.fftData[bin] || 0;
          const normalizedValue = (value / maxValue) * 255;

          // Convert to color
          const color = valueToColor(normalizedValue);

          // Set pixel in image data
          const index = (y * width + rightColumnX) * 4;
          data[index] = color.r;
          data[index + 1] = color.g;
          data[index + 2] = color.b;
          data[index + 3] = 255; // alpha
        }
      }

      // Put image data back to canvas
      canvasCtx.putImageData(imageData, 0, 0);
    };

    // Watch for changes in FFT data
    watch(
      () => props.fftData,
      () => {
        draw();
      }
    );

    // Watch for changes in history
    watch(
      () => props.fftHistory,
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
.spectrogram {
  width: 100%;
  height: 100%;
}

canvas {
  width: 100%;
  height: 100%;
}
</style>
