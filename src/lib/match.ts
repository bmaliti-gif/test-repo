// Roommate match score, 0–100 (PLAN.md Block 10):
//   budget overlap 40 · same campus 25 · move-in within a month 15 · shared habits 20.
// "Same gender only" is respected both ways: such pairs are not shown at all.
import type { Gender } from './database.types';

export type MatchProfile = {
  campus: string;
  budget_min_ngwee: number;
  budget_max_ngwee: number;
  /** First of the month, "2026-11-01". */
  move_in_month: string;
  habits: string[];
  gender: Gender | null;
  same_gender_only: boolean;
};

export type MatchBreakdown = { total: number; budget: number; campus: number; moveIn: number; habits: number };

/** Can these two see each other, given any "same gender only" preference? */
export function genderCompatible(a: MatchProfile, b: MatchProfile): boolean {
  if (!a.same_gender_only && !b.same_gender_only) return true;
  return a.gender !== null && a.gender === b.gender;
}

/** 40 for overlapping budgets (more when one range sits inside the other); a little for a near miss. */
export function budgetScore(a: MatchProfile, b: MatchProfile): number {
  const overlap = Math.min(a.budget_max_ngwee, b.budget_max_ngwee) - Math.max(a.budget_min_ngwee, b.budget_min_ngwee);
  if (overlap < 0) {
    // Within K200 of each other: worth a conversation.
    return -overlap <= 20000 ? 15 : 0;
  }
  const narrower = Math.min(a.budget_max_ngwee - a.budget_min_ngwee, b.budget_max_ngwee - b.budget_min_ngwee);
  if (narrower <= 0) return 40;
  return Math.round(40 * Math.max(0.5, Math.min(1, overlap / narrower)));
}

function monthIndex(isoMonth: string): number {
  const [y, m] = isoMonth.split('-').map(Number);
  return y * 12 + (m - 1);
}

export function moveInScore(a: MatchProfile, b: MatchProfile): number {
  const gap = Math.abs(monthIndex(a.move_in_month) - monthIndex(b.move_in_month));
  if (gap <= 1) return 15;
  if (gap === 2) return 7;
  return 0;
}

export function habitScore(a: MatchProfile, b: MatchProfile): number {
  if (a.habits.length === 0 || b.habits.length === 0) return 0;
  const shared = a.habits.filter((h) => b.habits.includes(h)).length;
  return Math.round((20 * shared) / Math.min(a.habits.length, b.habits.length));
}

/** Score `other` for `me`. null when a "same gender only" preference rules the pair out. */
export function matchScore(me: MatchProfile, other: MatchProfile): MatchBreakdown | null {
  if (!genderCompatible(me, other)) return null;
  const budget = budgetScore(me, other);
  const campus = me.campus === other.campus ? 25 : 0;
  const moveIn = moveInScore(me, other);
  const habits = habitScore(me, other);
  return { total: Math.min(100, budget + campus + moveIn + habits), budget, campus, moveIn, habits };
}
