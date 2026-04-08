import { useState, useEffect } from 'react';
import { usePreventUnsavedChanges } from '../../hooks/usePreventUnsavedChanges';
import { ConfirmDialog } from './ConfirmDialog';

type PreventUnsavedChangesProps = {
  isDirty: boolean;
  message?: string;
  children: React.ReactNode;
  onConfirm?: () => void;
};

export const PreventUnsavedChanges = ({
  isDirty,
  message = 'У вас есть несохраненные изменения. Вы действительно хотите покинуть страницу?',
  children,
  onConfirm,
}: PreventUnsavedChangesProps) => {
  const [showDialog, setShowDialog] = useState(false);

  usePreventUnsavedChanges({ isDirty, message, onConfirm });

  useEffect(() => {
    if (!isDirty) return;

    const handlePopState = () => setShowDialog(true);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isDirty]);

  return (
    <>
      {children}
      <ConfirmDialog
        open={showDialog}
        title="Несохраненные изменения"
        message={message}
        confirmText="Покинуть страницу"
        cancelText="Остаться"
        onConfirm={() => { setShowDialog(false); onConfirm?.(); window.history.back(); }}
        onCancel={() => setShowDialog(false)}
        severity="warning"
      />
    </>
  );
};
