import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary/15 text-primary",
        secondary: "border-border/60 bg-secondary text-secondary-foreground",
        success:
          "border-transparent bg-[hsl(var(--success)/0.15)] text-[hsl(var(--success))]",
        warning:
          "border-transparent bg-[hsl(var(--warning)/0.15)] text-[hsl(var(--warning))]",
        destructive:
          "border-transparent bg-destructive/15 text-destructive",
        chain:
          "border-transparent bg-[hsl(var(--brand-violet)/0.16)] text-[hsl(var(--brand-violet))]",
        outline: "border-border text-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean;
}

function Badge({ className, variant, dot, children, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props}>
      {dot ? (
        <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
      ) : null}
      {children}
    </div>
  );
}

export { Badge, badgeVariants };
