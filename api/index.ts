import express, { type Request, Response, NextFunction } from "express";
import pool from './db.ts';
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.get('/api/test-db', async (req: Request, res: Response) => { // Added Request, Response types for clarity
  try {
    const client = await pool.connect(); // Get a client from the pool
    const result = await client.query('SELECT NOW() as current_time');
    client.release(); // Release the client back to the pool
    console.log(
      `Successfully connected to database: ${pool.options.database} at ${pool.options.host}:${pool.options.port}. Current time: ${result.rows[0].current_time}`
    );
    res.json({ message: 'Database connected!', time: result.rows[0].current_time });
  } catch (err: any) {
    console.error(
      `Error connecting to database: ${pool.options.database} at ${pool.options.host}:${pool.options.port}. Error: ${err.message}`,
      err.stack 
    );
    res.status(500).json({ message: 'Failed to connect to database', error: err.message });
  }
});

app.post('/api/users/:userId/series', async (req: Request, res: Response) => { // Added Request, Response types
  const { userId } = req.params;
  const { tvSeriesName, status } = req.body;

  if (!tvSeriesName || !status) {
    return res.status(400).json({ message: 'TV series name and status are required.' });
  }

  let client;
  try {
    client = await pool.connect();
    const query = `
      INSERT INTO user_tv_series (user_id, tv_series_name, status, created_at)
      VALUES ($1, $2, $3, NOW())
      RETURNING *;
    `;
    const result = await client.query(query, [userId, tvSeriesName, status]);
    client.release();
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    if (client) client.release();
    console.error('Error adding TV series:', err.message);
    res.status(500).json({ message: 'Failed to add TV series', error: err.message });
  }
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "test") {
    // Do nothing for test environment regarding Vite/static serving
  } else if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = process.env.PORT || 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
