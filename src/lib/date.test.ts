import { describe, expect, it } from 'vitest';
import { formatLongDate, formatShortDate, sortByDateDesc } from './date';

const entry = (date?: string) => ({ data: { date } });

describe('date formatting', () => {
  // A YYYY-MM-DD string parses as UTC midnight, so a build machine west of UTC
  // would render the previous day without an explicit zone.
  it('renders the calendar date regardless of the build machine timezone', () => {
    expect(formatLongDate('2026-06-25')).toBe('June 25, 2026');
    expect(formatShortDate('2026-06-25')).toBe('Jun 25, 2026');
  });

  it('does not slip a day at the start of a month', () => {
    expect(formatLongDate('2026-01-01')).toBe('January 1, 2026');
  });
});

describe('sortByDateDesc', () => {
  it('puts the newer entry first', () => {
    expect(sortByDateDesc(entry('2026-01-01'), entry('2026-06-25'))).toBeGreaterThan(0);
  });

  it('sorts entries without a date to the end', () => {
    expect(sortByDateDesc(entry(), entry('2026-06-25'))).toBeGreaterThan(0);
  });
});
