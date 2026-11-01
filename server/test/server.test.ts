import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';
import axios from 'axios';
import { ffmpegService } from '../src/services/ffmpegService';
import { mediaExtractor } from '../src/services/mediaExtractor';
import { imageBatchArchiver } from '../src/services/imageBatchArchiver';
import { downloadManager } from '../src/services/downloadManager';
import app from '../src/index';

async function runTestSuite() {
  console.log('🧪 Starting Ultimate Downloader Backend Test Suite...\n');
  const tempDir = path.resolve(__dirname, 'temp_test_workspace');
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

  const testVideoPath = path.join(tempDir, 'sample_source.mp4');
  const trimmedPath = path.join(tempDir, 'trimmed.mp4');
  const extractedMp3 = path.join(tempDir, 'audio.mp3');

  // Test 1: Generate test media using ffmpeg lavfi
  console.log('--- TEST 1: FFmpeg Service Verification & Operations ---');
  const ffmpegStatus = await ffmpegService.isAvailable();
  console.log(`[PASS] FFmpeg available: ${ffmpegStatus.available} (version: ${ffmpegStatus.version || 'unknown'})`);
  if (!ffmpegStatus.available) throw new Error('FFmpeg is required for tests');

  await new Promise<void>((resolve, reject) => {
    const p = spawn('ffmpeg', [
      '-y',
      '-f', 'lavfi', '-i', 'testsrc=duration=3:size=320x240:rate=25',
      '-f', 'lavfi', '-i', 'sine=frequency=440:duration=3',
      '-c:v', 'libx264',
      '-c:a', 'aac',
      testVideoPath
    ]);
    p.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exit: ${code}`))));
  });
  console.log('[PASS] Generated test video at:', testVideoPath);

  const probe = await ffmpegService.probeMedia(testVideoPath);
  console.log(`[PASS] Probed media duration: ${probe?.duration}s, resolution: ${probe?.video?.width}x${probe?.video?.height}`);
  if (!probe || probe.duration < 2) throw new Error('Probe failed');

  await ffmpegService.trimMedia(testVideoPath, trimmedPath, '00:00:01', '00:00:02');
  console.log('[PASS] Trimmed media successfully to:', trimmedPath);

  await ffmpegService.extractAudio(testVideoPath, extractedMp3, 'mp3');
  console.log('[PASS] Extracted MP3 audio successfully to:', extractedMp3);

  // Test 2: Local HTTP server to serve test media and HTML
  console.log('\n--- TEST 2: Local Test Mock Server & Extractors ---');
  const mockServerPort = 5599;
  const mockServer = http.createServer((req, res) => {
    const url = req.url || '';
    if (url === '/sample.mp4') {
      const stat = fs.statSync(testVideoPath);
      res.writeHead(200, {
        'Content-Type': 'video/mp4',
        'Content-Length': stat.size,
      });
      fs.createReadStream(testVideoPath).pipe(res);
    } else if (url === '/gallery.html') {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Mock Gallery Page</title>
          <meta property="og:title" content="Mock Nature Photography">
          <meta property="og:image" content="http://127.0.0.1:${mockServerPort}/photo1.jpg">
          <meta property="og:video" content="http://127.0.0.1:${mockServerPort}/sample.mp4">
        </head>
        <body>
          <h1>Welcome to Test Gallery</h1>
          <img src="/photo1.jpg" alt="Photo 1" width="800" height="600" />
          <img data-src="/photo2.png" alt="Photo 2" />
          <a href="/photo3.webp">Download High-Res Photo 3</a>
        </body>
        </html>
      `);
    } else if (url.startsWith('/photo')) {
      // Return a tiny 1x1 GIF / JPEG buffer
      const dummyJpeg = Buffer.from('/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=', 'base64');
      res.writeHead(200, { 'Content-Type': 'image/jpeg', 'Content-Length': dummyJpeg.length });
      res.end(dummyJpeg);
    } else {
      res.writeHead(404);
      res.end('Not found');
    }
  });

  await new Promise<void>((resolve) => mockServer.listen(mockServerPort, '127.0.0.1', () => resolve()));
  console.log(`[PASS] Mock media server running at http://127.0.0.1:${mockServerPort}`);

  // Test 3: Platform Detection
  console.log('\n--- TEST 3: Platform Detection ---');
  if (mediaExtractor.detectPlatform('https://www.youtube.com/watch?v=123') !== 'youtube') throw new Error('YouTube detection failed');
  if (mediaExtractor.detectPlatform('https://tiktok.com/@user/video/123') !== 'tiktok') throw new Error('TikTok detection failed');
  if (mediaExtractor.detectPlatform('https://x.com/user/status/123') !== 'twitter') throw new Error('Twitter detection failed');
  if (mediaExtractor.detectPlatform('https://instagram.com/p/123') !== 'instagram') throw new Error('Instagram detection failed');
  if (mediaExtractor.detectPlatform('https://reddit.com/r/videos/123') !== 'reddit') throw new Error('Reddit detection failed');
  if (mediaExtractor.detectPlatform('https://example.com/video.mp4') !== 'direct') throw new Error('Direct detection failed');
  if (mediaExtractor.detectPlatform('https://example.com/blog/article') !== 'webpage') throw new Error('Webpage detection failed');
  console.log('[PASS] Platform detection logic verified for all platforms.');

  // Test 4: Direct Media Metadata Extraction
  console.log('\n--- TEST 4: Direct Media Metadata Extraction ---');
  const directInfo = await mediaExtractor.extractInfo(`http://127.0.0.1:${mockServerPort}/sample.mp4`);
  console.log(`[PASS] Extracted title: "${directInfo.title}", platform: ${directInfo.platform}, formats: ${directInfo.formats.length}`);
  if (directInfo.formats.length === 0) throw new Error('No formats found for direct media');

  // Test 5: Image Crawler & Batch Archiver
  console.log('\n--- TEST 5: Image Crawler & Batch Archiver ---');
  const crawled = await imageBatchArchiver.crawlImages(`http://127.0.0.1:${mockServerPort}/gallery.html`);
  console.log(`[PASS] Crawled ${crawled.images.length} images from mock gallery (Expected >= 3).`);
  if (crawled.images.length < 3) throw new Error('Image crawler missed candidates');

  const zipOutPath = path.join(tempDir, 'output_images.zip');
  const zipWriteStream = fs.createWriteStream(zipOutPath);
  const imageUrls = crawled.images.map((img) => img.url);
  await imageBatchArchiver.streamImageZip(imageUrls, zipWriteStream);
  const zipStat = fs.statSync(zipOutPath);
  console.log(`[PASS] Generated streaming ZIP archive, size: ${zipStat.size} bytes`);
  if (zipStat.size <= 0) throw new Error('ZIP archive is empty');

  // Test 6: DownloadManager Task Lifecycle & Direct Stream
  console.log('\n--- TEST 6: DownloadManager Task Execution ---');
  const { taskId, progress } = downloadManager.createDownloadTask({
    url: `http://127.0.0.1:${mockServerPort}/sample.mp4`,
    customFilename: 'download_manager_test',
  });
  console.log(`[PASS] Task created: ${taskId}, initial status: ${progress.status}`);

  await new Promise<void>((resolve, reject) => {
    const poll = setInterval(() => {
      const current = downloadManager.getTask(taskId);
      if (current?.status === 'completed') {
        clearInterval(poll);
        resolve();
      } else if (current?.status === 'error') {
        clearInterval(poll);
        reject(new Error(current.error || 'Task failed'));
      }
    }, 200);
  });

  const completedFile = downloadManager.getCompletedFile(taskId);
  console.log(`[PASS] Task completed successfully! Output file: ${completedFile?.filePath}`);
  if (!completedFile || !fs.existsSync(completedFile.filePath)) throw new Error('Completed file not found');

  // Test 7: Express API Route Endpoints
  console.log('\n--- TEST 7: Express API Server Endpoints ---');
  const apiTestPort = 5598;
  const apiServer = app.listen(apiTestPort, '127.0.0.1');

  try {
    const healthRes = await axios.get(`http://127.0.0.1:${apiTestPort}/api/health`);
    console.log(`[PASS] /api/health returned status: ${healthRes.data.status}, uptime: ${healthRes.data.uptime}s`);
    if (healthRes.data.status !== 'ok') throw new Error('Health check returned non-ok status');

    const infoRes = await axios.post(`http://127.0.0.1:${apiTestPort}/api/info`, {
      url: `http://127.0.0.1:${mockServerPort}/sample.mp4`,
    });
    console.log(`[PASS] /api/info returned media id: ${infoRes.data.id}, title: ${infoRes.data.title}`);

    const tasksRes = await axios.get(`http://127.0.0.1:${apiTestPort}/api/tasks`);
    console.log(`[PASS] /api/tasks returned ${tasksRes.data.length} task(s)`);

    const fileStreamRes = await axios.get(`http://127.0.0.1:${apiTestPort}/api/files/${taskId}`, {
      responseType: 'arraybuffer',
    });
    console.log(`[PASS] /api/files/${taskId} returned ${fileStreamRes.data.length} bytes`);

    const extractRes = await axios.post(`http://127.0.0.1:${apiTestPort}/api/extract-images`, {
      url: `http://127.0.0.1:${mockServerPort}/gallery.html`,
    });
    console.log(`[PASS] /api/extract-images extracted ${extractRes.data.images.length} images`);
  } finally {
    apiServer.close();
    mockServer.close();
    // Cleanup temporary workspace
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {}
  }

  console.log('\n🎉 ALL 7 TEST SUITES PASSED FLAWLESSLY!\n');
  process.exit(0);
}

runTestSuite().catch((err) => {
  console.error('\n❌ Test suite failed:', err);
  process.exit(1);
});
