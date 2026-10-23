"use client";

type Props = {
  action: (formData: FormData) => void | Promise<void>;
  message: string;
  children: React.ReactNode;
  className?: string;
};

export function ConfirmButton({ action, message, children, className }: Props) {
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!confirm(message)) event.preventDefault();
      }}
    >
      <button type="submit" className={className}>
        {children}
      </button>
    </form>
  );
}
