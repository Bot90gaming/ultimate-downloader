# Ultimate Downloader — REST API Specification

Welcome to the **Ultimate Downloader REST API** documentation. This service provides a high-performance, asynchronous media extraction, downloading, and transcoding backend designed for modern web applications, desktop wrappers (Electron), and headless CLI automation.

---

## Table of Contents

- [Overview & Base URL](#overview--base-url)
- [Authentication & Rate Limiting](#authentication--rate-limiting)
- [Common Data Formats](#common-data-formats)
- [Standard Error Model](#standard-error-model)
- [API Endpoints](#api-endpoints)
  - [`GET /api/health`](#get-apihealth)
  - [`POST /api/info`](#post-apiinfo)
  - [`POST /api/download`](#post-apidownload)
  - [`GET /api/tasks`](#get-apitasks)
  - [`GET /api/tasks/:taskId`](#get-apitaskstaskid)
  - [`DELETE /api/tasks/:taskId`](#delete-apitaskstaskid)
  - [`POST /api/tasks/:taskId/cancel`](#post-apitaskstaskidcancel)
  - [`POST /api/tasks/:taskId/pause`](#post-apitaskstaskidpause)
  - [`POST /api/batch`](#post-apibatch)
  - [`POST /api/images/extract`](#post-apiimagesextract)
  - [`POST /api/download-zip`](#post-apidownload-zip)
  - [`GET /api/downloads/:fileName`](#get-apidownloadsfilename)
- [Real-Time Streaming: Server-Sent Events (SSE)](#real-time-streaming-server-sent-events-sse)
  - [`GET /api/events`](#get-apievents)
  - [SSE Event Schemas](#sse-event-schemas)
- [Client Integration Examples](#client-integration-examples)

---

## Overview & Base URL

The default server listens on port `4000`:

```http
http://localhost:4000
```

All media API routes are prefixed under `/api`. All JSON payloads MUST be transmitted with header:

```http
Content-Type: application/json
```

---

## Authentication & Rate Limiting

- **Authentication**: None required by default in single-user and local instances. In enterprise or multi-tenant deployments, bearer tokens can be passed via `Authorization: Bearer <token>`.
- **Concurrency Gate**: Defaults to `3` simultaneous active downloads per node (configurable via `SIMULTANEOUS_DOWNLOAD_LIMIT` environment variable). Additional tasks enter the FIFO `queued` state.
- **Payload Limits**: JSON bodies are accepted up to `10MB` to accommodate bulk URL imports and batch requests.

---

## Common Data Formats

### Supported Platforms (`SupportedPlatform`)

```typescript
type SupportedPlatform =
  | 'youtube'
  | 'tiktok'
  | 'twitter'
  | 'instagram'
  | 'facebook'
  | 'reddit'
  | 'pinterest'
  | 'vimeo'
  | 'soundcloud'
  | 'direct'
  | 'webpage';
```

### Download Task Status (`DownloadStatus`)

```typescript
type DownloadStatus =
  | 'queued'          // Task accepted into scheduling queue
  | 'fetching_info'   // Extracting video metadata from upstream platform
  | 'downloading'     // Fetching raw video/audio chunks from provider
  | 'processing'      // FFmpeg transcoding, merging, or trimming audio/video
  | 'completed'       // File finished and ready for client download
  | 'error'           // Download or processing failed
  | 'cancelled';      // Task explicitly cancelled by client
```

---

## Standard Error Model

When a non-2xx HTTP status is returned, the API returns a standardized JSON error object:

```json
{
  "error": "BAD_REQUEST",
  "message": "The provided URL is invalid or malformed",
  "statusCode": 400,
  "timestamp": 1730462400000
}
```

Common status codes:
- `400 Bad Request`: Missing mandatory parameters or invalid URL format.
- `404 Not Found`: Task ID does not exist or target resource expired.
- `422 Unprocessable Entity`: The target URL could not be resolved or parsed by any extractor.
- `500 Internal Server Error`: Unhandled exception or FFmpeg execution failure.
- `503 Service Unavailable`: Dependent binary (e.g. `ffmpeg` or `yt-dlp`) is missing or unresponsive.

---

## API Endpoints

### `GET /api/health`

Checks daemon availability, uptime, disk storage status, and verifies whether required external processing binaries (`ffmpeg`, `yt-dlp`) are accessible in `$PATH`.

#### Request

```http
GET /api/health HTTP/1.1
Host: localhost:4000
```

#### Response (`200 OK`)

```json
{
  "status": "ok",
  "version": "1.0.0",
  "uptime": 1428.52,
  "hasFfmpeg": true,
  "hasYtDlp": true,
  "downloadsDir": "/app/downloads",
  "diskFreeBytes": 42949672960
}
```

#### Example cURL

```bash
curl -X GET http://localhost:4000/api/health
```

---

### `POST /api/info`

Fetches media metadata and available stream formats (resolutions, codecs, bitrates, audio tracks) for a given target URL without triggering the download.

#### Request

```http
POST /api/info HTTP/1.1
Host: localhost:4000
Content-Type: application/json

{
  "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
}
```

*Note: Query parameter syntax `GET /api/info?url=<encoded_url>` is also supported for rapid browser inspection.*

#### Request Schema

| Field | Type | Required | Description |
|:------|:-----|:---------|:------------|
| `url` | `string` | **Yes** | Absolute HTTP/HTTPS URL of the media page or direct asset |

#### Response (`200 OK`)

```json
{
  "id": "dQw4w9WgXcQ",
  "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  "title": "Rick Astley - Never Gonna Give You Up (Official Music Video)",
  "description": "The official video for Never Gonna Give You Up by Rick Astley",
  "thumbnail": "https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
  "duration": 213,
  "durationFormatted": "03:33",
  "author": {
    "name": "Rick Astley",
    "avatar": "https://yt3.ggpht.com/example-avatar.jpg",
    "url": "https://www.youtube.com/@RickAstleyYT"
  },
  "platform": "youtube",
  "mediaType": "video",
  "viewCount": 1540000000,
  "likeCount": 17000000,
  "uploadDate": "2009-10-25",
  "sourceUrl": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  "formats": [
    {
      "formatId": "2160p",
      "extension": "mp4",
      "resolution": "4K (2160p)",
      "qualityLabel": "Ultra HD",
      "fileSize": 452000000,
      "fileSizeFormatted": "431.1 MB",
      "hasVideo": true,
      "hasAudio": true,
      "fps": 60,
      "codec": "av01 / opus"
    },
    {
      "formatId": "1080p",
      "extension": "mp4",
      "resolution": "1080p Full HD",
      "qualityLabel": "Recommended",
      "fileSize": 128000000,
      "fileSizeFormatted": "122.1 MB",
      "hasVideo": true,
      "hasAudio": true,
      "fps": 60,
      "codec": "avc1 / aac"
    },
    {
      "formatId": "720p",
      "extension": "mp4",
      "resolution": "720p HD",
      "qualityLabel": "Fast",
      "fileSize": 54000000,
      "fileSizeFormatted": "51.5 MB",
      "hasVideo": true,
      "hasAudio": true,
      "fps": 30,
      "codec": "avc1 / aac"
    },
    {
      "formatId": "audio_320k",
      "extension": "mp3",
      "resolution": "320 kbps High Fidelity",
      "qualityLabel": "Audio Only",
      "fileSize": 8500000,
      "fileSizeFormatted": "8.1 MB",
      "hasVideo": false,
      "hasAudio": true,
      "bitrate": 320,
      "codec": "mp3"
    }
  ]
}
```

#### Example cURL

```bash
curl -X POST http://localhost:4000/api/info \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"}'
```

---

### `POST /api/download`

Creates a new asynchronous download task and submits it to the background task queue. The client receives an immediate `202 Accepted` response with a unique `taskId` to monitor via SSE or polling.

#### Request Schema

| Field | Type | Required | Description |
|:------|:-----|:---------|:------------|
| `url` | `string` | **Yes** | Target media URL |
| `formatId` | `string` | No | Identifier of the format from `/api/info` (e.g., `'1080p'`, `'audio_320k'`). Defaults to `'best'` |
| `extension` | `string` | No | Target container extension (`mp4`, `mkv`, `webm`, `mp3`, `m4a`, `wav`, `flac`) |
| `mediaType` | `string` | No | `'video'` \| `'audio'` \| `'image'` \| `'gallery'` |
| `audioOnly` | `boolean` | No | When `true`, automatically strips video tracks and extracts 320kbps audio |
| `trimStart` | `string` | No | Video trimming starting point (`HH:MM:SS` or seconds float string) |
| `trimEnd` | `string` | No | Video trimming ending point (`HH:MM:SS` or seconds float string) |
| `customFilename`| `string` | No | Override final disk filename (without extension) |

#### Request Example

```json
{
  "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  "formatId": "1080p",
  "extension": "mp4",
  "trimStart": "00:00:15",
  "trimEnd": "00:00:45",
  "customFilename": "RickAstley_Chorus_Clip"
}
```

#### Response (`202 Accepted`)

```json
{
  "taskId": "task_1730462410942_a9f1b",
  "status": "queued",
  "message": "Task queued successfully. Listen to /api/events for real-time progress.",
  "createdAt": 1730462410942
}
```

#### Example cURL

```bash
curl -X POST http://localhost:4000/api/download \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "formatId": "1080p",
    "audioOnly": false
  }'
```

---

### `GET /api/tasks`

Retrieves a list of all active, queued, and recently finished download tasks with snapshot telemetry.

#### Response (`200 OK`)

```json
{
  "tasks": [
    {
      "taskId": "task_1730462410942_a9f1b",
      "status": "downloading",
      "progressPercentage": 48.5,
      "downloadedBytes": 62100000,
      "totalBytes": 128000000,
      "speedBytesPerSecond": 4500000,
      "etaSeconds": 14,
      "fileName": "RickAstley_Chorus_Clip.mp4",
      "timestamp": 1730462425000
    }
  ],
  "total": 1,
  "queueLength": 0
}
```

#### Example cURL

```bash
curl -X GET http://localhost:4000/api/tasks
```

---

### `GET /api/tasks/:taskId`

Retrieves real-time progress details for a single task.

#### Parameters

- `taskId` (path param, string): The unique identifier returned by `POST /api/download`.

#### Response (`200 OK`)

```json
{
  "taskId": "task_1730462410942_a9f1b",
  "status": "completed",
  "progressPercentage": 100,
  "downloadedBytes": 128000000,
  "totalBytes": 128000000,
  "speedBytesPerSecond": 0,
  "etaSeconds": 0,
  "fileName": "RickAstley_Chorus_Clip.mp4",
  "downloadUrl": "/api/downloads/RickAstley_Chorus_Clip.mp4",
  "timestamp": 1730462438000
}
```

#### Example cURL

```bash
curl -X GET http://localhost:4000/api/tasks/task_1730462410942_a9f1b
```

---

### `DELETE /api/tasks/:taskId`

Cancels an in-progress task, aborts child processes (such as `ffmpeg` or `yt-dlp`), and purges any intermediate temporary files from the downloads directory.

#### Response (`200 OK`)

```json
{
  "taskId": "task_1730462410942_a9f1b",
  "status": "cancelled",
  "message": "Task cancelled and temporary resources freed."
}
```

#### Example cURL

```bash
curl -X DELETE http://localhost:4000/api/tasks/task_1730462410942_a9f1b
```

---

### `POST /api/tasks/:taskId/cancel`

Alias endpoint for environments where HTTP `DELETE` verbs are filtered by proxies.

#### Response (`200 OK`)

```json
{
  "taskId": "task_1730462410942_a9f1b",
  "cancelled": true
}
```

---

### `POST /api/tasks/:taskId/pause`

Pauses the active stream or thread pool execution for the specified task.

#### Response (`200 OK`)

```json
{
  "taskId": "task_1730462410942_a9f1b",
  "isPaused": true
}
```

---

### `POST /api/batch`

Enqueues multiple media downloads in a single transaction.

#### Request Schema

```json
{
  "items": [
    {
      "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      "formatId": "1080p"
    },
    {
      "url": "https://www.tiktok.com/@creator/video/731110022394857216",
      "audioOnly": true
    }
  ],
  "simultaneousLimit": 2
}
```

#### Response (`202 Accepted`)

```json
{
  "taskIds": [
    "task_1730462450111_01",
    "task_1730462450111_02"
  ],
  "enqueuedCount": 2
}
```

---

### `POST /api/images/extract` (or `POST /api/extract-images`)

Crawls any standard HTML webpage, extracts high-resolution embedded images (`<img>`, `srcset`, OpenGraph `og:image`, `twitter:image`), removes tracking query strings, and returns clean asset metadata.

#### Request Schema

```json
{
  "url": "https://unsplash.com/t/wallpapers"
}
```

#### Response (`200 OK`)

```json
{
  "url": "https://unsplash.com/t/wallpapers",
  "title": "Wallpapers & Backgrounds | Unsplash",
  "totalImages": 3,
  "images": [
    {
      "id": "img_001",
      "url": "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=2400&q=95",
      "thumbnailUrl": "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=400&q=80",
      "width": 3840,
      "height": 2160,
      "alt": "Alpine Mountain Sunset",
      "extension": "jpg",
      "sizeFormatted": "4.2 MB"
    },
    {
      "id": "img_002",
      "url": "https://images.unsplash.com/photo-1518770660439-4636190af475?w=2400&q=95",
      "thumbnailUrl": "https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&q=80",
      "width": 2560,
      "height": 1440,
      "alt": "Futuristic Cyber Circuit",
      "extension": "webp",
      "sizeFormatted": "2.8 MB"
    },
    {
      "id": "img_003",
      "url": "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=2400&q=95",
      "thumbnailUrl": "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=400&q=80",
      "width": 3200,
      "height": 2000,
      "alt": "Misty Emerald Forest",
      "extension": "png",
      "sizeFormatted": "3.5 MB"
    }
  ]
}
```

#### Example cURL

```bash
curl -X POST http://localhost:4000/api/images/extract \
  -H "Content-Type: application/json" \
  -d '{"url": "https://unsplash.com/t/wallpapers"}'
```

---

### `POST /api/download-zip`

Packs an array of remote image URLs into an in-memory streaming ZIP archive using `archiver`, and streams the resulting `.zip` directly to the client with `Content-Disposition: attachment`.

#### Request Schema

```json
{
  "imageUrls": [
    "https://images.unsplash.com/photo-1506744038136-46273834b3fb",
    "https://images.unsplash.com/photo-1518770660439-4636190af475"
  ],
  "zipFilename": "scraped_wallpapers.zip"
}
```

#### Response (`200 OK`)

- `Content-Type: application/zip`
- `Content-Disposition: attachment; filename="scraped_wallpapers.zip"`
- Binary stream of valid PKZIP archive containing downloaded assets numbered sequentially (`image_001.jpg`, `image_002.webp`, etc.).

#### Example cURL

```bash
curl -X POST http://localhost:4000/api/download-zip \
  -H "Content-Type: application/json" \
  -d '{
    "imageUrls": [
      "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1080",
      "https://images.unsplash.com/photo-1518770660439-4636190af475?w=1080"
    ],
    "zipFilename": "nature_wallpapers.zip"
  }' \
  --output nature_wallpapers.zip
```

---

### `GET /api/downloads/:fileName`

Serves completed media files from disk with proper MIME headers and HTTP range request support (`Accept-Ranges: bytes`) for smooth video playback and streaming scrubbing.

#### Headers Returned

```http
HTTP/1.1 200 OK
Content-Type: video/mp4
Content-Length: 128000000
Content-Disposition: attachment; filename="RickAstley_Chorus_Clip.mp4"
Accept-Ranges: bytes
```

---

## Real-Time Streaming: Server-Sent Events (SSE)

### `GET /api/events`

Establishes an open HTTP persistent stream using the W3C Server-Sent Events specification. All clients connected to this endpoint receive real-time push telemetry on download task progress, status transitions, speeds, and errors.

#### Headers Returned

```http
HTTP/1.1 200 OK
Content-Type: text/event-stream
Cache-Control: no-cache, no-transform
Connection: keep-alive
X-Accel-Buffering: no
```

#### Keep-Alive Heartbeat

The server emits a comment heartbeat every 15 seconds to prevent NAT timeouts and intermediary proxy disconnections:

```text
:keep-alive 1730462400000

```

### SSE Event Schemas

Each progress update message contains a complete `DownloadProgress` JSON payload:

```text
id: 1730462415000
event: message
data: {"taskId":"task_1730462410942_a9f1b","status":"downloading","progressPercentage":54.2,"downloadedBytes":69376000,"totalBytes":128000000,"speedBytesPerSecond":4820000,"etaSeconds":12,"fileName":"RickAstley.mp4","timestamp":1730462415000}

```

#### Payload Fields

| Property | Type | Description |
|:---------|:-----|:------------|
| `taskId` | `string` | Unique task identifier |
| `status` | `DownloadStatus` | Current queue / processing state |
| `progressPercentage` | `number` | Float between `0.0` and `100.0` |
| `downloadedBytes` | `number` | Bytes written to disk so far |
| `totalBytes` | `number` | Content length from headers or stream probe |
| `speedBytesPerSecond`| `number` | Rolling window throughput speed in bytes/sec |
| `etaSeconds` | `number` | Estimated remaining duration in seconds |
| `fileName` | `string` | Final output filename |
| `downloadUrl` | `string` | Relative URL to fetch finished file upon completion |
| `error` | `string?` | Present only when `status === 'error'` |
| `timestamp` | `number` | Epoch millisecond timestamp of notification |

---

## Client Integration Examples

### JavaScript / TypeScript Browser Client

```typescript
const eventSource = new EventSource('http://localhost:4000/api/events');

eventSource.onmessage = (event) => {
  const progress: DownloadProgress = JSON.parse(event.data);
  console.log(`Task ${progress.taskId}: ${progress.progressPercentage}% at ${progress.speedBytesPerSecond / (1024 * 1024)} MB/s`);

  if (progress.status === 'completed') {
    console.log(`Download complete! Get file at: ${progress.downloadUrl}`);
  }
};

eventSource.onerror = (err) => {
  console.error('SSE connection lost, reconnecting...', err);
};
```

### Python Client

```python
import requests
import json

# 1. Inspect URL
info = requests.post("http://localhost:4000/api/info", json={
    "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
}).json()
print("Title:", info["title"])

# 2. Start 1080p Download
download = requests.post("http://localhost:4000/api/download", json={
    "url": info["url"],
    "formatId": "1080p"
}).json()
task_id = download["taskId"]
print("Queued Task ID:", task_id)
```
