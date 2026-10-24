import { useEffect, useId, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Circle, Menu } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
export function SectionNavigation({
  items,
  current,
  onSelect,
  label = 'Workspace sections',
  sticky = false,
  rail = false,
}: {
  items: { name: string; label: string; Icon?: LucideIcon | undefined }[];
  current: string;
  onSelect: (name: string) => void;
  label?: string;
  sticky?: boolean;
  rail?: boolean;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const itemsId = useId();
  const itemsRef = useRef<HTMLDivElement>(null);
  const focusedControl = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    if (!rail) return;
    const desktop = window.matchMedia?.('(min-width: 1024px)');
    const restoreVisibleFocus = () => {
      const active =
        document.activeElement === document.body ? focusedControl.current : document.activeElement;
      if (!(active instanceof HTMLElement) || active.getClientRects().length) return;
      if (desktop?.matches && active === trigger.current) {
        const currentItem = itemsRef.current?.querySelector<HTMLButtonElement>(
          'button[aria-current="page"]',
        );
        (currentItem ?? itemsRef.current?.querySelector('button'))?.focus();
      } else if (!desktop?.matches && itemsRef.current?.contains(active)) {
        trigger.current?.focus();
      }
    };
    desktop?.addEventListener('change', restoreVisibleFocus);
    return () => desktop?.removeEventListener('change', restoreVisibleFocus);
  }, [rail]);
  const focusTrigger = () => {
    if (trigger.current?.getClientRects().length) trigger.current.focus();
  };
  return (
    <nav
      aria-label={label}
      data-rail={rail}
      data-slot="section-navigation"
      className={`flex flex-wrap gap-2 rounded-xl bg-sidebar p-2 text-sidebar-foreground lg:flex-col ${sticky ? 'lg:sticky lg:top-4' : ''} ${rail ? 'lg:items-center' : ''}`}
    >
      {rail && (
        <Button
          ref={trigger}
          variant="ghost"
          className="lg:hidden"
          aria-controls={itemsId}
          onFocus={(event) => {
            focusedControl.current = event.currentTarget;
          }}
          onBlur={(event) => {
            if (event.currentTarget.getClientRects().length) focusedControl.current = null;
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') setMobileOpen(false);
          }}
          aria-expanded={mobileOpen}
          aria-label={`Workspace menu: ${items.find((item) => item.name === current)?.label ?? label}`}
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          <Menu aria-hidden="true" />
          {items.find((item) => item.name === current)?.label ?? label}
        </Button>
      )}
      <div
        ref={itemsRef}
        id={itemsId}
        className={rail ? 'section-navigation-items' : 'contents'}
        data-open={mobileOpen}
      >
        {items.map((item) => {
          const Icon = item.Icon ?? Circle;
          return (
            <Button
              key={item.name}
              variant="ghost"
              aria-current={current === item.name ? 'page' : undefined}
              onClick={() => {
                onSelect(item.name);
                setMobileOpen(false);
                if (rail) focusTrigger();
              }}
              title={item.label}
              onFocus={(event) => {
                focusedControl.current = event.currentTarget;
              }}
              onBlur={(event) => {
                // A CSS breakpoint can hide the focused element before the media event fires.
                if (event.currentTarget.getClientRects().length) focusedControl.current = null;
              }}
              onKeyDown={(event) => {
                if (event.key === 'Escape') {
                  if (mobileOpen && trigger.current?.getClientRects().length) {
                    setMobileOpen(false);
                    focusTrigger();
                  }
                }
              }}
              className={`group relative justify-start text-left hover:bg-navigation-hover aria-[current=page]:bg-navigation-selected aria-[current=page]:text-navigation-selected-foreground ${rail ? 'lg:size-12 lg:justify-center lg:px-2' : ''}`}
            >
              {rail && <Icon aria-hidden="true" className="size-5 shrink-0" />}
              <span className="section-navigation-label">{item.label}</span>
            </Button>
          );
        })}
      </div>
    </nav>
  );
}
