import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, combineLatest, map, catchError, of } from 'rxjs';
import moment from 'moment';
import {
  SalesData,
  ProductMetrics,
  CustomerSegment,
  RegionalPerformance,
  DashboardMetrics,
  FilterOptions,
  TimeSeriesData,
} from '../models/analytics.models';
import { CsvImportService } from './csv-import.service';

@Injectable({
  providedIn: 'root',
})
export class AnalyticsDataService {
  private salesDataSubject = new BehaviorSubject<SalesData[]>([]);
  private filtersSubject = new BehaviorSubject<FilterOptions>({
    dateRange: {
      start: moment().subtract(30, 'days'), // 30 days ago
      end: moment(),
    },
    regions: [],
    categories: [],
    customerSegments: [],
  });

  // Optimized data streams
  public readonly salesData$ = this.salesDataSubject.asObservable();
  public readonly filters$ = this.filtersSubject.asObservable();

  // Computed observables for performance
  public readonly filteredSalesData$ = combineLatest([this.salesData$, this.filters$]).pipe(
    map(([salesData, filters]) => this.applyFilters(salesData, filters))
  );

  public readonly dashboardMetrics$ = this.filteredSalesData$.pipe(
    map((data) => this.calculateDashboardMetrics(data))
  );

  public readonly productMetrics$ = this.filteredSalesData$.pipe(
    map((data) => this.calculateProductMetrics(data))
  );

  public readonly customerSegments$ = this.filteredSalesData$.pipe(
    map((data) => this.calculateCustomerSegments(data))
  );

  public readonly regionalPerformance$ = this.filteredSalesData$.pipe(
    map((data) => this.calculateRegionalPerformance(data))
  );

  constructor(private csvImportService: CsvImportService) {
    // Initialize with empty data - requires CSV import
    // Optionally load sample data from assets
    this.loadSampleDataFromAssets();
  }

  // Optimized filtering with indexing
  private applyFilters(data: SalesData[], filters: FilterOptions): SalesData[] {
    return data.filter((item) => {
      console.log(
        item.date.toLocaleString(),
        filters.dateRange.start.toLocaleString(),
        filters.dateRange.end.toLocaleString()
      );

      const dateInRange = item.date.isBetween(filters.dateRange.start, filters.dateRange.end);

      const regionMatch = filters.regions.length === 0 || filters.regions.includes(item.region);
      const categoryMatch =
        filters.categories.length === 0 || filters.categories.includes(item.category);

      return dateInRange && regionMatch && categoryMatch;
    });
  }

  private calculateDashboardMetrics(data: SalesData[]): DashboardMetrics {
    const totalRevenue = data.reduce((sum, item) => sum + item.revenue, 0);
    const totalOrders = data.length;
    const uniqueCustomers = new Set(data.map((item) => item.customerId)).size;

    return {
      totalRevenue,
      totalOrders,
      averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
      customerCount: uniqueCustomers,
      conversionRate: 0.045, // Mock conversion rate
      periodComparison: {
        revenue: 0.12, // 12% growth
        orders: 0.08, // 8% growth
        customers: 0.15, // 15% growth
      },
    };
  }

  private calculateProductMetrics(data: SalesData[]): ProductMetrics[] {
    const productMap = new Map<string, any>();

    data.forEach((item) => {
      if (!productMap.has(item.productId)) {
        productMap.set(item.productId, {
          productId: item.productId,
          name: `Product ${item.productId}`,
          category: item.category,
          totalRevenue: 0,
          totalOrders: 0,
          averageOrderValue: 0,
          conversionRate: Math.random() * 0.1 + 0.02,
        });
      }

      const product = productMap.get(item.productId);
      product.totalRevenue += item.revenue;
      product.totalOrders += 1;
      product.averageOrderValue = product.totalRevenue / product.totalOrders;

      // Use actual product name if available
      if (item.productName && product.name.startsWith('Product ')) {
        product.name = item.productName;
      }
    });

    return Array.from(productMap.values());
  }

  private calculateCustomerSegments(data: SalesData[]): CustomerSegment[] {
    // Simplified customer segmentation
    const segments = ['High Value', 'Regular', 'New Customer', 'At Risk'];

    return segments.map((segment, index) => ({
      segmentId: `segment_${index}`,
      name: segment,
      customerCount: Math.floor(Math.random() * 1000) + 100,
      totalRevenue: Math.floor(Math.random() * 100000) + 10000,
      averageLifetimeValue: Math.floor(Math.random() * 5000) + 500,
      retentionRate: Math.random() * 0.3 + 0.6,
    }));
  }

  private calculateRegionalPerformance(data: SalesData[]): RegionalPerformance[] {
    const regionMap = new Map<string, any>();

    data.forEach((item) => {
      if (!regionMap.has(item.region)) {
        regionMap.set(item.region, {
          region: item.region,
          revenue: 0,
          orders: 0,
          customers: new Set(),
          growthRate: Math.random() * 0.4 - 0.1, // -10% to +30%
        });
      }

      const region = regionMap.get(item.region);
      region.revenue += item.revenue;
      region.orders += 1;
      region.customers.add(item.customerId);
    });

    return Array.from(regionMap.values()).map((region) => ({
      ...region,
      customers: region.customers.size,
    }));
  }

  // Update filters
  updateFilters(filters: Partial<FilterOptions>): void {
    const currentFilters = this.filtersSubject.value;
    this.filtersSubject.next({ ...currentFilters, ...filters });
  }

  // Generate time series data for charts
  getTimeSeriesData(
    metric: string,
    granularity: 'hour' | 'day' | 'week' | 'month' = 'day'
  ): Observable<TimeSeriesData[]> {
    return this.filteredSalesData$.pipe(
      map((data) => this.aggregateTimeSeriesData(data, metric, granularity))
    );
  }

  private aggregateTimeSeriesData(
    data: SalesData[],
    metric: string,
    granularity: string
  ): TimeSeriesData[] {
    const timeMap = new Map<string, { value: number; count: number }>();

    data.forEach((item) => {
      const timeKey = this.getTimeKey(item.date, granularity);
      if (!timeMap.has(timeKey)) {
        timeMap.set(timeKey, { value: 0, count: 0 });
      }

      const entry = timeMap.get(timeKey)!;
      entry.value += metric === 'revenue' ? item.revenue : 1;
      entry.count += 1;
    });

    return Array.from(timeMap.entries())
      .map(([timeKey, data]) => ({
        timestamp: moment(timeKey),
        value: data.value,
      }))
      .sort((a, b) => a.timestamp.valueOf() - b.timestamp.valueOf());
  }

  private getTimeKey(date: moment.Moment, granularity: string): string {
    switch (granularity) {
      case 'hour':
        return date.format('YYYY-MM-DD HH');
      case 'day':
        return date.format('YYYY-MM-DD');
      case 'week':
        const weekStart = date.clone().startOf('week');
        return weekStart.format('YYYY-MM-DD');
      case 'month':
        return date.format('YYYY-MM');
      default:
        return date.format('YYYY-MM-DD');
    }
  }

  // Load sample data from assets
  private loadSampleDataFromAssets(): void {
    this.csvImportService
      .loadSalesDataFromCsv('/assets/sample-sales-data.csv')
      .pipe(
        catchError((error) => {
          console.warn('Failed to load sample data from assets, using empty dataset:', error);
          return of([]);
        })
      )
      .subscribe((data) => {
        this.salesDataSubject.next(data);
      });
  }

  // Import sales data from CSV file
  importSalesDataFromCsv(csvFilePath: string): Observable<SalesData[]> {
    return this.csvImportService.loadSalesDataFromCsv(csvFilePath).pipe(
      map((data) => {
        this.salesDataSubject.next(data);
        return data;
      })
    );
  }

  // Import sales data from uploaded file
  async importSalesDataFromFile(file: File): Promise<SalesData[]> {
    const data = await this.csvImportService.parseUploadedFile(file);
    this.salesDataSubject.next(data);
    return data;
  }

  // Clear all data
  clearData(): void {
    this.salesDataSubject.next([]);
  }

  // Get sample CSV content for download
  downloadSampleCsv(): void {
    this.csvImportService.downloadSampleCsv();
  }
}
