import { useId, type ReactNode } from 'react';
import { Blueprint } from '../../components/Blueprint';
import { LogoMark } from '../../components/Header';

/** Who is signing in. Owner is only for the app owner's email (checked after the password). */
export type SignInAs = 'tenant' | 'landlord' | 'owner';

/** The panel beside the sign-in and sign-up forms: the logo and "Welcome", nothing else. */
export function WelcomePanel() {
  return (
    <aside className="welcome-panel welcome-simple" aria-label="Welcome">
      <LogoMark size={52} />
      <h2 className="welcome-title">Welcome</h2>
    </aside>
  );
}

/** Student / Landlord (and, for sign-in, Owner) as one segmented choice. */
export function RoleChoice<T extends SignInAs>({
  label,
  value,
  onChange,
  withOwner = false,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  withOwner?: boolean;
}) {
  const id = useId();
  const options: { v: SignInAs; text: string }[] = [
    { v: 'tenant', text: 'Student' },
    { v: 'landlord', text: 'Landlord' },
    ...(withOwner ? [{ v: 'owner' as const, text: 'Owner' }] : []),
  ];
  return (
    <fieldset className="form-group role-choice">
      <legend id={`${id}-l`}>{label}</legend>
      <div className="seg seg-wide" role="radiogroup" aria-labelledby={`${id}-l`}>
        {options.map((o) => (
          <label key={o.v} className="seg-opt">
            <input type="radio" name={`${id}-role`} checked={value === o.v} onChange={() => onChange(o.v as T)} />
            {o.text}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** The frame shared by the sign-in pages. With `welcome`, the welcome panel sits beside the form. */
export function AuthCard({
  kicker,
  title,
  children,
  welcome,
}: {
  kicker?: string;
  title: string;
  children: ReactNode;
  welcome?: boolean;
}) {
  const form = (
    <div className="auth-main">
      <div>
        {kicker && <div className="kicker">{kicker}</div>}
        <h1>{title}</h1>
      </div>
      <Blueprint className="card auth-card">{children}</Blueprint>
    </div>
  );
  if (!welcome) return <div className="page auth-page">{form}</div>;
  return (
    <div className="page auth-split">
      <WelcomePanel />
      {form}
    </div>
  );
}
