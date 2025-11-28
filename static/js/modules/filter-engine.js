/**
 * Filter Engine - Pure filtering logic (no DOM dependencies)
 * Location: static/js/modules/filter-engine.js
 * 
 * This module contains pure functions for filtering units.
 * All functions are testable without a browser environment.
 */

/**
 * Normalizes text for search comparison.
 * @param {string} text - Raw text to normalize
 * @returns {string} Lowercase, trimmed, single-spaced text
 */
export function normalizeText(text) {
  return (text || '').toLowerCase().trim().replace(/\s+/g, ' ');
}

/**
 * Parses a search query to extract cost filter and search terms.
 * Supports patterns like "3 cost" or "ahri 2cost".
 * 
 * @param {string} query - Raw search query
 * @returns {{ costFilter: number|null, terms: string[] }}
 */
export function parseQuery(query) {
  const normalized = normalizeText(query);
  const costMatch = normalized.match(/(\d+)\s*cost/);
  const costFilter = costMatch ? Number(costMatch[1]) : null;

  const terms = normalized
    .replace(/(\d+)\s*cost/g, '')
    .split(' ')
    .filter(Boolean);

  return { costFilter, terms };
}

/**
 * Checks if a unit matches the current filter criteria.
 * 
 * @param {Object} params - Filter parameters
 * @param {string} params.searchText - Pre-indexed searchable text for the unit
 * @param {string} params.unitCost - Unit's cost as string
 * @param {boolean} params.isUnlockable - Whether the unit is unlockable
 * @param {Set<string>} params.selectedCosts - Set of selected cost filters
 * @param {number|null} params.queryCost - Cost filter from search query
 * @param {string[]} params.terms - Search terms to match
 * @param {boolean} params.unlockOnly - Filter to unlockable units only
 * @returns {boolean} Whether the unit matches all criteria
 */
export function matchesFilter({
  searchText,
  unitCost,
  isUnlockable,
  selectedCosts,
  queryCost,
  terms,
  unlockOnly,
}) {
  // Cost filter check
  const costOk =
    (selectedCosts.size === 0 || selectedCosts.has(unitCost)) &&
    (queryCost === null || Number(unitCost) === queryCost);

  // Unlock filter check
  const unlockOk = !unlockOnly || isUnlockable;

  // Search terms check
  const termsOk = terms.every((term) => searchText.includes(term));

  return costOk && unlockOk && termsOk;
}

/**
 * Builds searchable text from a DOM element's data attributes and content.
 * 
 * @param {Object} data - Unit data
 * @param {string} data.search - data-search attribute
 * @param {string} data.unit - data-unit attribute  
 * @param {string} data.cost - data-cost attribute
 * @param {string} data.textContent - Element's text content
 * @returns {string} Normalized searchable text
 */
export function buildSearchText({ search, unit, cost, textContent }) {
  const fields = [
    search || '',
    unit || '',
    cost || '',
    (textContent || '').replace(/\s+/g, ' '),
  ];
  return normalizeText(fields.join(' '));
}

/**
 * Filters an array of indexed units based on criteria.
 * 
 * @param {Array<{el: Element, text: string}>} index - Indexed units
 * @param {Object} criteria - Filter criteria
 * @param {string} criteria.query - Search query
 * @param {Set<string>} criteria.selectedCosts - Selected cost filters
 * @param {boolean} criteria.unlockOnly - Unlock filter active
 * @returns {{ visible: Element[], hidden: Element[], count: number }}
 */
export function filterUnits(index, { query, selectedCosts, unlockOnly }) {
  const { costFilter: queryCost, terms } = parseQuery(query);
  
  const visible = [];
  const hidden = [];

  for (const { el, text } of index) {
    const matches = matchesFilter({
      searchText: text,
      unitCost: el.dataset.cost,
      isUnlockable: el.dataset.unlock === 'true',
      selectedCosts,
      queryCost,
      terms,
      unlockOnly,
    });

    if (matches) {
      visible.push(el);
    } else {
      hidden.push(el);
    }
  }

  return { visible, hidden, count: visible.length };
}
