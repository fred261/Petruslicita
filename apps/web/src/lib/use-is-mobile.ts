import { useEffect, useState } from "react";

const MOBILE_QUERY = "(max-width: 639px)";

/** Breakpoint alinhado ao `sm` do Tailwind — usado para decidir o estado inicial de seções colapsáveis. */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(() => window.matchMedia(MOBILE_QUERY).matches);

  useEffect(() => {
    const mql = window.matchMedia(MOBILE_QUERY);
    const onChange = () => setIsMobile(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isMobile;
}
