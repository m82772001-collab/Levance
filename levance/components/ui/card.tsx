import { cn } from "@/lib/utilities/cn";
import type { HTMLAttributes } from "react";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-lg border border-neutral-200 bg-white shadow-card",
        className
      )}
      {...props}
    />
  );
}
