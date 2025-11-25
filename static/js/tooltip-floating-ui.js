/**
 * Tooltip Manager - DOM orchestration for tooltips
 * Location: static/js/tooltip-floating-ui.js
 * 
 * Paradox Interactive style tooltips with pointer tracking.
 * 
 * API:
 *   window.TooltipManager.disable(container) - Hide and prevent tooltip
 *   window.TooltipManager.enable(container)  - Re-enable tooltip
 */

import {
  getState,
  setState,
  clearTimers,
  isHovered,
  setHovered,
  clearHovered,
  getActivePointer,
  getActivePointerId,
  setActivePointer,
  clearActivePointer,
  hasActivePointer,
} from './modules/tooltip-state.js';

import { updatePosition, createPointerTracker } from './modules/tooltip-position.js';
import { handleTabClick, initTabKeyboardNav } from './modules/tooltip-tabs.js';

/** Configuration constants */
const CONFIG = {
  SHOW_DELAY: 250,
  LOCK_DELAY: 800,
};

/** Global pointer tracker */
let pointerTracker = null;

/**
 * Shows a tooltip with delay.
 */
function showTooltip(tooltip, container) {
  const state = getState(tooltip);

  if (getActivePointer() || state.isDisabled) return;

  clearTimers(tooltip);

  state.showTimeout = setTimeout(() => {
    if (getActivePointer() || state.isDisabled) return;

    setState(tooltip, { status: 'following' });

    // Show tooltip
    tooltip.style.display = 'block';
    tooltip.dataset.locked = 'false';
    tooltip.classList.remove('tooltip-locked');
    tooltip.classList.add('tooltip-locking');
    tooltip.style.setProperty('--tooltip-lock-duration', CONFIG.LOCK_DELAY + 'ms');

    // Position at cursor
    const pos = pointerTracker.getPosition();
    updatePosition(tooltip, pos.x, pos.y);

    // Trigger visibility animation
    requestAnimationFrame(() => {
      tooltip.classList.add('tooltip-visible');
    });

    // Start lock countdown
    startLockCountdown(tooltip);
  }, CONFIG.SHOW_DELAY);
}

/**
 * Hides a tooltip.
 */
function hideTooltip(tooltip, immediate = false) {
  const state = getState(tooltip);

  clearTimers(tooltip);
  setState(tooltip, { status: 'hidden' });

  tooltip.classList.remove('tooltip-visible', 'tooltip-locking', 'tooltip-locked');
  tooltip.dataset.locked = 'false';

  if (immediate) {
    tooltip.style.display = 'none';
  } else {
    setTimeout(() => {
      if (getState(tooltip).status === 'hidden') {
        tooltip.style.display = 'none';
      }
    }, 150);
  }
}

/**
 * Starts the lock countdown timer.
 */
function startLockCountdown(tooltip) {
  const state = getState(tooltip);
  clearTimeout(state.lockTimeout);

  state.lockTimeout = setTimeout(() => {
    lockTooltip(tooltip);
  }, CONFIG.LOCK_DELAY);
}

/**
 * Locks a tooltip in place.
 */
function lockTooltip(tooltip) {
  const state = getState(tooltip);

  if (state.status === 'hidden') return;

  clearTimeout(state.lockTimeout);
  setState(tooltip, { status: 'locked', lockTimeout: null });

  tooltip.dataset.locked = 'true';
  tooltip.classList.remove('tooltip-locking');
  tooltip.classList.add('tooltip-locked');
}

/**
 * Handles pointer move for following tooltips.
 */
function onPointerMove() {
  const pos = pointerTracker.getPosition();

  document.querySelectorAll('.tooltip-card').forEach((tooltip) => {
    if (getState(tooltip).status === 'following') {
      updatePosition(tooltip, pos.x, pos.y);
    }
  });
}

/**
 * Binds events to a single unit container.
 */
function bindContainerEvents(container, tooltip) {
  // Pointer enter - show tooltip
  container.addEventListener('pointerenter', () => {
    setHovered(container);
    if (!getActivePointer()) {
      showTooltip(tooltip, container);
    }
  });

  // Pointer leave - maybe hide
  container.addEventListener('pointerleave', (event) => {
    clearHovered(container);

    const state = getState(tooltip);

    // Don't hide if locked and moving to tooltip
    if (state.status === 'locked' && tooltip.contains(event.relatedTarget)) {
      return;
    }

    // Don't hide if dragging
    if (hasActivePointer(container)) {
      return;
    }

    hideTooltip(tooltip);
  });

  // Pointer down - start drag, hide tooltip
  container.addEventListener('pointerdown', (event) => {
    if (tooltip.contains(event.target)) return;
    if (event.button !== 0) return;

    container.setPointerCapture(event.pointerId);
    setActivePointer(container, event.pointerId);
    hideTooltip(tooltip, true);
  });

  // Pointer up - end drag, maybe show tooltip
  container.addEventListener('pointerup', (event) => {
    if (!hasActivePointer(container)) return;
    if (event.pointerId !== getActivePointerId()) return;

    container.releasePointerCapture(event.pointerId);
    clearActivePointer();

    if (getState(tooltip).isDisabled) return;

    if (isHovered(container)) {
      showTooltip(tooltip, container);
    }
  });

  // Lost pointer capture
  container.addEventListener('lostpointercapture', (event) => {
    if (hasActivePointer(container) && event.pointerId === getActivePointerId()) {
      clearActivePointer();
    }
  });

  // Focus - show tooltip (keyboard nav)
  container.addEventListener('focus', () => {
    showTooltip(tooltip, container);
  }, true);

  // Blur - hide tooltip
  container.addEventListener('blur', (event) => {
    if (!tooltip.contains(event.relatedTarget)) {
      hideTooltip(tooltip);
    }
  }, true);
}

/**
 * Binds events to the tooltip itself.
 */
function bindTooltipEvents(container, tooltip) {
  // Pointer down on tooltip - lock it
  tooltip.addEventListener('pointerdown', (event) => {
    event.stopPropagation();

    if (event.target.closest('.units-tab-button')) {
      event.preventDefault();
    }

    if (getState(tooltip).status !== 'locked') {
      lockTooltip(tooltip);
    }
  });

  // Pointer up - prevent propagation
  tooltip.addEventListener('pointerup', (event) => {
    event.stopPropagation();
  });

  // Click - handle tabs
  tooltip.addEventListener('click', (event) => {
    event.stopPropagation();

    const tabButton = event.target.closest('.units-tab-button');
    if (tabButton) {
      handleTabClick(tooltip, tabButton);
    }
  });

  // Pointer leave tooltip - hide if locked
  tooltip.addEventListener('pointerleave', (event) => {
    if (container.contains(event.relatedTarget)) {
      return;
    }

    if (getState(tooltip).status === 'locked') {
      hideTooltip(tooltip);
    }
  });
}

/**
 * Public API for external tooltip control.
 */
window.TooltipManager = {
  disable(container) {
    const tooltip = container.querySelector('.tooltip-card');
    if (!tooltip) return;

    setState(tooltip, { isDisabled: true });
    hideTooltip(tooltip, true);
  },

  enable(container) {
    const tooltip = container.querySelector('.tooltip-card');
    if (!tooltip) return;

    setState(tooltip, { isDisabled: false });

    if (isHovered(container) && !getActivePointer()) {
      showTooltip(tooltip, container);
    }
  },
};

/**
 * Initializes all tooltips.
 */
function init() {
  // Create global pointer tracker
  pointerTracker = createPointerTracker();

  // Track pointer for following tooltips
  window.addEventListener('pointermove', onPointerMove, { passive: true });

  // Initialize each unit container
  document.querySelectorAll('.units-icon-container').forEach((container) => {
    const tooltip = container.querySelector('.tooltip-card');
    if (!tooltip) return;

    // Initial state
    tooltip.style.display = 'none';
    tooltip.classList.remove('tooltip-visible');
    tooltip.dataset.locked = 'false';

    // Bind events
    bindContainerEvents(container, tooltip);
    bindTooltipEvents(container, tooltip);
    initTabKeyboardNav(tooltip);
  });
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}