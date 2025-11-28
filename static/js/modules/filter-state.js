/**
 * Filter State - Reactive state management for filters
 * Location: static/js/modules/filter-state.js
 * 
 * Simple pub/sub state management without external dependencies.
 */

/**
 * Creates a reactive filter state manager.
 * 
 * @param {Object} initialState - Initial state values
 * @returns {Object} State manager with get, set, subscribe methods
 */
export function createFilterState(initialState = {}) {
  let state = {
    query: '',
    selectedCosts: new Set(),
    unlockOnly: false,
    ...initialState,
  };

  const listeners = new Set();

  /**
   * Gets the current state (immutable copy for Sets).
   * @returns {Object} Current state
   */
  function getState() {
    return {
      ...state,
      selectedCosts: new Set(state.selectedCosts),
    };
  }

  /**
   * Updates state and notifies listeners.
   * @param {Object} updates - Partial state updates
   */
  function setState(updates) {
    const prevState = getState();
    state = { ...state, ...updates };
    
    // Notify all listeners
    for (const listener of listeners) {
      listener(getState(), prevState);
    }
  }

  /**
   * Subscribes to state changes.
   * @param {Function} listener - Callback(newState, prevState)
   * @returns {Function} Unsubscribe function
   */
  function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  /**
   * Toggles a cost in the selected costs set.
   * @param {string} cost - Cost value to toggle (empty string = "All")
   */
  function toggleCost(cost) {
    const newCosts = new Set(state.selectedCosts);
    
    if (cost === '') {
      // "All" button clears selection
      newCosts.clear();
    } else if (newCosts.has(cost)) {
      newCosts.delete(cost);
    } else {
      newCosts.add(cost);
    }

    setState({ selectedCosts: newCosts });
  }

  /**
   * Sets the search query.
   * @param {string} query - New search query
   */
  function setQuery(query) {
    setState({ query });
  }

  /**
   * Toggles the unlock-only filter.
   */
  function toggleUnlockOnly() {
    setState({ unlockOnly: !state.unlockOnly });
  }

  /**
   * Resets all filters to default state.
   */
  function reset() {
    setState({
      query: '',
      selectedCosts: new Set(),
      unlockOnly: false,
    });
  }

  return {
    getState,
    setState,
    subscribe,
    toggleCost,
    setQuery,
    toggleUnlockOnly,
    reset,
  };
}

/**
 * Creates a unit index from DOM elements.
 * 
 * @param {NodeList|Array} elements - Unit container elements
 * @param {Function} buildTextFn - Function to build searchable text
 * @returns {Array<{el: Element, text: string}>}
 */
export function createUnitIndex(elements, buildTextFn) {
  return Array.from(elements).map((el) => ({
    el,
    text: buildTextFn({
      search: el.dataset.search || '',
      unit: el.dataset.unit || '',
      cost: el.dataset.cost || '',
      textContent: el.textContent || '',
    }),
  }));
}
