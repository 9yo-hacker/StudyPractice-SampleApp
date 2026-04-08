export type ErrorResponse = {
  status: number;
  message: string;
  errors?: Record<string, string[]>;
  timestamp?: string;
  path?: string;
  stack?: string;
};

class ErrorService {
  private listeners: Array<(error: ErrorResponse) => void> = [];
  private lastError: ErrorResponse | null = null;
  private errorCount = 0;

  handleError(error: any): ErrorResponse {
    console.error('Error caught:', error);

    let errorResponse: ErrorResponse = {
      status: error?.response?.status || 500,
      message: 'Произошла непредвиденная ошибка',
      timestamp: new Date().toISOString(),
    };

    if (error.response) {
      const { status, data } = error.response;
      errorResponse.status = status;
      errorResponse.path = error.config?.url;

      switch (status) {
        case 400:
          if (data.errors) {
            errorResponse.errors = data.errors;
            errorResponse.message = 'Ошибка валидации';
          } else {
            errorResponse.message = data.message || 'Неверный запрос';
          }
          break;
        case 401:
          errorResponse.message = 'Не авторизован';
          break;
        case 403:
          errorResponse.message = 'Доступ запрещен';
          break;
        case 404:
          errorResponse.message = 'Ресурс не найден';
          break;
        case 500: {
          const raw: string = data.message || '';
          const lower = raw.toLowerCase();
          if (lower.includes('duplicate') || lower.includes('unique') ||
              lower.includes('23505') || lower.includes('already exists') ||
              lower.includes('database error')) {
            errorResponse.message = 'Пользователь с таким логином уже существует';
          } else {
            errorResponse.message = raw || 'Внутренняя ошибка сервера';
          }
          break;
        }
        default:
          errorResponse.message = data.message || `Ошибка ${status}`;
          break;
      }
    } else if (error.request) {
      errorResponse.message = 'Сервер не отвечает. Проверьте подключение к сети.';
    } else {
      errorResponse.message = error.message || 'Ошибка при выполнении запроса';
      if (error.stack) errorResponse.stack = error.stack;
    }

    this.lastError = errorResponse;
    this.errorCount++;
    this.notifyListeners(errorResponse);
    return errorResponse;
  }

  subscribe(listener: (error: ErrorResponse) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners(error: ErrorResponse) {
    this.listeners.forEach(listener => listener(error));
  }

  getLastError(): ErrorResponse | null {
    return this.lastError;
  }

  getErrorCount(): number {
    return this.errorCount;
  }

  clearErrors() {
    this.errorCount = 0;
    this.lastError = null;
    this.listeners = [];
  }
}

export const errorService = new ErrorService();
