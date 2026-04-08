import { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, Box, Alert, IconButton, InputAdornment,
} from '@mui/material';
import { UserPlus, Eye, EyeOff, X } from 'lucide-react';

const isDuplicateLoginError = (msg: string) => {
  const lower = msg.toLowerCase();
  return lower.includes('duplicate') || lower.includes('unique') ||
         lower.includes('23505') || lower.includes('already exists') ||
         lower.includes('уже существует');
};

type AddUserModalProps = {
  open: boolean;
  onClose: () => void;
  onSave: (user: { login: string; password: string; name: string }) => Promise<void>;
};

export const AddUserModal = ({ open, onClose, onSave }: AddUserModalProps) => {
  const [formData, setFormData] = useState({ login: '', password: '', name: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = 'Имя обязательно';
    if (!formData.login.trim()) newErrors.login = 'Логин обязателен';
    else if (!/^[A-Z]/.test(formData.login)) newErrors.login = 'Логин должен начинаться с заглавной буквы';
    if (!formData.password.trim()) newErrors.password = 'Пароль обязателен';
    else if (formData.password.length < 3) newErrors.password = 'Минимум 3 символа';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (field: keyof typeof formData) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setFormData(prev => ({ ...prev, [field]: e.target.value }));
      if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
      if (serverError) setServerError('');
    };

  const handleSubmit = async () => {
    if (!validate()) return;
    try {
      setLoading(true);
      await onSave(formData);
      handleClose();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? '';
      if (isDuplicateLoginError(msg)) {
        setServerError(`Пользователь с логином "${formData.login}" уже существует`);
      } else {
        setServerError(msg || 'Ошибка при создании пользователя');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (loading) return;
    setFormData({ login: '', password: '', name: '' });
    setErrors({});
    setServerError('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={1}>
            <UserPlus size={24} />
            Создание пользователя
          </Box>
          <IconButton onClick={handleClose} size="small" disabled={loading}>
            <X size={20} />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        <Box display="flex" flexDirection="column" gap={2} sx={{ mt: 1 }}>
          {serverError && <Alert severity="error" onClose={() => setServerError('')}>{serverError}</Alert>}

          <TextField
            fullWidth
            label="Имя"
            value={formData.name}
            onChange={handleChange('name')}
            error={!!errors.name}
            helperText={errors.name}
            disabled={loading}
            required
          />

          <TextField
            fullWidth
            label="Логин"
            value={formData.login}
            onChange={handleChange('login')}
            error={!!errors.login}
            helperText={errors.login || 'Должен начинаться с заглавной буквы'}
            disabled={loading}
            required
          />

          <TextField
            fullWidth
            label="Пароль"
            type={showPassword ? 'text' : 'password'}
            value={formData.password}
            onChange={handleChange('password')}
            error={!!errors.password}
            helperText={errors.password}
            disabled={loading}
            required
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </IconButton>
                  </InputAdornment>
                ),
              },
            }}
          />
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} disabled={loading}>Отмена</Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={loading}
          startIcon={<UserPlus size={18} />}
        >
          {loading ? 'Создание...' : 'Создать'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
