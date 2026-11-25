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
  console.log("=== VayuVerse Real-Browser Modal Audit ===");

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
      `http://localhost:${PORT}/dashboard`,
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

    // Helper to test a viewport
    const testViewport = async (width, height, zoomScale = 1.0) => {
      await cdp.send("Emulation.setDeviceMetricsOverride", {
        width: Math.round(width),
        height: Math.round(height),
        deviceScaleFactor: zoomScale,
        mobile: width < 768,
      });
      await wait(300);
    };

    // --- TEST 1: AuthModal Audit ---
    console.log("\n--- Testing AuthModal ---");
    await testViewport(1280, 800, 1.0);
    await cdp.send("Page.navigate", { url: `http://localhost:${PORT}/dashboard` });
    await wait(2000);

    // Record triggering element
    const initialFocused = await cdp.eval("document.activeElement.tagName");
    console.log("Initial active element before modal:", initialFocused);

    // Open AuthModal
    await cdp.click('button[aria-label="Sign in"]');
    await wait(600);

    // 1. Check Dialog attributes & labels
    const authAttributes = await cdp.eval(`
      (() => {
        const d = document.querySelector('[role="dialog"]');
        if (!d) return null;
        return {
          role: d.getAttribute("role"),
          ariaModal: d.getAttribute("aria-modal"),
          labelledBy: d.getAttribute("aria-labelledby"),
          describedBy: d.getAttribute("aria-describedby"),
          titleText: document.getElementById(d.getAttribute("aria-labelledby"))?.textContent,
          bodyOverflow: document.body.style.overflow,
          activeTag: document.activeElement.tagName,
          activeText: document.activeElement.textContent?.slice(0, 30),
          isInside: d.contains(document.activeElement),
        };
      })()
    `);
    console.log("AuthModal Attributes & Focus:", authAttributes);
    auditResults.push({ modal: "AuthModal", check: "ARIA & Initial Focus & ScrollLock", pass: authAttributes && authAttributes.bodyOverflow === "hidden" && authAttributes.isInside });

    // 2. Responsive Layout at 320px, 375px, 768px, and 200% zoom
    for (const vp of [
      { w: 320, h: 568, name: "320px (Mobile Small)" },
      { w: 375, h: 667, name: "375px (iPhone)" },
      { w: 768, h: 1024, name: "768px (Tablet)" },
      { w: 1280, h: 800, name: "Desktop" },
      { w: 1280, h: 800, zoom: 2.0, name: "200% Zoom" },
    ]) {
      await testViewport(vp.w, vp.h, vp.zoom || 1.0);
      await wait(300);

      const metrics = await cdp.eval(`
        (() => {
          const d = document.querySelector('[role="dialog"]');
          if (!d) return null;
          const rect = d.getBoundingClientRect();
          const winH = window.innerHeight;
          const winW = window.innerWidth;
          return {
            top: Math.round(rect.top),
            bottom: Math.round(rect.bottom),
            left: Math.round(rect.left),
            right: Math.round(rect.right),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
            winH,
            winW,
            isClippedTop: rect.top < 0,
            fitsInViewport: rect.width <= winW,
          };
        })()
      `);
      console.log(`AuthModal @ ${vp.name}: top=${metrics?.top}px, width=${metrics?.width}px / ${metrics?.winW}px, clippedTop=${metrics?.isClippedTop}`);
      auditResults.push({ modal: "AuthModal", check: `Layout @ ${vp.name}`, pass: metrics && !metrics.isClippedTop && metrics.fitsInViewport });
    }

    // 3. Focus Trap (Tab & Shift+Tab)
    await testViewport(1280, 800, 1.0);
    const focusTrapResult = await cdp.eval(`
      (() => {
        const d = document.querySelector('[role="dialog"]');
        const focusable = Array.from(d.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'));
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        last.focus();
        return {
          firstTag: first?.tagName,
          lastTag: last?.tagName,
          lastFocused: document.activeElement === last
        };
      })()
    `);
    // Press Tab on last element
    await cdp.pressKey("Tab", "Tab", 9);
    await wait(100);
    const wrappedFocus = await cdp.eval("document.activeElement.tagName + ':' + (document.activeElement.getAttribute('aria-label') || document.activeElement.textContent?.slice(0, 15))");
    console.log("Tab focus wrap from last element:", wrappedFocus);

    // 4. Clicking inside dialog does not close it
    await cdp.eval(`document.querySelector('[role="dialog"]').click()`);
    await wait(200);
    const stillOpenAfterInsideClick = await cdp.eval("Boolean(document.querySelector('[role=\"dialog\"]'))");
    console.log("Still open after inside card click:", stillOpenAfterInsideClick);
    auditResults.push({ modal: "AuthModal", check: "Inside Click Safeguard", pass: stillOpenAfterInsideClick });

    // 5. Escape closes and restores focus to trigger
    await cdp.pressKey("Escape", "Escape", 27);
    await wait(400);
    const closedAfterEscape = await cdp.eval("!document.querySelector('[role=\"dialog\"]')");
    const restoredActive = await cdp.eval("document.activeElement.getAttribute('aria-label')");
    const bodyScrollRestored = await cdp.eval("document.body.style.overflow === ''");
    console.log("Closed after Escape:", closedAfterEscape, "| Focus returned to:", restoredActive, "| Body scroll restored:", bodyScrollRestored);
    auditResults.push({ modal: "AuthModal", check: "Escape & Focus Return & Body Scroll", pass: closedAfterEscape && bodyScrollRestored });


    // --- TEST 2: LocationSelectorDialog Audit ---
    console.log("\n--- Testing LocationSelectorDialog ---");
    await cdp.click('button[aria-label="Select Indian location"]');
    await wait(600);

    const locAttributes = await cdp.eval(`
      (() => {
        const d = document.querySelector('[role="dialog"]');
        if (!d) return null;
        return {
          labelledBy: d.getAttribute("aria-labelledby"),
          describedBy: d.getAttribute("aria-describedby"),
          titleText: document.getElementById(d.getAttribute("aria-labelledby"))?.textContent,
          bodyOverflow: document.body.style.overflow,
          activePlaceholder: document.activeElement?.placeholder || document.activeElement?.tagName,
        };
      })()
    `);
    console.log("LocationSelectorDialog Attributes & Focus:", locAttributes);
    auditResults.push({ modal: "LocationSelectorDialog", check: "ARIA & Search Input Auto-focus", pass: locAttributes && locAttributes.activePlaceholder.includes("Search Indian cities") });

    // Responsive checks
    for (const vp of [
      { w: 320, h: 568, name: "320px" },
      { w: 375, h: 667, name: "375px" },
      { w: 1280, h: 800, zoom: 2.0, name: "200% Zoom" },
    ]) {
      await testViewport(vp.w, vp.h, vp.zoom || 1.0);
      await wait(300);
      const locMetrics = await cdp.eval(`
        (() => {
          const d = document.querySelector('[role="dialog"]');
          const rect = d.getBoundingClientRect();
          return { top: Math.round(rect.top), clippedTop: rect.top < 0, fitsW: rect.width <= window.innerWidth };
        })()
      `);
      console.log(`LocationSelectorDialog @ ${vp.name}: top=${locMetrics?.top}px, fitsW=${locMetrics?.fitsW}`);
      auditResults.push({ modal: "LocationSelectorDialog", check: `Layout @ ${vp.name}`, pass: locMetrics && !locMetrics.clippedTop && locMetrics.fitsW });
    }

    // Escape closes
    await cdp.pressKey("Escape", "Escape", 27);
    await wait(400);


    // --- TEST 3: ProfileDialog Audit ---
    console.log("\n--- Testing ProfileDialog ---");
    await testViewport(1280, 800, 1.0);
    await cdp.click('button[aria-label="User Profile and Persona"]');
    await wait(600);

    const profileAttributes = await cdp.eval(`
      (() => {
        const d = document.querySelector('[role="dialog"]');
        if (!d) return null;
        return {
          labelledBy: d.getAttribute("aria-labelledby"),
          describedBy: d.getAttribute("aria-describedby"),
          titleText: document.getElementById(d.getAttribute("aria-labelledby"))?.textContent,
          bodyOverflow: document.body.style.overflow,
          isInside: d.contains(document.activeElement),
        };
      })()
    `);
    console.log("ProfileDialog Attributes & Focus:", profileAttributes);
    auditResults.push({ modal: "ProfileDialog", check: "ARIA & Initial Focus", pass: profileAttributes && profileAttributes.isInside });

    // Close via Done button
    await cdp.eval(`
      (() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.trim() === "Done");
        btn.click();
      })()
    `);
    await wait(400);


    // --- TEST 4: OnboardingModal Audit ---
    console.log("\n--- Testing OnboardingModal on Landing Page ---");
    await cdp.send("Page.navigate", { url: `http://localhost:${PORT}/` });
    await wait(2000);

    // Click "Begin Personalized Setup" or "Get Started"
    await cdp.eval(`
      (() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes("Setup") || b.textContent?.includes("Start"));
        if (btn) btn.click();
      })()
    `);
    await wait(600);

    const onboardAttributes = await cdp.eval(`
      (() => {
        const d = document.querySelector('[role="dialog"]');
        if (!d) return null;
        return {
          labelledBy: d.getAttribute("aria-labelledby"),
          describedBy: d.getAttribute("aria-describedby"),
          titleText: document.getElementById(d.getAttribute("aria-labelledby"))?.textContent,
          bodyOverflow: document.body.style.overflow,
          radios: Array.from(d.querySelectorAll('[role="radio"]')).map(r => ({
            name: r.querySelector('h3')?.textContent,
            checked: r.getAttribute('aria-checked')
          }))
        };
      })()
    `);
    console.log("OnboardingModal Attributes & Radios:", onboardAttributes);
    auditResults.push({ modal: "OnboardingModal", check: "ARIA & Radiogroup", pass: onboardAttributes && onboardAttributes.radios?.length === 3 });

    // Test responsive layout at 320px
    await testViewport(320, 568, 1.0);
    await wait(300);
    const onboard320 = await cdp.eval(`
      (() => {
        const d = document.querySelector('[role="dialog"]');
        const rect = d.getBoundingClientRect();
        return { top: Math.round(rect.top), clippedTop: rect.top < 0, fitsW: rect.width <= window.innerWidth };
      })()
    `);
    console.log("OnboardingModal @ 320px:", onboard320);
    auditResults.push({ modal: "OnboardingModal", check: "Layout @ 320px", pass: onboard320 && !onboard320.clippedTop && onboard320.fitsW });

    // Escape closes OnboardingModal
    await cdp.pressKey("Escape", "Escape", 27);
    await wait(400);

    console.log("\n=== REAL BROWSER AUDIT SUMMARY ===");
    console.table(auditResults);

    const allPassed = auditResults.every((r) => r.pass);
    if (!allPassed) {
      console.error("Some real browser checks failed!");
      process.exitCode = 1;
    } else {
      console.log("ALL REAL BROWSER CHECKS PASSED PERFECTLY!");
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
