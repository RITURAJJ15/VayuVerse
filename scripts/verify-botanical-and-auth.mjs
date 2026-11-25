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

  async click(selector) {
    await this.eval(`
      (() => {
        const el = document.querySelector(${JSON.stringify(selector)});
        if (!el) throw new Error("Element not found: " + ${JSON.stringify(selector)});
        el.click();
      })()
    `);
  }

  async pressKey(key, code, windowsVirtualKeyCode) {
    await this.send("Input.dispatchKeyEvent", {
      type: "keyDown",
      key,
      code,
      windowsVirtualKeyCode,
    });
    await this.send("Input.dispatchKeyEvent", {
      type: "keyUp",
      key,
      code,
      windowsVirtualKeyCode,
    });
  }

  close() {
    this.ws.close();
  }
}

async function main() {
  console.log("=== VayuVerse Botanical Landing & Auth Gate Real-Browser Audit ===");

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

    // --- TEST 1: Botanical Calm Landing Page Content & Typography ---
    console.log("\n--- Testing Botanical Landing Page on Desktop (1280px) ---");
    await testViewport(1280, 800, 1.0);
    await cdp.send("Page.navigate", { url: `http://localhost:${PORT}/` });
    await wait(2000);

    const landingContent = await cdp.eval(`
      (() => {
        return {
          h1: document.querySelector('h1')?.textContent?.trim().replace(/\\s+/g, ' '),
          hasSubhead: Boolean(document.querySelector('p')?.textContent?.includes("Understand the air around you")),
          hasWhySection: Boolean(document.getElementById('why-vayuverse')),
          hasFeaturesSection: Boolean(document.getElementById('features')),
          hasHowSection: Boolean(document.getElementById('how-it-works')),
          hasScienceSection: Boolean(document.getElementById('environmental-science')),
          hasFinalCta: Boolean(document.body.textContent.includes("Make room for better air.")),
          footerLinksCount: document.querySelectorAll('footer a, footer button').length,
          hasGetStarted: Boolean(Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes("Get Started"))),
        };
      })()
    `);
    console.log("Landing page inspection:", landingContent);
    auditResults.push({
      test: "Landing Page Botanical Content",
      pass: landingContent.h1?.includes("Breathe better") && landingContent.hasSubhead && landingContent.hasWhySection && landingContent.hasFinalCta,
    });

    // --- TEST 2: Responsive Viewport Checks (320px, 375px, 768px, 1280px, 1440px) ---
    console.log("\n--- Testing Viewport Responsiveness & Horizontal Overflow ---");
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
            hasHorizontalScrollbar: scrollW > innerW + 1, // allow 1px subpixel tolerance
          };
        })()
      `);
      console.log(`Viewport @ ${vp.name}: scrollW=${overflowCheck.scrollW}px, innerW=${overflowCheck.innerW}px, noOverflow=${!overflowCheck.hasHorizontalScrollbar}`);
      auditResults.push({
        test: `Responsive Layout @ ${vp.name}`,
        pass: !overflowCheck.hasHorizontalScrollbar,
      });
    }

    // --- TEST 3: Auth Modal Interaction on Landing Page ---
    console.log("\n--- Testing 'Get Started' Auth Modal Trigger ---");
    await testViewport(1280, 800);
    await cdp.eval(`
      (() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.trim() === "Get Started");
        if (btn) btn.click();
      })()
    `);
    await wait(600);

    const authModalState = await cdp.eval(`
      (() => {
        const dialog = document.querySelector('[role="dialog"]');
        return {
          isOpen: Boolean(dialog),
          title: dialog ? document.getElementById(dialog.getAttribute('aria-labelledby'))?.textContent : null,
          hasGoogleBtn: Boolean(dialog && dialog.textContent.includes("Continue with Google")),
        };
      })()
    `);
    console.log("Auth Modal State:", authModalState);
    auditResults.push({
      test: "Get Started triggers Google Auth Dialog",
      pass: authModalState.isOpen && authModalState.hasGoogleBtn,
    });

    // Close Auth Modal
    await cdp.pressKey("Escape", "Escape", 27);
    await wait(400);

    // --- TEST 4: Protected Route Access Gate ---
    console.log("\n--- Testing Protected Route Gate (/dashboard) for Unauthenticated Visitor ---");
    await cdp.send("Page.navigate", { url: `http://localhost:${PORT}/dashboard` });
    await wait(2000);

    const protectedGateCheck = await cdp.eval(`
      (() => {
        const url = window.location.pathname;
        const dialog = document.querySelector('[role="dialog"]');
        return {
          pathname: url,
          isBlockedFromDashboard: url === "/" || url === "",
          authModalAutoOpened: Boolean(dialog),
        };
      })()
    `);
    console.log("Protected Route Check (/dashboard):", protectedGateCheck);
    auditResults.push({
      test: "Unauthenticated /dashboard access blocked & redirected to auth",
      pass: protectedGateCheck.isBlockedFromDashboard && protectedGateCheck.authModalAutoOpened,
    });

    // Close modal
    await cdp.pressKey("Escape", "Escape", 27);
    await wait(400);

    // --- TEST 5: Unauthenticated /onboarding access blocked ---
    console.log("\n--- Testing Unauthenticated Access to /onboarding ---");
    await cdp.send("Page.navigate", { url: `http://localhost:${PORT}/onboarding` });
    await wait(1500);

    const onboardingBlockedCheck = await cdp.eval(`
      (() => {
        const url = window.location.pathname;
        return {
          pathname: url,
          isBlockedFromOnboarding: url === "/" || url === "",
        };
      })()
    `);
    console.log("Unauthenticated /onboarding check:", onboardingBlockedCheck);
    auditResults.push({
      test: "Unauthenticated /onboarding access blocked",
      pass: onboardingBlockedCheck.isBlockedFromOnboarding,
    });

    console.log("\n=== REAL BROWSER AUDIT SUMMARY ===");
    console.table(auditResults);

    const allPassed = auditResults.every((r) => r.pass);
    if (!allPassed) {
      console.error("Some real browser checks failed!");
      process.exitCode = 1;
    } else {
      console.log("ALL REAL BROWSER AUDIT CHECKS PASSED!");
    }
  } finally {
    if (cdp) cdp.close();
    chromeProcess.kill();
    previewProcess.kill();
  }
}

main().catch((err) => {
  console.error("Browser audit failed with error:", err);
  process.exit(1);
});
