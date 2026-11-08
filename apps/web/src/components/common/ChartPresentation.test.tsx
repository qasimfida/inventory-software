// @vitest-environment jsdom
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { ChartPresentation } from './ChartPresentation';
import { AppearanceProvider } from '@/theme/Appearance';
afterEach(cleanup);
it('numbers keeps values and allows revealing the same chart without mutation', () => {
  render(
    <AppearanceProvider preview previewPreferences={{ charts: 'numbers' }}>
      <ChartPresentation label="Sales chart" values={<p>Exact sales: 123.45</p>}>
        <span>Chart marks</span>
      </ChartPresentation>
    </AppearanceProvider>,
  );
  expect(screen.getByText('Exact sales: 123.45')).toBeTruthy();
  expect(screen.queryByText('Chart marks')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Show Sales chart' }));
  expect(screen.getByText('Chart marks')).toBeTruthy();
  expect(screen.getByText('Exact sales: 123.45')).toBeTruthy();
});
it('preview applies independent axes and restores prior attributes', () => {
  document.documentElement.dataset.controlSize = 'small';
  const view = render(
    <AppearanceProvider
      preview
      previewPreferences={{ controlSize: 'large', density: 'compact', animation: 'off' }}
    >
      <span>Preview</span>
    </AppearanceProvider>,
  );
  expect(document.documentElement.dataset.controlSize).toBe('large');
  expect(document.documentElement.dataset.density).toBe('compact');
  expect(document.documentElement.dataset.motion).toBe('disabled');
  view.unmount();
  expect(document.documentElement.dataset.controlSize).toBe('small');
  delete document.documentElement.dataset.controlSize;
});
