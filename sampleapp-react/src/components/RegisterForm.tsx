import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Box, Button, Alert, CircularProgress } from '@mui/material';
import { UserPlus } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { FormInput } from './FormInput';
import { PasswordStrength } from './PasswordStrength';
import { FormDebug } from './FormDebug';
import { validateLogin, validatePassword, validateName } from '../utils/validators';
import { checkLoginUnique } from '../api/validation';
import { useDebounce } from '../hooks/useDebounce';

type FormData = {
  login: string;
  password: string;
  name: string;
};

export const RegisterForm = ({ onSuccess, onDirtyChange }: { onSuccess?: () => void; onDirtyChange?: (dirty: boolean) => void }) => {
  const { register: registerUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');
  const [showDebug, setShowDebug] = useState(import.meta.env.DEV);
  const [checkingLogin, setCheckingLogin] = useState(false);

  const { control, handleSubmit, watch, formState, setError, clearErrors } = useForm<FormData>({
    mode: 'onChange',
    defaultValues: { login: '', password: '', name: '' },
  });

  const { errors, touchedFields, isValid, isDirty } = formState;
  const loginValue = watch('login');
  const passwordValue = watch('password');
  const debouncedLogin = useDebounce(loginValue, 500);

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  useEffect(() => {
    if (loginValue !== 'admin') clearErrors('login');
  }, [loginValue, clearErrors]);

  useEffect(() => {
    const checkLogin = async () => {
      if (!debouncedLogin || debouncedLogin.length < 3 || debouncedLogin === 'admin') return;
      setCheckingLogin(true);
      try {
        const isUnique = await checkLoginUnique(debouncedLogin);
        if (!isUnique) {
          setError('login', { type: 'manual', message: 'Этот логин уже занят' });
        } else {
          clearErrors('login');
        }
      } catch {
        // игнорируем ошибку сети
      } finally {
        setCheckingLogin(false);
      }
    };
    checkLogin();
  }, [debouncedLogin, setError, clearErrors]);

  const onSubmit = async (data: FormData) => {
    try {
      setLoading(true);
      setServerError('');
      await registerUser(data);
      onSuccess?.();
    } catch (err: unknown) {
      const apiErrors = (err as { response?: { data?: { errors?: Record<string, string[]> } } })?.response?.data?.errors;
      if (apiErrors) {
        if (apiErrors.Login) setError('login', { type: 'manual', message: apiErrors.Login[0] });
        if (apiErrors.Password) setError('password', { type: 'manual', message: apiErrors.Password[0] });
        setServerError('Проверьте правильность заполнения полей');
      } else {
        const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
        if (msg?.toLowerCase().includes('логин') || msg?.toLowerCase().includes('login') || msg?.toLowerCase().includes('уже существует')) {
          setError('login', { type: 'manual', message: msg });
        } else {
          setServerError(msg || 'Ошибка регистрации');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {serverError && <Alert severity="error">{serverError}</Alert>}

        <Controller
          name="name"
          control={control}
          rules={{ validate: validateName }}
          render={({ field }) => (
            <FormInput
              {...field}
              label="Имя"
              error={errors.name?.message}
              touched={touchedFields.name}
              disabled={loading}
            />
          )}
        />

        <Controller
          name="login"
          control={control}
          rules={{ validate: validateLogin }}
          render={({ field }) => (
            <FormInput
              {...field}
              label="Логин"
              error={errors.login?.message}
              touched={touchedFields.login}
              required
              disabled={loading}
              endAdornment={checkingLogin ? <CircularProgress size={20} /> : undefined}
            />
          )}
        />

        <Controller
          name="password"
          control={control}
          rules={{ validate: validatePassword }}
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

        <PasswordStrength password={passwordValue} />

        {isDirty && (
          <Alert severity="info">✏️ У вас есть несохраненные изменения</Alert>
        )}

        <Button
          type="submit"
          variant="contained"
          startIcon={<UserPlus size={20} />}
          disabled={!isValid || loading}
        >
          {loading ? 'Регистрация...' : 'Зарегистрироваться'}
        </Button>

        {import.meta.env.DEV && (
          <Button variant="text" size="small" onClick={() => setShowDebug(!showDebug)}>
            {showDebug ? 'Скрыть отладку' : 'Показать отладку'}
          </Button>
        )}

        {showDebug && (
          <FormDebug
            values={watch() as Record<string, unknown>}
            errors={errors as Record<string, unknown>}
            touched={touchedFields as Record<string, unknown>}
            isValid={isValid}
            isDirty={isDirty}
          />
        )}
      </Box>
    </form>
  );
};
