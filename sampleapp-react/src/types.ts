export type User = {
  id: number;
  name: string;
  login: string;
  token?: string;
};

export type LoginData = {
  login: string;
  password: string;
};

export type RegisterData = {
  login: string;
  password: string;
  name?: string;
};

export type AuthResponse = {
  token: string;
  user: User;
};

export type PaginatedResponse<T> = {
  data: T[];
  count: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
};

export type PaginationParams = {
  pageNumber: number;
  pageSize: number;
};
