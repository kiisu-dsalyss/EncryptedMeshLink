/**
 * Local Discovery Server for Testing
 * Simple HTTP server that provides discovery functionality for local testing
 */

import { createServer, IncomingMessage, ServerResponse } from 'http';
import { URL } from 'url';

interface DiscoveryEntry {
  station_id: string;
  station_name: string;
  ip: string;
  port: number;
  last_seen: number;
  public_key?: string;
}

class LocalDiscoveryServer {
  private server = createServer((req, res) => this.handleRequest(req, res));
  private stations = new Map<string, DiscoveryEntry>();
  private port: number;

  constructor(port: number = 8899) {
    this.port = port;
  }

  private handleRequest(req: IncomingMessage, res: ServerResponse) {
    const url = new URL(req.url || '', `http://localhost:${this.port}`);
    
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Content-Type', 'application/json');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    try {
      if (req.method === 'GET' && url.pathname === '/api/discovery') {
        this.handleGetPeers(req, res, url);
      } else if (req.method === 'POST' && url.pathname === '/api/discovery') {
        this.handleRegister(req, res);
      } else if (req.method === 'DELETE' && url.pathname === '/api/discovery') {
        this.handleUnregister(req, res, url);
      } else {
        res.writeHead(404);
        res.end(JSON.stringify({ error: 'Not found' }));
      }
    } catch (error) {
      console.error('Discovery server error:', error);
      res.writeHead(500);
      res.end(JSON.stringify({ error: 'Internal server error' }));
    }
  }

  private handleGetPeers(req: IncomingMessage, res: ServerResponse, url: URL) {
    // Clean up expired entries (older than 2 minutes)
    const now = Date.now();
    const expiredThreshold = 2 * 60 * 1000; // 2 minutes
    
    for (const [stationId, entry] of this.stations.entries()) {
      if (now - entry.last_seen > expiredThreshold) {
        this.stations.delete(stationId);
      }
    }

    const peers = Array.from(this.stations.values());
    console.log(`🔍 Discovery: Returning ${peers.length} peers`);
    
    res.writeHead(200);
    res.end(JSON.stringify({ peers }));
  }

  private handleRegister(req: IncomingMessage, res: ServerResponse) {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const entry: DiscoveryEntry = {
          station_id: data.station_id,
          station_name: data.station_name || data.station_id,
          ip: data.ip || '127.0.0.1',
          port: data.port || 8080,
          last_seen: Date.now(),
          public_key: data.public_key
        };

        this.stations.set(entry.station_id, entry);
        console.log(`📡 Discovery: Registered station ${entry.station_id} at ${entry.ip}:${entry.port}`);
        
        res.writeHead(200);
        res.end(JSON.stringify({ 
          success: true, 
          message: `Station ${entry.station_id} registered successfully`,
          peers_count: this.stations.size 
        }));
      } catch (error) {
        console.error('Registration error:', error);
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
  }

  private handleUnregister(req: IncomingMessage, res: ServerResponse, url: URL) {
    const stationId = url.searchParams.get('station_id');
    
    if (!stationId) {
      res.writeHead(400);
      res.end(JSON.stringify({ error: 'station_id parameter required' }));
      return;
    }

    const deleted = this.stations.delete(stationId);
    if (deleted) {
      console.log(`🗑️  Discovery: Unregistered station ${stationId}`);
    }
    
    res.writeHead(200);
    res.end(JSON.stringify({ 
      success: true,
      message: deleted ? `Station ${stationId} unregistered` : `Station ${stationId} not found`,
      peers_count: this.stations.size
    }));
  }

  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server.listen(this.port, '127.0.0.1', () => {
        console.log(`🌐 Local Discovery Server listening on http://127.0.0.1:${this.port}`);
        resolve();
      });

      this.server.on('error', (error) => {
        if ((error as any).code === 'EADDRINUSE') {
          console.log(`🔄 Discovery server port ${this.port} in use, assuming already running`);
          resolve();
        } else {
          reject(error);
        }
      });
    });
  }

  async stop(): Promise<void> {
    return new Promise((resolve) => {
      this.server.close(() => {
        console.log('🛑 Local Discovery Server stopped');
        resolve();
      });
    });
  }
}

// Auto-start if run directly
if (require.main === module) {
  const server = new LocalDiscoveryServer();
  server.start().catch(console.error);
  
  process.on('SIGINT', async () => {
    await server.stop();
    process.exit(0);
  });
}

export { LocalDiscoveryServer };
