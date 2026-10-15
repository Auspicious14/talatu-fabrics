"use client";

import { useActionState } from "react";
import { signIn } from "../../actions";

export default function AdminLoginPage() {
  const [state, action, pending] = useActionState(signIn, {} as { error?: string });
  const field = "h-12 w-full border border-line bg-ivory px-3 focus:border-wine focus:outline-none";
  return (
    <div className="flex min-h-dvh items-center justify-center bg-cream px-5">
      <form action={action} className="w-full max-w-sm border border-line bg-ivory p-8 shadow-soft">
        <p className="eyebrow mb-2">Talatu Fabrics</p>
        <h1 className="text-4xl">Owner sign in</h1>
        <div className="mt-8 space-y-5">
          <div>
            <label htmlFor="email" className="eyebrow mb-2 block">Email</label>
            <input id="email" name="email" type="email" autoComplete="email" required className={field} />
          </div>
          <div>
            <label htmlFor="password" className="eyebrow mb-2 block">Password</label>
            <input id="password" name="password" type="password" autoComplete="current-password" required className={field} />
          </div>
          {state.error ? <p role="alert" className="text-sm text-warn">{state.error}</p> : null}
          <button
            type="submit"
            disabled={pending}
            className="h-12 w-full bg-wine text-xs font-medium uppercase tracking-[0.18em] text-ivory hover:bg-wine-deep disabled:opacity-60"
          >
            {pending ? "Signing in…" : "Sign in"}
          </button>
        </div>
      </form>
    </div>
  );
}
