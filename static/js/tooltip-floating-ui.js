/**
 * Tooltip Positioner - Paradox Interactive style
 * Uses Pointer Events API. Compatible with native HTML5 drag & drop.
 * 
 * API:
 *   window.TooltipManager.disable(container) - Hide and prevent tooltip
 *   window.TooltipManager.enable(container)  - Re-enable tooltip
 */

import {
  computePosition,
  flip,
  shift,
  offset,
} from '@floating-ui/dom';

(function () {
  'use strict';

  const CONFIG = {
    TOOLTIP_OFFSET: 8,
    SHOW_DELAY: 250,
    LOCK_DELAY: 800,
    VIEWPORT_PADDING: 16,
  };

  // State management
  const tooltipStates = new WeakMap();
  const hoveredContainers = new WeakSet();
  const pointer = { x: 0, y: 0 };
  
  let activePointerContainer = null;
  let activePointerId = null;

  function getState(tooltip) {
    if (!tooltipStates.has(tooltip)) {
      tooltipStates.set(tooltip, {
        status: 'hidden', // 'hidden' | 'following' | 'locked'
        showTimeout: null,
        lockTimeout: null,
        isDisabled: false,
      });
    }
    return tooltipStates.get(tooltip);
  }

  function clearTimers(state) {
    clearTimeout(state.showTimeout);
    clearTimeout(state.lockTimeout);
    state.showTimeout = null;
    state.lockTimeout = null;
  }

  // Positioning
  function updatePosition(tooltip, x, y) {
    computePosition(
      {
        getBoundingClientRect: () => ({
          width: 0, height: 0,
          x, y, top: y, left: x, right: x, bottom: y,
        }),
      },
      tooltip,
      {
        placement: 'bottom',
        strategy: 'fixed',
        middleware: [
          offset(CONFIG.TOOLTIP_OFFSET),
          flip({ 
            fallbackPlacements: ['top', 'bottom', 'left', 'right'], 
            padding: CONFIG.VIEWPORT_PADDING,
          }),
          shift({ padding: CONFIG.VIEWPORT_PADDING }),
        ],
      }
    ).then(({ x: posX, y: posY, placement }) => {
      tooltip.style.left = `${posX}px`;
      tooltip.style.top = `${posY}px`;
      tooltip.setAttribute('data-placement', placement);
    });
  }

  // Tooltip actions
  function showTooltip(tooltip, container) {
    const state = getState(tooltip);
    
    if (activePointerContainer || state.isDisabled) return;
    
    clearTimers(state);
    
    state.showTimeout = setTimeout(() => {
      if (activePointerContainer || state.isDisabled) return;
      
      state.status = 'following';
      
      tooltip.style.display = 'block';
      tooltip.dataset.locked = 'false';
      tooltip.classList.remove('tooltip-locked');
      tooltip.classList.add('tooltip-locking');
      tooltip.style.setProperty('--tooltip-lock-duration', CONFIG.LOCK_DELAY + 'ms');
      
      updatePosition(tooltip, pointer.x, pointer.y);
      
      requestAnimationFrame(() => {
        tooltip.classList.add('tooltip-visible');
      });
      
      startLockCountdown(tooltip);
    }, CONFIG.SHOW_DELAY);
  }

  function hideTooltip(tooltip, immediate = false) {
    const state = getState(tooltip);
    
    clearTimers(state);
    state.status = 'hidden';
    
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

  function startLockCountdown(tooltip) {
    const state = getState(tooltip);
    clearTimeout(state.lockTimeout);
    
    state.lockTimeout = setTimeout(() => {
      lockTooltip(tooltip);
    }, CONFIG.LOCK_DELAY);
  }

  function lockTooltip(tooltip) {
    const state = getState(tooltip);
    
    if (state.status === 'hidden') return;
    
    clearTimeout(state.lockTimeout);
    state.lockTimeout = null;
    state.status = 'locked';
    
    tooltip.dataset.locked = 'true';
    tooltip.classList.remove('tooltip-locking');
    tooltip.classList.add('tooltip-locked');
  }

  // Cursor tracking
  function onPointerMove(event) {
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    
    document.querySelectorAll('.tooltip-card').forEach((tooltip) => {
      if (getState(tooltip).status === 'following') {
        updatePosition(tooltip, pointer.x, pointer.y);
      }
    });
  }

  // Tab handling
  function handleTabClick(tooltip, tabButton) {
    const targetTab = tabButton.dataset.tabTarget;
    if (!targetTab) return;

    tooltip.querySelectorAll('.units-tab-button').forEach((btn) => {
      const isActive = btn === tabButton;
      btn.classList.toggle('is-active', isActive);
      btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
      btn.setAttribute('tabindex', isActive ? '0' : '-1');
    });

    tooltip.querySelectorAll('.tooltip-tab-panel').forEach((panel) => {
      const isActive = panel.dataset.tabPanel === targetTab;
      panel.classList.toggle('is-active', isActive);
      panel.hidden = !isActive;
    });
  }

  // Public API
  window.TooltipManager = {
    disable(container) {
      const tooltip = container.querySelector('.tooltip-card');
      if (!tooltip) return;
      
      const state = getState(tooltip);
      state.isDisabled = true;
      hideTooltip(tooltip, true);
    },

    enable(container) {
      const tooltip = container.querySelector('.tooltip-card');
      if (!tooltip) return;
      
      const state = getState(tooltip);
      state.isDisabled = false;
      
      if (hoveredContainers.has(container) && !activePointerContainer) {
        showTooltip(tooltip, container);
      }
    },
  };

  // Initialization
  function init() {
    window.addEventListener('pointermove', onPointerMove, { passive: true });

    document.querySelectorAll('.units-icon-container').forEach((container) => {
      const tooltip = container.querySelector('.tooltip-card');
      if (!tooltip) return;

      // Initial state
      tooltip.style.display = 'none';
      tooltip.classList.remove('tooltip-visible');
      tooltip.dataset.locked = 'false';

      // Container events
      container.addEventListener('pointerenter', () => {
        hoveredContainers.add(container);
        if (!activePointerContainer) {
          showTooltip(tooltip, container);
        }
      });

      container.addEventListener('pointerleave', (event) => {
        hoveredContainers.delete(container);
        
        const state = getState(tooltip);
        
        if (state.status === 'locked' && tooltip.contains(event.relatedTarget)) {
          return;
        }
        
        if (activePointerContainer === container) {
          return;
        }
        
        hideTooltip(tooltip);
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
        
        if (getState(tooltip).isDisabled) return;
        
        if (hoveredContainers.has(container)) {
          showTooltip(tooltip, container);
        }
      });

      container.addEventListener('lostpointercapture', (event) => {
        if (activePointerContainer === container && event.pointerId === activePointerId) {
          activePointerContainer = null;
          activePointerId = null;
        }
      });

      // Tooltip events
      tooltip.addEventListener('pointerdown', (event) => {
        event.stopPropagation();
        
        if (event.target.closest('.units-tab-button')) {
          event.preventDefault();
        }
        
        if (getState(tooltip).status !== 'locked') {
          lockTooltip(tooltip);
        }
      });

      tooltip.addEventListener('pointerup', (event) => {
        event.stopPropagation();
      });

      tooltip.addEventListener('click', (event) => {
        event.stopPropagation();
        
        const tabButton = event.target.closest('.units-tab-button');
        if (tabButton) {
          handleTabClick(tooltip, tabButton);
        }
      });

      tooltip.addEventListener('pointerleave', (event) => {
        const state = getState(tooltip);
        
        if (container.contains(event.relatedTarget)) {
          return;
        }
        
        if (state.status === 'locked') {
          hideTooltip(tooltip);
        }
      });

      // Keyboard accessibility
      container.addEventListener('focus', () => showTooltip(tooltip, container), true);
      
      container.addEventListener('blur', (event) => {
        if (!tooltip.contains(event.relatedTarget)) {
          hideTooltip(tooltip);
        }
      }, true);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();