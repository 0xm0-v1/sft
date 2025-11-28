/**
 * Tooltip Position - Positioning logic using floating-ui
 * Location: static/js/modules/tooltip-position.js
 */

import {
  computePosition,
  flip,
  shift,
  offset,
} from '@floating-ui/dom';

/** Default positioning configuration */
const DEFAULT_CONFIG = {
  offset: 8,
  viewportPadding: 16,
  placement: 'bottom',
};

/**
 * Updates tooltip position based on cursor coordinates.
 * 
 * @param {HTMLElement} tooltip - Tooltip element to position
 * @param {number} x - Cursor X coordinate
 * @param {number} y - Cursor Y coordinate
 * @param {Object} [config] - Optional configuration overrides
 * @returns {Promise<void>}
 */
export async function updatePosition(tooltip, x, y, config = {}) {
  const opts = { ...DEFAULT_CONFIG, ...config };

  // Create a virtual element at cursor position
  const virtualElement = {
    getBoundingClientRect: () => ({
      width: 0,
      height: 0,
      x,
      y,
      top: y,
      left: x,
      right: x,
      bottom: y,
    }),
  };

  const { x: posX, y: posY, placement } = await computePosition(
    virtualElement,
    tooltip,
    {
      placement: opts.placement,
      strategy: 'fixed',
      middleware: [
        offset(opts.offset),
        flip({
          fallbackPlacements: ['top', 'bottom', 'left', 'right'],
          padding: opts.viewportPadding,
        }),
        shift({ padding: opts.viewportPadding }),
      ],
    }
  );

  tooltip.style.left = `${posX}px`;
  tooltip.style.top = `${posY}px`;
  tooltip.setAttribute('data-placement', placement);
}

/**
 * Creates a pointer tracker that updates on mouse move.
 * 
 * @returns {{ getPosition: () => {x: number, y: number}, destroy: () => void }}
 */
export function createPointerTracker() {
  const position = { x: 0, y: 0 };

  function onPointerMove(event) {
    position.x = event.clientX;
    position.y = event.clientY;
  }

  window.addEventListener('pointermove', onPointerMove, { passive: true });

  return {
    getPosition: () => ({ ...position }),
    destroy: () => {
      window.removeEventListener('pointermove', onPointerMove);
    },
  };
}
