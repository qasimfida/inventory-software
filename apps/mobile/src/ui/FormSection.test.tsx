// @vitest-environment jsdom
import { useState } from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
vi.mock('react-native-safe-area-context', () => import('./safe-area-test-adapter'));
vi.mock('react-native', () => vi.importActual('react-native-web'));
import { FormSection } from './FormSection';
import { Field } from './Controls';
afterEach(cleanup);
it('keeps native field drafts while collapsed and announces expansion', async () => {
  function Example() {
    const [value, setValue] = useState('');
    return (
      <FormSection title="Optional details" defaultOpen>
        <Field label="Description" value={value} onChange={setValue} />
      </FormSection>
    );
  }
  render(<Example />);
  const user = userEvent.setup();
  await user.type(screen.getByLabelText('Description'), 'Keep this draft');
  const toggle = screen.getByRole('button', { name: 'Optional details' });
  await user.click(toggle);
  expect(toggle.getAttribute('aria-expanded')).toBe('false');
  expect(screen.queryByRole('textbox')).toBeNull();
  await user.click(toggle);
  expect(screen.getByLabelText<HTMLInputElement>('Description').value).toBe('Keep this draft');
});
