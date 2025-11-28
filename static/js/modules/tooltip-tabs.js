/**
 * Tooltip Tabs - Tab switching logic
 * Location: static/js/modules/tooltip-tabs.js
 * 
 * SEPARATION OF CONCERNS:
 * - Uses data-js-* attributes for JS hooks
 * - Uses data-state-* attributes for state
 */

/**
 * DOM Selectors - Use data-js attributes
 */
const SELECTORS = {
  tabButton: '[data-js="tab-button"]',
  tabPanel: '[data-js="tab-panel"]',
  tabContainer: '[data-js="tab-container"]',
};

/**
 * State attributes
 */
const STATE_ATTRS = {
  active: 'data-state-active',
};

/**
 * Handles tab click within a tooltip.
 * Updates aria attributes and visibility of panels.
 * 
 * @param {HTMLElement} tooltip - Parent tooltip element
 * @param {HTMLElement} clickedTab - The tab button that was clicked
 */
export function handleTabClick(tooltip, clickedTab) {
  const targetTab = clickedTab.dataset.tabTarget;
  if (!targetTab) return;

  // Update tab buttons
  const allTabs = tooltip.querySelectorAll(SELECTORS.tabButton);
  for (const tab of allTabs) {
    const isActive = tab === clickedTab;
    
    if (isActive) {
      tab.setAttribute(STATE_ATTRS.active, 'true');
    } else {
      tab.removeAttribute(STATE_ATTRS.active);
    }
    
    tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
    tab.setAttribute('tabindex', isActive ? '0' : '-1');
  }

  // Update tab panels
  const allPanels = tooltip.querySelectorAll(SELECTORS.tabPanel);
  for (const panel of allPanels) {
    const isActive = panel.dataset.tabPanel === targetTab;
    
    if (isActive) {
      panel.setAttribute(STATE_ATTRS.active, 'true');
    } else {
      panel.removeAttribute(STATE_ATTRS.active);
    }
    
    panel.hidden = !isActive;
  }
}

/**
 * Initializes tab keyboard navigation within a tooltip.
 * Enables arrow key navigation between tabs.
 * 
 * @param {HTMLElement} tooltip - Tooltip element containing tabs
 */
export function initTabKeyboardNav(tooltip) {
  const tabContainer = tooltip.querySelector(SELECTORS.tabContainer);
  if (!tabContainer) return;

  tabContainer.addEventListener('keydown', (event) => {
    const tabs = Array.from(tabContainer.querySelectorAll(SELECTORS.tabButton));
    const currentIndex = tabs.findIndex((tab) => tab === document.activeElement);
    
    if (currentIndex === -1) return;

    let newIndex = currentIndex;

    switch (event.key) {
      case 'ArrowLeft':
      case 'ArrowUp':
        event.preventDefault();
        newIndex = currentIndex > 0 ? currentIndex - 1 : tabs.length - 1;
        break;
      case 'ArrowRight':
      case 'ArrowDown':
        event.preventDefault();
        newIndex = currentIndex < tabs.length - 1 ? currentIndex + 1 : 0;
        break;
      case 'Home':
        event.preventDefault();
        newIndex = 0;
        break;
      case 'End':
        event.preventDefault();
        newIndex = tabs.length - 1;
        break;
      default:
        return;
    }

    tabs[newIndex].focus();
    handleTabClick(tooltip, tabs[newIndex]);
  });
}
