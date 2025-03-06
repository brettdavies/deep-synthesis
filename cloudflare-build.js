// cloudflare-build.js
// This script runs after the Vite build to prepare the output for Cloudflare Pages
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST_DIR = path.join(__dirname, 'dist');

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function createCloudflareConfig() {
  console.log("⚙️ Creating Cloudflare configuration files...");
  
  // Create _redirects file for SPA routing
  const redirectsContent = [
    "# Serve static assets directly",
    "/main.js /main.js 200",
    "/assets/* /assets/:splat 200",
    "/*.js /main.js 200",  // Fallback for main.js
    "/*.css /assets/main.css 200",  // Fallback for main.css
    "/*.svg /assets/:splat 200",  // Serve SVGs from assets
    
    "# For all other routes, serve the index.html file for SPA",
    "/*    /index.html   200"
  ].join('\n');
  
  await fs.writeFile(path.join(DIST_DIR, "_redirects"), redirectsContent);

  // Create _headers file for MIME types and security headers
  const headersContent = [
    "# JavaScript files",
    "/*.js",
    "  Content-Type: application/javascript",
    "",
    "# CSS files",
    "/*.css",
    "  Content-Type: text/css",
    "",
    "# SVG files",
    "/*.svg",
    "  Content-Type: image/svg+xml",
    "",
    "# PNG files",
    "/*.png",
    "  Content-Type: image/png",
    "",
    "# JPEG files",
    "/*.jpg",
    "/*.jpeg",
    "  Content-Type: image/jpeg",
    "",
    "# GIF files",
    "/*.gif",
    "  Content-Type: image/gif",
    "",
    "# JSON files",
    "/*.json",
    "  Content-Type: application/json",
    "",
    "# Default security headers for all routes",
    "/*",
    "  X-Content-Type-Options: nosniff",
    "  X-Frame-Options: DENY",
    "  Referrer-Policy: strict-origin-when-cross-origin"
  ].join('\n');
  
  await fs.writeFile(path.join(DIST_DIR, "_headers"), headersContent);
}

async function processStylesheets() {
  console.log("🎨 Processing CSS files...");
  
  // Check if we have a specific global CSS file to manually manage
  const globalCssFile = path.join(__dirname, 'styles', 'globals.css');
  if (await fileExists(globalCssFile)) {
    // Read the global CSS content
    let globalCssContent = await fs.readFile(globalCssFile, 'utf8');
    
    // Copy it directly to dist directory as styles.css
    await fs.writeFile(path.join(DIST_DIR, 'styles.css'), globalCssContent);
    console.log("✅ Copied global styles to dist/styles.css");
  }
}

async function processSrcFiles() {
  console.log("🔍 Copying logo and other assets...");
  
  // Copy logo.svg if it exists
  const logoPath = path.join(__dirname, 'src', 'logo.svg');
  if (await fileExists(logoPath)) {
    const logoContent = await fs.readFile(logoPath);
    await fs.writeFile(path.join(DIST_DIR, 'logo.svg'), logoContent);
    console.log("✅ Copied logo.svg");
  }
}

async function fixIndexHtml() {
  console.log("🔧 Fixing index.html location...");
  
  // Check if index.html is in the src subdirectory
  const srcIndexPath = path.join(DIST_DIR, 'src', 'index.html');
  if (await fileExists(srcIndexPath)) {
    // Read the index.html content
    const indexContent = await fs.readFile(srcIndexPath, 'utf8');
    
    // Fix paths if needed (remove leading slashes for Cloudflare compatibility)
    const fixedContent = indexContent
      .replace(/src="\/main.js"/g, 'src="main.js"')
      .replace(/href="\/assets\//g, 'href="assets/')
      .replace(/href="\/styles.css"/g, 'href="styles.css"');
    
    // Write to the root of the dist directory
    await fs.writeFile(path.join(DIST_DIR, 'index.html'), fixedContent);
    console.log("✅ Moved index.html to dist root and fixed paths");
  } else {
    console.log("⚠️ index.html not found in src subdirectory");
  }
}

async function createStatusJson() {
  console.log("📊 Creating status.json...");
  
  // Create a status.json file with build information
  const now = new Date();
  const statusContent = {
    status: "online",
    version: "0.1.0",
    environment: "production",
    timestamp: now.toISOString(),
    build_date: now.toISOString(),
    dependencies: {
      react: "18.2.0",
      vite: "6.2.0"
    }
  };
  
  await fs.writeFile(
    path.join(DIST_DIR, 'status.json'), 
    JSON.stringify(statusContent, null, 2)
  );
  console.log("✅ Created status.json");
}

async function main() {
  console.log("\n🚀 Starting Cloudflare Pages post-processing...\n");
  
  try {
    // Make sure the dist directory exists
    if (!(await fileExists(DIST_DIR))) {
      console.error("❌ Dist directory not found! Please run the Vite build first.");
      process.exit(1);
    }
    
    // Create Cloudflare configuration files
    await createCloudflareConfig();
    
    // Process stylesheets
    await processStylesheets();
    
    // Process src files and assets
    await processSrcFiles();
    
    // Fix index.html location
    await fixIndexHtml();
    
    // Create status.json
    await createStatusJson();
    
    console.log("\n✅ Cloudflare Pages post-processing complete!");
  } catch (error) {
    console.error("❌ Error during post-processing:", error);
    process.exit(1);
  }
}

main();