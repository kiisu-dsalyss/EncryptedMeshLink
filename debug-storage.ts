/**
 * Debug Node Registry Storage
 */

import { NodeRegistryStorage } from './src/nodeRegistry/storage';
import { NodeRegistryEntry } from './src/nodeRegistry/types';

const storage = new NodeRegistryStorage(':memory:');

console.log('🔍 Testing Node Registry Storage...');

// Test basic functionality
const entry: NodeRegistryEntry = {
  nodeId: 'test-node',
  stationId: 'test-station',
  lastSeen: Date.now(),
  isOnline: true,
  metadata: { test: 'data' },
  ttl: 300
};

console.log('📝 Adding entry:', entry);
console.log('📅 Current timestamp (ms):', Date.now());
console.log('📅 Current timestamp (s):', Math.floor(Date.now() / 1000));
console.log('📅 Entry lastSeen (ms):', entry.lastSeen);
console.log('📅 Entry lastSeen (s):', Math.floor(entry.lastSeen / 1000));
console.log('🕰️ TTL (s):', entry.ttl);

storage.upsertNode(entry);

// Debug: Check what's in the database
console.log('\n🔍 Raw database query (bypassing TTL check):');
const db = (storage as any).db;
const rawRows = db.prepare('SELECT * FROM node_registry').all();
console.log('📋 Raw rows:', rawRows);

// Check the TTL calculation
const now = Math.floor(Date.now() / 1000);
const entryTime = Math.floor(entry.lastSeen / 1000);
const expires = entryTime + entry.ttl;
console.log(`\n�️ TTL Check: now=${now}, entryTime=${entryTime}, expires=${expires}, valid=${expires > now}`);

// Debug: Test the exact SQL query used in findNode
console.log('\n🔍 Testing findNode SQL query manually:');
const findQuery = `
  SELECT * FROM node_registry 
  WHERE node_id = ? AND last_seen + ttl > strftime('%s', 'now')
  ORDER BY last_seen DESC 
  LIMIT 1
`;
const stmt = db.prepare(findQuery);
const manualResult = stmt.get('test-node');
console.log('📋 Manual query result:', manualResult);

// Check what strftime returns
const currentTimeQuery = db.prepare("SELECT strftime('%s', 'now') as current_time").get();
console.log('📅 SQLite current time:', currentTimeQuery);

// Check the TTL calculation in SQL
const ttlCheckQuery = db.prepare(`
  SELECT 
    node_id,
    last_seen,
    ttl,
    strftime('%s', 'now') as now,
    (last_seen + ttl) as expires,
    (last_seen + ttl > strftime('%s', 'now')) as is_valid
  FROM node_registry 
  WHERE node_id = ?
`).get('test-node');
console.log('�️ TTL check query:', ttlCheckQuery);

storage.close();
