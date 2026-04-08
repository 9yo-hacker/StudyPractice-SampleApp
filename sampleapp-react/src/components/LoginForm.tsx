import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Box, Button, Alert } from '@mui/material';
import { LogIn } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { FormInput } from './FormInput';
import { ButtonLoader } from './ButtonLoader';

type FormData = {
  login: string;
  password: string;
};

export const LoginForm = ({ onSuccess }: { onSuccess?: () => void }) => {
  const { login } = useAuth();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { control, handleSubmit, formState: { errors, touchedFields, isValid } } = useForm<FormData>({
    mode: 'onChange',
    defaultValues: { login: '', password: '' },
  });

  const onSubmit = async (data: FormData) => {
    try {
      setLoading(true);
      setError('');
      await login(data.login, data.password);
      onSuccess?.();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || 'Ошибка входа');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {error && <Alert severity="error">{error}</Alert>}

        <Controller
          name="login"
          control={control}
          rules={{ required: 'Логин обязателен', validate: (v) => /^[A-Z]/.test(v) || 'Логин должен начинаться с заглавной буквы' }}
          render={({ field }) => (
            <FormInput
              {...field}
              label="Логин"
              error={errors.login?.message}
              touched={touchedFields.login}
              required
              disabled={loading}
            />
          )}
        />

        <Controller
          name="password"
          control={control}
          rules={{
            required: 'Пароль обязателен',
            minLength: { value: 3, message: 'Минимум 3 символа' },
          }}
          render={({ field }) => (
            <FormInput
              {...field}
              label="Пароль"
              type="password"
              error={errors.password?.message}
              touched={touchedFields.password}
              required
              disabled={loading}
            />
          )}
        />

        <Button
          type="submit"
          variant="contained"
          startIcon={loading ? <ButtonLoader /> : <LogIn size={20} />}
          disabled={!isValid || loading}
          fullWidth
        >
          {loading ? 'Вход...' : 'Войти'}
        </Button>
      </Box>
    </form>
  );
};
