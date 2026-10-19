import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { ErrorState, LoadingState } from '@/components/common/AsyncState';

it('renders loading feedback as a status announcement', () => {
  const html = renderToStaticMarkup(<LoadingState message="Connecting…" />);
  expect(html).toContain('role="status"');
  expect(html).toContain('Connecting…');
});

it('renders an error announcement with a keyboard-operable retry button', () => {
  const html = renderToStaticMarkup(
    <ErrorState message="Connection failed." onRetry={() => undefined} />,
  );
  expect(html).toContain('role="alert"');
  expect(html).toContain('<button');
  expect(html).toContain('Try again');
});
