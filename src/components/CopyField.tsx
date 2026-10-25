"use client";

import { useState } from "react";
import { fieldClass, labelClass } from "./styles";

/** A read-only value with a copy link beside it. */
export function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Older browsers: the field is selectable, the user can copy by hand.
    }
  }
  return (
    <label className={labelClass}>
      <span className="flex items-baseline justify-between">
        {label}
        <button type="button" onClick={copy} className="text-sm font-medium text-accent hover:underline">
          {copied ? "הועתק" : "העתקה"}
        </button>
      </span>
      <input className={fieldClass} readOnly dir="ltr" value={value} onFocus={(e) => e.currentTarget.select()} />
    </label>
  );
}
