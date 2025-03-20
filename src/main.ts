import FFT from "fft.js";
import { FFTConfig } from "./types";

// Configuration
const FFT_CONFIG: FFTConfig = {
  size: 1024,
  sampleRate: 44100,
  updateIntervalMs: 50,
};

// Initialize FFT processor
const fft: FFT = new FFT(FFT_CONFIG.size);

// Get DOM elements
const youtubeUrlInput = document.getElementById(
  "youtube-url"
) as HTMLInputElement;
const analyzeButton = document.getElementById(
  "analyze-btn"
) as HTMLButtonElement;
const statusMessage = document.getElementById("status-message") as HTMLElement;
const loadingOverlay = document.getElementById(
  "loading-overlay"
) as HTMLElement;
const canvas = document.getElementById("fft-canvas") as HTMLCanvasElement;
const logScaleCheckbox = document.getElementById(
  "log-scale"
) as HTMLInputElement;
const showPeaksCheckbox = document.getElementById(
  "show-peaks"
) as HTMLInputElement;
const visualizationTypeSelect = document.getElementById(
  "visualization-type"
) as HTMLSelectElement;

// Canvas setup
const ctx = canvas.getContext("2d")!;
const canvasContainer = document.getElementById(
  "canvas-container"
) as HTMLElement;

// Make sure canvas fills its container
function resizeCanvas(): void {
  canvas.width = canvasContainer.clientWidth;
  canvas.height = canvasContainer.clientHeight;
}

// Call resizeCanvas whenever window is resized
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

// Store FFT history for spectrogram
const MAX_HISTORY = 200;
const fftHistory: number[][] = [];

// Function to show a status message
function showStatus(message: string): void {
  statusMessage.textContent = message;
}

// Function to toggle loading overlay
function setLoading(isLoading: boolean): void {
  if (isLoading) {
    loadingOverlay.classList.add("active");
  } else {
    loadingOverlay.classList.remove("active");
  }
}

// Function to extract YouTube video ID (kept for URL validation)
function extractYouTubeVideoId(url: string): string | null {
  const regex =
    /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

// Function to generate mock FFT data
function generateMockFFTData(): number[] {
  const data = new Float64Array(FFT_CONFIG.size * 2);
  const time = Date.now() / 1000; // Use current time to create dynamic patterns

  // Create a simpler pattern that will be more visible in the visualization
  for (let i = 0; i < FFT_CONFIG.size * 2; i += 2) {
    const frequency = i / 2;
    let amplitude = 0;

    // Create a few clear frequency bands instead of continuous spectrum
    // This makes patterns more visible in the visualization

    // Bass frequencies (0-100Hz)
    if (frequency < 100) {
      amplitude = 3.0 * Math.sin(time * 1.0) * Math.exp(-frequency / 25);
    }
    // Mid-low frequencies (100-200Hz)
    else if (frequency < 200) {
      amplitude =
        2.0 *
        Math.sin(time * 1.5) *
        Math.exp((-(frequency - 150) * (frequency - 150)) / 1000);
    }
    // Mid frequencies (200-400Hz)
    else if (frequency < 400) {
      amplitude =
        1.5 *
        Math.sin(time * 2.0) *
        Math.exp((-(frequency - 300) * (frequency - 300)) / 2000);
    }
    // High frequencies (400-800Hz)
    else if (frequency < 800) {
      amplitude =
        1.0 *
        Math.sin(time * 2.5) *
        Math.exp((-(frequency - 600) * (frequency - 600)) / 5000);
    }
    // Very high frequencies (>800Hz)
    else {
      amplitude =
        0.5 *
        Math.sin(time * 3.0) *
        Math.exp((-(frequency - 1000) * (frequency - 1000)) / 10000);
    }

    // Add a small amount of noise
    amplitude += (Math.random() - 0.5) * 0.1;

    // Ensure amplitude is never negative for better visualization
    amplitude = Math.max(0, amplitude);

    data[i] = amplitude; // Real part
    data[i + 1] = 0; // Imaginary part (zero for real signals)
  }

  return Array.from(data);
}

// Process FFT data and update visualization
function processFFTData(fftOutput: number[]): void {
  // Convert FFT output to magnitudes
  const magnitudes: number[] = [];
  const maxFrequencies = Math.min(256, FFT_CONFIG.size / 2); // Limit for better visualization

  for (let i = 0; i < maxFrequencies; i++) {
    const real = fftOutput[i * 2];
    const imag = fftOutput[i * 2 + 1];
    let magnitude = Math.sqrt(real * real + imag * imag);

    // Apply log scale if selected
    if (logScaleCheckbox.checked && magnitude > 0) {
      magnitude = Math.log10(magnitude) * 10;
    }

    // Ensure magnitude is never negative
    magnitude = Math.max(0, magnitude);

    magnitudes.push(magnitude);
  }

  // Add to history
  fftHistory.push([...magnitudes]);
  if (fftHistory.length > MAX_HISTORY) {
    fftHistory.shift();
  }

  // Visualize
  drawVisualization(magnitudes);
}

// Function to get color for magnitude
function getColor(magnitude: number, max: number): string {
  // Heatmap color: blue -> cyan -> green -> yellow -> red
  const ratio = Math.min(1, Math.max(0, magnitude / max));

  if (ratio < 0.2) {
    // Blue to Cyan (0.0 - 0.2)
    const r = 0;
    const g = Math.floor(255 * (ratio / 0.2));
    const b = 255;
    return `rgb(${r}, ${g}, ${b})`;
  } else if (ratio < 0.4) {
    // Cyan to Green (0.2 - 0.4)
    const r = 0;
    const g = 255;
    const b = Math.floor(255 * (1 - (ratio - 0.2) / 0.2));
    return `rgb(${r}, ${g}, ${b})`;
  } else if (ratio < 0.6) {
    // Green to Yellow (0.4 - 0.6)
    const r = Math.floor(255 * ((ratio - 0.4) / 0.2));
    const g = 255;
    const b = 0;
    return `rgb(${r}, ${g}, ${b})`;
  } else if (ratio < 0.8) {
    // Yellow to Red (0.6 - 0.8)
    const r = 255;
    const g = Math.floor(255 * (1 - (ratio - 0.6) / 0.2));
    const b = 0;
    return `rgb(${r}, ${g}, ${b})`;
  } else {
    // Red to Bright Red (0.8 - 1.0)
    const r = 255;
    const g = 0;
    const b = Math.floor(255 * ((ratio - 0.8) / 0.2));
    return `rgb(${r}, ${g}, ${b})`;
  }
}

// Draw visualization based on current settings
function drawVisualization(magnitudes: number[]): void {
  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const type = visualizationTypeSelect.value;

  switch (type) {
    case "spectrogram":
      drawSpectrogram();
      break;
    case "bars":
      drawFrequencyBars(magnitudes);
      break;
    case "line":
      drawLineGraph(magnitudes);
      break;
    default:
      drawSpectrogram();
  }
}

// Draw spectrogram visualization
function drawSpectrogram(): void {
  const width = canvas.width;
  const height = canvas.height;
  const historyCount = fftHistory.length;
  const barWidth = width / MAX_HISTORY;
  const barHeight = height / 256;

  // Find maximum value for normalization
  let maxMagnitude = 0;
  for (const row of fftHistory) {
    for (const mag of row) {
      maxMagnitude = Math.max(maxMagnitude, mag);
    }
  }

  // Draw each history slice
  for (let h = 0; h < historyCount; h++) {
    const x = width - (historyCount - h) * barWidth;
    const magnitudes = fftHistory[h];

    for (let i = 0; i < magnitudes.length; i++) {
      const y = height - (i + 1) * barHeight;
      const color = getColor(magnitudes[i], maxMagnitude);

      ctx.fillStyle = color;
      ctx.fillRect(x, y, barWidth, barHeight);
    }
  }
}

// Draw frequency bars visualization
function drawFrequencyBars(magnitudes: number[]): void {
  const width = canvas.width;
  const height = canvas.height;
  const barCount = magnitudes.length;
  const barWidth = width / barCount;
  const padding = barWidth * 0.1;

  // Find maximum value for normalization
  let maxMagnitude = 0;
  for (const mag of magnitudes) {
    maxMagnitude = Math.max(maxMagnitude, mag);
  }

  // Ensure we have a reasonable maximum
  maxMagnitude = Math.max(maxMagnitude, 0.1);

  // Draw bars
  for (let i = 0; i < barCount; i++) {
    const barHeight = (magnitudes[i] / maxMagnitude) * height;
    const x = i * barWidth;
    const y = height - barHeight;

    const color = getColor(magnitudes[i], maxMagnitude);
    ctx.fillStyle = color;
    ctx.fillRect(x + padding / 2, y, barWidth - padding, barHeight);

    // Draw peak markers if enabled
    if (showPeaksCheckbox.checked && i > 0 && i < barCount - 1) {
      if (
        magnitudes[i] > magnitudes[i - 1] &&
        magnitudes[i] > magnitudes[i + 1]
      ) {
        ctx.fillStyle = "white";
        ctx.fillRect(x + barWidth / 2 - 1, y - 4, 2, 4);
      }
    }
  }
}

// Draw line graph visualization
function drawLineGraph(magnitudes: number[]): void {
  const width = canvas.width;
  const height = canvas.height;
  const pointCount = magnitudes.length;

  // Find maximum value for normalization
  let maxMagnitude = 0;
  for (const mag of magnitudes) {
    maxMagnitude = Math.max(maxMagnitude, mag);
  }

  // Ensure we have a reasonable maximum
  maxMagnitude = Math.max(maxMagnitude, 0.1);

  // Start drawing path
  ctx.beginPath();
  ctx.moveTo(0, height);

  for (let i = 0; i < pointCount; i++) {
    const x = (i / pointCount) * width;
    const y = height - (magnitudes[i] / maxMagnitude) * height;
    ctx.lineTo(x, y);
  }

  ctx.lineTo(width, height);
  ctx.closePath();

  // Create gradient fill
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "rgba(255, 64, 64, 0.8)");
  gradient.addColorStop(0.5, "rgba(255, 128, 0, 0.5)");
  gradient.addColorStop(1, "rgba(0, 64, 255, 0.1)");

  ctx.fillStyle = gradient;
  ctx.fill();

  // Draw line
  ctx.beginPath();
  ctx.moveTo(0, height - (magnitudes[0] / maxMagnitude) * height);

  for (let i = 1; i < pointCount; i++) {
    const x = (i / pointCount) * width;
    const y = height - (magnitudes[i] / maxMagnitude) * height;
    ctx.lineTo(x, y);
  }

  ctx.strokeStyle = "rgb(255, 255, 255)";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Draw peak markers if enabled
  if (showPeaksCheckbox.checked) {
    ctx.fillStyle = "white";
    for (let i = 1; i < pointCount - 1; i++) {
      if (
        magnitudes[i] > magnitudes[i - 1] &&
        magnitudes[i] > magnitudes[i + 1]
      ) {
        const x = (i / pointCount) * width;
        const y = height - (magnitudes[i] / maxMagnitude) * height;
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

// Analysis state manager with no nullables
class AnalysisState {
  private _interval?: number;
  private _isPaused = false;

  get isRunning(): boolean {
    return typeof this._interval === "number";
  }

  get isPaused(): boolean {
    return this._isPaused;
  }

  start(): void {
    if (this.isRunning) {
      return;
    }
    this._isPaused = false;
    this._interval = window.setInterval(() => {
      if (!this._isPaused) {
        const fftOutput = generateMockFFTData();
        processFFTData(fftOutput);
      }
    }, FFT_CONFIG.updateIntervalMs);
  }

  stop(): void {
    if (typeof this._interval === "number") {
      window.clearInterval(this._interval);
      this._interval = undefined;
    }
    this._isPaused = false;
  }

  togglePause(): void {
    this._isPaused = !this._isPaused;
  }
}

const analysisState = new AnalysisState();

// Function to start analysis
async function startAnalysis(): Promise<void> {
  try {
    const youtubeUrl = youtubeUrlInput.value.trim();

    if (!youtubeUrl) {
      showStatus("Please enter a YouTube URL");
      return;
    }

    const videoId = extractYouTubeVideoId(youtubeUrl);

    if (!videoId) {
      showStatus("Invalid YouTube URL");
      return;
    }

    // If already running, toggle pause/resume
    if (analysisState.isRunning) {
      analysisState.togglePause();

      if (analysisState.isPaused) {
        console.log("Pausing analysis");
        analyzeButton.textContent = "Resume";
        showStatus("Analysis paused");
      } else {
        console.log("Resuming analysis");
        analyzeButton.textContent = "Pause";
        showStatus("Analysis resumed");
      }
      return;
    }

    // Initialize visualization
    console.log("Initializing visualization");
    analyzeButton.disabled = true;
    analyzeButton.textContent = "Setting up...";
    setLoading(true);
    showStatus("Setting up visualization...");

    // Clear any previous data
    fftHistory.length = 0;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Short delay to allow UI to update
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Start generating and processing FFT data
    analyzeButton.disabled = false;
    analyzeButton.textContent = "Pause";
    showStatus("Generating FFT data...");
    setLoading(false);

    console.log("Starting FFT data generation");
    analysisState.start();
    console.log("FFT data generation started");
  } catch (error) {
    console.error("Error in analysis:", error);
    showStatus(
      `Error: ${error instanceof Error ? error.message : String(error)}`
    );
    stopAnalysis();
    setLoading(false);
  }
}

// Function to stop analysis
function stopAnalysis(): void {
  analysisState.stop();
  analyzeButton.disabled = false;
  analyzeButton.textContent = "Analyze";
  showStatus("Analysis stopped");
}

// Set up event listeners
analyzeButton.addEventListener("click", startAnalysis);

// Add event listeners for visualization controls
logScaleCheckbox.addEventListener("change", () => {
  // Redraw with current data
  if (fftHistory.length > 0) {
    drawVisualization(fftHistory[fftHistory.length - 1]);
  }
});

showPeaksCheckbox.addEventListener("change", () => {
  // Redraw with current data
  if (fftHistory.length > 0) {
    drawVisualization(fftHistory[fftHistory.length - 1]);
  }
});

visualizationTypeSelect.addEventListener("change", () => {
  // Redraw with current data
  if (fftHistory.length > 0) {
    drawVisualization(fftHistory[fftHistory.length - 1]);
  }
});

// Add window unload event to clean up resources
window.addEventListener("beforeunload", () => {
  analysisState.stop();
});

// Initialize on load
window.addEventListener("load", () => {
  console.log("Application loaded, initializing...");
  showStatus("Application loaded");
});
