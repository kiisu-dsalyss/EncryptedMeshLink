/**
 * Node Registry Storage
 * SQLite-based storage for cross-station node tracking
 */

import Database from 'better-sqlite3';
import { NodeRegistryEntry, NodeInfo, NodeConflict } from './types';

export class NodeRegistryStorage {
  private db: Database.Database;
  private isInitialized = false;

  constructor(dbPath: string = ':memory:') {
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('synchronous = NORMAL');
    this.db.pragma('cache_size = 1000');
  }

  /**
   * Initialize the database schema
   */
  public initialize(): void {
    if (this.isInitialized) return;

    // Node registry table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS node_registry (
        node_id TEXT NOT NULL,
        station_id TEXT NOT NULL,
        last_seen INTEGER NOT NULL,
        is_online INTEGER NOT NULL DEFAULT 1,
        metadata TEXT,
        ttl INTEGER NOT NULL,
        created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
        updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
        PRIMARY KEY (node_id, station_id)
      )
    `);

    // Indexes for performance
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_node_registry_node_id ON node_registry(node_id);
      CREATE INDEX IF NOT EXISTS idx_node_registry_station_id ON node_registry(station_id);
      CREATE INDEX IF NOT EXISTS idx_node_registry_last_seen ON node_registry(last_seen);
      CREATE INDEX IF NOT EXISTS idx_node_registry_is_online ON node_registry(is_online);
    `);

    // Conflict resolution table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS node_conflicts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        node_id TEXT NOT NULL,
        conflicting_entries TEXT NOT NULL,
        resolved_entry TEXT,
        resolution_strategy TEXT NOT NULL,
        created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
        resolved_at INTEGER
      )
    `);

    this.isInitialized = true;
  }

  /**
   * Add or update a node in the registry
   */
  public upsertNode(entry: NodeRegistryEntry): void {
    this.initialize();

    const stmt = this.db.prepare(`
      INSERT INTO node_registry (
        node_id, station_id, last_seen, is_online, metadata, ttl, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, strftime('%s', 'now'))
      ON CONFLICT(node_id, station_id) DO UPDATE SET
        last_seen = excluded.last_seen,
        is_online = excluded.is_online,
        metadata = excluded.metadata,
        ttl = excluded.ttl,
        updated_at = strftime('%s', 'now')
    `);

    stmt.run(
      entry.nodeId,
      entry.stationId,
      Math.floor(entry.lastSeen / 1000), // Convert to seconds for SQLite
      entry.isOnline ? 1 : 0,
      entry.metadata ? JSON.stringify(entry.metadata) : null,
      entry.ttl
    );
  }

  /**
   * Get all nodes for a specific station
   */
  public getNodesByStation(stationId: string): NodeRegistryEntry[] {
    this.initialize();

    const stmt = this.db.prepare(`
      SELECT * FROM node_registry 
      WHERE station_id = ? AND last_seen + ttl > CAST(strftime('%s', 'now') AS INTEGER)
      ORDER BY last_seen DESC
    `);

    const rows = stmt.all(stationId) as any[];
    return rows.map(this.rowToEntry);
  }

  /**
   * Find a specific node across all stations
   */
  public findNode(nodeId: string): NodeRegistryEntry | null {
    this.initialize();

    const stmt = this.db.prepare(`
      SELECT * FROM node_registry 
      WHERE node_id = ? AND last_seen + ttl > CAST(strftime('%s', 'now') AS INTEGER)
      ORDER BY last_seen DESC 
      LIMIT 1
    `);

    const row = stmt.get(nodeId) as any;
    return row ? this.rowToEntry(row) : null;
  }

  /**
   * Get all active nodes across all stations
   */
  public getAllActiveNodes(): NodeRegistryEntry[] {
    this.initialize();

    const stmt = this.db.prepare(`
      SELECT * FROM node_registry 
      WHERE last_seen + ttl > CAST(strftime('%s', 'now') AS INTEGER)
      ORDER BY station_id, last_seen DESC
    `);

    const rows = stmt.all() as any[];
    return rows.map(this.rowToEntry);
  }

  /**
   * Remove a specific node
   */
  public removeNode(nodeId: string, stationId?: string): number {
    this.initialize();

    let stmt: Database.Statement;
    let params: any[];

    if (stationId) {
      stmt = this.db.prepare('DELETE FROM node_registry WHERE node_id = ? AND station_id = ?');
      params = [nodeId, stationId];
    } else {
      stmt = this.db.prepare('DELETE FROM node_registry WHERE node_id = ?');
      params = [nodeId];
    }

    const result = stmt.run(...params);
    return result.changes;
  }

  /**
   * Clean up expired nodes
   */
  public cleanupExpiredNodes(): number {
    this.initialize();

    const stmt = this.db.prepare(`
      DELETE FROM node_registry 
      WHERE last_seen + ttl <= CAST(strftime('%s', 'now') AS INTEGER)
    `);

    const result = stmt.run();
    return result.changes;
  }

  /**
   * Get node count by station
   */
  public getNodeCountByStation(): Record<string, number> {
    this.initialize();

    const stmt = this.db.prepare(`
      SELECT station_id, COUNT(*) as count 
      FROM node_registry 
      WHERE last_seen + ttl > CAST(strftime('%s', 'now') AS INTEGER)
      GROUP BY station_id
    `);

    const rows = stmt.all() as any[];
    const result: Record<string, number> = {};
    
    for (const row of rows) {
      result[row.station_id] = row.count;
    }

    return result;
  }

  /**
   * Record a node conflict
   */
  public recordConflict(conflict: NodeConflict): void {
    this.initialize();

    const stmt = this.db.prepare(`
      INSERT INTO node_conflicts (
        node_id, conflicting_entries, resolved_entry, resolution_strategy
      ) VALUES (?, ?, ?, ?)
    `);

    stmt.run(
      conflict.nodeId,
      JSON.stringify(conflict.conflictingEntries),
      conflict.resolvedEntry ? JSON.stringify(conflict.resolvedEntry) : null,
      conflict.resolutionStrategy
    );
  }

  /**
   * Get recent conflicts
   */
  public getRecentConflicts(limitHours: number = 24): NodeConflict[] {
    this.initialize();

    const stmt = this.db.prepare(`
      SELECT * FROM node_conflicts 
      WHERE created_at > CAST(strftime('%s', 'now') AS INTEGER) - ?
      ORDER BY created_at DESC
    `);

    const rows = stmt.all(limitHours * 3600) as any[];
    return rows.map(row => ({
      nodeId: row.node_id,
      conflictingEntries: JSON.parse(row.conflicting_entries),
      resolvedEntry: row.resolved_entry ? JSON.parse(row.resolved_entry) : undefined,
      resolutionStrategy: row.resolution_strategy,
      timestamp: row.created_at * 1000
    }));
  }

  /**
   * Close the database connection
   */
  public close(): void {
    if (this.db) {
      this.db.close();
    }
  }

  /**
   * Convert database row to NodeRegistryEntry
   */
  private rowToEntry(row: any): NodeRegistryEntry {
    return {
      nodeId: row.node_id,
      stationId: row.station_id,
      lastSeen: row.last_seen * 1000, // Convert to milliseconds
      isOnline: row.is_online === 1,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      ttl: row.ttl
    };
  }
}
