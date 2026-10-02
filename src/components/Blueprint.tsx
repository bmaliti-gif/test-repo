import type { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react';

type BlueprintProps<T extends ElementType> = {
  as?: T;
  className?: string;
  children?: ReactNode;
} & Omit<ComponentPropsWithoutRef<T>, 'as' | 'className' | 'children'>;

/** The four "+" registration marks of a blueprint object. */
export function Corners() {
  return (
    <>
      <i className="corner tl" aria-hidden="true" />
      <i className="corner tr" aria-hidden="true" />
      <i className="corner bl" aria-hidden="true" />
      <i className="corner br" aria-hidden="true" />
    </>
  );
}

/**
 * A blueprint object: hairline frame, square corners and four corner marks.
 * Use it for cards and figures. Cards stay transparent line drawings.
 */
export function Blueprint<T extends ElementType = 'div'>({ as, className, children, ...rest }: BlueprintProps<T>) {
  const Tag: ElementType = as ?? 'div';
  return (
    <Tag className={className ? `blueprint ${className}` : 'blueprint'} {...rest}>
      <Corners />
      {children}
    </Tag>
  );
}
