# Ultimate Downloader — Architecture & Engineering Specification

This document details the architectural blueprints, component hierarchies, real-time event lifecycles, and multi-platform packaging mechanisms powering **Ultimate Downloader**.

---

## Table of Contents

- [System Overview](#system-overview)
- [End-to-End Request Handling Flow](#end-to-end-request-handling-flow)
- [Real-Time Event Pipeline (SSE Sequence)](#real-time-event-pipeline-sse-sequence)
- [Core Architecture Subsystems](#core-architecture-subsystems)
  - [1. Presentation Layer (Vite + React)](#1-presentation-layer-vite--react)
  - [2. API Gateway & Controller Layer (Express)](#2-api-gateway--controller-layer-express)
  - [3. Media Extraction Engine (`MediaExtractor`)](#3-media-extraction-engine-mediaextractor)
  - [4. Task Queue & State Machine (`DownloadManager`)](#4-task-queue--state-machine-downloadmanager)
  - [5. Media Processing Pipeline (`FfmpegService`)](#5-media-processing-pipeline-ffmpegservice)
  - [6. Image Archival Subsystem (`Archiver`)](#6-image-archival-subsystem-archiver)
- [Task Lifecycle State Machine](#task-lifecycle-state-machine)
- [Multi-Platform Packaging Architecture](#multi-platform-packaging-architecture)
  - [Web Application Deployment](#web-application-deployment)
  - [Docker Containerization](#docker-containerization)
  - [Electron Desktop Application](#electron-desktop-application)
  - [Headless Command-Line Interface (CLI)](#headless-command-line-interface-cli)
- [Performance, Resilience & Security](#performance-resilience--security)

---

## System Overview

Ultimate Downloader is engineered as a decoupled, event-driven media processing system. It enables instantaneous media analysis, multi-resolution video downloading, studio-grade audio extraction, and bulk image scraping across major content platforms with a unified visual interface.

```
                      +---------------------------------------+
                      |       Clients & Interfaces            |
                      |  [Web UI]  [Electron]  [CLI]  [cURL]  |
                      +-------------------+-------------------+
                                          |
                                          v  HTTP REST / SSE
                      +---------------------------------------+
                      |       Express API Gateway             |
                      |   CORS, Rate Gate, Request Router     |
                      +-------------------+-------------------+
                                          |
                +-------------------------+-------------------------+
                |                                                   |
                v                                                   v
+-------------------------------+                   +-------------------------------+
|     MediaExtractor            |                   |    DownloadQueueManager       |
|  - Platform URL Matcher       |                   |  - FIFO Worker Concurrency    |
|  - yt-dlp Native Bridge       |                   |  - Progress Tracking          |
|  - Cheerio HTML DOM Crawler   |                   |  - SSE Event Broadcast Hub    |
+---------------+---------------+                   +---------------+---------------+
                |                                                   |
                +-------------------------+-------------------------+
                                          |
                +-------------------------+-------------------------+
                |                                                   |
                v                                                   v
+-------------------------------+                   +-------------------------------+
|     FfmpegService             |                   |     ArchiverService           |
|  - Lossless Stream Trimming   |                   |  - Bulk Image Bundler         |
|  - 320kbps Audio Transcoder   |                   |  - Streamed ZIP Generator     |
|  - Format Remuxing (MP4/MKV)  |                   |  - Non-blocking I/O           |
+---------------+---------------+                   +---------------+---------------+
                |                                                   |
                +-------------------------+-------------------------+
                                          |
                                          v
                      +---------------------------------------+
                      |   Disk Storage (/downloads)           |
                      |   Range Requests / Static Server      |
                      +---------------------------------------+
```

---

## End-to-End Request Handling Flow

The following Mermaid diagram traces a download operation from initial URL submission in the UI through format detection, queued background processing, FFmpeg transcoding/trimming, and client retrieval:

```mermaid
flowchart TD
    subgraph Client ["Client Layer (Web / Electron / CLI)"]
        UI_INPUT["User inputs URL & options (format, trim, audio)"]
        UI_SSE["SSE Client listens to /api/events"]
        UI_PROGRESS["Live Progress Bar (Speed, ETA, %)"]
        UI_SAVE["Client downloads final media file"]
    end

    subgraph Gateway ["Express API Gateway"]
        API_POST["POST /api/download"]
        API_EVENTS["GET /api/events (SSE Stream)"]
        API_STATIC["GET /api/downloads/:fileName"]
    end

    subgraph Core ["Extraction & Orchestration"]
        EXTRACTOR["MediaExtractor.extractMetadata()"]
        QUEUE["DownloadManager.enqueueTask()"]
        WORKER["Worker Thread / Process Execution"]
        STATE_TRACKER["Task State Machine & Telemetry"]
    end

    subgraph Processing ["Processing & External Engines"]
        YTDLP["yt-dlp Native Binary"]
        AXIOS["Axios Direct Chunk Downloader"]
        FFMPEG["FFmpeg Audio/Video Muxer & Trimmer"]
        ARCHIVER["Archiver Streaming ZIP Packer"]
    end

    subgraph Storage ["Local Storage"]
        TEMP_DISK["Scratch Temporary Chunks"]
        OUTPUT_DISK["Final Media Directory (/downloads)"]
    end

    UI_INPUT -->|1. Submit Request| API_POST
    API_POST -->|2. Route to Task Queue| QUEUE
    QUEUE -->|3. Return 202 taskId| UI_INPUT
    UI_SSE -->|Connect stream| API_EVENTS
    API_EVENTS -.->|Real-time events| UI_PROGRESS

    QUEUE -->|4. Execute task in slot| WORKER
    WORKER -->|5. Platform Detection| EXTRACTOR

    EXTRACTOR -->|Social/Video| YTDLP
    EXTRACTOR -->|Direct HTTP Media| AXIOS
    EXTRACTOR -->|Webpage Images| ARCHIVER

    YTDLP -->|Raw Streams| TEMP_DISK
    AXIOS -->|Raw Chunks| TEMP_DISK

    WORKER -->|6. Trim / Transcode| FFMPEG
    TEMP_DISK --> FFMPEG
    FFMPEG -->|7. Muxed & Tagged File| OUTPUT_DISK
    ARCHIVER -->|Packaged ZIP| OUTPUT_DISK

    WORKER -->|8. Status: completed| STATE_TRACKER
    STATE_TRACKER -->|Emit event| API_EVENTS

    UI_PROGRESS -->|9. Trigger download| API_STATIC
    API_STATIC -->|Stream binary with range| OUTPUT_DISK
    OUTPUT_DISK --> UI_SAVE
```

---

## Real-Time Event Pipeline (SSE Sequence)

The real-time telemetry pipeline relies on standard HTTP Server-Sent Events (`text/event-stream`), avoiding the heavy handshake overhead of WebSockets while ensuring automatic browser reconnection and proxy compatibility:

```mermaid
sequenceDiagram
    autonumber
    actor User as Client (Web / Desktop)
    participant SSE as Express SSE Manager (/api/events)
    participant API as Download Controller (/api/download)
    participant Queue as Download Queue Manager
    participant Worker as Download Execution Worker
    participant FFmpeg as FFmpeg / yt-dlp Subprocess

    User->>SSE: GET /api/events (HTTP persistent connection)
    SSE-->>User: 200 OK (Content-Type: text/event-stream)
    
    User->>API: POST /api/download { url, formatId, trimStart, trimEnd }
    API->>Queue: enqueueTask(payload)
    Queue-->>API: taskId (e.g. task_001)
    API-->>User: 202 Accepted { taskId: "task_001", status: "queued" }
    
    Queue->>SSE: broadcastTaskProgress(taskId, "queued", 0%)
    SSE-->>User: data: {"taskId":"task_001","status":"queued","progressPercentage":0}

    Queue->>Worker: startTask(task_001)
    Worker->>SSE: broadcastTaskProgress(taskId, "fetching_info", 5%)
    SSE-->>User: data: {"taskId":"task_001","status":"fetching_info","progressPercentage":5}

    Worker->>FFmpeg: spawn(yt-dlp / ffmpeg, [args])
    
    loop Stream Download & Telemetry
        FFmpeg-->>Worker: stdout/stderr progress updates (downloaded bytes, speed)
        Worker->>SSE: broadcastTaskProgress(taskId, "downloading", 45%, 4.2 MB/s, 12s ETA)
        SSE-->>User: data: {"taskId":"task_001","status":"downloading","progressPercentage":45,...}
    end

    Worker->>FFmpeg: Post-processing / Trimming / Audio extraction
    Worker->>SSE: broadcastTaskProgress(taskId, "processing", 92%)
    SSE-->>User: data: {"taskId":"task_001","status":"processing","progressPercentage":92}

    FFmpeg-->>Worker: Process exited with code 0
    Worker->>Queue: markCompleted(task_001, fileName, filePath)
    Worker->>SSE: broadcastTaskProgress(taskId, "completed", 100%, downloadUrl)
    SSE-->>User: data: {"taskId":"task_001","status":"completed","downloadUrl":"/api/downloads/file.mp4"}

    User->>API: GET /api/downloads/file.mp4
    API-->>User: Binary Stream (200 OK / 206 Partial Content)
```

---

## Core Architecture Subsystems

### 1. Presentation Layer (Vite + React)

- **UI Framework**: React 18 with TypeScript in strict mode.
- **Styling**: Tailwind CSS configured with custom glassmorphism layers, glow effects, and modern Dark Theme palette.
- **Iconography**: `lucide-react` for responsive, accessible vector icons.
- **State Architecture**:
  - `sseClient`: Manages singleton `EventSource` connection with graceful offline mock fallbacks.
  - `HistoryDrawer`: Synchronizes completed downloads to persistent `localStorage` with export capabilities.
  - `MediaInputCard`: Immediate platform icon detection as the user pastes URLs via heuristic regular expressions.
  - `BatchUrlModal`: Multi-line bulk ingestion dialog with format presets.
  - `ImageGalleryExtractor`: Grid view for webpage image previews with multi-select and 1-click ZIP download.

### 2. API Gateway & Controller Layer (Express)

- **Entry Point**: `server/src/index.ts`
- **Middlewares**:
  - `cors()`: Configured for universal cross-origin requests from both Vite dev server (`:5173`) and Electron desktop webviews.
  - `express.json({ limit: '10mb' })`: Accommodates high-volume batch URL payloads.
  - `express.static()`: Serves client static bundle in production mode (`CLIENT_DIST`).
- **Graceful Shutdown**: Intercepts `SIGINT` and `SIGTERM` to safely terminate running child subprocesses and flush open SSE connections.

### 3. Media Extraction Engine (`MediaExtractor`)

The extractor routes URLs based on domain heuristics:
1. **Social / Video Platforms (YouTube, TikTok, Twitter/X, Instagram, Reddit, Vimeo)**:
   - Evaluates URL patterns (e.g., `youtu.be`, `youtube.com/shorts`, `tiktok.com/@user/video`, `x.com/status`).
   - Leverages `yt-dlp --dump-json` to extract streams, resolution ladders, audio tracks, and author metadata.
2. **Direct Media Links**:
   - Detects file extensions (`.mp4`, `.webm`, `.mkv`, `.mp3`, `.wav`, etc.).
   - Issues HTTP `HEAD` requests to verify MIME type and `Content-Length`.
3. **Generic Webpages**:
   - Uses `cheerio` to parse DOM elements.
   - Collects `<img>` elements, resolves relative URLs to absolute HTTP targets, parses responsive `srcset` definitions, and inspects OpenGraph (`og:image`) and Twitter Card (`twitter:image`) metadata tags.

### 4. Task Queue & State Machine (`DownloadManager`)

- **Concurrency Throttle**: Bounded worker pool (defaults to `3` concurrent slots). Tasks in excess of the limit remain in FIFO `queued` status.
- **Progress Tracking**: Tracks `downloadedBytes`, `totalBytes`, instantaneous throughput (`speedBytesPerSecond`), and calculated `etaSeconds`.
- **Cancellation**: Exposes `cancelTask(taskId)` which triggers process killing (`SIGKILL` / `SIGTERM`) on active subprocesses and cleans temporary files.

### 5. Media Processing Pipeline (`FfmpegService`)

FFmpeg commands are constructed with flags optimized for fast execution:
- **Audio Extraction**:
  ```bash
  ffmpeg -y -i input.tmp -vn -c:a libmp3lame -b:a 320k output.mp3
  ```
- **Lossless Stream Trimming**:
  ```bash
  ffmpeg -y -ss 00:01:10 -to 00:02:30 -i input.tmp -c copy output.mp4
  ```
- **Precision Re-encoding (when cutting between non-keyframe boundaries)**:
  ```bash
  ffmpeg -y -ss 00:01:10 -to 00:02:30 -i input.tmp -c:v libx264 -preset ultrafast -crf 18 -c:a aac output.mp4
  ```

### 6. Image Archival Subsystem (`Archiver`)

- Directly streams binary archives (`application/zip`) using Node.js readable streams and `archiver` pipe mechanisms.
- Fetches remote image resources in parallel with axios streams, piping directly into the ZIP archive to prevent high memory usage.

---

## Task Lifecycle State Machine

Each download task transitions through a strictly validated state machine:

```mermaid
stateDiagram-v2
    [*] --> queued: POST /api/download
    queued --> fetching_info: Worker slot available
    queued --> cancelled: DELETE /api/tasks/:id

    fetching_info --> downloading: Metadata & stream URLs resolved
    fetching_info --> error: URL invalid / extractor failure
    fetching_info --> cancelled: DELETE /api/tasks/:id

    downloading --> processing: Raw streams fully acquired
    downloading --> error: Network interruption / HTTP error
    downloading --> cancelled: Subprocess killed by client

    processing --> completed: FFmpeg muxing / ZIP packing complete
    processing --> error: FFmpeg encoding error
    processing --> cancelled: Aborted during transcode

    completed --> [*]: Client fetches file via /api/downloads/:fileName
    error --> [*]: Error logged & notified to client
    cancelled --> [*]: Scratch files purged
```

---

## Multi-Platform Packaging Architecture

```mermaid
graph TD
    subgraph SourceCode ["Unified Codebase"]
        CORE_SHARED["shared/types.ts"]
        FRONTEND["client/ (React + Vite + Tailwind)"]
        BACKEND["server/ (Express + MediaExtractor + FFmpeg)"]
    end

    subgraph TargetPlatforms ["Distribution Targets"]
        PLATFORM_WEB["Web Application (Standard Browser)"]
        PLATFORM_DOCKER["Docker Container (OCI Image)"]
        PLATFORM_DESKTOP["Electron Desktop (Win / Mac / Linux)"]
        PLATFORM_CLI["Headless CLI Tool (Node.js bin)"]
    end

    FRONTEND -->|Vite Build| PLATFORM_WEB
    BACKEND -->|ts-node / dist| PLATFORM_WEB

    SourceCode -->|Multi-stage Dockerfile| PLATFORM_DOCKER
    PLATFORM_DOCKER -->|ghcr.io image| DOCKER_RUN["docker compose up"]

    BACKEND -->|Child Process fork| PLATFORM_DESKTOP
    FRONTEND -->|Localhost / File load| PLATFORM_DESKTOP
    ELECTRON_WRAPPER["electron/main.js & preload.js"] --> PLATFORM_DESKTOP

    BACKEND -->|bin/cli.js| PLATFORM_CLI
```

### Web Application Deployment

- The frontend is compiled into a static distribution bundle via `npm --prefix client run build`.
- In standalone web deployments, Express serves the static assets directly from `client/dist`, providing a unified service on port `4000`.

### Docker Containerization

- Built on `node:22-bookworm-slim` multi-stage build.
- Preinstalls `ffmpeg`, `python3`, `yt-dlp`, and certificates.
- Runs as unprivileged `node` user for defense-in-depth container security.
- Mounts `/app/downloads` as a Docker volume for persistent storage across container lifecycles.

### Electron Desktop Application

- Located in `electron/main.js` and `electron/preload.js`.
- Features:
  - Automatically forks and manages the Express backend as a supervised background child process.
  - Health checks port `4000` with automated retry backoff before loading the window.
  - Native OS System Tray integration with Quick Download and Show/Hide actions.
  - Native OS Desktop Notifications upon download completion.
  - Native OS File Picker dialog (`dialog.showOpenDialog`) for choosing custom download folders.
  - Safe IPC communication via context-isolated preload bridge.

### Headless Command-Line Interface (CLI)

- Located in `server/bin/cli.js` (aliased as `ultimate-dl`).
- Allows terminal-based headless downloading:
  ```bash
  npx ultimate-dl "https://www.youtube.com/watch?v=dQw4w9WgXcQ" --audio-only
  ```
- Renders dynamic ASCII progress bars and terminal ETA metrics.

---

## Performance, Resilience & Security

| Concern | Implementation Strategy |
|:--------|:------------------------|
| **Memory Footprint** | Streaming I/O throughout: direct pipe from Axios/yt-dlp to disk and Archiver to response stream. Zero buffering of large 4K files in RAM. |
| **Deadlock Prevention** | Bounded concurrency slots with FIFO queue. Subprocesses have configurable timeout safety guards. |
| **Sanitization** | File names are sanitized to remove directory traversal characters (`../`, `\`, `:`). Shell commands use argument arrays instead of concatenated shell strings to prevent command injection. |
| **Process Isolation** | Electron isolates renderer from Node.js runtime using `contextIsolation: true` and `nodeIntegration: false`. |
