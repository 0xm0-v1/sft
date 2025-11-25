/**
 * Tooltip Positioner: cursor-follow strategy + Floating UI for collision handling.
 * Simplifies logic: follow cursor until lock; Floating UI keeps tooltips inside the viewport.
 */

import {
  computePosition,
  flip,
  shift,
  offset,
  autoUpdate,
} from '@floating-ui/dom';

(function () {
  'use strict';

  const CONFIG = {
    TOOLTIP_OFFSET: 8,
    SHOW_DELAY: 250,
    LOCK_DELAY: 800,
    VIEWPORT_PADDING: 16,
  };

  let showTimeout = null;
  let cleanupFn = null;
  let currentTooltip = null;
  let lockTimeout = null;
  let lockTarget = null;
  let lockContainer = null;

  const latestPointer = { x: 0, y: 0 };

  // virtual reference object that will act at the mouse position
  const virtualRef = {
    getBoundingClientRect: () => ({
      width: 0,
      height: 0,
      x: latestPointer.x,
      y: latestPointer.y,
      top: latestPointer.y,
      left: latestPointer.x,
      right: latestPointer.x,
      bottom: latestPointer.y,
    }),
    // Optional: if you have scroll containers, you may provide contextElement
  };

  function showTooltip(referenceEl, tooltipEl, containerEl, pointerEvent) {
    if (showTimeout) {
      clearTimeout(showTimeout);
      showTimeout = null;
    }
    // if another tooltip open, hide it immediately
    if (currentTooltip && currentTooltip !== tooltipEl) {
      hideTooltipImmediate(currentTooltip);
    }

    if (pointerEvent) {
      updateLatestPointer(pointerEvent);
    }

    showTimeout = setTimeout(() => {
      tooltipEl.style.display = 'block';
      resetTooltipState(tooltipEl);

      if (pointerEvent) {
        // cursor-follow mode
        cleanupFn = autoUpdate(virtualRef, tooltipEl, () => {
          updatePosition(virtualRef, tooltipEl);
        });
        attachPointerTracker(tooltipEl);
      } else {
        // anchored to reference element
        cleanupFn = autoUpdate(referenceEl, tooltipEl, () => {
          updatePosition(referenceEl, tooltipEl);
        });
      }

      requestAnimationFrame(() => {
        tooltipEl.classList.add('tooltip-visible');
        startLockCountdown(tooltipEl, containerEl);
      });

      currentTooltip = tooltipEl;
    }, CONFIG.SHOW_DELAY);
  }

  function updatePosition(reference, tooltipEl) {
    computePosition(reference, tooltipEl, {
      placement: 'bottom',
      strategy: 'fixed',
      middleware: [
        offset(CONFIG.TOOLTIP_OFFSET),
        flip({ fallbackPlacements: ['top', 'bottom', 'left', 'right'], padding: CONFIG.VIEWPORT_PADDING }),
        shift({ padding: CONFIG.VIEWPORT_PADDING }),
      ],
    }).then(({ x, y, placement }) => {
      Object.assign(tooltipEl.style, {
        left: `${x}px`,
        top: `${y}px`,
      });
      tooltipEl.setAttribute('data-placement', placement);
    });
  }

  function hideTooltip(tooltipEl) {
    if (showTimeout) {
      clearTimeout(showTimeout);
      showTimeout = null;
    }
    if (cleanupFn) {
      cleanupFn();
      cleanupFn = null;
    }
    detachPointerTracker(tooltipEl);
    if (lockTarget === tooltipEl) {
      cancelLockCountdown();
    }
    if (!tooltipEl) return;

    tooltipEl.classList.remove('tooltip-visible', 'tooltip-locking', 'tooltip-locked');
    tooltipEl.dataset.locked = 'false';

    setTimeout(() => {
      if (!tooltipEl.classList.contains('tooltip-visible')) {
        tooltipEl.style.display = 'none';
      }
    }, 150);

    if (currentTooltip === tooltipEl) {
      currentTooltip = null;
    }
  }

  function hideTooltipImmediate(tooltipEl) {
    if (!tooltipEl) return;
    if (lockTarget === tooltipEl) {
      cancelLockCountdown();
    }
    detachPointerTracker(tooltipEl);
    tooltipEl.classList.remove('tooltip-visible', 'tooltip-locking', 'tooltip-locked');
    tooltipEl.dataset.locked = 'false';
    tooltipEl.style.display = 'none';
    if (currentTooltip === tooltipEl) {
      currentTooltip = null;
    }
  }

  function startLockCountdown(tooltipEl, containerEl) {
    cancelLockCountdown();
    tooltipEl.dataset.locked = 'false';
    tooltipEl.classList.add('tooltip-locking');
    tooltipEl.style.setProperty('--tooltip-lock-duration', CONFIG.LOCK_DELAY + 'ms');

    lockTarget = tooltipEl;
    lockContainer = containerEl;

    lockTimeout = setTimeout(() => {
      if (lockContainer && !lockContainer.matches(':hover')) {
        cancelLockCountdown();
        return;
      }
      lockTooltip(tooltipEl);
    }, CONFIG.LOCK_DELAY);
  }

  function cancelLockCountdown() {
    if (lockTimeout) {
      clearTimeout(lockTimeout);
      lockTimeout = null;
    }
    if (lockTarget) {
      lockTarget.classList.remove('tooltip-locking');
      lockTarget.style.removeProperty('--tooltip-lock-duration');
    }
    lockTarget = null;
    lockContainer = null;
  }

  function lockTooltip(tooltipEl) {
    lockTimeout = null;
    lockTarget = null;
    lockContainer = null;
    tooltipEl.dataset.locked = 'true';
    tooltipEl.classList.remove('tooltip-locking');
    tooltipEl.classList.add('tooltip-locked');
    detachPointerTracker(tooltipEl);
  }

  function isTooltipLocked(tooltipEl) {
    return tooltipEl?.dataset.locked === 'true';
  }

  function resetTooltipState(tooltipEl) {
    tooltipEl.dataset.locked = 'false';
    tooltipEl.classList.remove('tooltip-locking', 'tooltip-locked');
  }

  function attachPointerTracker(tooltipEl) {
    detachPointerTracker(tooltipEl);
    const handler = (event) => {
      if (tooltipEl.dataset.locked === 'true') {
        detachPointerTracker(tooltipEl);
        return;
      }
      updateLatestPointer(event);
      // No need to manually reposition here; autoUpdate + computePosition handles it.
    };
    window.addEventListener('pointermove', handler);
    tooltipEl._pointerHandler = handler;
  }

  function detachPointerTracker(tooltipEl) {
    const handler = tooltipEl._pointerHandler;
    if (!handler) return;
    window.removeEventListener('pointermove', handler);
    delete tooltipEl._pointerHandler;
  }

  function updateLatestPointer(event) {
    if (!event) return;
    latestPointer.x = event.clientX;
    latestPointer.y = event.clientY;
  }

  function init() {
    const containers = document.querySelectorAll('.units-icon-container');
    containers.forEach((container) => {
      const icon = container.querySelector('.units-icon');
      const tooltip = container.querySelector('.tooltip-card');
      if (!icon || !tooltip) return;

      tooltip.style.display = 'none';
      tooltip.classList.remove('tooltip-visible');
      tooltip.dataset.locked = 'false';

      container.addEventListener('mouseenter', (event) => {
        if (container.dataset.tooltipDisabled === 'true') return;
        container.dataset.hovering = 'true';
        showTooltip(icon, tooltip, container, event);
      });
      container.addEventListener('mouseleave', (event) => {
        container.dataset.hovering = 'false';
        container.dataset.tooltipDisabled = 'false';
        cancelLockCountdown();
        if (isTooltipLocked(tooltip)) {
          const nextTarget = event.relatedTarget;
          if (nextTarget && tooltip.contains(nextTarget)) {
            return;
          }
        }
        hideTooltip(tooltip);
      });
      container.addEventListener(
        'focus',
        () => {
          showTooltip(icon, tooltip, container, null);
        },
        true,
      );
      container.addEventListener(
        'blur',
        () => {
          hideTooltip(tooltip);
        },
        true,
      );
      tooltip.addEventListener('mouseleave', () => {
        if (isTooltipLocked(tooltip)) {
          hideTooltip(tooltip);
        }
      });

      // While mouse button is held down, keep tooltip hidden; restore on release.
      container.addEventListener('mousedown', () => {
        container.dataset.tooltipDisabled = 'true';
        hideTooltipImmediate(tooltip);
      });

      container.addEventListener('mouseup', (event) => {
        container.dataset.tooltipDisabled = 'false';
        // If still hovering after release, show again.
        if (container.matches(':hover')) {
          showTooltip(icon, tooltip, container, event);
        }
      });
    });
  }

  function cleanup() {
    if (showTimeout) clearTimeout(showTimeout);
    if (cleanupFn) cleanupFn();
    cancelLockCountdown();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.addEventListener('beforeunload', cleanup);
  window.addEventListener('pointermove', updateLatestPointer, true);
})();
