export const kpiData = {
  salesMonth: 145000,
  activeOrders: 24,
  registeredUsers: 1205,
  conversionRate: 3.2,
};

export const salesChartData = [
  { day: 'Lun', ventas: 18500 },
  { day: 'Mar', ventas: 22000 },
  { day: 'Mié', ventas: 15800 },
  { day: 'Jue', ventas: 28400 },
  { day: 'Vie', ventas: 32100 },
  { day: 'Sáb', ventas: 19200 },
  { day: 'Dom', ventas: 9000 },
];

export interface Product {
  sku: string;
  name: string;
  category: string;
  stock: number;
  status: 'Óptimo' | 'Bajo Stock';
  price: number;
}

export const inventoryData: Product[] = [
  { sku: 'WAX-001', name: 'Cannesh Sleep Drops', category: 'Nano-Tech', stock: 12, status: 'Bajo Stock', price: 950 },
  { sku: 'WAX-002', name: 'Wax Gummies Artisan 50mg', category: 'Comestibles', stock: 45, status: 'Óptimo', price: 600 },
  { sku: 'WAX-003', name: 'Belgian Mountain Chocolate', category: 'Comestibles', stock: 38, status: 'Óptimo', price: 850 },
  { sku: 'WAX-004', name: 'Vape Batería Cerámica Pro', category: 'Hardware', stock: 8, status: 'Bajo Stock', price: 1200 },
  { sku: 'WAX-005', name: 'Nano Tincture 1000mg', category: 'Nano-Tech', stock: 60, status: 'Óptimo', price: 1400 },
];

export interface Order {
  id: string;
  client: string;
  date: string;
  total: number;
  paymentStatus: 'Pagado' | 'Pendiente';
  shippingStatus: 'Preparando' | 'En Tránsito' | 'Entregado';
  tracking: string;
}

export const ordersData: Order[] = [
  { id: 'ORD-1001', client: 'María López', date: '2024-12-01', total: 2150, paymentStatus: 'Pagado', shippingStatus: 'Entregado', tracking: 'SKD-78291' },
  { id: 'ORD-1002', client: 'Carlos Ruiz', date: '2024-12-02', total: 950, paymentStatus: 'Pagado', shippingStatus: 'En Tránsito', tracking: 'SKD-78305' },
  { id: 'ORD-1003', client: 'Ana Martínez', date: '2024-12-03', total: 1800, paymentStatus: 'Pendiente', shippingStatus: 'Preparando', tracking: '—' },
  { id: 'ORD-1004', client: 'Roberto Díaz', date: '2024-12-04', total: 600, paymentStatus: 'Pagado', shippingStatus: 'En Tránsito', tracking: 'ENV-44120' },
  { id: 'ORD-1005', client: 'Sofía Hernández', date: '2024-12-05', total: 3200, paymentStatus: 'Pagado', shippingStatus: 'Preparando', tracking: '—' },
];

export interface Client {
  name: string;
  email: string;
  totalSpent: number;
  points: number;
  level: 'Bronce' | 'Plata' | 'VIP';
}

export const clientsData: Client[] = [
  { name: 'María López', email: 'maria@email.com', totalSpent: 12500, points: 1250, level: 'VIP' },
  { name: 'Carlos Ruiz', email: 'carlos@email.com', totalSpent: 4200, points: 420, level: 'Plata' },
  { name: 'Ana Martínez', email: 'ana@email.com', totalSpent: 1800, points: 180, level: 'Bronce' },
  { name: 'Roberto Díaz', email: 'roberto@email.com', totalSpent: 8900, points: 890, level: 'Plata' },
  { name: 'Sofía Hernández', email: 'sofia@email.com', totalSpent: 15300, points: 1530, level: 'VIP' },
];

export interface Coupon {
  code: string;
  discount: string;
  active: boolean;
}

export const couponsData: Coupon[] = [
  { code: 'WAXAPPMS20', discount: '20% OFF', active: true },
  { code: 'BIENVENIDO10', discount: '10% OFF', active: true },
  { code: 'VERANO30', discount: '30% OFF', active: false },
];
