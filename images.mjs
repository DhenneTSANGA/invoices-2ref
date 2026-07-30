import sharp from "sharp";
import fs from "fs";
import path from "path";
import { performance } from "perf_hooks";

const inputDir = "./public/auth";
const outputDir = "./public/optimized/auth";
const MAX_WIDTH = 1600;
const WEBP_QUALITY = 80;

const c = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  magenta: "\x1b[35m",
  blue: "\x1b[34m",
  white: "\x1b[37m",
  bgCyan: "\x1b[46m",
  bgGreen: "\x1b[42m",
};

const SPINNER = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
const BAR_WIDTH = 28;

function hideCursor() {
  process.stdout.write("\x1b[?25l");
}
function showCursor() {
  process.stdout.write("\x1b[?25h");
}
function clearLine() {
  process.stdout.write("\r\x1b[2K");
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatMs(ms) {
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(1)} s`;
}

function gradientBar(ratio) {
  const filled = Math.round(ratio * BAR_WIDTH);
  const empty = BAR_WIDTH - filled;
  let bar = "";
  for (let i = 0; i < filled; i++) {
    const t = i / Math.max(BAR_WIDTH - 1, 1);
    if (t < 0.33) bar += `${c.cyan}█`;
    else if (t < 0.66) bar += `${c.blue}█`;
    else bar += `${c.magenta}█`;
  }
  bar += `${c.reset}${c.dim}${"░".repeat(empty)}${c.reset}`;
  return bar;
}

function printBanner(total) {
  const line = "─".repeat(46);
  console.log();
  console.log(`${c.cyan}${c.bold}  ◆  Image Optimizer${c.reset} ${c.dim}· WebP${c.reset}`);
  console.log(`${c.dim}  ${line}${c.reset}`);
  console.log(
    `  ${c.dim}Source${c.reset}  ${inputDir}\n` +
      `  ${c.dim}Sortie${c.reset}  ${outputDir}\n` +
      `  ${c.dim}Règle${c.reset}   max ${MAX_WIDTH}px · qualité ${WEBP_QUALITY}\n` +
      `  ${c.dim}Fichiers${c.reset} ${c.bold}${total}${c.reset}`,
  );
  console.log(`${c.dim}  ${line}${c.reset}`);
  console.log();
}

function renderProgress({
  current,
  total,
  file,
  spinFrame,
  done,
  failed,
  savedBytes,
}) {
  const ratio = total === 0 ? 1 : current / total;
  const pct = Math.round(ratio * 100);
  const remaining = Math.max(total - current, 0);
  const spin = done ? `${c.green}✔` : `${c.cyan}${SPINNER[spinFrame % SPINNER.length]}`;

  clearLine();
  process.stdout.write(
    `  ${spin}${c.reset}  ${gradientBar(ratio)}  ${c.bold}${String(pct).padStart(3)}%${c.reset}` +
      `  ${c.dim}${current}/${total}${c.reset}`,
  );

  if (!done) {
    process.stdout.write(
      `\n  ${c.dim}En cours${c.reset}  ${c.white}${file}${c.reset}` +
        `  ${c.yellow}· ${remaining} restante${remaining > 1 ? "s" : ""}${c.reset}` +
        `  ${c.dim}| ok ${done ? current : Math.max(current - 1, 0)} · err ${failed}${c.reset}`,
    );
    process.stdout.write("\x1b[1A"); // remonte d’une ligne pour la prochaine clear
  } else {
    process.stdout.write("\n");
    process.stdout.write(
      `  ${c.green}Terminé${c.reset}  ${c.dim}${current} optimisée${current > 1 ? "s" : ""}` +
        (failed ? ` · ${c.red}${failed} erreur${failed > 1 ? "s" : ""}${c.reset}` : "") +
        (savedBytes > 0
          ? ` · ${c.cyan}−${formatBytes(savedBytes)}${c.reset} ${c.dim}économisés${c.reset}`
          : "") +
        `${c.reset}`,
    );
  }
}

async function optimizeOne(file) {
  const inputPath = path.join(inputDir, file);
  const outputName = file.replace(/\.(jpe?g|png|heic)$/i, ".webp");
  const outputPath = path.join(outputDir, outputName);

  const inputStat = fs.statSync(inputPath);
  const t0 = performance.now();

  await sharp(inputPath)
    .rotate() // EXIF
    .resize(MAX_WIDTH, undefined, { withoutEnlargement: true, fit: "inside" })
    .webp({ quality: WEBP_QUALITY, effort: 4 })
    .toFile(outputPath);

  const outputStat = fs.statSync(outputPath);
  return {
    file,
    outputName,
    inputBytes: inputStat.size,
    outputBytes: outputStat.size,
    ms: performance.now() - t0,
  };
}

async function main() {
  if (!fs.existsSync(inputDir)) {
    console.error(
      `\n  ${c.red}✖${c.reset} Dossier introuvable : ${c.bold}${inputDir}${c.reset}\n`,
    );
    process.exit(1);
  }

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const files = fs
    .readdirSync(inputDir)
    .filter((file) => /\.(jpe?g|png|heic)$/i.test(file))
    .sort((a, b) => a.localeCompare(b, "fr"));

  printBanner(files.length);

  if (files.length === 0) {
    console.log(`  ${c.yellow}Aucune image à optimiser.${c.reset}\n`);
    return;
  }

  hideCursor();
  const started = performance.now();
  let spinFrame = 0;
  let failed = 0;
  let savedBytes = 0;
  const errors = [];
  const results = [];

  const spinTimer = setInterval(() => {
    spinFrame += 1;
  }, 80);

  process.on("SIGINT", () => {
    clearInterval(spinTimer);
    showCursor();
    console.log(`\n\n  ${c.yellow}Interrompu.${c.reset}\n`);
    process.exit(130);
  });

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    renderProgress({
      current: i,
      total: files.length,
      file,
      spinFrame,
      done: false,
      failed,
      savedBytes,
    });

    try {
      const result = await optimizeOne(file);
      results.push(result);
      savedBytes += Math.max(0, result.inputBytes - result.outputBytes);
    } catch (err) {
      failed += 1;
      errors.push({ file, message: err instanceof Error ? err.message : String(err) });
    }

    renderProgress({
      current: i + 1,
      total: files.length,
      file,
      spinFrame,
      done: false,
      failed,
      savedBytes,
    });
  }

  clearInterval(spinTimer);
  clearLine();
  process.stdout.write("\x1b[1B\r\x1b[2K"); // descend + nettoie la 2e ligne
  process.stdout.write("\x1b[1A");

  renderProgress({
    current: files.length,
    total: files.length,
    file: "",
    spinFrame: 0,
    done: true,
    failed,
    savedBytes,
  });

  showCursor();

  const elapsed = performance.now() - started;
  console.log();
  console.log(`${c.dim}  ── Détail ──────────────────────────────────${c.reset}`);

  for (const r of results) {
    const ratio =
      r.inputBytes > 0
        ? Math.round((1 - r.outputBytes / r.inputBytes) * 100)
        : 0;
    console.log(
      `  ${c.green}→${c.reset} ${r.file} ${c.dim}→${c.reset} ${r.outputName}` +
        `  ${c.dim}${formatBytes(r.inputBytes)} → ${formatBytes(r.outputBytes)}` +
        ` (−${ratio}%) · ${formatMs(r.ms)}${c.reset}`,
    );
  }

  for (const e of errors) {
    console.log(`  ${c.red}✖${c.reset} ${e.file}  ${c.dim}${e.message}${c.reset}`);
  }

  console.log();
  console.log(
    `  ${c.bold}Bilan${c.reset}  ${results.length} ok` +
      (failed ? ` · ${c.red}${failed} échec${failed > 1 ? "s" : ""}${c.reset}` : "") +
      ` · ${formatMs(elapsed)}` +
      (savedBytes > 0 ? ` · ${c.cyan}${formatBytes(savedBytes)}${c.reset} gagnés` : ""),
  );
  console.log();

  if (failed > 0) process.exitCode = 1;
}

main().catch((err) => {
  showCursor();
  console.error(`\n  ${c.red}Erreur fatale :${c.reset}`, err);
  process.exit(1);
});
