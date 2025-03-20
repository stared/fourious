# Fourious

A web application that displays real-time windowed Fourier transforms visualization.

## Features

- Real-time simulated Fourier transform (FFT) data
- Canvas-based visualization with multiple display modes:
  - Spectrogram (frequency over time)
  - Frequency bars
  - Line graph
- Built with TypeScript for type safety
- Self-contained frontend application with no server or external dependencies

## Requirements

- Node.js (v14+)
- Web browser with modern JavaScript support

## Installation

1. Clone the repository:

```bash
git clone https://github.com/yourusername/fourious.git
cd fourious
```

2. Install dependencies:

```bash
yarn install
```

## Usage

1. Start the development server:

```bash
yarn start
```

2. Open your browser and go to http://localhost:5173

3. Enter a YouTube URL (for validation only) and click "Analyze"

4. Click "Pause" to pause the visualization or "Resume" to continue

5. Try different visualization modes using the selector at the bottom

## Visualization Controls

- **Log Scale**: Toggle logarithmic scaling for frequency magnitudes
- **Show Peaks**: Highlight frequency peaks in the visualization
- **Visualization Type**: Switch between different visualization modes
  - Spectrogram: Shows frequency changes over time (heatmap)
  - Bars: Shows current frequency magnitudes as vertical bars
  - Line: Shows frequency spectrum as a continuous line graph

## How It Works

1. The application simulates Fourier transform data with realistic patterns
2. Various frequency ranges are modeled with time-based variations
3. The FFT results are visualized using HTML Canvas with different visualization types
4. The visualization updates in real-time at regular intervals (50ms by default)

## Technology Stack

- TypeScript for type safety
- Vite for frontend tooling
- Canvas API for visualization
- FFT.js for Fourier transform calculations

## Building for Production

To build the application for production:

```bash
yarn build
```

The built files will be in the `dist` directory and can be served with any static file server.

## License

MIT
