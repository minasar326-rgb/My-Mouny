import { useEffect, useRef, useState } from "react";

type ModalEntry = {
  id: string;
  close: () => void;
};

// Global stack of active modals/sheets
const modalStack: ModalEntry[] = [];
let isProgrammaticBack = false;
let initialized = false;

function initGlobalBackHandler() {
  if (typeof window === "undefined" || initialized) return;
  initialized = true;

  window.addEventListener("popstate", () => {
    // If this popstate was triggered by our own programmatic close, ignore it completely
    if (isProgrammaticBack) {
      isProgrammaticBack = false;
      return;
    }

    // Check if there is an open modal/sheet in the stack to close
    if (modalStack.length > 0) {
      const top = modalStack.pop();
      if (top) {
        top.close();
      }
      return;
    }

    // Root level: Do NOT force window.history.go(-1) to about:blank.
    // If running in Capacitor/Android native wrapper, invoke exitApp
    const cap = (window as any).Capacitor;
    if (cap?.Plugins?.App?.exitApp) {
      cap.Plugins.App.exitApp();
    }
  });
}

/**
 * Hook to connect any modal/sheet to the back-button navigation stack.
 * Exactly 1 back button press = 1 step backward closing this modal.
 */
export function useModalBackHandler(isOpen: boolean, onClose: () => void) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const idRef = useRef("");
  if (!idRef.current) {
    idRef.current = `modal-${Math.random().toString(36).slice(2)}`;
  }
  const pushedRef = useRef(false);

  useEffect(() => {
    initGlobalBackHandler();

    if (!isOpen) {
      if (pushedRef.current) {
        pushedRef.current = false;
        const index = modalStack.findIndex((m) => m.id === idRef.current);
        if (index !== -1) {
          modalStack.splice(index, 1);
        }
        // If history state currently belongs to this modal, pop it cleanly
        if (typeof window !== "undefined" && window.history.state?.modalId === idRef.current) {
          isProgrammaticBack = true;
          try {
            window.history.back();
          } catch {
            isProgrammaticBack = false;
          }
        }
      }
      return;
    }

    if (!pushedRef.current) {
      pushedRef.current = true;
      const id = idRef.current;
      if (typeof window !== "undefined") {
        window.history.pushState({ modalId: id }, "");
      }

      const entry: ModalEntry = {
        id,
        close: () => {
          pushedRef.current = false;
          onCloseRef.current();
        },
      };
      modalStack.push(entry);
    }

    return () => {
      const index = modalStack.findIndex((m) => m.id === idRef.current);
      if (index !== -1) {
        modalStack.splice(index, 1);
      }
      if (pushedRef.current && typeof window !== "undefined" && window.history.state?.modalId === idRef.current) {
        pushedRef.current = false;
        isProgrammaticBack = true;
        try {
          window.history.back();
        } catch {
          isProgrammaticBack = false;
        }
      }
    };
  }, [isOpen]);
}

/**
 * Hook for displaying the "press back again to exit" toast on the root screen.
 */
export function useRootBackHandler() {
  const [showExitToast, setShowExitToast] = useState(false);
  return { showExitToast };
}
