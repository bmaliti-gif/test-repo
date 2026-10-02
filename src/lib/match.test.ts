import { describe, expect, it } from 'vitest';
import { budgetScore, genderCompatible, habitScore, matchScore, moveInScore, type MatchProfile } from './match';

const base: MatchProfile = {
  campus: 'unza',
  budget_min_ngwee: 90000,
  budget_max_ngwee: 120000,
  move_in_month: '2026-11-01',
  habits: ['Non-smoker', 'Early riser', 'Quiet study'],
  gender: 'female',
  same_gender_only: false,
};
const p = (over: Partial<MatchProfile>): MatchProfile => ({ ...base, ...over });

describe('matchScore', () => {
  it('gives 100 to an identical profile', () => {
    expect(matchScore(base, base)?.total).toBe(100);
  });

  it('adds up the four parts', () => {
    const r = matchScore(base, p({ campus: 'unilus', move_in_month: '2027-03-01', habits: [] }))!;
    expect(r).toEqual({ total: 40, budget: 40, campus: 0, moveIn: 0, habits: 0 });
  });

  it('respects "same gender only" both ways', () => {
    expect(matchScore(base, p({ gender: 'male', same_gender_only: true }))).toBeNull();
    expect(matchScore(p({ same_gender_only: true }), p({ gender: 'male' }))).toBeNull();
    expect(matchScore(p({ same_gender_only: true }), p({ gender: null }))).toBeNull();
    expect(matchScore(p({ same_gender_only: true }), base)?.total).toBe(100);
    expect(genderCompatible(base, p({ gender: 'male' }))).toBe(true);
  });
});

describe('budgetScore', () => {
  it('is full when one range sits inside the other', () => {
    expect(budgetScore(base, p({ budget_min_ngwee: 100000, budget_max_ngwee: 110000 }))).toBe(40);
  });
  it('is partial for a small overlap', () => {
    expect(budgetScore(base, p({ budget_min_ngwee: 115000, budget_max_ngwee: 200000 }))).toBe(20);
  });
  it('gives a little for a near miss and nothing for a big gap', () => {
    expect(budgetScore(base, p({ budget_min_ngwee: 130000, budget_max_ngwee: 150000 }))).toBe(15);
    expect(budgetScore(base, p({ budget_min_ngwee: 200000, budget_max_ngwee: 250000 }))).toBe(0);
  });
});

describe('moveInScore', () => {
  it('rewards moving in within a month', () => {
    expect(moveInScore(base, p({ move_in_month: '2026-12-01' }))).toBe(15);
    expect(moveInScore(base, p({ move_in_month: '2027-01-01' }))).toBe(7);
    expect(moveInScore(base, p({ move_in_month: '2027-02-01' }))).toBe(0);
  });
});

describe('habitScore', () => {
  it('scores shared habits against the shorter list', () => {
    expect(habitScore(base, p({ habits: ['Non-smoker'] }))).toBe(20);
    expect(habitScore(base, p({ habits: ['Non-smoker', 'Night owl'] }))).toBe(10);
    expect(habitScore(base, p({ habits: [] }))).toBe(0);
  });
});
