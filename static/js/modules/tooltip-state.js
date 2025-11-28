/**
 * Tooltip State - State management for tooltips
 * Location: static/js/modules/tooltip-state.js
 */

/** @typedef {'hidden' | 'following' | 'locked'} TooltipStatus */

/**
 * @typedef {Object} TooltipState
 * @property {TooltipStatus} status - Current tooltip status
 * @property {number|null} showTimeout - Timeout ID for show delay
 * @property {number|null} lockTimeout - Timeout ID for lock delay
 * @property {boolean} isDisabled - Whether tooltip is disabled
 */

// WeakMap to store state per tooltip element
const tooltipStates = new WeakMap();

// Track which containers are currently hovered
const hoveredContainers = new WeakSet();

// Track active pointer capture
let activePointerContainer = null;
let activePointerId = null;

/**
 * Gets or creates state for a tooltip element.
 * @param {HTMLElement} tooltip
 * @returns {TooltipState}
 */
export function getState(tooltip) {
  if (!tooltipStates.has(tooltip)) {
    tooltipStates.set(tooltip, {
      status: 'hidden',
      showTimeout: null,
      lockTimeout: null,
      isDisabled: false,
    });
  }
  return tooltipStates.get(tooltip);
}

/**
 * Updates tooltip state.
 * @param {HTMLElement} tooltip
 * @param {Partial<TooltipState>} updates
 */
export function setState(tooltip, updates) {
  const state = getState(tooltip);
  Object.assign(state, updates);
}

/**
 * Clears all pending timeouts for a tooltip.
 * @param {HTMLElement} tooltip
 */
export function clearTimers(tooltip) {
  const state = getState(tooltip);
  clearTimeout(state.showTimeout);
  clearTimeout(state.lockTimeout);
  state.showTimeout = null;
  state.lockTimeout = null;
}

/**
 * Checks if a container is currently hovered.
 * @param {HTMLElement} container
 * @returns {boolean}
 */
export function isHovered(container) {
  return hoveredContainers.has(container);
}

/**
 * Marks a container as hovered.
 * @param {HTMLElement} container
 */
export function setHovered(container) {
  hoveredContainers.add(container);
}

/**
 * Marks a container as not hovered.
 * @param {HTMLElement} container
 */
export function clearHovered(container) {
  hoveredContainers.delete(container);
}

/**
 * Gets the active pointer container.
 * @returns {HTMLElement|null}
 */
export function getActivePointer() {
  return activePointerContainer;
}

/**
 * Gets the active pointer ID.
 * @returns {number|null}
 */
export function getActivePointerId() {
  return activePointerId;
}

/**
 * Sets active pointer capture.
 * @param {HTMLElement|null} container
 * @param {number|null} pointerId
 */
export function setActivePointer(container, pointerId) {
  activePointerContainer = container;
  activePointerId = pointerId;
}

/**
 * Clears active pointer capture.
 */
export function clearActivePointer() {
  activePointerContainer = null;
  activePointerId = null;
}

/**
 * Checks if a container has active pointer capture.
 * @param {HTMLElement} container
 * @returns {boolean}
 */
export function hasActivePointer(container) {
  return activePointerContainer === container;
}
