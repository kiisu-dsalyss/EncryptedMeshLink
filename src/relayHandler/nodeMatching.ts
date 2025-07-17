/**
 * Node Matching Utilities
 * Enhanced node resolution with online status priority and smart matching
 */

import { NodeInfo, NodeMatchResult } from './types';

/**
 * Determines if a node is considered "online" based on lastSeen timestamp
 * A node is online if it was seen within the last 5 minutes
 */
export function isNodeOnline(node: NodeInfo): boolean {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  return node.lastSeen > fiveMinutesAgo;
}

/**
 * Calculate similarity score between two strings (0-100)
 * Uses a combination of exact match, starts with, includes, and Levenshtein distance
 */
function calculateSimilarityScore(target: string, candidate: string): number {
  const targetLower = target.toLowerCase();
  const candidateLower = candidate.toLowerCase();
  
  // Exact match
  if (targetLower === candidateLower) return 100;
  
  // Starts with (high score)
  if (candidateLower.startsWith(targetLower)) return 90;
  if (targetLower.startsWith(candidateLower)) return 85;
  
  // Contains (medium score)
  if (candidateLower.includes(targetLower)) return 70;
  if (targetLower.includes(candidateLower)) return 65;
  
  // Simple Levenshtein distance for fuzzy matching
  const distance = levenshteinDistance(targetLower, candidateLower);
  const maxLen = Math.max(targetLower.length, candidateLower.length);
  const similarity = Math.max(0, (maxLen - distance) / maxLen * 60);
  
  return similarity;
}

/**
 * Simple Levenshtein distance implementation
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));
  
  for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= b.length; j++) matrix[j][0] = j;
  
  for (let j = 1; j <= b.length; j++) {
    for (let i = 1; i <= a.length; i++) {
      const indicator = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,     // deletion
        matrix[j - 1][i] + 1,     // insertion
        matrix[j - 1][i - 1] + indicator // substitution
      );
    }
  }
  
  return matrix[b.length][a.length];
}

/**
 * Find the best matching node(s) for a given identifier
 * Prioritizes online nodes and exact matches
 */
export function findBestNodeMatch(
  knownNodes: Map<number, NodeInfo>,
  targetIdentifier: string
): NodeMatchResult | null {
  const candidates: NodeMatchResult[] = [];
  
  // First check if it's a direct numeric ID
  const numericId = parseInt(targetIdentifier);
  if (!isNaN(numericId) && knownNodes.has(numericId)) {
    const node = knownNodes.get(numericId)!;
    return {
      node,
      nodeId: numericId,
      matchScore: 100,
      isOnline: isNodeOnline(node),
      matchType: 'exact_id'
    };
  }
  
  // Search by name matching
  for (const [nodeId, node] of knownNodes) {
    const longName = node.user?.longName || '';
    const shortName = node.user?.shortName || '';
    
    // Calculate match scores for both names
    const longNameScore = longName ? calculateSimilarityScore(targetIdentifier, longName) : 0;
    const shortNameScore = shortName ? calculateSimilarityScore(targetIdentifier, shortName) : 0;
    const bestScore = Math.max(longNameScore, shortNameScore);
    
    // Only consider matches with at least 30% similarity
    if (bestScore >= 30) {
      let matchType: NodeMatchResult['matchType'] = 'fuzzy_name';
      
      if (bestScore >= 100) {
        matchType = 'exact_name';
      } else if (bestScore >= 85) {
        matchType = 'partial_name';
      }
      
      candidates.push({
        node,
        nodeId,
        matchScore: bestScore,
        isOnline: isNodeOnline(node),
        matchType
      });
    }
  }
  
  if (candidates.length === 0) {
    return null;
  }
  
  // Sort candidates with preference for:
  // 1. Online status (online nodes get +10 score bonus)
  // 2. Match score
  // 3. Match type (exact > partial > fuzzy)
  candidates.sort((a, b) => {
    const aScore = a.matchScore + (a.isOnline ? 10 : 0);
    const bScore = b.matchScore + (b.isOnline ? 10 : 0);
    
    if (aScore !== bScore) {
      return bScore - aScore; // Higher score first
    }
    
    // If scores are equal, prefer better match types
    const matchTypeOrder = { 'exact_id': 0, 'exact_name': 1, 'partial_name': 2, 'fuzzy_name': 3 };
    return matchTypeOrder[a.matchType] - matchTypeOrder[b.matchType];
  });
  
  return candidates[0];
}
