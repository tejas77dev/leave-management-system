"use client";

import { useFormStatus } from "react-dom";

const VARIANTS = {
  primary:
    "bg-brand-600 text-white shadow-sm hover:bg-brand-700 active:bg-brand-800 disabled:bg-brand-300",
  approve:
    "bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 active:bg-emerald-800 disabled:bg-emerald-300",
  reject: "bg-rose-600 text-white shadow-sm hover:bg-rose-700 active:bg-rose-800 disabled:bg-rose-300",
  secondary:
    "bg-white text-slate-700 shadow-sm ring-1 ring-slate-300 ring-inset hover:bg-slate-50 active:bg-slate-100 disabled:text-slate-400",
  ghost: "text-slate-500 hover:bg-slate-100 hover:text-slate-900",
} as const;

const SIZES = {
  sm: "px-2.5 py-1.5 text-xs",
  md: "px-3.5 py-2 text-sm",
} as const;

export function SubmitButton({
  children,
  pendingLabel = "Saving...",
  variant = "primary",
  size = "md",
  name,
  value,
  title,
  className = "",
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  variant?: keyof typeof VARIANTS;
  size?: keyof typeof SIZES;
  name?: string;
  value?: string;
  title?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      name={name}
      value={value}
      title={title}
      disabled={pending}
      className={`inline-flex items-center justify-center rounded-lg font-medium transition-colors disabled:cursor-not-allowed ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
