/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * Application Limits & Constants
 * ═══════════════════════════════════════════════════════════════════════════════
 * Single source of truth for all validation limits used throughout the app.
 * Update these values and all validation logic will use the new limits.
 */

// Table & Column Limits
export const LIMITS = {
  // Table management
  MAX_TABLES: 6,              // Maximum number of tables allowed

  // Column management
  MAX_COLS_PER_TABLE: 4,      // Excludes primary key (so 5 total with id column)
  MAX_COLS_TOTAL: 5,          // Total columns including primary key

  // Row management
  MAX_ROWS_PER_TABLE: 20,     // Maximum rows per table

  // Name validation
  MAX_NAME_LENGTH: 20,        // Max characters for table and column names

  // URL sharing
  MAX_URL_LENGTH: 4096,       // Warning threshold for share link length (all modern browsers support 4000+ chars)
};

/**
 * Get human-readable limit messages
 */
export const LIMIT_MESSAGES = {
  TABLE_LIMIT: `Maximum ${LIMITS.MAX_TABLES} tables allowed`,
  COLUMN_LIMIT: `Maximum ${LIMITS.MAX_COLS_PER_TABLE} columns per table (${LIMITS.MAX_COLS_TOTAL} including primary key)`,
  ROW_LIMIT: `Maximum ${LIMITS.MAX_ROWS_PER_TABLE} rows per table`,
  NAME_LENGTH: `Name limited to ${LIMITS.MAX_NAME_LENGTH} characters`,
  URL_WARNING: `Link is larger than ${LIMITS.MAX_URL_LENGTH} characters. Some servers may reject it.`,
};

/**
 * Validate against a limit
 * @param {number} value - Value to check
 * @param {string} limitKey - Key from LIMITS object (e.g., 'MAX_TABLES')
 * @returns {boolean} true if value exceeds limit
 */
export function exceedsLimit(value, limitKey) {
  return value >= LIMITS[limitKey];
}

/**
 * Get the limit value by key
 * @param {string} limitKey - Key from LIMITS object
 * @returns {number} The limit value
 */
export function getLimit(limitKey) {
  return LIMITS[limitKey];
}

/**
 * Get the friendly error message for a limit
 * @param {string} limitKey - Key from LIMITS object
 * @returns {string} Human-readable error message
 */
export function getLimitMessage(limitKey) {
  const msgKey = limitKey.replace('MAX_', '') + (limitKey.includes('LENGTH') ? '' : '');
  for (const [key, msg] of Object.entries(LIMIT_MESSAGES)) {
    if (key.includes(msgKey)) return msg;
  }
  return `Limit exceeded: ${limitKey}`;
}
