import { ReactNode, useEffect } from 'react';
import { createPortal } from 'react-dom';

import { useTranslation } from '@/context/I18nContext';

type ShareModalProps = {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
  onDownload: () => void;
  downloading?: boolean;
  labels?: {
    close: string;
    download: string;
    downloading: string;
  };
};

export function ShareModal({
  open,
  title,
  children,
  onClose,
  onDownload,
  downloading = false,
  labels
}: ShareModalProps) {
  const { t } = useTranslation('shareModal');

  const { close, download, downloading: downloadingLabel } = {
    close: labels?.close ?? t('close'),
    download: labels?.download ?? t('download'),
    downloading: labels?.downloading ?? t('downloading')
  };

  useEffect(() => {
    if (!open || typeof document === 'undefined') {
      return;
    }

    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  if (!open || typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <div className="share-modal">
      <div className="share-modal__backdrop" onClick={onClose} />
      <div className="share-modal__content" role="dialog" aria-modal="true" aria-label={title}>
        <header className="share-modal__header">
          <h2>{title}</h2>
          <button type="button" className="share-modal__close" aria-label={close} onClick={onClose}>
            ×
          </button>
        </header>
        <div className="share-modal__body">{children}</div>
        <footer className="share-modal__footer">
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            {close}
          </button>
          <button
            type="button"
            className="btn btn--primary"
            onClick={onDownload}
            disabled={downloading}
          >
            {downloading ? downloadingLabel : download}
          </button>
        </footer>
      </div>
    </div>,
    document.body
  );
}

