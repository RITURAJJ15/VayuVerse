import { spawn } from "child_process";
import http from "http";
import WebSocket from "ws";

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 4173;
const CDP_PORT = 9222;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
      res.on("error", reject);
    });
  });
}

class CDPClient {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.id = 1;
    this.callbacks = new Map();
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.ws.on("open", resolve);
      this.ws.on("error", reject);
      this.ws.on("message", (raw) => {
        const msg = JSON.parse(raw);
        if (msg.id && this.callbacks.has(msg.id)) {
          const { resolve, reject } = this.callbacks.get(msg.id);
          this.callbacks.delete(msg.id);
          if (msg.error) reject(msg.error);
          else resolve(msg.result);
        }
      });
    });
  }

  async send(method, params = {}) {
    const id = this.id++;
    return new Promise((resolve, reject) => {
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async eval(expression) {
    const res = await this.send("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (res.exceptionDetails) {
      throw new Error(res.exceptionDetails.text || JSON.stringify(res.exceptionDetails));
    }
    return res.result?.value;
  }

  close() {
    this.ws.close();
  }
}

async function main() {
  console.log("=== VayuVerse HTML5 Video Background Real-Browser Verification ===");

  // 1. Launch Vite preview server
  console.log("Starting preview server on port", PORT);
  const previewProcess = spawn("npx", ["vite", "preview", "--port", String(PORT), "--strictPort"], {
    shell: true,
    stdio: "pipe",
  });

  await wait(2500);

  // 2. Launch headless Chrome with CDP
  console.log("Launching headless Chrome on port", CDP_PORT);
  const chromeProcess = spawn(
    CHROME_PATH,
    [
      "--headless=new",
      `--remote-debugging-port=${CDP_PORT}`,
      "--disable-gpu",
      "--no-first-run",
      "--no-default-browser-check",
      `http://localhost:${PORT}/`,
    ],
    { stdio: "ignore" }
  );

  await wait(3000);

  let cdp;
  try {
    const list = await fetchJson(`http://127.0.0.1:${CDP_PORT}/json/list`);
    const pageTarget = list.find((t) => t.type === "page");
    if (!pageTarget) throw new Error("Could not find Chrome page target");

    cdp = new CDPClient(pageTarget.webSocketDebuggerUrl);
    await cdp.connect();
    console.log("Connected to Chrome via CDP WebSocket!");

    await cdp.send("Page.enable");
    await cdp.send("Runtime.enable");
    await cdp.send("DOM.enable");

    const auditResults = [];

    const testViewport = async (width, height, zoomScale = 1.0) => {
      await cdp.send("Emulation.setDeviceMetricsOverride", {
        width: Math.round(width),
        height: Math.round(height),
        deviceScaleFactor: zoomScale,
        mobile: width < 768,
      });
      await wait(300);
    };

    // --- TEST 1: Video Element & Attributes Inspection ---
    console.log("\n--- Testing Video Background & Attributes ---");
    await testViewport(1280, 800);
    await cdp.send("Page.navigate", { url: `http://localhost:${PORT}/` });
    await wait(2000);

    const videoInspection = await cdp.eval(`
      (() => {
        const video = document.querySelector('video');
        const sources = Array.from(video?.querySelectorAll('source') || []).map(s => s.getAttribute('src'));
        const hasSvgTree = Boolean(document.querySelector('g[class*="sway-master"]'));
        const hasSvgAir = Boolean(document.querySelector('path[class*="air-flow"]'));
        const hasFallingLeaves = Boolean(document.querySelector('div[style*="leaf-fall"]'));
        const soundBtn = document.querySelector('button[aria-label*="nature ambient sound"]');
        const headline = document.querySelector('h1')?.textContent?.replace(/\\s+/g, ' ').trim();
        const hasCard = Boolean(document.body.textContent.includes("Every choice shapes the air you take inside"));
        const hasNavbar = Boolean(document.querySelector('header .rounded-full'));

        return {
          hasVideo: Boolean(video),
          muted: video?.muted,
          loop: video?.loop,
          autoplay: video?.autoplay,
          playsInline: video?.hasAttribute('playsinline'),
          poster: video?.getAttribute('poster'),
          sources,
          hasSvgTree,
          hasSvgAir,
          hasFallingLeaves,
          hasSoundBtn: Boolean(soundBtn),
          headline,
          hasCard,
          hasNavbar,
        };
      })()
    `);
    console.log("Video background inspection:", videoInspection);

    auditResults.push({
      test: "HTML5 Video element present with autoplay, muted, loop, playsinline",
      pass: videoInspection.hasVideo && videoInspection.muted && videoInspection.loop && videoInspection.autoplay && videoInspection.playsInline,
    });
    auditResults.push({
      test: "Static poster fallback configured (/images/botanical-hero-clean.jpg)",
      pass: Boolean(videoInspection.poster?.includes("botanical-hero-clean.jpg")),
    });
    auditResults.push({
      test: "Video sources configured for landing video.mp4",
      pass: videoInspection.sources.some(s => s.includes("landing") && s.includes(".mp4")),
    });
    auditResults.push({
      test: "Artificial SVG branches, oversized leaves, and particles removed",
      pass: !videoInspection.hasSvgTree && !videoInspection.hasSvgAir && !videoInspection.hasFallingLeaves,
    });
    auditResults.push({
      test: "Floating navigation, headline, and atmospheric card preserved above video",
      pass: videoInspection.hasNavbar && videoInspection.headline?.includes("Breathe better") && videoInspection.hasCard,
    });
    auditResults.push({
      test: "Nature ambient sound system preserved separately",
      pass: videoInspection.hasSoundBtn,
    });

    // --- TEST 2: Responsive Viewports (320px, 375px, 768px, 1280px, 1440px) ---
    console.log("\n--- Testing Responsive Viewports & Zero Horizontal Overflow ---");
    for (const vp of [
      { w: 320, h: 568, name: "320px (Mobile Small)" },
      { w: 375, h: 667, name: "375px (iPhone)" },
      { w: 768, h: 1024, name: "768px (Tablet)" },
      { w: 1280, h: 800, name: "1280px (Desktop)" },
      { w: 1440, h: 900, name: "1440px (Wide Desktop)" },
    ]) {
      await testViewport(vp.w, vp.h);
      await wait(300);

      const overflowCheck = await cdp.eval(`
        (() => {
          const scrollW = document.documentElement.scrollWidth;
          const innerW = window.innerWidth;
          return {
            scrollW,
            innerW,
            hasHorizontalScrollbar: scrollW > innerW + 1,
          };
        })()
      `);
      console.log(`Viewport @ ${vp.name}: scrollW=${overflowCheck.scrollW}px, innerW=${overflowCheck.innerW}px, noOverflow=${!overflowCheck.hasHorizontalScrollbar}`);
      auditResults.push({
        test: `Responsive Layout @ ${vp.name}`,
        pass: !overflowCheck.hasHorizontalScrollbar,
      });
    }

    console.log("\n=== REAL BROWSER VIDEO AUDIT SUMMARY ===");
    console.table(auditResults);

    const allPassed = auditResults.every((r) => r.pass);
    if (!allPassed) {
      console.error("Some real browser video checks failed!");
      process.exitCode = 1;
    } else {
      console.log("ALL REAL BROWSER VIDEO AUDIT CHECKS PASSED!");
    }
  } finally {
    if (cdp) cdp.close();
    chromeProcess.kill();
    previewProcess.kill();
  }
}

main().catch((err) => {
  console.error("Browser video audit failed with error:", err);
  process.exit(1);
});
