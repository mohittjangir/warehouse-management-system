import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Inject JWT token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('wims_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('wims_token');
      localStorage.removeItem('wims_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

// ─── Auth ────────────────────────────────────────────────────────────────────
export const authService = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  me: () => api.get('/auth/me'),
};

// ─── Products ─────────────────────────────────────────────────────────────────
export const productService = {
  list: (params?: Record<string, unknown>) => api.get('/products/', { params }),
  get: (id: number) => api.get(`/products/${id}`),
  create: (data: unknown) => api.post('/products/', data),
  update: (id: number, data: unknown) => api.put(`/products/${id}`, data),
  delete: (id: number) => api.delete(`/products/${id}`),
};

// ─── Masters ─────────────────────────────────────────────────────────────────
export const masterService = {
  categories: {
    list: () => api.get('/categories'),
    create: (data: unknown) => api.post('/categories', data),
    update: (id: number, data: unknown) => api.put(`/categories/${id}`, data),
    delete: (id: number) => api.delete(`/categories/${id}`),
  },
  units: {
    list: () => api.get('/units'),
    create: (data: unknown) => api.post('/units', data),
    update: (id: number, data: unknown) => api.put(`/units/${id}`, data),
  },
  warehouses: {
    list: () => api.get('/warehouses'),
    create: (data: unknown) => api.post('/warehouses', data),
    update: (id: number, data: unknown) => api.put(`/warehouses/${id}`, data),
  },
  locations: {
    list: (warehouseId?: number) =>
      api.get('/locations', { params: warehouseId ? { warehouse_id: warehouseId } : {} }),
    create: (data: unknown) => api.post('/locations', data),
    update: (id: number, data: unknown) => api.put(`/locations/${id}`, data),
  },
  suppliers: {
    list: () => api.get('/suppliers'),
    create: (data: unknown) => api.post('/suppliers', data),
    update: (id: number, data: unknown) => api.put(`/suppliers/${id}`, data),
  },
  customers: {
    list: () => api.get('/customers'),
    create: (data: unknown) => api.post('/customers', data),
    update: (id: number, data: unknown) => api.put(`/customers/${id}`, data),
  },
};

// ─── Inventory ─────────────────────────────────────────────────────────────────
export const inventoryService = {
  balance: (params?: Record<string, unknown>) => api.get('/inventory', { params }),
  stockIn: (data: unknown) => api.post('/stock-in', data),
  stockOut: (data: unknown) => api.post('/stock-out', data),
  adjustment: (data: unknown) => api.post('/inventory/adjustment', data),
  movements: (params?: Record<string, unknown>) => api.get('/stock-movements', { params }),
  batches: (params?: Record<string, unknown>) => api.get('/batches', { params }),
};

// ─── Dashboard ───────────────────────────────────────────────────────────────
export const dashboardService = {
  admin: () => api.get('/dashboard/admin'),
  inventory: () => api.get('/dashboard/inventory'),
};

// ─── Reports ─────────────────────────────────────────────────────────────────
export const reportService = {
  stock: (params?: Record<string, unknown>) => api.get('/reports/stock', { params }),
  ageing: (params?: Record<string, unknown>) => api.get('/reports/ageing', { params }),
  movements: (params?: Record<string, unknown>) => api.get('/reports/movements', { params }),
  exportCsv: (type: string) =>
    api.get(`/reports/export/csv/${type}`, { responseType: 'blob' }),
};

// ─── Users ───────────────────────────────────────────────────────────────────
export const userService = {
  list: (params?: Record<string, unknown>) => api.get('/users/', { params }),
  create: (data: unknown) => api.post('/users/', data),
  update: (id: number, data: unknown) => api.put(`/users/${id}`, data),
  resetPassword: (id: number, password: string) =>
    api.post(`/users/${id}/reset-password`, { new_password: password }),
};

// ─── Audit ───────────────────────────────────────────────────────────────────
export const auditService = {
  list: (params?: Record<string, unknown>) => api.get('/audit-logs', { params }),
};
