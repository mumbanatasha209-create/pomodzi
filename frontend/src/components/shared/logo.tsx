import { cn } from "@/lib/utils";

export function Logo({
  className,
  size = 36,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <span
      className={cn(
        "relative inline-flex items-center justify-center rounded-xl brand-gradient font-bold text-primary-foreground shadow-[0_6px_20px_-6px_hsl(var(--primary)/0.8)]",
        className,
      )}
      style={{ width: size, height: size, fontSize: size * 0.5 }}
      aria-hidden
    >
      P
      <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-[hsl(var(--brand-violet))] ring-2 ring-background" />
    </span>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <Logo size={32} />
      <span className="text-[17px] font-semibold tracking-tight">
        Pamodzi
      </span>
    </div>
  );
}
