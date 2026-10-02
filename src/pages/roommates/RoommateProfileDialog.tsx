import { useEffect, useId, useState, type FormEvent } from 'react';
import { Check } from 'lucide-react';
import { Button } from '../../components/Button';
import { Dialog } from '../../components/Dialog';
import { Notice } from '../../components/Status';
import { useToast } from '../../components/Toast';
import { HABITS } from '../../data/habits';
import type { Gender } from '../../lib/database.types';
import { MATE_CAMPUSES, useSaveRoommateProfile, type RoommateProfile } from '../../lib/roommates';

type Props = {
  open: boolean;
  onClose: () => void;
  current: RoommateProfile | null;
  defaultCampus: string | null;
};

const nextMonth = () => {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

export function RoommateProfileDialog({ open, onClose, current, defaultCampus }: Props) {
  const ids = useId();
  const toast = useToast();
  const save = useSaveRoommateProfile();
  const [campus, setCampus] = useState('unza');
  const [min, setMin] = useState('');
  const [max, setMax] = useState('');
  const [month, setMonth] = useState(nextMonth());
  const [habits, setHabits] = useState<string[]>([]);
  const [gender, setGender] = useState<Gender | ''>('');
  const [sameOnly, setSameOnly] = useState(false);
  const [bio, setBio] = useState('');
  const [visible, setVisible] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setCampus(current?.campus ?? (MATE_CAMPUSES.some((c) => c.id === defaultCampus) ? defaultCampus! : 'unza'));
    setMin(current ? String(current.budget_min_ngwee / 100) : '');
    setMax(current ? String(current.budget_max_ngwee / 100) : '');
    setMonth(current ? current.move_in_month.slice(0, 7) : nextMonth());
    setHabits(current?.habits ?? []);
    setGender(current?.gender ?? '');
    setSameOnly(current?.same_gender_only ?? false);
    setBio(current?.bio ?? '');
    setVisible(current?.visible ?? true);
    setError(null);
  }, [open, current, defaultCampus]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const lo = Number(min);
    const hi = Number(max);
    if (!lo || !hi || lo < 100 || hi > 20000) return setError('Enter your budget in Kwacha a month, e.g. 900 to 1,200.');
    if (hi < lo) return setError('The top of your budget should be at least the bottom.');
    if (!/^\d{4}-\d{2}$/.test(month)) return setError('Choose the month you want to move in.');
    if (sameOnly && !gender) return setError('To match with the same gender only, tell us your gender.');
    setError(null);
    try {
      await save.mutateAsync({
        exists: Boolean(current),
        input: {
          campus,
          budget_min_ngwee: Math.round(lo * 100),
          budget_max_ngwee: Math.round(hi * 100),
          move_in_month: `${month}-01`,
          habits,
          gender: gender || null,
          same_gender_only: sameOnly,
          bio: bio.trim().slice(0, 280),
          visible,
        },
      });
      onClose();
      toast(current ? 'Roommate profile updated.' : 'Roommate profile created. Your match scores are ready.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title={current ? 'Edit my roommate profile' : 'Create my roommate profile'} className="mate-dialog" dismissible={!save.isPending}>
      <form className="form" onSubmit={submit} noValidate>
        {error && <Notice tone="error">{error}</Notice>}
        <fieldset className="form-group">
          <legend>Campus</legend>
          <div className="seg seg-wide">
            {MATE_CAMPUSES.map((c) => (
              <label key={c.id} className="seg-opt">
                <input type="radio" name={`${ids}-campus`} checked={campus === c.id} onChange={() => setCampus(c.id)} />
                {c.label}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="form-row">
          <div className="field">
            <label htmlFor={`${ids}-min`}>Budget from (K / month)</label>
            <input id={`${ids}-min`} className="input" inputMode="numeric" placeholder="900" value={min} onChange={(e) => setMin(e.target.value.replace(/\D/g, ''))} data-autofocus />
          </div>
          <div className="field">
            <label htmlFor={`${ids}-max`}>Budget up to (K / month)</label>
            <input id={`${ids}-max`} className="input" inputMode="numeric" placeholder="1200" value={max} onChange={(e) => setMax(e.target.value.replace(/\D/g, ''))} />
          </div>
        </div>
        <div className="field">
          <label htmlFor={`${ids}-month`}>Move-in month</label>
          <input id={`${ids}-month`} className="input" type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
        </div>
        <fieldset className="form-group">
          <legend>How you live (choose a few)</legend>
          <div className="chip-list">
            {HABITS.map((h) => {
              const on = habits.includes(h);
              return (
                <button key={h} type="button" className={on ? 'chip is-on' : 'chip'} aria-pressed={on} onClick={() => setHabits(on ? habits.filter((x) => x !== h) : [...habits, h])}>
                  {on && <Check size={13} strokeWidth={1.5} aria-hidden="true" />}
                  {h}
                </button>
              );
            })}
          </div>
        </fieldset>
        <div className="form-row">
          <div className="field">
            <label htmlFor={`${ids}-gender`}>Gender (optional)</label>
            <select id={`${ids}-gender`} className="input" value={gender} onChange={(e) => setGender(e.target.value as Gender | '')}>
              <option value="">Prefer not to say</option>
              <option value="female">Female</option>
              <option value="male">Male</option>
            </select>
          </div>
          <label className="check same-gender">
            <input type="checkbox" checked={sameOnly} onChange={(e) => setSameOnly(e.target.checked)} />
            Match me with the same gender only
          </label>
        </div>
        <div className="field">
          <label htmlFor={`${ids}-bio`}>A line about you (optional)</label>
          <textarea id={`${ids}-bio`} className="input" rows={3} maxLength={280} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="e.g. 3rd-year Law, quiet during the week, I cook on Sundays." />
          <p className="field-hint">{bio.length}/280</p>
        </div>
        <label className="check">
          <input type="checkbox" checked={visible} onChange={(e) => setVisible(e.target.checked)} />
          Show my profile to other members
        </label>
        <div className="dialog-actions">
          <Button variant="ghost" onClick={onClose} disabled={save.isPending}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={save.isPending}>
            {save.isPending ? 'Saving…' : 'Save profile'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
