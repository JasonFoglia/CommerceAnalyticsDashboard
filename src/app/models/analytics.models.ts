import 'moment';

// Core data interfaces for commerce analytics
export interface SalesData {
  id: string;
  date: moment.Moment;
  revenue: number;
  orders: number;
  customerId: string;
  productId: string;
  productName?: string; // Optional product name from CSV
  category: string;
  region: string;
}

export interface ProductMetrics {
  productId: string;
  name: string;
  category: string;
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  conversionRate: number;
}

export interface CustomerSegment {
  segmentId: string;
  name: string;
  customerCount: number;
  totalRevenue: number;
  averageLifetimeValue: number;
  retentionRate: number;
}

export interface RegionalPerformance {
  region: string;
  revenue: number;
  orders: number;
  customers: number;
  growthRate: number;
}

export interface TimeSeriesData {
  timestamp: moment.Moment;
  value: number;
  metadata?: Record<string, any>;
}

export interface ChartDataPoint {
  x: number | moment.Moment;
  y: number;
  label?: string;
}

export interface DashboardMetrics {
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  customerCount: number;
  conversionRate: number;
  periodComparison: {
    revenue: number;
    orders: number;
    customers: number;
  };
}

export interface FilterOptions {
  dateRange: {
    start: moment.Moment;
    end: moment.Moment;
  };
  regions: string[];
  categories: string[];
  customerSegments: string[];
}
