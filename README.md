# SampleApp

Учебное full-stack приложение для управления пользователями. Реализует регистрацию, JWT-авторизацию, CRUD операции, серверную пагинацию, обработку ошибок и смену темы.

---

## Стек

| Слой | Технологии |
|------|-----------|
| **Backend** | .NET 8, ASP.NET Core, Entity Framework Core 8, PostgreSQL, FluentValidation, JWT |
| **Frontend** | React 18, TypeScript, Vite, Material UI 7, React Hook Form, React Router 7, Axios |

---

## Требования

- [.NET 8 SDK](https://dotnet.microsoft.com/download)
- [Node.js 20+](https://nodejs.org)
- [PostgreSQL](https://www.postgresql.org/download/) — запущенный на порту **5433**

---

## Запуск

### 1. База данных

Создай БД и примени миграции:

```bash
cd SampleApp.API
dotnet ef database update
```

> Строка подключения: `Host=localhost;Port=5433;Database=SampleApp;Username=postgres;Password=root`  
> При необходимости отредактируй `SampleApp.API/appsettings.json`.

### 2. Backend

```bash
cd SampleApp.API
dotnet run --launch-profile http
```

API запускается на `http://localhost:5071`  
Swagger UI: `http://localhost:5071/swagger`

### 3. Frontend

```bash
cd sampleapp-react
npm install
npm run dev
```

Приложение запускается на `http://localhost:5173`

---

## Что реализовано

### Авторизация
- Регистрация с валидацией (FluentValidation на бэке, React Hook Form на фронте)
- Вход по логину/паролю, JWT токен
- Защита маршрутов — неавторизованные пользователи редиректятся на `/login`
- Индикатор силы пароля, асинхронная проверка уникальности логина

### Пользователи
- Таблица с сортировкой, поиском и клиентской пагинацией (`/users`)
- Серверная пагинация с карточками статистики (`/users-server`)
- CRUD: создание, редактирование профиля, удаление с подтверждением
- Кнопка **Seed** — заполнение базы 50 тестовыми пользователями

### UX
- Глобальный лоадер отслеживает все HTTP запросы через axios интерцепторы
- Обработка ошибок: ErrorBoundary, ErrorAlert, страницы 404 / 500
- Предупреждение при уходе со страницы с несохранёнными изменениями
- Смена темы: светлая / тёмная / системная, сохраняется между сессиями

---

## Быстрая проверка

1. Открыть `http://localhost:5173`
2. Нажать **Seed 50 пользователей** — база заполнится тестовыми данными
3. Зарегистрироваться (`/register`) или войти (`/login`)
4. Перейти в **Пользователи** — таблица с сортировкой и поиском
5. Перейти в **Серверная пагинация** (`/users-server`) — пагинация через API
6. Открыть профиль → редактировать → попробовать уйти без сохранения
7. Переключить тему через иконку в хедере
