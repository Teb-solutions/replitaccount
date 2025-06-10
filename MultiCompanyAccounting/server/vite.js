import express from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer, createLogger } from "vite";
// Remove vite.config import for production deployment
import { nanoid } from "nanoid";

const viteLogger = createLogger();

export function log(message, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true,
  };

  const vite = await createViteServer({
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html",
      );

      let template = fs.readFileSync(clientTemplate, "utf-8");
      template = await vite.transformIndexHtml(url, template);

      res.status(200).set({ "Content-Type": "text/html" }).end(template);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}

export async function serveStatic(app) {
  const compressionSupported = await checkCompressionSupport();
  
  if (compressionSupported) {
    const compression = await import("compression");
    app.use(compression.default());
  }

  const clientDist = path.resolve(import.meta.dirname, "..", "dist", "client");
  
  if (!fs.existsSync(clientDist)) {
    throw new Error(
      `Could not find the production client build at ${clientDist}. Please run 'npm run build' first.`
    );
  }

  app.use(express.static(clientDist, { maxAge: "1d" }));

  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api/")) {
      return next();
    }

    const indexPath = path.join(clientDist, "index.html");
    
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(404).send("Page not found");
    }
  });
}

async function checkCompressionSupport() {
  try {
    await import("compression");
    return true;
  } catch {
    return false;
  }
}