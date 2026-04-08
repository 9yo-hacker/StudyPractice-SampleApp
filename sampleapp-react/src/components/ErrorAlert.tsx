import { useEffect, useState } from 'react';
import {
  Snackbar, Alert, AlertTitle, Box, IconButton, Typography,
} from '@mui/material';
import { X, ChevronDown, ChevronUp } from 'lucide-react';
import { ErrorResponse, errorService } from '../services/error.service';

export const ErrorAlert = () => {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<ErrorResponse | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const unsubscribe = errorService.subscribe((err) => {
      setError(err);
      setOpen(true);
      setExpanded(false);
    });
    return unsubscribe;
  }, []);

  const handleClose = () => {
    setOpen(false);
    setExpanded(false);
  };

  if (!error) return null;

  const getSeverity = () => error.status < 500 ? 'warning' : 'error';

  const getTitle = () => {
    switch (error.status) {
      case 400: return 'Ошибка запроса';
      case 401: return 'Не авторизован';
      case 403: return 'Доступ запрещен';
      case 404: return 'Не найдено';
      case 500: return 'Ошибка сервера';
      default: return `Ошибка ${error.status}`;
    }
  };

  return (
    <Snackbar
      open={open}
      autoHideDuration={error.status === 401 ? 3000 : 6000}
      onClose={handleClose}
      anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
    >
      <Alert
        severity={getSeverity()}
        sx={{ width: '100%', maxWidth: 600, '& .MuiAlert-message': { width: '100%' } }}
        action={
          <Box display="flex" alignItems="center">
            {error.errors && (
              <IconButton size="small" onClick={() => setExpanded(!expanded)} color="inherit">
                {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </IconButton>
            )}
            <IconButton size="small" onClick={handleClose} color="inherit">
              <X size={18} />
            </IconButton>
          </Box>
        }
      >
        <AlertTitle>{getTitle()}</AlertTitle>
        <Box>
          <Typography variant="body2">{error.message}</Typography>
          {expanded && error.errors && (
            <Box sx={{ mt: 1, pl: 2 }}>
              {Object.entries(error.errors).map(([field, messages]) => (
                <Box key={field}>
                  <Typography variant="caption" color="inherit" sx={{ fontWeight: 'bold' }}>
                    {field}:
                  </Typography>
                  <ul style={{ margin: '4px 0 8px 0', paddingLeft: 20 }}>
                    {messages.map((msg, i) => (
                      <li key={i}><Typography variant="caption">{msg}</Typography></li>
                    ))}
                  </ul>
                </Box>
              ))}
            </Box>
          )}
        </Box>
      </Alert>
    </Snackbar>
  );
};
