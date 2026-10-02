import { useId, type InputHTMLAttributes, type ReactNode } from 'react';

type FieldProps = {
  label: string;
  /** Plain-words problem with this field. */
  error?: string | null;
  /** Helpful note under the field (or a soft warning). */
  hint?: ReactNode;
  children: (ids: { id: string; describedBy: string | undefined; invalid: boolean }) => ReactNode;
};

/** Label + control + hint/error, wired up for screen readers. */
export function Field({ label, error, hint, children }: FieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {children({ id, describedBy, invalid: Boolean(error) })}
      {hint && (
        <p id={hintId} className="field-hint">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="field-error">
          {error}
        </p>
      )}
    </div>
  );
}

type TextFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> & {
  label: string;
  error?: string | null;
  hint?: ReactNode;
};

export function TextField({ label, error, hint, className, ...input }: TextFieldProps) {
  return (
    <Field label={label} error={error} hint={hint}>
      {({ id, describedBy, invalid }) => (
        <input
          id={id}
          className={className ? `input ${className}` : 'input'}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          {...input}
        />
      )}
    </Field>
  );
}
