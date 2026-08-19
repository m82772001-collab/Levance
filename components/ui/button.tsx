import { cn } from "@/lib/utilities/cn";
import type { ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-obsidian text-ivory hover:bg-neutral-800 disabled:bg-neutral-300",
  secondary:
    "bg-transparent text-obsidian border border-obsidian hover:bg-obsidian hover:text-ivory disabled:opacity-40",
  ghost:
    "bg-transparent text-obsidian hover:bg-neutral-100 disabled:opacity-40",
};

export function Button({
  variant = "primary",
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded px-6 py-3 text-sm font-medium tracking-wide transition-colors duration-300 ease-signature disabled:cursor-not-allowed",
        variantClasses[variant],
        className
      )}
      {...props}
    />
  );
}
