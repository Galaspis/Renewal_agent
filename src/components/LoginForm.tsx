"use client";

import { useActionState } from "react";
import { login } from "@/app/actions";
import { btnPrimary, fieldClass, labelClass } from "./styles";

export function LoginForm() {
  const [state, action, pending] = useActionState(login, null);

  return (
    <form action={action} className="mt-8 space-y-4">
      {state?.error ? <p className="text-sm text-danger">{state.error}</p> : null}
      <label className={labelClass}>
        סיסמת משפחה
        <input
          className={fieldClass}
          type="password"
          name="password"
          autoComplete="current-password"
          dir="ltr"
          required
        />
      </label>
      <button type="submit" disabled={pending} className={`${btnPrimary} w-full`}>
        {pending ? "בודקים…" : "כניסה ללוח"}
      </button>
    </form>
  );
}
