import { useEffect, useRef } from "react";

interface UseModalA11yOptions {
  isOpen: boolean;
  onClose?: () => void;
  initialFocusRef?: React.RefObject<HTMLElement | null>;
  closeOnEscape?: boolean;
}

// Global modal counter to properly manage document.body overflow lock across nested dialogs
let openModalsCount = 0;
let originalBodyOverflow = "";

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const selector = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(", ");

  const elements = Array.from(container.querySelectorAll<HTMLElement>(selector));
  return elements.filter((el) => {
    return (
      el.offsetWidth > 0 ||
      el.offsetHeight > 0 ||
      el.getClientRects().length > 0 ||
      window.getComputedStyle(el).display !== "none"
    );
  });
}

/**
 * Production-quality accessibility hook for modals:
 * - Traps Tab & Shift+Tab within modal bounds (WCAG 2.1.2)
 * - Restores focus to the triggering element on close (WCAG 2.4.3)
 * - Focuses initial element or first interactive control upon opening
 * - Locks background body scrolling without breaks during nested dialogs
 * - Handles Escape key dismissal safely
 */
export function useModalA11y({
  isOpen,
  onClose,
  initialFocusRef,
  closeOnEscape = true,
}: UseModalA11yOptions) {
  const modalContainerRef = useRef<HTMLDivElement | null>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    // 1. Record trigger element for focus restoration
    if (typeof document !== "undefined") {
      previousActiveElementRef.current = document.activeElement as HTMLElement | null;

      // 2. Lock body scroll
      if (openModalsCount === 0) {
        originalBodyOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
      }
      openModalsCount++;
    }

    // 3. Move initial focus into modal
    const focusTimer = requestAnimationFrame(() => {
      if (initialFocusRef?.current) {
        initialFocusRef.current.focus();
      } else if (modalContainerRef.current) {
        const focusables = getFocusableElements(modalContainerRef.current);
        if (focusables.length > 0 && focusables[0]) {
          focusables[0].focus();
        } else {
          modalContainerRef.current.focus();
        }
      }
    });

    // 4. Trap Tab and listen for Escape
    const handleKeyDown = (e: KeyboardEvent) => {
      if (closeOnEscape && e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onClose?.();
        return;
      }

      if (e.key === "Tab" && modalContainerRef.current) {
        const focusables = getFocusableElements(modalContainerRef.current);
        if (focusables.length === 0) {
          e.preventDefault();
          return;
        }

        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (!first || !last) return;

        if (e.shiftKey) {
          // Shift + Tab: reverse wrap
          if (
            document.activeElement === first ||
            !modalContainerRef.current.contains(document.activeElement)
          ) {
            e.preventDefault();
            last.focus();
          }
        } else {
          // Tab: forward wrap
          if (
            document.activeElement === last ||
            !modalContainerRef.current.contains(document.activeElement)
          ) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      cancelAnimationFrame(focusTimer);
      window.removeEventListener("keydown", handleKeyDown);

      // Restore body scroll
      if (typeof document !== "undefined") {
        openModalsCount = Math.max(0, openModalsCount - 1);
        if (openModalsCount === 0) {
          document.body.style.overflow = originalBodyOverflow;
        }

        // Restore focus to triggering element safely
        if (
          previousActiveElementRef.current &&
          typeof previousActiveElementRef.current.focus === "function"
        ) {
          requestAnimationFrame(() => {
            try {
              previousActiveElementRef.current?.focus();
            } catch {
              // Ignore focus error if trigger unmounted
            }
          });
        }
      }
    };
  }, [isOpen, onClose, closeOnEscape, initialFocusRef]);

  return { modalContainerRef };
}
