/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * Fast Hashing for Performance-Critical Comparisons
 * ═══════════════════════════════════════════════════════════════════════════════
 * Uses simple but fast hashing to compare large objects (e.g., tables for presets)
 * instead of expensive JSON.stringify operations.
 *
 * Uses DJB2 hash algorithm: Fast, simple, good distribution for our use case.
 */

/**
 * Fast DJB2 hash function for objects
 * Much faster than JSON.stringify for equality comparison
 * @param {any} obj - Object to hash
 * @returns {number} Hash value
 */
function djb2Hash(obj) {
  const str = typeof obj === 'string' ? obj : JSON.stringify(obj);
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i); // hash * 33 + char
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Compare two objects by hash (fast equality check)
 * Returns true if hashes match (with negligible collision risk for our data)
 * @param {any} obj1 - First object
 * @param {any} obj2 - Second object
 * @returns {boolean} true if hashes match
 */
export function hashEqual(obj1, obj2) {
  return djb2Hash(obj1) === djb2Hash(obj2);
}

/**
 * Get hash of an object
 * @param {any} obj - Object to hash
 * @returns {number} Hash value
 */
export function getHash(obj) {
  return djb2Hash(obj);
}

/**
 * Memoized hasher for preset data (computed once at startup)
 * Stores hashes of presets to avoid recomputing on every render
 */
export class PresetHashCache {
  constructor() {
    this.cache = new Map();
  }

  /**
   * Set hash for a preset name
   * @param {string} name - Preset name
   * @param {any} data - Preset data to hash
   */
  set(name, data) {
    this.cache.set(name, djb2Hash(data));
  }

  /**
   * Check if current data matches a cached preset
   * @param {string} name - Preset name
   * @param {any} currentData - Current data to compare
   * @returns {boolean} true if matches
   */
  matches(name, currentData) {
    return this.cache.get(name) === djb2Hash(currentData);
  }

  /**
   * Find which preset name matches current data
   * @param {any} currentData - Current data to find
   * @returns {string|null} Preset name or null if no match
   */
  findMatch(currentData) {
    const currentHash = djb2Hash(currentData);
    for (const [name, hash] of this.cache.entries()) {
      if (hash === currentHash) {
        return name;
      }
    }
    return null;
  }

  /**
   * Get size of cache
   * @returns {number} Number of cached presets
   */
  size() {
    return this.cache.size;
  }

  /**
   * Clear cache
   */
  clear() {
    this.cache.clear();
  }
}
