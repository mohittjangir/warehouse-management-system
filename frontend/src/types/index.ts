export interface User {
  id: number;
  name: string;
  email: string;
  role: 'ADMIN' | 'INVENTORY_STAFF';
  status: 'ACTIVE' | 'INACTIVE';
  created_at: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
}

export interface Category {
  id: number;
  name: string;
  description?: string;
  status: boolean;
  created_at: string;
}

export interface Unit {
  id: number;
  name: string;
  short_code: string;
}

export interface Warehouse {
  id: number;
  name: string;
  code: string;
  address?: string;
  status: boolean;
}

export interface StorageLocation {
  id: number;
  warehouse_id: number;
  name: string;
  code: string;
  description?: string;
  status: boolean;
}

export interface Supplier {
  id: number;
  name: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
  status: boolean;
}

export interface Customer {
  id: number;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  status: boolean;
}

export type StockStatus = 'HEALTHY' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'OVERSTOCK';

export interface Product {
  id: number;
  sku: string;
  name: string;
  product_code?: string;
  category_id?: number;
  category_name?: string;
  unit_id?: number;
  unit_name?: string;
  unit_short_code?: string;
  description?: string;
  items_per_carton: number;
  minimum_stock: number;
  maximum_stock?: number;
  reorder_level: number;
  status: string;
  created_at: string;
  total_quantity?: number;
  cartons?: number;
  loose_units?: number;
  stock_status?: StockStatus;
}

export interface Batch {
  id: number;
  product_id: number;
  batch_number: string;
  manufacturing_date?: string;
  expiry_date?: string;
  received_date: string;
  initial_quantity: number;
  remaining_quantity: number;
  warehouse_id: number;
  location_id?: number;
  status: string;
  age_days?: number;
}

export interface StockTransaction {
  id: number;
  transaction_number: string;
  transaction_type: 'STOCK_IN' | 'STOCK_OUT' | 'ADJUSTMENT' | 'TRANSFER';
  product_id: number;
  product_name?: string;
  product_sku?: string;
  batch_id?: number;
  batch_number?: string;
  quantity: number;
  carton_quantity?: number;
  unit_quantity?: number;
  previous_balance: number;
  new_balance: number;
  warehouse_id?: number;
  warehouse_name?: string;
  location_id?: number;
  location_name?: string;
  supplier_id?: number;
  supplier_name?: string;
  customer_id?: number;
  customer_name?: string;
  reference_number?: string;
  user_id: number;
  user_name?: string;
  remarks?: string;
  created_at: string;
}

export interface InventoryBalance {
  product_id: number;
  sku: string;
  product_name: string;
  category_name?: string;
  warehouse_id?: number;
  warehouse_name?: string;
  location_id?: number;
  location_name?: string;
  total_quantity: number;
  cartons: number;
  loose_units: number;
  items_per_carton: number;
  stock_status: StockStatus;
  reorder_level: number;
  minimum_stock: number;
  oldest_batch_date?: string;
}

export interface AdminDashboard {
  total_products: number;
  total_stock: number;
  total_cartons: number;
  stock_in_today: number;
  stock_out_today: number;
  low_stock_count: number;
  out_of_stock_count: number;
  stock_movement_chart: Array<{ date: string; stock_in: number; stock_out: number }>;
  inventory_by_category: Array<{ category: string; total: number }>;
  recent_activity: Array<{ id: number; user: string; action: string; description: string; time: string }>;
}

export interface InventoryDashboard {
  total_products: number;
  available_stock: number;
  total_cartons: number;
  stock_in_today: number;
  stock_out_today: number;
  low_stock_count: number;
  out_of_stock_count: number;
  recent_stock_in: Array<{ id: number; product: string; quantity: number; user: string; time: string; txn_number: string }>;
  recent_stock_out: Array<{ id: number; product: string; quantity: number; user: string; time: string; txn_number: string }>;
  low_stock_products: Array<{ product_id: number; product_name: string; sku: string; available: number; reorder_level: number; status: string }>;
}

export interface AuditLog {
  id: number;
  user_id?: number;
  user_name?: string;
  action: string;
  entity_type?: string;
  entity_id?: number;
  description?: string;
  old_value?: Record<string, unknown>;
  new_value?: Record<string, unknown>;
  ip_address?: string;
  timestamp: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}
