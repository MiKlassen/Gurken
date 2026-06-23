"use client";

import { useFormStatus } from "react-dom";

type SubmitButtonProps = {
  children: React.ReactNode;
  className?: string;
  pendingLabel?: string;
};

export function SubmitButton({ children, className, pendingLabel = "Speichert..." }: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button className={className || "button primary"} type="submit" disabled={pending}>
      {pending ? pendingLabel : children}
    </button>
  );
}
