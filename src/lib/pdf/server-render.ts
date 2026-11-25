import { existsSync } from "node:fs";
import type { Browser } from "puppeteer-core";
import type { BuiltPdf } from "@/lib/pdf/exportDocumentPdf";
import { createPdfRenderToken } from "@/lib/pdf/print-token";

export type ServerRenderedPdf = Pick<BuiltPdf, "fileName" | "base64" | "previewBase64">;

const NAVIGATION_TIMEOUT_MS = 60_000;
const RENDER_TIMEOUT_MS = 90_000;

function resolveAppUrl(explicit?: string): string {
  const candidates = [
    explicit,
    process.env.APP_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "",
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "",
  ];
  for (const candidate of candidates) {
    const value = candidate?.trim();
    if (value) return value.replace(/\/+$/, "");
  }
  throw new Error("APP_URL manquant : impossible de joindre la page d’impression PDF.");
}

function isServerless(): boolean {
  return Boolean(
    process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.AWS_EXECUTION_ENV,
  );
}

function resolveLocalChrome(): string {
  const explicit = process.env.CHROME_PATH?.trim();
  if (explicit && existsSync(explicit)) return explicit;

  const candidates = [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }
  throw new Error("Chrome introuvable pour le rendu PDF local : définissez CHROME_PATH.");
}

async function launchBrowser(): Promise<Browser> {
  const puppeteer = (await import("puppeteer-core")).default;

  if (isServerless()) {
    const chromium = (await import("@sparticuz/chromium")).default;
    return puppeteer.launch({
      args: chromium.args,
      defaultViewport: { width: 1280, height: 1600, deviceScaleFactor: 1 },
      executablePath: await chromium.executablePath(),
      headless: true,
    });
  }

  return puppeteer.launch({
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-background-timer-throttling",
      "--disable-renderer-backgrounding",
      "--font-render-hinting=none",
    ],
    defaultViewport: { width: 1280, height: 1600, deviceScaleFactor: 1 },
    executablePath: resolveLocalChrome(),
    headless: true,
  });
}

function printUrl(appUrl: string, documentId: string): string {
  const token = createPdfRenderToken(documentId);
  const params = new URLSearchParams({ token });
  return `${appUrl}/print/document/${encodeURIComponent(documentId)}?${params.toString()}`;
}

export type DocumentPdfRenderer = {
  render(documentId: string): Promise<ServerRenderedPdf>;
  close(): Promise<void>;
};

/**
 * Ouvre un Chromium (local ou serverless) réutilisé pour plusieurs documents :
 * le cron d’abonnements peut ainsi joindre les PDF sans repayer le démarrage.
 */
export async function createDocumentPdfRenderer(options?: {
  appUrl?: string;
}): Promise<DocumentPdfRenderer> {
  const browser = await launchBrowser();
  const appUrl = resolveAppUrl(options?.appUrl);

  return {
    async render(documentId) {
      const page = await browser.newPage();
      try {
        page.setDefaultTimeout(RENDER_TIMEOUT_MS);
        await page.goto(printUrl(appUrl, documentId), {
          waitUntil: "domcontentloaded",
          timeout: NAVIGATION_TIMEOUT_MS,
        });
        await page.waitForFunction(
          () => Boolean(window.__DOC_PDF_RESULT__ || window.__DOC_PDF_ERROR__),
          { timeout: RENDER_TIMEOUT_MS },
        );
        const output = await page.evaluate(() => ({
          result: window.__DOC_PDF_RESULT__ ?? null,
          error: window.__DOC_PDF_ERROR__ ?? null,
        }));
        if (!output.result) {
          throw new Error(output.error || "Rendu PDF vide");
        }
        return output.result as ServerRenderedPdf;
      } finally {
        await page.close().catch(() => undefined);
      }
    },
    async close() {
      await browser.close().catch(() => undefined);
    },
  };
}

/** Rendu d’un seul document (script de rattrapage, renvoi ponctuel). */
export async function renderDocumentPdfOnServer(
  documentId: string,
  options?: { appUrl?: string },
): Promise<ServerRenderedPdf> {
  const renderer = await createDocumentPdfRenderer(options);
  try {
    return await renderer.render(documentId);
  } finally {
    await renderer.close();
  }
}
