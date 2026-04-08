export const validateLoginNotAdmin = (value: string) => {
  if (value === 'admin') return 'Недопустимый логин пользователя';
  return undefined;
};

export const validatePassword = (value: string) => {
  if (!value) return 'Пароль обязателен';
  if (value.length < 3) return 'Минимум 3 символа';
  if (value.length > 8) return 'Максимум 8 символов';
  if (value === '123') return 'Слишком простой пароль';
  return undefined;
};

export const validateLogin = (value: string) => {
  if (!value) return 'Логин обязателен';
  if (value.length < 2) return 'Минимум 2 символа';
  if (value.length > 50) return 'Максимум 50 символов';
  if (!/^[A-Z]/.test(value)) return 'Логин должен начинаться с заглавной буквы';
  if (value === 'admin') return 'Недопустимый логин пользователя';
  return undefined;
};

export const validateName = (value: string) => {
  if (!value) return 'Имя обязательно';
  if (value.length < 2) return 'Минимум 2 символа';
  return undefined;
};
