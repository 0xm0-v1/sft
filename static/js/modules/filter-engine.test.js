/**
 * Filter Engine Tests
 * Location: static/js/modules/filter-engine.test.js
 * 
 * Run with: node --experimental-vm-modules node_modules/jest/bin/jest.js
 * Or use Vitest/other ESM-compatible test runner
 */

import { 
  normalizeText, 
  parseQuery, 
  matchesFilter, 
  buildSearchText 
} from './filter-engine.js';

describe('normalizeText', () => {
  test('lowercases text', () => {
    expect(normalizeText('AHRI')).toBe('ahri');
  });

  test('trims whitespace', () => {
    expect(normalizeText('  ahri  ')).toBe('ahri');
  });

  test('collapses multiple spaces', () => {
    expect(normalizeText('ahri   jinx')).toBe('ahri jinx');
  });

  test('handles null/undefined', () => {
    expect(normalizeText(null)).toBe('');
    expect(normalizeText(undefined)).toBe('');
  });
});

describe('parseQuery', () => {
  test('extracts cost filter from "3 cost"', () => {
    const result = parseQuery('3 cost');
    expect(result.costFilter).toBe(3);
    expect(result.terms).toEqual([]);
  });

  test('extracts cost filter from "ahri 2cost"', () => {
    const result = parseQuery('ahri 2cost');
    expect(result.costFilter).toBe(2);
    expect(result.terms).toEqual(['ahri']);
  });

  test('returns null costFilter when no cost specified', () => {
    const result = parseQuery('ahri mage');
    expect(result.costFilter).toBeNull();
    expect(result.terms).toEqual(['ahri', 'mage']);
  });

  test('handles empty query', () => {
    const result = parseQuery('');
    expect(result.costFilter).toBeNull();
    expect(result.terms).toEqual([]);
  });
});

describe('matchesFilter', () => {
  const baseParams = {
    searchText: 'ahri mage 4 cost',
    unitCost: '4',
    isUnlockable: false,
    selectedCosts: new Set(),
    queryCost: null,
    terms: [],
    unlockOnly: false,
  };

  test('matches when no filters active', () => {
    expect(matchesFilter(baseParams)).toBe(true);
  });

  test('matches when cost is in selectedCosts', () => {
    expect(matchesFilter({
      ...baseParams,
      selectedCosts: new Set(['4']),
    })).toBe(true);
  });

  test('does not match when cost not in selectedCosts', () => {
    expect(matchesFilter({
      ...baseParams,
      selectedCosts: new Set(['1', '2']),
    })).toBe(false);
  });

  test('matches when all search terms found', () => {
    expect(matchesFilter({
      ...baseParams,
      terms: ['ahri', 'mage'],
    })).toBe(true);
  });

  test('does not match when search term missing', () => {
    expect(matchesFilter({
      ...baseParams,
      terms: ['jinx'],
    })).toBe(false);
  });

  test('matches unlockable unit when unlockOnly active', () => {
    expect(matchesFilter({
      ...baseParams,
      isUnlockable: true,
      unlockOnly: true,
    })).toBe(true);
  });

  test('does not match non-unlockable when unlockOnly active', () => {
    expect(matchesFilter({
      ...baseParams,
      isUnlockable: false,
      unlockOnly: true,
    })).toBe(false);
  });
});

describe('buildSearchText', () => {
  test('combines all fields', () => {
    const result = buildSearchText({
      search: 'Ahri mage',
      unit: 'Ahri',
      cost: '4',
      textContent: 'Spirit Fox',
    });
    expect(result).toContain('ahri');
    expect(result).toContain('mage');
    expect(result).toContain('4');
    expect(result).toContain('spirit fox');
  });

  test('handles empty fields', () => {
    const result = buildSearchText({
      search: '',
      unit: 'Test',
      cost: '',
      textContent: '',
    });
    expect(result).toBe('test');
  });
});