"use client";

import { useFormState, useFormStatus } from "react-dom";
import { loginAction } from "../_actions/auth";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full bg-accent-teal text-surface-base font-semibold py-2.5 rounded text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
    >
      {pending ? "Signing in…" : "Sign in"}
    </button>
  );
}

export default function AdminLoginPage() {
  const [state, action] = useFormState(loginAction, {});

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-base px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <p className="text-xs font-semibold tracking-widest uppercase text-text-secondary mb-2">
            Park Ridge Land History
          </p>
          <h1 className="text-2xl font-bold text-text-primary">Admin</h1>
        </div>

        <div className="bg-surface-raised border border-surface-border rounded-lg p-6">
          <form action={action} className="space-y-4">
            {state.error && (
              <p className="text-accent-red text-sm bg-accent-red/10 border border-accent-red/20 rounded px-3 py-2">
                {state.error}
              </p>
            )}

            <div>
              <label
                htmlFor="username"
                className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1"
              >
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                required
                className="w-full bg-surface-card border border-surface-border rounded px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-teal/60 transition-colors"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1"
              >
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="w-full bg-surface-card border border-surface-border rounded px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-teal/60 transition-colors"
              />
            </div>

            <SubmitButton />
          </form>
        </div>
      </div>
    </div>
  );
}
