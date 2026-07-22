import { chromium } from "playwright";

const widths = [320, 375, 390];
const paths = ["/", "/login", "/signup"];

function overflowReport(page) {
  return page.evaluate(() => {
    const docEl = document.documentElement;
    const body = document.body;
    const scrollWidth = Math.max(docEl.scrollWidth, body.scrollWidth);
    const clientWidth = docEl.clientWidth;
    const offenders = [];
    for (const el of document.querySelectorAll("body *")) {
      if (!(el instanceof HTMLElement)) continue;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;
      if (rect.right > clientWidth + 1 || rect.left < -1) {
        const tag = el.tagName.toLowerCase();
        const cls = (el.className && typeof el.className === "string"
          ? el.className.slice(0, 80)
          : "");
        offenders.push({
          tag,
          cls,
          left: Math.round(rect.left),
          right: Math.round(rect.right),
          text: (el.innerText || "").slice(0, 40).replace(/\s+/g, " "),
        });
      }
    }
    return {
      clientWidth,
      scrollWidth,
      overflowPx: scrollWidth - clientWidth,
      offenders: offenders.slice(0, 12),
    };
  });
}

const browser = await chromium.launch({ headless: true });
const results = [];

for (const width of widths) {
  const context = await browser.newContext({
    viewport: { width, height: 844 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  for (const path of paths) {
    const url = `http://localhost:8080${path}`;
    await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
    await page.waitForTimeout(800);
    const report = await overflowReport(page);
    results.push({ width, path, ...report });
  }
  await context.close();
}

await browser.close();

let failed = false;
for (const r of results) {
  const ok = r.overflowPx <= 1;
  if (!ok) failed = true;
  console.log(
    `${ok ? "OK" : "FAIL"} ${r.width}px ${r.path} scrollOverflow=${r.overflowPx}px offenders=${r.offenders.length}`,
  );
  if (!ok) {
    for (const o of r.offenders.slice(0, 5)) {
      console.log(`  - <${o.tag}.${o.cls}> left=${o.left} right=${o.right} "${o.text}"`);
    }
  }
}

process.exit(failed ? 1 : 0);
