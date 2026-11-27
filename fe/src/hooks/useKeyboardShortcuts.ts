import { useEffect, useRef } from "react";

const EDITABLE_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"]);

export function useKeyboardShortcuts(
  handlers: Record<string, (e: KeyboardEvent) => void>,
  enabled = true,
): void {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (!enabled) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.isComposing || e.ctrlKey || e.metaKey || e.altKey) return;
      const el = document.activeElement as HTMLElement | null;
      if (el && (EDITABLE_TAGS.has(el.tagName.toUpperCase()) || el.isContentEditable)) {
        return;
      }
      const action = handlersRef.current[e.code] ?? handlersRef.current[e.key];
      action?.(e);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enabled]);
}
