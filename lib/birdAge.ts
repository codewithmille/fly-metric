/**
 * Utility functions for computing and formatting bird age.
 * Examples:
 * - 5 days
 * - 2 weeks and 3 days
 * - 1 month and 2 weeks
 * - 3 months and 1 week
 * - 1 year and 4 months
 */

export interface BirdAgeResult {
  formatted: string;     // e.g. "1 month and 2 weeks"
  short: string;         // e.g. "1m 2w"
  totalDays: number;
  years: number;
  months: number;
  weeks: number;
  days: number;
  isEstimated?: boolean;
}

/**
 * Calculates human-readable age from a birthdate/hatch date.
 * If birthdate is missing, it can optionally estimate from ring number (e.g. PH-2026-88001).
 */
export function getBirdAge(birthdate?: string | null, ringNo?: string): BirdAgeResult | null {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (birthdate && birthdate.trim()) {
    let birth: Date;
    const parts = birthdate.split('T')[0].split('-').map(Number);
    if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
      birth = new Date(parts[0], parts[1] - 1, parts[2]);
    } else {
      birth = new Date(birthdate);
    }

    if (isNaN(birth.getTime())) {
      return null;
    }

    const diffMs = today.getTime() - birth.getTime();
    const totalDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (totalDays < 0) {
      return {
        formatted: 'Hatch pending',
        short: 'Pending',
        totalDays: 0,
        years: 0,
        months: 0,
        weeks: 0,
        days: 0,
      };
    }

    if (totalDays === 0) {
      return {
        formatted: 'Hatched today',
        short: '0d',
        totalDays: 0,
        years: 0,
        months: 0,
        weeks: 0,
        days: 0,
      };
    }

    if (totalDays === 1) {
      return {
        formatted: '1 day old',
        short: '1d',
        totalDays: 1,
        years: 0,
        months: 0,
        weeks: 0,
        days: 1,
      };
    }

    if (totalDays < 7) {
      return {
        formatted: `${totalDays} days`,
        short: `${totalDays}d`,
        totalDays,
        years: 0,
        months: 0,
        weeks: 0,
        days: totalDays,
      };
    }

    // Calculate calendar years, months, days
    let years = today.getFullYear() - birth.getFullYear();
    let months = today.getMonth() - birth.getMonth();
    let days = today.getDate() - birth.getDate();

    if (days < 0) {
      months--;
      const prevMonth = new Date(today.getFullYear(), today.getMonth(), 0);
      days += prevMonth.getDate();
    }
    if (months < 0) {
      years--;
      months += 12;
    }

    // Under 1 month (< 30 days) -> show weeks and days
    if (years === 0 && months === 0) {
      const weeks = Math.floor(totalDays / 7);
      const remDays = totalDays % 7;
      const weekStr = `${weeks} ${weeks === 1 ? 'week' : 'weeks'}`;
      if (remDays === 0) {
        return {
          formatted: weekStr,
          short: `${weeks}w`,
          totalDays,
          years: 0,
          months: 0,
          weeks,
          days: 0,
        };
      }
      return {
        formatted: `${weekStr} and ${remDays} ${remDays === 1 ? 'day' : 'days'}`,
        short: `${weeks}w ${remDays}d`,
        totalDays,
        years: 0,
        months: 0,
        weeks,
        days: remDays,
      };
    }

    // Between 1 month and 1 year (years === 0, months > 0)
    if (years === 0) {
      const weeks = Math.floor(days / 7);
      const remDays = days % 7;
      const monthStr = `${months} ${months === 1 ? 'month' : 'months'}`;

      if (weeks > 0) {
        return {
          formatted: `${monthStr} and ${weeks} ${weeks === 1 ? 'week' : 'weeks'}`,
          short: `${months}m ${weeks}w`,
          totalDays,
          years: 0,
          months,
          weeks,
          days: remDays,
        };
      }
      if (remDays > 0) {
        return {
          formatted: `${monthStr} and ${remDays} ${remDays === 1 ? 'day' : 'days'}`,
          short: `${months}m ${remDays}d`,
          totalDays,
          years: 0,
          months,
          weeks: 0,
          days: remDays,
        };
      }
      return {
        formatted: monthStr,
        short: `${months}m`,
        totalDays,
        years: 0,
        months,
        weeks: 0,
        days: 0,
      };
    }

    // 1 year or older (years >= 1)
    const yearStr = `${years} ${years === 1 ? 'year' : 'years'}`;
    if (months > 0) {
      const monthStr = `${months} ${months === 1 ? 'month' : 'months'}`;
      return {
        formatted: `${yearStr} and ${monthStr}`,
        short: `${years}y ${months}m`,
        totalDays,
        years,
        months,
        weeks: Math.floor(days / 7),
        days: days % 7,
      };
    }

    const weeks = Math.floor(days / 7);
    if (weeks > 0) {
      return {
        formatted: `${yearStr} and ${weeks} ${weeks === 1 ? 'week' : 'weeks'}`,
        short: `${years}y ${weeks}w`,
        totalDays,
        years,
        months: 0,
        weeks,
        days: days % 7,
      };
    }

    return {
      formatted: yearStr,
      short: `${years}y`,
      totalDays,
      years,
      months: 0,
      weeks: 0,
      days: 0,
    };
  }

  // Fallback: Check if ringNo contains a 4-digit year like PH-2026-88001
  if (ringNo) {
    const match = ringNo.match(/(?:19|20)\d{2}/);
    if (match) {
      const ringYear = parseInt(match[0], 10);
      const currYear = today.getFullYear();
      const diffYears = currYear - ringYear;
      if (diffYears === 0) {
        // Assume early in the year hatch (e.g. Feb/March)
        const approxMonths = Math.max(1, today.getMonth() + 1);
        return {
          formatted: `~${approxMonths} mos (${ringYear} hatch)`,
          short: `~${approxMonths}m (${ringYear})`,
          totalDays: approxMonths * 30,
          years: 0,
          months: approxMonths,
          weeks: 0,
          days: 0,
          isEstimated: true,
        };
      } else if (diffYears > 0) {
        return {
          formatted: `${diffYears} ${diffYears === 1 ? 'year' : 'years'} (${ringYear} hatch)`,
          short: `${diffYears}y (${ringYear})`,
          totalDays: diffYears * 365,
          years: diffYears,
          months: 0,
          weeks: 0,
          days: 0,
          isEstimated: true,
        };
      }
    }
  }

  return null;
}
