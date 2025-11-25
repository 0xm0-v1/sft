(() => {
  'use strict';

  const input = document.querySelector('#search-input');
  const cards = Array.from(document.querySelectorAll('.units-icon-container'));
  const wrapper = input?.closest('.search-wrapper');
  const clearBtn = wrapper?.querySelector('.search-clear');
  const resultsEl = document.querySelector('.search-results');
  const costFilters = Array.from(document.querySelectorAll('.cost-filter[data-cost]'));
  const unlockFilter = document.querySelector('.cost-filter--unlock');

  const selectedCosts = new Set();
  let activeUnlockOnly = false;

  if (!input || cards.length === 0) {
    return;
  }

  const searchForm = input.closest('form');
  if (searchForm) {
    searchForm.addEventListener('submit', (event) => {
      event.preventDefault();
    });
  }

  const index = cards.map((el) => ({
    el,
    text: buildSearchText(el),
  }));

  input.addEventListener('input', () => {
    toggleClear();
    filterCards(input.value);
  });

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      input.value = '';
      input.focus();
      setActiveCostFilter('');
      toggleClear();
      filterCards('');
    });
  }

  if (costFilters.length) {
    costFilters.forEach((btn) => {
      btn.addEventListener('click', () => {
        const value = btn.dataset.cost || '';
        toggleCostFilter(value);
        filterCards(input.value);
      });
    });
  }

  if (unlockFilter) {
    unlockFilter.addEventListener('click', () => {
      activeUnlockOnly = !activeUnlockOnly;
      unlockFilter.classList.toggle('is-active', activeUnlockOnly);
      filterCards(input.value);
    });
  }

  // Initial render if the input carries a value (e.g., from browser autofill)
  filterCards(input.value);
  toggleClear();

  // Toggle focus on the search via Ctrl+F / Cmd+F (instead of the browser find).
  window.addEventListener(
    'keydown',
    (event) => {
      const isFindShortcut = event.key?.toLowerCase() === 'f' && (event.ctrlKey || event.metaKey);
      if (!isFindShortcut) return;
      event.preventDefault();
      if (document.activeElement === input) {
        input.blur();
      } else {
        input.focus();
        input.select();
      }
    },
    true,
  );

  function buildSearchText(el) {
    // concat dataset hints and all readable text inside the card (including tooltip content)
    const fields = [
      el.dataset.search || '',
      el.dataset.unit || '',
      el.dataset.cost || '',
      getReadableText(el),
    ];
    return normalizeText(fields.join(' '));
  }

  function getReadableText(el) {
    return (el.textContent || '').replace(/\s+/g, ' ');
  }

  function normalizeText(text) {
    return (text || '').toLowerCase().trim().replace(/\s+/g, ' ');
  }

  function filterCards(rawQuery) {
    const { costFilter: queryCost, terms } = normalizeQuery(rawQuery);
    // If user typed "X cost", honor it in addition to button selections.
    const costFilterFromQuery = queryCost !== null ? queryCost : null;
    let visibleCount = 0;

    index.forEach(({ el, text }) => {
      const costOk =
        (selectedCosts.size === 0 || selectedCosts.has(el.dataset.cost)) &&
        (costFilterFromQuery === null || Number(el.dataset.cost) === Number(costFilterFromQuery));
      const unlockOk = !activeUnlockOnly || el.dataset.unlock === 'true';
      const matches = costOk && unlockOk && terms.every((term) => text.includes(term));
      el.hidden = !matches;
      if (matches) {
        visibleCount += 1;
      } else {
        resetTooltipState(el);
      }
    });
    updateResultsCount(visibleCount);
  }

  function normalizeQuery(query) {
    const normalized = normalizeText(query);
    const costMatch = normalized.match(/(\d+)\s*cost/);
    const costFilter = costMatch ? Number(costMatch[1]) : null;

    const terms = normalized
      .replace(/(\d+)\s*cost/g, '')
      .split(' ')
      .filter(Boolean);

    return { costFilter, terms };
  }

  // Hide any tooltip still visible on filtered-out cards to avoid stray overlays
  function resetTooltipState(cardEl) {
    const tooltip = cardEl.querySelector('.tooltip-card');
    if (!tooltip) return;

    tooltip.dataset.locked = 'false';
    tooltip.classList.remove('tooltip-visible', 'tooltip-locking', 'tooltip-locked');
    tooltip.style.display = 'none';
  }

  function toggleClear() {
    if (!wrapper) return;
    wrapper.classList.toggle('has-value', Boolean(input.value));
  }

  function updateResultsCount(count) {
    if (!resultsEl) return;
    const label = count === 1 ? 'result' : 'results';
    resultsEl.textContent = `${count} ${label}`;
  }

  function toggleCostFilter(value) {
    // Empty value == "All" button
    if (value === '') {
      selectedCosts.clear();
    } else {
      if (selectedCosts.has(value)) {
        selectedCosts.delete(value);
      } else {
        selectedCosts.add(value);
      }
    }

    // Sync active classes: "All" is active only if no specific cost selected
    costFilters.forEach((btn) => {
      const cost = btn.dataset.cost || '';
      if (cost === '') {
        btn.classList.toggle('is-active', selectedCosts.size === 0);
      } else {
        btn.classList.toggle('is-active', selectedCosts.has(cost));
      }
    });
  }

  function persistState() {}
  function restoreState() {
    return { query: '', cost: null };
  }
})();
