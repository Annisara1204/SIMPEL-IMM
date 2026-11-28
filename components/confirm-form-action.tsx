"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

type Props = {
  action: (formData: FormData) => void | Promise<void>;
  message: string;
  className?: string;
  children: ReactNode;
};

/** Form yang meminta konfirmasi sebelum aksi merusak dijalankan. */
export function ConfirmFormAction({
  action,
  message,
  className,
  children,
}: Props) {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmed = useRef(false);

  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  function close() {
    setOpen(false);
    formRef.current
      ?.querySelector<HTMLButtonElement>("button[type=submit]")
      ?.focus();
  }

  return (
    <>
      <form
        ref={formRef}
        action={action}
        className={className}
        onSubmit={(event) => {
          if (confirmed.current) {
            confirmed.current = false;
            return;
          }
          event.preventDefault();
          setOpen(true);
        }}
      >
        {children}
      </form>
      {open && (
        <div className="confirm-backdrop" onClick={close}>
          <div
            className="confirm-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="Konfirmasi tindakan"
            onClick={(event) => event.stopPropagation()}
          >
            <p>{message}</p>
            <div className="confirm-actions">
              <button
                ref={cancelRef}
                type="button"
                className="btn btn--outline"
                onClick={close}
              >
                Batal
              </button>
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => {
                  confirmed.current = true;
                  setOpen(false);
                  formRef.current?.requestSubmit();
                }}
              >
                Lanjutkan
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
