import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

type UsePreventUnsavedChangesProps = {
  isDirty: boolean;
  message?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
};

export const usePreventUnsavedChanges = ({
  isDirty,
  message = 'У вас есть несохраненные изменения. Вы действительно хотите покинуть страницу?',
  onConfirm,
  onCancel,
}: UsePreventUnsavedChangesProps) => {
  const navigate = useNavigate();

  useEffect(() => {
    if (!isDirty) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = message;
      return message;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty, message]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const link = (e.target as HTMLElement).closest('a');
      if (link && isDirty && link.href?.startsWith(window.location.origin)) {
        e.preventDefault();
        const path = link.href.replace(window.location.origin, '');
        if (window.confirm(message)) {
          onConfirm?.();
          navigate(path);
        } else {
          onCancel?.();
        }
      }
    };

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [isDirty, message, navigate, onConfirm, onCancel]);

  const checkBeforeNavigate = useCallback(
    (to: string) => {
      if (!isDirty) return true;
      const ok = window.confirm(message);
      if (ok) onConfirm?.();
      else onCancel?.();
      return ok;
    },
    [isDirty, message, onConfirm, onCancel]
  );

  return { checkBeforeNavigate };
};
