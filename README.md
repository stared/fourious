# Fourious

A web application that displays real-time windowed Fourier transforms for YouTube audio.

## Features

- Extract audio from YouTube videos
- Perform real-time windowed Fourier transform (FFT)
- Visualize frequency spectra using Perspective library from FINOS
- Built with TypeScript for type safety
- Both web interface and CLI support

## Requirements

- Node.js (v14+)
- FFmpeg (must be installed and accessible in your PATH)
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

### Web Application

1. Start the server and frontend in development mode:

```bash
yarn dev
```

Alternatively, you can start them separately:

```bash
# Start the server
yarn dev:server

# In another terminal, start the frontend
yarn start
```

2. Open your browser and go to http://localhost:5173

3. Enter a YouTube URL and click "Analyze"

### Command Line Interface

For quick testing or analysis via CLI:

```bash
yarn test
```

Or specify a custom YouTube URL:

```bash
ts-node cli.ts https://www.youtube.com/watch?v=YOUR_VIDEO_ID
```

## How It Works

1. The application extracts audio from YouTube videos using ytdl-core
2. Audio is processed in real-time using FFmpeg to convert to PCM format
3. Audio frames are processed with a Fast Fourier Transform (FFT) algorithm
4. The FFT results are visualized using the Perspective library

## Technology Stack

- TypeScript for type safety
- Express for the backend server
- Socket.IO for real-time communication
- Vite for frontend tooling
- Perspective for data visualization
- FFT.js for Fourier transform calculations

## License

MIT
