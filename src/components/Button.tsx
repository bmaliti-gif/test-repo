import type { ButtonHTMLAttributes } from 'react';
import { Corners } from './Blueprint';

type Variant = 'primary' | 'secondary' | 'ghost';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  /** Square icon-only button (36px). Give it an aria-label. */
  icon?: boolean;
  /** Full width. */
  block?: boolean;
};

/** Design-system button. The primary variant is always a blueprint object with corner marks. */
export function Button({ variant = 'secondary', icon, block, className, type = 'button', children, ...rest }: ButtonProps) {
  const classes = ['btn', `btn-${variant}`];
  if (icon) classes.push('btn-icon');
  if (block) classes.push('btn-block');
  if (variant === 'primary') classes.push('blueprint');
  if (className) classes.push(className);

  return (
    <button type={type} className={classes.join(' ')} {...rest}>
      {variant === 'primary' && <Corners />}
      {children}
    </button>
  );
}
