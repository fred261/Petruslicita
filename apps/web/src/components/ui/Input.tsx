import { type InputHTMLAttributes, forwardRef } from "react";
import clsx from "clsx";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <div className="w-full">
        <input
          ref={ref}
          className={clsx(
            "h-10 w-full rounded-md border bg-white px-3 text-sm text-ink-900 placeholder:text-ink-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-400",
            error ? "border-red-400" : "border-ink-100",
            className,
          )}
          {...props}
        />
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </div>
    );
  },
);
Input.displayName = "Input";
