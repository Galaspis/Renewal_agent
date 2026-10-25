"use client";

import { useRef } from "react";

// A text link that opens the file picker and uploads on choice. No visible input, no
// second "upload" button.
export function FilePicker({
  action,
  label,
  className,
}: {
  action: (formData: FormData) => void | Promise<void>;
  label: string;
  className?: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <form ref={formRef} action={action}>
      <input
        ref={inputRef}
        type="file"
        name="file"
        accept=".pdf,image/*"
        className="sr-only"
        onChange={() => formRef.current?.requestSubmit()}
      />
      <button type="button" className={className} onClick={() => inputRef.current?.click()}>
        {label}
      </button>
    </form>
  );
}
