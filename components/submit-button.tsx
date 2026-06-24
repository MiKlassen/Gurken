"use client";

import { useFormStatus } from "react-dom";

type SubmitButtonProps = {
  children: React.ReactNode;
  className?: string;
  confirmMessage?: string;
  pendingLabel?: string;
};

export function SubmitButton({ children, className, confirmMessage, pendingLabel = "Speichert..." }: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      className={className || "button primary"}
      type="submit"
      disabled={pending}
      onClick={(event) => {
        if (confirmMessage && !window.confirm(confirmMessage)) {
          event.preventDefault();
        }
      }}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
