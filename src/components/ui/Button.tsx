import type { ButtonHTMLAttributes, PropsWithChildren } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "success";

type ButtonProps = PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }>;

const variants: Record<ButtonVariant, string> = {
  primary: "bg-casa-cyan text-white hover:bg-cyan-700 focus:ring-casa-cyan",
  secondary: "bg-slate-900 text-white hover:bg-slate-700 focus:ring-slate-500 dark:bg-white dark:text-slate-950",
  ghost: "bg-transparent text-slate-700 hover:bg-slate-100 focus:ring-slate-300 dark:text-slate-200 dark:hover:bg-slate-800",
  danger: "bg-casa-error text-white hover:bg-red-700 focus:ring-red-500",
  success: "bg-casa-green text-white hover:bg-emerald-700 focus:ring-emerald-500"
};

export function Button({ className = "", variant = "primary", children, ...props }: ButtonProps) {
  return (
    <button
      className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 dark:focus:ring-offset-slate-950 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
