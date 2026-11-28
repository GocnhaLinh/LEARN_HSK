import { type RefObject, useEffect } from 'react';

const REVEAL_SELECTOR = '.t-card, .t-card-flat, .t-banner';
const STAGGER_STEP_MS = 85;
const MAX_STAGGER_MS = 425;

/**
 * Automatically animates cards/boxes (.t-card, .t-card-flat, .t-banner) inside `containerRef`
 * on initial mount and whenever they scroll into the viewport — across every page.
 */
export function useScrollReveal(containerRef: RefObject<HTMLElement | null>, resetKey: string) {
  useEffect(() => {
    const root = containerRef.current;
    if (!root || typeof window === 'undefined' || !('IntersectionObserver' in window)) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

    const cleanupTimers = new Map<HTMLElement, number>();
    const pending = new Set<HTMLElement>();

    const finishReveal = (el: HTMLElement) => {
      const tid = cleanupTimers.get(el);
      if (tid !== undefined) {
        window.clearTimeout(tid);
        cleanupTimers.delete(el);
      }
      pending.delete(el);
      el.classList.remove('reveal-box', 'is-revealed');
      el.style.removeProperty('--reveal-delay');
    };

    const revealElement = (el: HTMLElement, delayMs: number) => {
      if (el.classList.contains('is-revealed')) return;
      el.style.setProperty('--reveal-delay', `${delayMs}ms`);
      el.classList.add('is-revealed');
      el.addEventListener('animationend', () => finishReveal(el), { once: true });
      // Safety cleanup in case animationend doesn't fire (e.g. element hidden mid-animation)
      const tid = window.setTimeout(() => finishReveal(el), delayMs + 850);
      cleanupTimers.set(el, tid);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        let batchIdx = 0;
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const el = entry.target as HTMLElement;
          observer.unobserve(el);
          revealElement(el, Math.min(batchIdx * STAGGER_STEP_MS, MAX_STAGGER_MS));
          batchIdx++;
        }
      },
      { threshold: 0.01, rootMargin: '0px 0px -20px 0px' },
    );

    const bindBox = (el: HTMLElement) => {
      if (el.dataset.revealBound === '1') return;
      if (el.closest('[role="dialog"], [data-no-reveal]')) return;
      el.dataset.revealBound = '1';
      el.classList.add('reveal-box');
      pending.add(el);
      observer.observe(el);
    };

    const scan = (scope: ParentNode) => {
      if (scope instanceof HTMLElement && scope.matches(REVEAL_SELECTOR)) {
        bindBox(scope);
      }
      scope.querySelectorAll<HTMLElement>(REVEAL_SELECTOR).forEach(bindBox);
    };

    scan(root);

    // Watch for lazy-loaded pages, async React Query lists & toggled panels
    const mutObserver = new MutationObserver((mutations) => {
      for (const m of mutations) {
        for (const node of m.addedNodes) {
          if (node instanceof HTMLElement) scan(node);
        }
      }
    });
    mutObserver.observe(root, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      mutObserver.disconnect();
      cleanupTimers.forEach((tid) => window.clearTimeout(tid));
      cleanupTimers.clear();
      // Reset any elements that didn't finish revealing (fixes React StrictMode double-effect & HMR)
      pending.forEach((el) => {
        delete el.dataset.revealBound;
        el.classList.remove('reveal-box', 'is-revealed');
        el.style.removeProperty('--reveal-delay');
      });
      pending.clear();
    };
  }, [containerRef, resetKey]);
}
