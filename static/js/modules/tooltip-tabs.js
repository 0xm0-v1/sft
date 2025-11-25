/**
 * Tooltip Tabs - Tab switching logic
 * Location: static/js/modules/tooltip-tabs.js
 */

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
  const allTabs = tooltip.querySelectorAll('.units-tab-button');
  for (const tab of allTabs) {
    const isActive = tab === clickedTab;
    tab.classList.toggle('is-active', isActive);
    tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
    tab.setAttribute('tabindex', isActive ? '0' : '-1');
  }

  // Update tab panels
  const allPanels = tooltip.querySelectorAll('.tooltip-tab-panel');
  for (const panel of allPanels) {
    const isActive = panel.dataset.tabPanel === targetTab;
    panel.classList.toggle('is-active', isActive);
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
  const tabContainer = tooltip.querySelector('.units-tab-container');
  if (!tabContainer) return;

  tabContainer.addEventListener('keydown', (event) => {
    const tabs = Array.from(tabContainer.querySelectorAll('.units-tab-button'));
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