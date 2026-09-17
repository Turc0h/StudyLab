import { useState, useEffect } from "react";

export function useDelayedRender(isOpen: boolean, delayMs = 300): boolean {
  const [shouldRender, setShouldRender] = useState(isOpen);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
    } else {
      const timer = setTimeout(() => {
        setShouldRender(false);
      }, delayMs);
      return () => clearTimeout(timer);
    }
  }, [isOpen, delayMs]);

  return shouldRender;
}
