#!/usr/bin/env node

const path = require('path');
const fs = require('fs');

// Path to compiled services
const distDir = path.resolve(__dirname, '..', 'dist');

if (!fs.existsSync(path.join(distDir, 'index.js'))) {
  console.error('\x1b[31m[Error] Server build not found in dist/. Please run `npm run build` in server first.\x1b[0m');
  process.exit(1);
}

const { mediaExtractor } = require(path.join(distDir, 'services', 'mediaExtractor'));
const { downloadManager } = require(path.join(distDir, 'services', 'downloadManager'));
const { ffmpegService } = require(path.join(distDir, 'services', 'ffmpegService'));
const { imageBatchArchiver } = require(path.join(distDir, 'services', 'imageBatchArchiver'));

// Parse command line arguments
const args = process.argv.slice(2);

function printHelp() {
  console.log(`
\x1b[36m\x1b[1mUltimate Downloader CLI\x1b[0m
Cross-platform Video, Audio, and Image Bulk Downloader

\x1b[1mUSAGE:\x1b[0m
  ultimate-dl <url> [options]

\x1b[1mOPTIONS:\x1b[0m
  -a, --audio              Extract pure audio (MP3 320kbps)
  -f, --format <format>    Specific resolution or format ID (e.g. 1080p, 720p, 480p, audio-mp3-320k)
  -o, --output <path>      Custom output file destination path or filename
  -s, --start <timestamp>  Trim start time (e.g. 00:00:15 or 15)
  -e, --end <timestamp>    Trim end time (e.g. 00:01:30 or 90)
  -i, --images             Extract and package all images from webpage as a ZIP
  -h, --help               Show this help message
  -v, --version            Display current version

\x1b[1mEXAMPLES:\x1b[0m
  ultimate-dl "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
  ultimate-dl "https://www.youtube.com/watch?v=dQw4w9WgXcQ" --audio --output song.mp3
  ultimate-dl "https://twitter.com/user/status/12345" --format 1080p
  ultimate-dl "https://unsplash.com/t/nature" --images --output ./nature-gallery.zip
  ultimate-dl "https://example.com/video.mp4" --start 00:00:10 --end 00:00:30 -o clip.mp4
`);
}

if (args.length === 0 || args.includes('-h') || args.includes('--help')) {
  printHelp();
  process.exit(0);
}

if (args.includes('-v') || args.includes('--version')) {
  console.log('ultimate-dl v1.0.0');
  process.exit(0);
}

// Extract flags
let targetUrl = '';
let audioOnly = false;
let formatId = '';
let outputPath = '';
let trimStart = '';
let trimEnd = '';
let extractImages = false;

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === '-a' || arg === '--audio') {
    audioOnly = true;
  } else if (arg === '-f' || arg === '--format') {
    formatId = args[++i] || '';
  } else if (arg === '-o' || arg === '--output') {
    outputPath = args[++i] || '';
  } else if (arg === '-s' || arg === '--start') {
    trimStart = args[++i] || '';
  } else if (arg === '-e' || arg === '--end') {
    trimEnd = args[++i] || '';
  } else if (arg === '-i' || arg === '--images') {
    extractImages = true;
  } else if (!arg.startsWith('-') && !targetUrl) {
    targetUrl = arg;
  }
}

if (!targetUrl) {
  console.error('\x1b[31m[Error] Please provide a valid media URL.\x1b[0m');
  printHelp();
  process.exit(1);
}

// Render dynamic terminal progress bar
function renderProgressBar(percentage, speedBytes, etaSecs, status) {
  const width = 30;
  const clamped = Math.max(0, Math.min(100, percentage));
  const completed = Math.round((clamped / 100) * width);
  const remaining = width - completed;

  const bar = '\x1b[32m' + '='.repeat(completed) + (completed < width ? '>' : '') + '\x1b[90m' + ' '.repeat(Math.max(0, remaining - 1)) + '\x1b[0m';

  const speedStr = speedBytes > 0 ? `${(speedBytes / (1024 * 1024)).toFixed(2)} MB/s` : '-- MB/s';
  const etaStr = etaSecs > 0 ? `${Math.floor(etaSecs / 60)}m ${etaSecs % 60}s` : '--';

  process.stdout.write(`\r[${bar}] ${clamped.toFixed(1)}% | ${speedStr} | ETA: ${etaStr} | \x1b[33m${status}\x1b[0m   `);
}

async function run() {
  console.log(`\n\x1b[1m\x1b[36m>> Ultimate Downloader\x1b[0m`);
  console.log(`\x1b[90mTarget URL:\x1b[0m \x1b[4m${targetUrl}\x1b[0m`);

  // Detect platform
  const platform = mediaExtractor.detectPlatform(targetUrl);
  console.log(`\x1b[90mDetected Platform:\x1b[0m \x1b[1m${platform.toUpperCase()}\x1b[0m`);

  // Image batch extraction
  if (extractImages) {
    console.log(`\n\x1b[34m[1/2] Crawling images...\x1b[0m`);
    const crawlResult = await imageBatchArchiver.crawlImages(targetUrl);
    console.log(`Found \x1b[32m${crawlResult.images.length}\x1b[0m images on page.`);

    if (crawlResult.images.length === 0) {
      console.log('No images found to download.');
      process.exit(0);
    }

    const defaultZip = path.resolve(process.cwd(), outputPath || `${crawlResult.title.replace(/[^a-zA-Z0-9_\-]/g, '_')}_images.zip`);
    console.log(`\x1b[34m[2/2] Archiving images into:\x1b[0m ${defaultZip}`);

    const writeStream = fs.createWriteStream(defaultZip);
    const imageUrls = crawlResult.images.map(img => img.url);

    await imageBatchArchiver.streamImageZip(imageUrls, writeStream, (processed, total, name) => {
      const pct = Math.round((processed / total) * 100);
      renderProgressBar(pct, 0, 0, `Archiving ${name}`);
    });

    console.log(`\n\n\x1b[32m✔ Successfully saved image archive:\x1b[0m ${defaultZip}\n`);
    process.exit(0);
  }

  // Media Inspection
  console.log(`\n\x1b[34m[1/2] Inspecting media stream...\x1b[0m`);
  let metadata;
  try {
    metadata = await mediaExtractor.extractInfo(targetUrl);
    console.log(`  \x1b[1mTitle:\x1b[0m    ${metadata.title}`);
    if (metadata.durationFormatted) console.log(`  \x1b[1mDuration:\x1b[0m ${metadata.durationFormatted}`);
    if (metadata.author?.name) console.log(`  \x1b[1mAuthor:\x1b[0m   ${metadata.author.name}`);
    console.log(`  \x1b[1mFormats:\x1b[0m  ${metadata.formats.length} stream(s) available`);
  } catch (err) {
    console.error(`\x1b[31m[Failed to inspect media]\x1b[0m ${err.message}`);
    process.exit(1);
  }

  // Create download request
  console.log(`\n\x1b[34m[2/2] Starting download...\x1b[0m`);
  const downloadReq = {
    url: targetUrl,
    formatId: formatId || undefined,
    audioOnly,
    trimStart: trimStart || undefined,
    trimEnd: trimEnd || undefined,
    customFilename: outputPath ? path.basename(outputPath).replace(path.extname(outputPath), '') : undefined,
  };

  const { taskId } = downloadManager.createDownloadTask(downloadReq);

  // Poll progress from downloadManager until completion
  await new Promise((resolve, reject) => {
    const checkInterval = setInterval(() => {
      const task = downloadManager.getTask(taskId);
      if (!task) return;

      renderProgressBar(
        task.progressPercentage,
        task.speedBytesPerSecond,
        task.etaSeconds,
        task.status
      );

      if (task.status === 'completed') {
        clearInterval(checkInterval);
        resolve(task);
      } else if (task.status === 'error') {
        clearInterval(checkInterval);
        reject(new Error(task.error || 'Download failed'));
      } else if (task.status === 'cancelled') {
        clearInterval(checkInterval);
        reject(new Error('Download cancelled'));
      }
    }, 250);
  });

  const completed = downloadManager.getCompletedFile(taskId);
  if (!completed) {
    console.error('\n\x1b[31m[Error] Completed file could not be located.\x1b[0m');
    process.exit(1);
  }

  let finalDestination = completed.filePath;
  if (outputPath) {
    finalDestination = path.resolve(process.cwd(), outputPath);
    // If output path is a directory
    if (fs.existsSync(finalDestination) && fs.statSync(finalDestination).isDirectory()) {
      finalDestination = path.join(finalDestination, completed.fileName);
    }
    fs.copyFileSync(completed.filePath, finalDestination);
  }

  console.log(`\n\n\x1b[32m\x1b[1m✔ Download completed successfully!\x1b[0m`);
  console.log(`\x1b[90mSaved to:\x1b[0m \x1b[1m${finalDestination}\x1b[0m\n`);
  process.exit(0);
}

run().catch((err) => {
  console.error(`\n\x1b[31m[Fatal Error]\x1b[0m ${err.message}`);
  process.exit(1);
});
