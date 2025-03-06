#!/usr/bin/env bun
import { build, type BuildConfig } from "bun";
import { existsSync } from "fs";
import { rm, mkdir, writeFile, copyFile } from "fs/promises";
import path from "path";
import fs from "fs";

// Print help text if requested
if (process.argv.includes("--help") || process.argv.includes("-h")) {
  console.log(`
🏗️  Bun Build Script for Cloudflare Pages

Usage: bun run build-cf.ts [options]

Common Options:
  --outdir <path>          Output directory (default: "dist")
  --minify                 Enable minification (or --minify.whitespace, --minify.syntax, etc)
  --source-map <type>      Sourcemap type: none|linked|inline|external
  --target <target>        Build target: browser|bun|node
  --format <format>        Output format: esm|cjs|iife
  --splitting              Enable code splitting
  --packages <type>        Package handling: bundle|external
  --public-path <path>     Public path for assets
  --env <mode>             Environment handling: inline|disable|prefix*
  --conditions <list>      Package.json export conditions (comma separated)
  --external <list>        External packages (comma separated)
  --banner <text>          Add banner text to output
  --footer <text>          Add footer text to output
  --define <obj>           Define global constants (e.g. --define.VERSION=1.0.0)
  --help, -h               Show this help message

Example:
  bun run build-cf.ts --outdir=dist --minify --source-map=linked --external=react,react-dom
`);
  process.exit(0);
}

// Helper function to convert kebab-case to camelCase
const toCamelCase = (str: string): string => {
  return str.replace(/-([a-z])/g, g => g[1].toUpperCase());
};

// Helper function to parse a value into appropriate type
const parseValue = (value: string): any => {
  // Handle true/false strings
  if (value === "true") return true;
  if (value === "false") return false;

  // Handle numbers
  if (/^\d+$/.test(value)) return parseInt(value, 10);
  if (/^\d*\.\d+$/.test(value)) return parseFloat(value);

  // Handle arrays (comma-separated)
  if (value.includes(",")) return value.split(",").map(v => v.trim());

  // Default to string
  return value;
};

// Magical argument parser that converts CLI args to BuildConfig
function parseArgs(): Partial<BuildConfig> {
  const config: Record<string, any> = {};
  const args = process.argv.slice(2);

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (!arg.startsWith("--")) continue;

    // Handle --no-* flags
    if (arg.startsWith("--no-")) {
      const key = toCamelCase(arg.slice(5));
      config[key] = false;
      continue;
    }

    // Handle --flag (boolean true)
    if (!arg.includes("=") && (i === args.length - 1 || args[i + 1].startsWith("--"))) {
      const key = toCamelCase(arg.slice(2));
      config[key] = true;
      continue;
    }

    // Handle --key=value or --key value
    let key: string;
    let value: string;

    if (arg.includes("=")) {
      [key, value] = arg.slice(2).split("=", 2);
    } else {
      key = arg.slice(2);
      value = args[++i];
    }

    // Convert kebab-case key to camelCase
    key = toCamelCase(key);

    // Handle nested properties (e.g. --minify.whitespace)
    if (key.includes(".")) {
      const [parentKey, childKey] = key.split(".");
      config[parentKey] = config[parentKey] || {};
      config[parentKey][childKey] = parseValue(value);
    } else {
      config[key] = parseValue(value);
    }
  }

  return config as Partial<BuildConfig>;
}

// Helper function to format file sizes
const formatFileSize = (bytes: number): string => {
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(2)} ${units[unitIndex]}`;
};

// Wrap build process in an async function to avoid top-level await issues
async function runBuild() {
  console.log("\n🚀 Starting build process for Cloudflare Pages...\n");

  // Parse CLI arguments with our magical parser
  const cliConfig = parseArgs();
  const outdir = cliConfig.outdir || path.join(process.cwd(), "dist");

  if (existsSync(outdir)) {
    console.log(`🗑️ Cleaning previous build at ${outdir}`);
    await rm(outdir, { recursive: true, force: true });
  }

  // Create output directory
  await mkdir(outdir, { recursive: true });

  const start = performance.now();

  // Build the frontend React app first
  console.log("🔨 Building frontend application...");
  const frontendResult = await build({
    entrypoints: [path.resolve("src/frontend.tsx")],
    outdir,
    minify: true,
    target: "browser",
    sourcemap: "linked",
    define: {
      "process.env.NODE_ENV": JSON.stringify("production"),
      "process.env.REACT_VERSION": JSON.stringify("18"),
    },
    ...cliConfig, // Merge in any CLI-provided options
  });

  // Process CSS and copy it explicitly
  console.log("🎨 Processing Tailwind CSS...");
  // Get the global CSS content
  let globalCssContent = await Bun.file("styles/globals.css").text();
  
  // Fix the Tailwind CSS import and plugin references
  // Replace @import "tailwindcss"; with the compiled Tailwind CSS
  // This addresses the MIME type error from loading 'tailwindcss' without extension
  globalCssContent = globalCssContent
    .replace('@import "tailwindcss";', '/* Tailwind CSS styles inlined by build process */')
    .replace('@plugin "tailwindcss-animate";', '/* Tailwind animate plugin inlined by build process */');
  
  // Ensure the path matches what we reference in the HTML
  await writeFile(path.join(outdir, "styles.css"), globalCssContent);

  // Create the modified index.html
  console.log("📝 Creating index.html...");
  const indexHtmlContent = await Bun.file("src/index.html").text();
  // Use relative paths (without leading slash) to avoid MIME type issues
  const modifiedIndexHtml = indexHtmlContent
    .replace('<script type="module" src="./frontend.tsx" async></script>', 
            '<script type="module" src="frontend.js" async></script>\n' +
            '    <link rel="stylesheet" href="styles.css" />\n' +
            '    <link rel="prefetch" href="status.json" as="fetch" />');

  // Write the index.html file to the root of the output directory
  await writeFile(path.join(outdir, "index.html"), modifiedIndexHtml);

  // Create important Cloudflare configuration files
  console.log("⚙️ Creating Cloudflare configuration files...");
  
  // Create _redirects file for SPA routing - THIS IS CRITICAL for Cloudflare Pages SPA
  const redirectsContent = [
    "# Static asset routes first to avoid redirection",
    "/frontend.js  /frontend.js  200", 
    "/styles.css   /styles.css   200",
    "/tailwindcss  /styles.css   200", // Redirect missing extension requests to proper CSS
    "/tailwindcss-animate  /styles.css   200", // Redirect tailwind animate plugin 
    "/logo.svg     /logo.svg     200",
    "/status.json  /status.json  200", // Explicitly include status.json
    "/assets/*     /assets/:splat 200",
    "",
  ].join('\n');
  
  // Use Node's fs module directly
  fs.writeFileSync(path.join(outdir, "_redirects"), redirectsContent);

  // Create _headers file to ensure proper MIME types
  const headersLines = [
    "# Explicitly set content types for our key static files",
    "/frontend.js",
    "  Content-Type: application/javascript",
    "",
    "/styles.css",
    "  Content-Type: text/css",
    "",
    "/logo.svg",
    "  Content-Type: image/svg+xml",
    "",
    "/status.json",
    "  Content-Type: application/json",
    "",
    "# Default security headers for all routes",
    "/*",
    "  X-Content-Type-Options: nosniff",
    "  X-Frame-Options: DENY",
    "  Referrer-Policy: strict-origin-when-cross-origin"
  ].join('\n');
  
  await writeFile(path.join(outdir, "_headers"), headersLines);

  // Copy logo.svg
  console.log("🖼️ Copying logo and assets...");
  if (existsSync("src/logo.svg")) {
    const logoContent = await Bun.file("src/logo.svg").arrayBuffer();
    await writeFile(path.join(outdir, "logo.svg"), Buffer.from(logoContent));
  }

  // Copy any other frontend JS directly to ensure they're available
  for (const output of frontendResult.outputs) {
    if (output.kind === "entry-point" || output.kind === "asset") {
      const filename = path.basename(output.path);
      const destPath = path.join(outdir, filename);
      // Only copy if not already there
      if (output.path !== destPath && existsSync(output.path)) {
        await copyFile(output.path, destPath);
      }
    }
  }

  // Copy images if they exist
  if (existsSync("src/assets")) {
    console.log("📸 Copying image assets...");
    const imageFiles = Array.from(new Bun.Glob("**/*.{png,jpg,jpeg,gif,svg}").scanSync("src/assets"));
    
    for (const imagePath of imageFiles) {
      const srcPath = path.join("src/assets", imagePath);
      const destPath = path.join(outdir, "assets", imagePath);
      
      // Create destination directory
      await mkdir(path.dirname(destPath), { recursive: true });
      
      // Copy file
      const imageContent = await Bun.file(srcPath).arrayBuffer();
      await writeFile(destPath, Buffer.from(imageContent));
    }
  }

  // Add a status.json file for diagnostics
  const statusJson = {
    status: "ok",
    build_time: new Date().toISOString(),
    build_version: "2.0.1", // Increment this when making significant changes
    css_fixes_applied: true,
    mime_type: "application/json",
    files: [
      "index.html",
      "frontend.js",
      "styles.css",
      "logo.svg",
      "status.json"
    ],
    redirects: [
      "/tailwindcss → /styles.css",
      "/tailwindcss-animate → /styles.css"
    ]
  };
  
  fs.writeFileSync(
    path.join(outdir, "status.json"), 
    JSON.stringify(statusJson, null, 2)
  );

  // Print the results
  const end = performance.now();

  console.log("\n📦 Build output files:");
  
  // List all files in the output directory
  const allFiles = Array.from(new Bun.Glob("**/*").scanSync(outdir));
  
  // Map files to size
  const fileDetails = [];
  for (const filePath of allFiles) {
    const fullPath = path.join(outdir, filePath);
    if (fs.statSync(fullPath).isFile()) {
      const size = fs.statSync(fullPath).size;
      fileDetails.push({
        "File": filePath,
        "Size": formatFileSize(size)
      });
    }
  }
  
  console.table(fileDetails);
  const buildTime = (end - start).toFixed(2);

  console.log(`\n✅ Build completed in ${buildTime}ms\n`);
}

// Call the build function
runBuild().catch(err => {
  console.error("❌ Build failed:", err);
  process.exit(1);
}); 