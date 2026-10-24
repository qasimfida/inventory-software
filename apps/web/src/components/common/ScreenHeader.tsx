import { createContext, useContext } from 'react';
export const PageTitleContext = createContext('');
import type { ReactNode } from 'react';

/** Presentation only. Owners provide existing copy, actions and permission checks. */
export function ScreenHeader({
  title,
  description,
  actions,
  level = 2,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  level?: 2 | 3;
}) {
  const pageTitle = useContext(PageTitleContext);
  const duplicate = typeof title === 'string' && title === pageTitle;
  if (duplicate && !description && !actions) return null;
  const Heading = level === 2 ? 'h2' : 'h3';
  return (
    <header className="screen-header">
      <div className="screen-heading">
        {!duplicate && <Heading>{title}</Heading>}
        {description && <p className="screen-description">{description}</p>}
      </div>
      {actions && <div className="screen-actions">{actions}</div>}
    </header>
  );
}
