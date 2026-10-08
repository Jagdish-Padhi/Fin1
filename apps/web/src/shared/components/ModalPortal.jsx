import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

/**
 * Enterprise Modal Portal:
 * - Mounts modals directly into document.body, isolating them from any ancestor transforms/filters
 * - Locks background body scroll while the modal is open
 * - Compensates for scrollbar width to prevent layout shifts
 * - Listens for the Escape key to close the modal
 */
export function ModalPortal({ isOpen = true, onClose, children }) {
  useEffect(() => {
    if (!isOpen) return;

    // Capture initial body styles
    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    // Lock body scroll
    document.body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(children, document.body);
}
