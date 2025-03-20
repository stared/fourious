import FFT from "fft.js";

// Configuration
const FFT_CONFIG = {
  size: 1024,
  sampleRate: 44100,
  updateIntervalMs: 50,
};

// Initialize FFT processor
const fft: FFT = new FFT(FFT_CONFIG.size);

// Audio context and nodes
let audioContext: AudioContext;
let analyserNode: AnalyserNode;
let sourceNode: MediaStreamAudioSourceNode;

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

// Initialize Web Audio API
async function initAudio(stream: MediaStream): Promise<void> {
  // Create audio context
  audioContext = new AudioContext({
    sampleRate: FFT_CONFIG.sampleRate,
  });

  // Create analyzer node
  analyserNode = audioContext.createAnalyser();
  analyserNode.fftSize = FFT_CONFIG.size * 2; // Must be power of 2
  analyserNode.smoothingTimeConstant = 0.5;

  // Using microphone input
  sourceNode = audioContext.createMediaStreamSource(stream);
  sourceNode.connect(analyserNode);
  // Don't connect to destination to avoid feedback
}

// Process real-time audio data from analyzer node
function processAudioData(): void {
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
    if (logScaleCheckbox.checked && magnitude > 0) {
      magnitude = Math.log10(magnitude + 1) * 50;
    }

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

  // Ensure we have a reasonable maximum
  maxMagnitude = Math.max(maxMagnitude, 1);

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
  maxMagnitude = Math.max(maxMagnitude, 1);

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
  maxMagnitude = Math.max(maxMagnitude, 1);

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

// Analysis state manager
class AnalysisState {
  private _animationFrame?: number;
  private _isRunning = false;

  get isRunning(): boolean {
    return this._isRunning;
  }

  start(): void {
    if (this._isRunning) return;

    this._isRunning = true;

    // Start animation loop
    const loop = () => {
      if (!this._isRunning) return;

      processAudioData();
      this._animationFrame = requestAnimationFrame(loop);
    };

    loop();
  }

  stop(): void {
    if (this._animationFrame) {
      cancelAnimationFrame(this._animationFrame);
      this._animationFrame = undefined;
    }
    this._isRunning = false;

    // Stop audio
    if (audioContext) {
      if (audioContext.state !== "closed") {
        audioContext.suspend();
      }
    }
  }
}

const analysisState = new AnalysisState();

// Function to get microphone input
async function getMicrophoneInput(): Promise<MediaStream> {
  try {
    showStatus("Requesting microphone access...");
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    showStatus("Microphone access granted");
    return stream;
  } catch (error) {
    console.error("Error accessing microphone:", error);
    showStatus(
      `Error: ${error instanceof Error ? error.message : String(error)}`
    );
    throw error;
  }
}

// Function to start analysis
async function startAnalysis(): Promise<void> {
  try {
    // If already running, stop analysis
    if (analysisState.isRunning) {
      analysisState.stop();
      analyzeButton.textContent = "Analyze";
      showStatus("Analysis stopped");
      return;
    }

    // Initialize microphone input
    showStatus("Initializing microphone...");
    setLoading(true);
    analyzeButton.disabled = true;
    analyzeButton.textContent = "Setting up...";

    // Clear any previous data
    fftHistory.length = 0;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    try {
      // Get microphone input
      const stream = await getMicrophoneInput();
      await initAudio(stream);

      showStatus("Audio processing started");
      setLoading(false);
      analyzeButton.disabled = false;
      analyzeButton.textContent = "Stop";

      // Start analysis
      analysisState.start();
    } catch (micError) {
      console.error("Microphone initialization failed:", micError);
      showStatus("Could not access microphone. Check browser permissions.");
      setLoading(false);
      analyzeButton.disabled = false;
      analyzeButton.textContent = "Analyze";
    }
  } catch (error) {
    console.error("Error in analysis:", error);
    showStatus(
      `Error: ${error instanceof Error ? error.message : String(error)}`
    );
    setLoading(false);
    analyzeButton.disabled = false;
    analyzeButton.textContent = "Analyze";
  }
}

// Set up event listeners
analyzeButton.addEventListener("click", startAnalysis);

// Add window unload event to clean up resources
window.addEventListener("beforeunload", () => {
  analysisState.stop();

  // Clean up audio resources
  if (sourceNode) {
    sourceNode.disconnect();
  }

  if (analyserNode) {
    analyserNode.disconnect();
  }

  if (audioContext && audioContext.state !== "closed") {
    audioContext.close();
  }
});

// Initialize on load
window.addEventListener("load", () => {
  console.log("Application loaded");
  showStatus("Click 'Analyze' to start audio visualization");
});
