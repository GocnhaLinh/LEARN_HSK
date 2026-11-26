import { useEffect, useState } from 'react';

/**
 * Tracks whether window.scrollY has passed `threshold` pixels using a passive listener.
 */
export function useScrollPast(threshold = 180): boolean {
  const [past, setPast] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const next = window.scrollY > threshold;
      setPast((prev) => (prev === next ? prev : next));
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [threshold]);

  return past;
}
