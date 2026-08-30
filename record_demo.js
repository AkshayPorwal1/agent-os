const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const FRAMES_DIR = path.join(__dirname, 'frames_temp');

if (!fs.existsSync(FRAMES_DIR)) {
  fs.mkdirSync(FRAMES_DIR, { recursive: true });
}

let frameIndex = 0;

async function captureFrame(page, count = 1, delayMs = 100) {
  for (let i = 0; i < count; i++) {
    const filename = path.join(FRAMES_DIR, `frame_${String(frameIndex).padStart(5, '0')}.png`);
    await page.screenshot({ path: filename, type: 'png' });
    frameIndex++;
    if (delayMs > 0) {
      await new Promise(r => setTimeout(r, delayMs));
    }
  }
}

async function run() {
  console.log('🚀 Launching Google Chrome to record live demo...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,850'],
    defaultViewport: { width: 1280, height: 850 }
  });

  const page = await browser.newPage();
  console.log('🌐 Navigating to http://localhost:4200...');
  await page.goto('http://localhost:4200', { waitUntil: 'networkidle0' });

  // Initial frames (2 seconds)
  console.log('📸 Capturing initial dashboard state...');
  await captureFrame(page, 15, 120);

  // Focus input and type task description character by character
  console.log('⌨️ Typing task description...');
  const inputSelector = 'input[type="text"], input';
  await page.waitForSelector(inputSelector);
  await page.click(inputSelector);

  const taskText = "Draft an incident post-mortem report for a database outage";
  for (const char of taskText) {
    await page.type(inputSelector, char, { delay: 40 });
    if (frameIndex % 3 === 0) {
      await captureFrame(page, 1, 30);
    }
  }

  await captureFrame(page, 10, 100);

  // Submit task
  console.log('🖱️ Clicking Submit button...');
  await page.keyboard.press('Enter');

  // Capture loading / reasoning state (4 seconds)
  console.log('⏳ Capturing reasoning state & HITL clarification...');
  for (let i = 0; i < 25; i++) {
    await captureFrame(page, 1, 150);
  }

  // Wait for clarification card with chips
  const chipSelector = '.chip, button.suggestion-chip, .suggestion-chip, .option-chip, button';
  await page.waitForSelector(chipSelector, { timeout: 15000 }).catch(() => null);

  await captureFrame(page, 15, 100);

  // Find and click the first suggestion chip
  console.log('👆 Selecting suggestion chip for HITL guidance...');
  const chips = await page.$$(chipSelector);
  let clicked = false;
  for (const chip of chips) {
    const text = await page.evaluate(el => el.textContent, chip);
    if (text && !text.includes('Submit') && !text.includes('AgentOS') && text.trim().length > 3) {
      await chip.click();
      clicked = true;
      console.log(`Clicked chip: "${text.trim().substring(0, 40)}..."`);
      break;
    }
  }

  if (!clicked && chips.length > 0) {
    await chips[0].click();
  }

  // Capture execution & SOP generation (8 seconds)
  console.log('🧠 Capturing Gemma 4 validation, SOP generation, and execution...');
  for (let i = 0; i < 40; i++) {
    await captureFrame(page, 1, 200);
  }

  // Smooth scroll down to review results and Memory Vault
  console.log('📜 Scrolling to review execution results and Memory Vault...');
  for (let scroll = 0; scroll <= 400; scroll += 40) {
    await page.evaluate((s) => window.scrollTo({ top: s, behavior: 'smooth' }), scroll);
    await captureFrame(page, 2, 80);
  }

  await captureFrame(page, 20, 100);

  // Scroll back to top
  for (let scroll = 400; scroll >= 0; scroll -= 60) {
    await page.evaluate((s) => window.scrollTo({ top: s, behavior: 'smooth' }), scroll);
    await captureFrame(page, 1, 50);
  }

  await captureFrame(page, 15, 100);

  await browser.close();
  console.log(`✅ Captured ${frameIndex} frames!`);

  // Compile frames to MP4 and GIF using Python imageio
  console.log('🎬 Compiling video to agent-os-demo.mp4 & agent-os-demo.gif...');
  const pyScript = `
import imageio
import os
import glob
from PIL import Image

frames_dir = "${FRAMES_DIR}"
frame_files = sorted(glob.glob(os.path.join(frames_dir, "frame_*.png")))
print(f"Loading {len(frame_files)} frames...")

if frame_files:
    # 1. Generate MP4
    writer = imageio.get_writer("agent-os-demo.mp4", fps=10, quality=8)
    for f in frame_files:
        img = imageio.imread(f)
        writer.append_data(img)
    writer.close()
    print("✨ Saved agent-os-demo.mp4!")

    # 2. Generate animated GIF (downsampled for fast web preview)
    gif_frames = []
    for idx, f in enumerate(frame_files):
        if idx % 2 == 0:  # every 2nd frame for smooth compact GIF
            im = Image.open(f)
            im.thumbnail((800, 530), Image.Resampling.LANCZOS)
            gif_frames.append(im)
    
    if gif_frames:
        gif_frames[0].save(
            "agent-os-demo.gif",
            save_all=True,
            append_images=gif_frames[1:],
            optimize=True,
            duration=120,
            loop=0
        )
        print("✨ Saved agent-os-demo.gif!")
`;
  fs.writeFileSync(path.join(__dirname, 'compile_video.py'), pyScript);
  execSync(`cd "${__dirname}/backend" && source venv/bin/activate && python3 ../compile_video.py`, { stdio: 'inherit' });

  // Cleanup temp frames
  fs.rmSync(FRAMES_DIR, { recursive: true, force: true });
  fs.rmSync(path.join(__dirname, 'compile_video.py'), { force: true });
  console.log('🎉 Recording complete and saved to project directory!');
}

run().catch(err => {
  console.error('Error recording demo:', err);
  process.exit(1);
});
