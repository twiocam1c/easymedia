import type { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "ghost" | "danger";
  size?: "md" | "lg";
}

/** 主操作按钮。primary 用于核心动作(开始压缩),其余为次级。 */
export function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...rest
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all duration-200 ease-out-expo disabled:cursor-not-allowed disabled:opacity-40";
  const sizes = {
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base",
  };
  const variants = {
    primary:
      "bg-accent text-white hover:bg-accent-hover hover:shadow-lg hover:shadow-accent/25 active:scale-[0.98]",
    ghost:
      "bg-surface-overlay text-ink hover:bg-white/10 active:scale-[0.98]",
    danger:
      "bg-danger/15 text-danger hover:bg-danger/25 active:scale-[0.98]",
  };
  return (
    <button
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
