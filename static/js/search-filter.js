/**
 * Search Filter - DOM orchestration
 * Location: static/js/search-filter.js
 * 
 * This file wires together the filter modules and DOM elements.
 * Business logic is delegated to filter-engine.js
 * State management is delegated to filter-state.js
 */

import { buildSearchText, filterUnits } from './modules/filter-engine.js';
import { createFilterState, createUnitIndex } from './modules/filter-state.js';

/**
 * Initializes the search filter functionality.
 */
function initSearchFilter() {
  // DOM Elements
  const elements = {
    input: document.querySelector('#search-input'),
    wrapper: document.querySelector('#search-input')?.closest('.search-wrapper'),
    clearBtn: document.querySelector('.search-clear'),
    resultsEl: document.querySelector('.search-results'),
    costFilters: Array.from(document.querySelectorAll('.cost-filter[data-cost]')),
    unlockFilter: document.querySelector('.cost-filter--unlock'),
    cards: Array.from(document.querySelectorAll('.units-icon-container')),
  };

  // Guard: exit if essential elements are missing
  if (!elements.input || elements.cards.length === 0) {
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
 * Applies filters and updates DOM visibility.
 */
function applyFilters(currentState, unitIndex, elements) {
  const { visible, hidden, count } = filterUnits(unitIndex, {
    query: currentState.query,
    selectedCosts: currentState.selectedCosts,
    unlockOnly: currentState.unlockOnly,
  });

  // Update visibility
  for (const el of visible) {
    el.hidden = false;
  }
  for (const el of hidden) {
    el.hidden = true;
    resetTooltipState(el);
  }

  // Update results count
  updateResultsCount(elements.resultsEl, count);
}

/**
 * Syncs UI elements with current state.
 */
function syncUI(currentState, elements) {
  // Sync clear button visibility
  if (elements.wrapper) {
    elements.wrapper.classList.toggle('has-value', Boolean(currentState.query));
  }

  // Sync cost filter buttons
  for (const btn of elements.costFilters) {
    const cost = btn.dataset.cost || '';
    const isActive = cost === ''
      ? currentState.selectedCosts.size === 0
      : currentState.selectedCosts.has(cost);
    btn.classList.toggle('is-active', isActive);
  }

  // Sync unlock filter
  if (elements.unlockFilter) {
    elements.unlockFilter.classList.toggle('is-active', currentState.unlockOnly);
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
 * Resets tooltip state for hidden cards.
 */
function resetTooltipState(cardEl) {
  const tooltip = cardEl.querySelector('.tooltip-card');
  if (!tooltip) return;

  tooltip.dataset.locked = 'false';
  tooltip.classList.remove('tooltip-visible', 'tooltip-locking', 'tooltip-locked');
  tooltip.style.display = 'none';
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSearchFilter);
} else {
  initSearchFilter();
}