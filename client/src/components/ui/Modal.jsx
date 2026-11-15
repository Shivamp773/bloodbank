import { useEffect, useId } from 'react';
import { createPortal } from 'react-dom';

/**
 * A React-controlled Bootstrap modal (no Bootstrap JavaScript needed).
 * Closes on Escape, on the × button and when clicking the backdrop.
 */
export default function Modal({ show, title, onClose, children, footer, size }) {
  const titleId = useId();

  useEffect(() => {
    if (!show) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onKeyDown);
    document.body.classList.add('modal-open');
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.classList.remove('modal-open');
    };
  }, [show, onClose]);

  if (!show) return null;

  return createPortal(
    <>
      <div
        className="modal fade show d-block"
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) onClose?.();
        }}
      >
        <div className={`modal-dialog modal-dialog-centered${size ? ` modal-${size}` : ''}`}>
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title fs-5" id={titleId}>
                {title}
              </h2>
              <button type="button" className="btn-close" aria-label="Close" onClick={onClose} />
            </div>
            <div className="modal-body">{children}</div>
            {footer && <div className="modal-footer">{footer}</div>}
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show" />
    </>,
    document.body,
  );
}
