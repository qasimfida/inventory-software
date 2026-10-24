import type { ReactNode } from 'react';
import { Boxes } from 'lucide-react';
export function SignInLayout({ signedIn, children }: { signedIn: boolean; children: ReactNode }) {
  if (signedIn) return children;
  return (
    <div className="auth-stage">
      <div className="auth-card">
        <div className="auth-brand">
          <Boxes aria-hidden="true" size={36} />
          <h1 className="sr-only">Inventory</h1>
        </div>
        {children}
      </div>
    </div>
  );
}
