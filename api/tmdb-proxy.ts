/**
 * TMDB API Proxy Server
 * 
 * Purpose:
 * This server acts as a proxy for requests to the The Movie Database (TMDB) API.
 * It can be used to:
 * - Bypass regional hosting issues with TMDB (e.g., if direct access from certain
 *   regions to api.themoviedb.org is problematic, this proxy can be hosted in a
 *   region with better access, like the US).
 * - Centralize TMDB API key management: Instead of embedding the API key in multiple
 *   client applications or exposing it, the key is stored securely in this proxy's
 *   environment, and clients make requests to the proxy.
 * 
 * Required Environment Variables:
 * - PROXY_PORT: The port on which this proxy server will listen.
 *   Defaults to 3001 if not specified.
 *   Example: `PROXY_PORT=3001`
 * - PROXY_TMDB_API_KEY: The TMDB API key that this proxy server will use to
 *   authenticate with the actual TMDB API. This key must be obtained from TMDB.
 *   Example: `PROXY_TMDB_API_KEY="your_actual_tmdb_api_key"`
 */
import express, { Request, Response } from 'express';
import axios from 'axios';

const app = express();
const PROXY_PORT = process.env.PROXY_PORT || 3001;
const PROXY_TMDB_API_KEY = process.env.PROXY_TMDB_API_KEY;

app.use(express.json());

app.get('/proxy-tmdb/*', async (req: Request, res: Response) => {
    const capturedPath = req.params[0];
    const originalQuery = req.query;

    if (!PROXY_TMDB_API_KEY) {
        console.error('TMDB API key for proxy is not configured (PROXY_TMDB_API_KEY missing).');
        return res.status(500).json({ message: 'Proxy configuration error.' });
    }

    const targetUrl = `https://api.themoviedb.org/3/${capturedPath}`;

    try {
        console.log(`[TMDB PROXY] Forwarding request to: ${targetUrl} with query:`, originalQuery);
        const response = await axios.get(targetUrl, {
            params: {
                ...originalQuery,
                api_key: PROXY_TMDB_API_KEY,
            },
            headers: {
                'Accept': 'application/json' // TMDB recommends this
            }
        });
        console.log(`[TMDB PROXY] Request to ${targetUrl} succeeded with status ${response.status}`);
        res.status(response.status).json(response.data);
    } catch (error: any) {
        console.error(`[TMDB PROXY] Error forwarding request to ${targetUrl}:`, error.isAxiosError ? error.message : error);
        if (axios.isAxiosError(error) && error.response) {
            res.status(error.response.status).json(error.response.data);
        } else {
            res.status(500).json({ message: 'Error proxying TMDB request to target.' });
        }
    }
});

app.listen(PROXY_PORT, () => {
    console.log(`TMDB Proxy server running on port ${PROXY_PORT}`);
    // Ensure PROXY_TMDB_API_KEY is set for the proxy to function correctly.
    // Without it, the proxy cannot authenticate its requests to the actual TMDB API.
    if (!PROXY_TMDB_API_KEY) {
        console.warn('CRITICAL WARNING: PROXY_TMDB_API_KEY is not set. The proxy server will NOT be able to authenticate with TMDB.');
    }
});
