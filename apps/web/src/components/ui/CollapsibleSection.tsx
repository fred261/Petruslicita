import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import clsx from "clsx";
import { Card, CardContent, CardHeader, CardTitle } from "./Card";
import { useIsMobile } from "@/lib/use-is-mobile";

interface CollapsibleSectionProps {
  title: string;
  children: ReactNode;
  /** Força o estado inicial. Sem isso, abre em telas grandes e fecha em telas pequenas (spec: acordeões no mobile). */
  defaultOpen?: boolean;
  contentClassName?: string;
}

export function CollapsibleSection({ title, children, defaultOpen, contentClassName }: CollapsibleSectionProps) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(defaultOpen ?? !isMobile);

  return (
    <Card>
      <CardHeader
        className="cursor-pointer select-none"
        role="button"
        tabIndex={0}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen((v) => !v);
          }
        }}
      >
        <div className="flex items-center justify-between gap-2">
          <CardTitle>{title}</CardTitle>
          <ChevronDown className={clsx("h-4 w-4 shrink-0 text-ink-400 transition-transform", open && "rotate-180")} />
        </div>
      </CardHeader>
      {open && <CardContent className={contentClassName}>{children}</CardContent>}
    </Card>
  );
}
