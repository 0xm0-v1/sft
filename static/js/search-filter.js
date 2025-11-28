/**
 * Search Filter - DOM orchestration
 * Location: static/js/search-filter.js
 * 
 * SEPARATION OF CONCERNS:
 * - DOM selection uses IDs and data-* attributes (not CSS classes)
 * - CSS classes are only for styling
 * - data-state-* attributes for JS state
 * - data-js-* attributes for JS hooks
 */

import { buildSearchText, filterUnits } from './modules/filter-engine.js';
import { createFilterState, createUnitIndex } from './modules/filter-state.js';

/** 
 * DOM Selectors - All use IDs or data-attributes, NOT CSS classes
 * This ensures CSS and JS are decoupled
 */
const SELECTORS = {
  // By ID
  searchInput: '#search-input',
  searchWrapper: '#search-wrapper',
  searchClearBtn: '#search-clear',
  searchResults: '#search-results',
  costFiltersContainer: '#cost-filters',
  unitsGrid: '#units-grid',
  
  // By data-attribute (for collections)
  costFilterBtn: '[data-js="cost-filter"]',
  unlockFilterBtn: '[data-js="unlock-filter"]',
  unitCard: '[data-js="unit-card"]',
  tooltip: '[data-js="tooltip"]',
};

/** 
 * State attributes - Used for JS state management
 * Separate from CSS classes for styling
 */
const STATE_ATTRS = {
  hasValue: 'data-state-has-value',
  active: 'data-state-active',
  hidden: 'data-state-hidden',
  locked: 'data-state-locked',
  visible: 'data-state-visible',
  locking: 'data-state-locking',
};

/**
 * Initializes the search filter functionality.
 */
function initSearchFilter() {
  // DOM Elements - Selected by ID or data-attribute
  const elements = {
    input: document.querySelector(SELECTORS.searchInput),
    wrapper: document.querySelector(SELECTORS.searchWrapper),
    clearBtn: document.querySelector(SELECTORS.searchClearBtn),
    resultsEl: document.querySelector(SELECTORS.searchResults),
    costFilters: Array.from(document.querySelectorAll(SELECTORS.costFilterBtn)),
    unlockFilter: document.querySelector(SELECTORS.unlockFilterBtn),
    cards: Array.from(document.querySelectorAll(SELECTORS.unitCard)),
  };

  // Guard: exit if essential elements are missing
  if (!elements.input || elements.cards.length === 0) {
    console.warn('Search filter: Missing required DOM elements');
    return;
  }

  // Prevent form submission
  const searchForm = elements.input.closest('form');
  if (searchForm) {
    searchForm.addEventListener('submit', (e) => e.preventDefault());
  }

  // Initialize state and index
  const state = createFilterState();
  const unitIndex = createUnitIndex(elements.cards, buildSearchText);

  // Subscribe to state changes
  state.subscribe((newState) => {
    applyFilters(newState, unitIndex, elements);
    syncUI(newState, elements);
  });

  // Bind event handlers
  bindEvents(elements, state);

  // Initial render
  applyFilters(state.getState(), unitIndex, elements);
  syncUI(state.getState(), elements);
}

/**
 * Applies filters and updates DOM visibility using data-state attributes.
 */
function applyFilters(currentState, unitIndex, elements) {
  const { visible, hidden, count } = filterUnits(unitIndex, {
    query: currentState.query,
    selectedCosts: currentState.selectedCosts,
    unlockOnly: currentState.unlockOnly,
  });

  // Update visibility using data-state attribute (not hidden property)
  for (const el of visible) {
    el.removeAttribute(STATE_ATTRS.hidden);
    el.hidden = false;
  }
  for (const el of hidden) {
    el.setAttribute(STATE_ATTRS.hidden, 'true');
    el.hidden = true;
    resetTooltipState(el);
  }

  // Update results count
  updateResultsCount(elements.resultsEl, count);
}

/**
 * Syncs UI elements with current state using data-state attributes.
 */
function syncUI(currentState, elements) {
  // Sync search wrapper state
  if (elements.wrapper) {
    if (currentState.query) {
      elements.wrapper.setAttribute(STATE_ATTRS.hasValue, 'true');
    } else {
      elements.wrapper.removeAttribute(STATE_ATTRS.hasValue);
    }
  }

  // Sync cost filter buttons
  for (const btn of elements.costFilters) {
    const cost = btn.dataset.cost || '';
    const isActive = cost === ''
      ? currentState.selectedCosts.size === 0
      : currentState.selectedCosts.has(cost);
    
    if (isActive) {
      btn.setAttribute(STATE_ATTRS.active, 'true');
      btn.setAttribute('aria-pressed', 'true');
    } else {
      btn.removeAttribute(STATE_ATTRS.active);
      btn.setAttribute('aria-pressed', 'false');
    }
  }

  // Sync unlock filter
  if (elements.unlockFilter) {
    if (currentState.unlockOnly) {
      elements.unlockFilter.setAttribute(STATE_ATTRS.active, 'true');
      elements.unlockFilter.setAttribute('aria-pressed', 'true');
    } else {
      elements.unlockFilter.removeAttribute(STATE_ATTRS.active);
      elements.unlockFilter.setAttribute('aria-pressed', 'false');
    }
  }
}

/**
 * Binds all event handlers.
 */
function bindEvents(elements, state) {
  const { input, clearBtn, costFilters, unlockFilter } = elements;

  // Search input
  input.addEventListener('input', () => {
    state.setQuery(input.value);
  });

  // Clear button
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      input.value = '';
      input.focus();
      state.reset();
    });
  }

  // Cost filter buttons
  for (const btn of costFilters) {
    btn.addEventListener('click', () => {
      state.toggleCost(btn.dataset.cost || '');
    });
  }

  // Unlock filter button
  if (unlockFilter) {
    unlockFilter.addEventListener('click', () => {
      state.toggleUnlockOnly();
    });
  }

  // Keyboard shortcut: Ctrl/Cmd + F
  window.addEventListener('keydown', (event) => {
    handleKeyboardShortcut(event, input);
  }, true);
}

/**
 * Handles keyboard shortcuts for search.
 */
function handleKeyboardShortcut(event, input) {
  const isFindShortcut = 
    event.key?.toLowerCase() === 'f' && 
    (event.ctrlKey || event.metaKey);

  if (isFindShortcut) {
    event.preventDefault();
    if (document.activeElement === input) {
      input.blur();
    } else {
      input.focus();
      input.select();
    }
    return;
  }

  if (event.key === 'Escape' && document.activeElement === input) {
    event.preventDefault();
    input.blur();
  }
}

/**
 * Updates the results count display.
 */
function updateResultsCount(resultsEl, count) {
  if (!resultsEl) return;
  const label = count === 1 ? 'result' : 'results';
  resultsEl.textContent = `${count} ${label}`;
}

/**
 * Resets tooltip state for hidden cards using data-state attributes.
 */
function resetTooltipState(cardEl) {
  const tooltip = cardEl.querySelector(SELECTORS.tooltip);
  if (!tooltip) return;

  tooltip.removeAttribute(STATE_ATTRS.locked);
  tooltip.removeAttribute(STATE_ATTRS.visible);
  tooltip.removeAttribute(STATE_ATTRS.locking);
  tooltip.style.display = 'none';
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSearchFilter);
} else {
  initSearchFilter();
}
