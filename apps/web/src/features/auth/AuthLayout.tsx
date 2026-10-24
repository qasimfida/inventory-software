import { Boxes, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
export function AuthLayout({
  title,
  children,
  back = false,
}: {
  title: string;
  children: ReactNode;
  back?: boolean;
}) {
  return (
    <main className="auth-layout">
      <div className="auth-card space-y-5">
        {back && (
          <Link
            className="inline-flex min-h-(--target-size) items-center text-primary"
            to="/auth/login"
            aria-label="Back to sign in"
          >
            <ArrowLeft aria-hidden="true" />
          </Link>
        )}
        <div className="auth-brand">
          <Boxes className="auth-logo" aria-hidden="true" />
        </div>
        <h1 className="text-center text-2xl">{title}</h1>
        {children}
      </div>
    </main>
  );
}
