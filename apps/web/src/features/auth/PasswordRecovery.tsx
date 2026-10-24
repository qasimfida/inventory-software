import { AccordionSection } from '@/components/ui/Accordion';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { AuthenticationError } from '@inventory/api-client';
import { authClient } from '@/platform/auth-client';
import { Input } from '@/components/ui/FormControls';
import { Button } from '@/components/ui/Button';
import { lockOffline } from '../offline/offline-lock';

export function PasswordRecovery() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget;
    const values = new FormData(form);
    form.reset();
    setBusy(true);
    setMessage('');
    lockOffline();
    try {
      await authClient.resetPassword(
        String(values.get('email')),
        String(values.get('password')),
        String(values.get('code')),
      );
      setMessage('Password reset. All online sessions ended. Sign in with your new password.');
    } catch (error) {
      setMessage(
        error instanceof AuthenticationError
          ? error.message
          : 'Reset was not confirmed. Try signing in with the new password before requesting another code.',
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <AccordionSection
      className="rounded-lg border p-4"
      title={<>Forgot password / recovery code</>}
    >
      <p className="my-3 text-sm">
        Contact your trusted account operator for a recovery code after identity verification. No
        email is sent by this application. Codes expire after 30 minutes.
      </p>
      <form onSubmit={(event) => void submit(event)} className="space-y-3">
        <label htmlFor="recovery-email">Recovery account email</label>
        <Input
          id="recovery-email"
          name="email"
          type="email"
          autoComplete="username"
          required
          maxLength={254}
          disabled={busy}
        />
        <label htmlFor="recovery-code">Recovery code</label>
        <Input
          id="recovery-code"
          name="code"
          type="password"
          autoComplete="off"
          required
          minLength={43}
          maxLength={43}
          disabled={busy}
        />
        <label htmlFor="recovery-password">New password (15–128 characters)</label>
        <Input
          id="recovery-password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={15}
          maxLength={128}
          disabled={busy}
        />
        <Button type="submit" disabled={busy}>
          {busy ? 'Resetting password…' : 'Reset password'}
        </Button>
        {message && <p role="status">{message}</p>}
      </form>
    </AccordionSection>
  );
}
