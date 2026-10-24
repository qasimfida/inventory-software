import { useLayoutEffect, useRef } from 'react';
/** Fits both the initial below-toolbar position and the later sticky position. */
export function useCartHeight() {
  const ref = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const cart = ref.current;
    if (!cart) return;
    let frame = 0;
    const measure = () => {
      const top = Math.max(0, cart.getBoundingClientRect().top);
      const value = `${Math.round(top)}px`;
      if (cart.style.getPropertyValue('--pos-cart-top') !== value)
        cart.style.setProperty('--pos-cart-top', value);
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    const observer = new ResizeObserver(schedule);
    if (cart.parentElement) observer.observe(cart.parentElement);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, []);
  return ref;
}
