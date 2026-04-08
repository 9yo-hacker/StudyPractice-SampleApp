import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Box, Button, Alert } from '@mui/material';
import { ButtonLoader } from './ButtonLoader';
import { LogIn } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { FormInput } from './FormInput';

type FormData = {
  login: string;
  password: string;
};

export const LoginForm = ({ onSuccess }: { onSuccess?: () => void }) => {
  const { login } = useAuth();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, watch, formState: { errors, touchedFields, isValid } } = useForm<FormData>({
    mode: 'onChange',
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

        <FormInput
          label="Логин"
          name="login"
          value={watch('login') ?? ''}
          onChange={register('login', { required: 'Логин обязателен' }).onChange}
          onBlur={register('login').onBlur}
          error={errors.login?.message}
          touched={touchedFields.login}
          required
          disabled={loading}
        />

        <FormInput
          label="Пароль"
          name="password"
          type="password"
          value={watch('password') ?? ''}
          onChange={register('password', {
            required: 'Пароль обязателен',
            minLength: { value: 3, message: 'Минимум 3 символа' },
          }).onChange}
          onBlur={register('password').onBlur}
          error={errors.password?.message}
          touched={touchedFields.password}
          required
          disabled={loading}
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
