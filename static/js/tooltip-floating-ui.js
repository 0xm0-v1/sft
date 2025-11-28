/**
 * Tooltip Manager - Cursor-relative positioning with hide delay
 * Location: static/js/tooltip-floating-ui.js
 * 
 * Key features:
 * - Tooltip positioned relative to cursor (not card)
 * - Hide delay: tooltip stays visible briefly when mouse leaves
 * - Uses data-state-* attributes for state management
 */

import {
  computePosition,
  flip,
  shift,
  offset,
  size,
} from '@floating-ui/dom';

// ============================================
// CONFIGURATION
// ============================================
const CONFIG = {
  SHOW_DELAY: 200,
  LOCK_DELAY: 800,
  HIDE_DELAY: 100,        // Delay before hiding
  HIDE_TRANSITION: 150,
  OFFSET: 12,             // Distance from cursor
  VIEWPORT_PADDING: 12,
};

const SELECTORS = {
  unitCard: '[data-js="unit-card"]',
  tooltip: '[data-js="tooltip"]',
  tabButton: '[data-js="tab-button"]',
  tabPanel: '[data-js="tab-panel"]',
  tabContainer: '[data-js="tab-container"]',
  lockIndicator: '[data-js="lock-indicator"]',
  traitIcon: '.trait-icon[data-icon]',
};

const STATE_ATTRS = {
  locked: 'data-state-locked',
  visible: 'data-state-visible',
  locking: 'data-state-locking',
  active: 'data-state-active',
};

// ============================================
// STATE MANAGEMENT
// ============================================
const tooltipStates = new WeakMap();
const hoveredContainers = new WeakSet();
const hoveredTooltips = new WeakSet();
let activePointerContainer = null;
let activePointerId = null;

// Mouse position tracking
let mouseX = 0;
let mouseY = 0;

function getState(tooltip) {
  if (!tooltipStates.has(tooltip)) {
    tooltipStates.set(tooltip, {
      status: 'hidden',
      showTimeout: null,
      lockTimeout: null,
      hideTimeout: null,
      isDisabled: false,
      currentContainer: null,
    });
  }
  return tooltipStates.get(tooltip);
}

function setState(tooltip, updates) {
  Object.assign(getState(tooltip), updates);
}

function clearTimers(tooltip) {
  const state = getState(tooltip);
  clearTimeout(state.showTimeout);
  clearTimeout(state.lockTimeout);
  clearTimeout(state.hideTimeout);
  state.showTimeout = null;
  state.lockTimeout = null;
  state.hideTimeout = null;
}

// ============================================
// VIRTUAL ELEMENT FOR CURSOR POSITION
// ============================================

/**
 * Creates a virtual element at the cursor position
 * Used by floating-ui as the reference element
 */
function createVirtualElement(x, y) {
  return {
    getBoundingClientRect() {
      return {
        width: 0,
        height: 0,
        x: x,
        y: y,
        top: y,
        left: x,
        right: x,
        bottom: y,
      };
    },
  };
}

// ============================================
// POSITIONING
// ============================================
async function updatePosition(tooltip, x, y) {
  const virtualEl = createVirtualElement(x, y);

  try {
    const { x: posX, y: posY, placement } = await computePosition(
      virtualEl,
      tooltip,
      {
        placement: 'right-start',
        strategy: 'fixed',
        middleware: [
          offset(CONFIG.OFFSET),
          flip({
            fallbackPlacements: ['left-start', 'right-end', 'left-end', 'bottom-start', 'top-start'],
            padding: CONFIG.VIEWPORT_PADDING,
          }),
          shift({ 
            padding: CONFIG.VIEWPORT_PADDING,
            crossAxis: true,
          }),
          // Constrain size to available space
          size({
            apply({ availableWidth, availableHeight, elements }) {
              Object.assign(elements.floating.style, {
                maxWidth: `${Math.min(availableWidth, 380)}px`,
                maxHeight: `${availableHeight}px`,
              });
            },
            padding: CONFIG.VIEWPORT_PADDING,
          }),
        ],
      }
    );
    
    tooltip.style.left = `${posX}px`;
    tooltip.style.top = `${posY}px`;
    tooltip.setAttribute('data-placement', placement);
  } catch (e) {
    // Fallback: simple positioning
    const tooltipRect = tooltip.getBoundingClientRect();
    
    let posX = x + CONFIG.OFFSET;
    let posY = y;
    
    // Flip to left if overflows right
    if (posX + tooltipRect.width > window.innerWidth - CONFIG.VIEWPORT_PADDING) {
      posX = x - tooltipRect.width - CONFIG.OFFSET;
    }
    
    // Shift up if overflows bottom
    if (posY + tooltipRect.height > window.innerHeight - CONFIG.VIEWPORT_PADDING) {
      posY = window.innerHeight - tooltipRect.height - CONFIG.VIEWPORT_PADDING;
    }
    
    // Clamp to viewport
    posX = Math.max(CONFIG.VIEWPORT_PADDING, posX);
    posY = Math.max(CONFIG.VIEWPORT_PADDING, posY);
    
    tooltip.style.left = `${posX}px`;
    tooltip.style.top = `${posY}px`;
  }
}

// ============================================
// TAB MANAGEMENT
// ============================================
function handleTabClick(tooltip, clickedTab) {
  const targetTab = clickedTab.dataset.tabTarget;
  if (!targetTab) return;

  tooltip.querySelectorAll(SELECTORS.tabButton).forEach(tab => {
    const isActive = tab === clickedTab;
    if (isActive) {
      tab.setAttribute(STATE_ATTRS.active, 'true');
    } else {
      tab.removeAttribute(STATE_ATTRS.active);
    }
    tab.setAttribute('aria-selected', String(isActive));
    tab.setAttribute('tabindex', isActive ? '0' : '-1');
  });

  tooltip.querySelectorAll(SELECTORS.tabPanel).forEach(panel => {
    const isActive = panel.dataset.tabPanel === targetTab;
    if (isActive) {
      panel.setAttribute(STATE_ATTRS.active, 'true');
      panel.hidden = false;
    } else {
      panel.removeAttribute(STATE_ATTRS.active);
      panel.hidden = true;
    }
  });
}

function initTabKeyboardNav(tooltip) {
  const tabContainer = tooltip.querySelector(SELECTORS.tabContainer);
  if (!tabContainer) return;

  tabContainer.addEventListener('keydown', (event) => {
    const tabs = Array.from(tabContainer.querySelectorAll(SELECTORS.tabButton));
    const currentIndex = tabs.indexOf(document.activeElement);
    if (currentIndex === -1) return;

    let newIndex = currentIndex;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault();
      newIndex = currentIndex > 0 ? currentIndex - 1 : tabs.length - 1;
    } else if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault();
      newIndex = currentIndex < tabs.length - 1 ? currentIndex + 1 : 0;
    }

    if (newIndex !== currentIndex) {
      tabs[newIndex].focus();
      handleTabClick(tooltip, tabs[newIndex]);
    }
  });
}

// ============================================
// TOOLTIP SHOW/HIDE/LOCK
// ============================================
function showTooltip(tooltip, container) {
  const state = getState(tooltip);
  if (activePointerContainer || state.isDisabled) return;

  // Cancel any pending hide
  clearTimeout(state.hideTimeout);
  state.hideTimeout = null;

  // If already visible, just update container reference
  if (state.status === 'visible' || state.status === 'locked') {
    setState(tooltip, { currentContainer: container });
    return;
  }

  clearTimers(tooltip);
  setState(tooltip, { currentContainer: container });

  state.showTimeout = setTimeout(() => {
    if (activePointerContainer || state.isDisabled) return;
    if (!hoveredContainers.has(container) && !hoveredTooltips.has(tooltip)) return;

    setState(tooltip, { status: 'visible' });

    tooltip.classList.remove('hidden');
    tooltip.classList.add('block');
    tooltip.setAttribute(STATE_ATTRS.locking, 'true');
    tooltip.removeAttribute(STATE_ATTRS.locked);

    // Position relative to cursor
    updatePosition(tooltip, mouseX, mouseY);

    requestAnimationFrame(() => {
      if (getState(tooltip).status !== 'hidden') {
        tooltip.setAttribute(STATE_ATTRS.visible, 'true');
      }
    });

    state.lockTimeout = setTimeout(() => lockTooltip(tooltip), CONFIG.LOCK_DELAY);
  }, CONFIG.SHOW_DELAY);
}

function scheduleHide(tooltip) {
  const state = getState(tooltip);
  
  if (state.status === 'hidden' || state.hideTimeout) return;
  
  state.hideTimeout = setTimeout(() => {
    // Check if mouse returned to card or tooltip
    if (hoveredContainers.has(state.currentContainer) || hoveredTooltips.has(tooltip)) {
      state.hideTimeout = null;
      return;
    }
    
    hideTooltip(tooltip, false);
  }, CONFIG.HIDE_DELAY);
}

function cancelHide(tooltip) {
  const state = getState(tooltip);
  clearTimeout(state.hideTimeout);
  state.hideTimeout = null;
}

function hideTooltip(tooltip, immediate = false) {
  clearTimers(tooltip);
  setState(tooltip, { status: 'hidden', currentContainer: null });

  tooltip.removeAttribute(STATE_ATTRS.visible);
  tooltip.removeAttribute(STATE_ATTRS.locking);
  tooltip.removeAttribute(STATE_ATTRS.locked);

  if (immediate) {
    tooltip.classList.remove('block');
    tooltip.classList.add('hidden');
  } else {
    setTimeout(() => {
      if (getState(tooltip).status === 'hidden') {
        tooltip.classList.remove('block');
        tooltip.classList.add('hidden');
      }
    }, CONFIG.HIDE_TRANSITION);
  }
}

function lockTooltip(tooltip) {
  const state = getState(tooltip);
  if (state.status === 'hidden') return;

  clearTimeout(state.lockTimeout);
  setState(tooltip, { status: 'locked', lockTimeout: null });

  tooltip.setAttribute(STATE_ATTRS.locked, 'true');
  tooltip.removeAttribute(STATE_ATTRS.locking);
}

// ============================================
// TRAIT ICONS INITIALIZATION
// ============================================
function initTraitIcons(tooltip) {
  const icons = tooltip.querySelectorAll(SELECTORS.traitIcon);
  icons.forEach(icon => {
    const iconUrl = icon.dataset.icon;
    if (iconUrl) {
      icon.style.maskImage = `url('${iconUrl}')`;
      icon.style.webkitMaskImage = `url('${iconUrl}')`;
    }
  });
}

// ============================================
// EVENT BINDING
// ============================================
function bindContainerEvents(container, tooltip) {
  // Track mouse position within container
  container.addEventListener('pointermove', (event) => {
    mouseX = event.clientX;
    mouseY = event.clientY;
  }, { passive: true });

  container.addEventListener('pointerenter', (event) => {
    // Capture initial position
    mouseX = event.clientX;
    mouseY = event.clientY;
    
    hoveredContainers.add(container);
    cancelHide(tooltip);
    
    if (!activePointerContainer) {
      showTooltip(tooltip, container);
    }
  });

  container.addEventListener('pointerleave', (event) => {
    hoveredContainers.delete(container);
    
    // If moving directly to tooltip, don't schedule hide
    if (tooltip.contains(event.relatedTarget)) return;
    
    // If dragging, don't hide
    if (activePointerContainer === container) return;
    
    // Schedule hide with delay
    const state = getState(tooltip);
    if (state.status === 'visible' || state.status === 'locked') {
      scheduleHide(tooltip);
    } else {
      hideTooltip(tooltip, true);
    }
  });

  container.addEventListener('pointerdown', (event) => {
    if (tooltip.contains(event.target)) return;
    if (event.button !== 0) return;

    container.setPointerCapture(event.pointerId);
    activePointerContainer = container;
    activePointerId = event.pointerId;
    hideTooltip(tooltip, true);
  });

  container.addEventListener('pointerup', (event) => {
    if (activePointerContainer !== container) return;
    if (event.pointerId !== activePointerId) return;

    container.releasePointerCapture(event.pointerId);
    activePointerContainer = null;
    activePointerId = null;

    if (!getState(tooltip).isDisabled && hoveredContainers.has(container)) {
      showTooltip(tooltip, container);
    }
  });

  container.addEventListener('lostpointercapture', (event) => {
    if (activePointerContainer === container && event.pointerId === activePointerId) {
      activePointerContainer = null;
      activePointerId = null;
    }
  });

  // Keyboard support (uses card center as reference)
  container.addEventListener('focus', () => {
    const rect = container.getBoundingClientRect();
    mouseX = rect.right;
    mouseY = rect.top + rect.height / 2;
    
    hoveredContainers.add(container);
    cancelHide(tooltip);
    showTooltip(tooltip, container);
  }, true);

  container.addEventListener('blur', (event) => {
    hoveredContainers.delete(container);
    if (!tooltip.contains(event.relatedTarget)) {
      hideTooltip(tooltip);
    }
  }, true);
}

function bindTooltipEvents(container, tooltip) {
  tooltip.addEventListener('pointerenter', () => {
    hoveredTooltips.add(tooltip);
    cancelHide(tooltip);
  });
  
  tooltip.addEventListener('pointerleave', (event) => {
    hoveredTooltips.delete(tooltip);
    
    const state = getState(tooltip);
    
    // If moving back to container, don't schedule hide
    if (state.currentContainer && state.currentContainer.contains(event.relatedTarget)) {
      return;
    }
    
    scheduleHide(tooltip);
  });
  
  tooltip.addEventListener('pointerdown', (event) => {
    event.stopPropagation();
    if (event.target.closest(SELECTORS.tabButton)) event.preventDefault();
    if (getState(tooltip).status !== 'locked') lockTooltip(tooltip);
  });

  tooltip.addEventListener('pointerup', (event) => {
    event.stopPropagation();
  });

  tooltip.addEventListener('click', (event) => {
    event.stopPropagation();
    const tabButton = event.target.closest(SELECTORS.tabButton);
    if (tabButton) handleTabClick(tooltip, tabButton);
  });
}

// ============================================
// TOOLTIP REGISTRY (for portal support)
// ============================================
const containerToTooltip = new WeakMap();

// ============================================
// PUBLIC API
// ============================================
window.TooltipManager = {
  disable(container) {
    const tooltip = containerToTooltip.get(container);
    if (!tooltip) return;
    setState(tooltip, { isDisabled: true });
    hideTooltip(tooltip, true);
  },
  enable(container) {
    const tooltip = containerToTooltip.get(container);
    if (!tooltip) return;
    setState(tooltip, { isDisabled: false });
    if (hoveredContainers.has(container) && !activePointerContainer) {
      showTooltip(tooltip, container);
    }
  },
  hide(container) {
    const tooltip = containerToTooltip.get(container);
    if (tooltip) hideTooltip(tooltip, true);
  },
  lock(container) {
    const tooltip = containerToTooltip.get(container);
    if (tooltip) lockTooltip(tooltip);
  },
};

// ============================================
// INITIALIZATION
// ============================================

// Portal container in body for tooltips (avoids overflow issues)
let portalContainer = null;

function getPortalContainer() {
  if (!portalContainer) {
    portalContainer = document.createElement('div');
    portalContainer.id = 'tooltip-portal';
    portalContainer.setAttribute('aria-live', 'polite');
    document.body.appendChild(portalContainer);
  }
  return portalContainer;
}

function init() {
  const cards = document.querySelectorAll(SELECTORS.unitCard);
  let count = 0;

  cards.forEach(container => {
    const tooltip = container.querySelector(SELECTORS.tooltip);
    if (!tooltip) return;

    // Portal: move tooltip to body to avoid overflow clipping
    const portal = getPortalContainer();
    portal.appendChild(tooltip);
    
    // Store reference to original container
    tooltip._originalContainer = container;
    
    // Register in WeakMap for API access
    containerToTooltip.set(container, tooltip);

    // Ensure hidden state
    tooltip.classList.add('hidden');
    tooltip.classList.remove('block');
    tooltip.removeAttribute(STATE_ATTRS.visible);
    tooltip.removeAttribute(STATE_ATTRS.locked);
    tooltip.removeAttribute(STATE_ATTRS.locking);

    // Initialize trait icons
    initTraitIcons(tooltip);

    // Bind events
    bindContainerEvents(container, tooltip);
    bindTooltipEvents(container, tooltip);
    initTabKeyboardNav(tooltip);
    count++;
  });

  console.log('[TooltipManager] Initialized', count, 'tooltips (portaled to body)');
}

// Run on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}