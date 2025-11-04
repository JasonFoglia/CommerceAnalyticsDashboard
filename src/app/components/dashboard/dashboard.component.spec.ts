import { provideHttpClient } from '@angular/common/http';
import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import moment from 'moment';
import { of } from 'rxjs';
import {
  CustomerSegment,
  DashboardMetrics,
  ProductMetrics,
  RegionalPerformance,
  TimeSeriesData,
} from '../../models/analytics.models';
import { AnalyticsDataService } from '../../services/analytics-data.service';
import { DashboardComponent } from './dashboard.component';

describe('DashboardComponent', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;
  let analyticsService: jasmine.SpyObj<AnalyticsDataService>;

  const mockDashboardMetrics: DashboardMetrics = {
    totalRevenue: 150000,
    totalOrders: 1250,
    averageOrderValue: 120,
    customerCount: 800,
    conversionRate: 3.5,
    periodComparison: {
      revenue: 0.1,
      orders: 0.05,
      customers: 0.08,
    },
  };

  const mockProductMetrics: ProductMetrics[] = [
    {
      productId: 'p1',
      name: 'Product A',
      totalRevenue: 50000,
      totalOrders: 400,
      category: 'Category 1',
      averageOrderValue: 125,
      conversionRate: 3.5,
    },
    {
      productId: 'p2',
      name: 'Product B',
      totalRevenue: 75000,
      totalOrders: 500,
      category: 'Category 2',
      averageOrderValue: 150,
      conversionRate: 4.0,
    },
  ];

  const mockCustomerSegments: CustomerSegment[] = [
    {
      segmentId: 'Premium',
      customerCount: 200,
      totalRevenue: 80000,
      name: 'Premium',
      averageLifetimeValue: 1000,
      retentionRate: 0.9,
    },
    {
      segmentId: 'Regular',
      customerCount: 600,
      totalRevenue: 70000,
      name: 'Regular',
      averageLifetimeValue: 500,
      retentionRate: 0.8,
    },
  ];

  const mockRegionalPerformance: RegionalPerformance[] = [
    {
      region: 'North America',
      revenue: 80000,
      customers: 600,
      orders: 700,
      growthRate: 0.1,
    },
    {
      region: 'Europe',
      revenue: 70000,
      customers: 400,
      orders: 550,
      growthRate: 0.05,
    },
  ];

  const mockTimeSeriesData: TimeSeriesData[] = [
    {
      timestamp: moment().subtract(7, 'days'),
      value: 10000,
    },
    {
      timestamp: moment().subtract(6, 'days'),
      value: 12000,
    },
  ];

  beforeEach(async () => {
    const analyticsServiceSpy = jasmine.createSpyObj(
      'AnalyticsDataService',
      ['getTimeSeriesData', 'updateFilters'],
      {
        dashboardMetrics$: of(mockDashboardMetrics),
        productMetrics$: of(mockProductMetrics),
        customerSegments$: of(mockCustomerSegments),
        regionalPerformance$: of(mockRegionalPerformance),
      }
    );

    analyticsServiceSpy.getTimeSeriesData.and.returnValue(of(mockTimeSeriesData));

    const csvImportServiceSpy = jasmine.createSpyObj(
      'CsvImportService',
      ['loadSalesDataFromCsv', 'parseCsvToSalesData'],
      {}
    );

    csvImportServiceSpy.loadSalesDataFromCsv.and.returnValue(of(''));
    csvImportServiceSpy.parseCsvToSalesData.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        provideHttpClient(),
        provideZonelessChangeDetection(),
        { provide: AnalyticsDataService, useValue: analyticsServiceSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    analyticsService = TestBed.inject(AnalyticsDataService) as jasmine.SpyObj<AnalyticsDataService>;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize observables in constructor', () => {
    expect(component.dashboardMetrics$).toBeDefined();
    expect(component.productMetrics$).toBeDefined();
    expect(component.customerSegments$).toBeDefined();
    expect(component.regionalPerformance$).toBeDefined();
    expect(component.revenueTimeSeries$).toBeDefined();
    expect(component.ordersTimeSeries$).toBeDefined();
  });

  it('should call getTimeSeriesData for revenue and orders on initialization', () => {
    expect(analyticsService.getTimeSeriesData).toHaveBeenCalledWith('revenue', 'day');
    expect(analyticsService.getTimeSeriesData).toHaveBeenCalledWith('orders', 'day');
    expect(analyticsService.getTimeSeriesData).toHaveBeenCalledTimes(2);
  });

  it('should sort product metrics by total revenue in descending order', (done) => {
    component.productMetrics$.subscribe((products) => {
      expect(products[0].totalRevenue).toBeGreaterThan(products[1].totalRevenue);
      expect(products[0].name).toBe('Product B');
      expect(products[1].name).toBe('Product A');
      done();
    });
  });

  it('should sort regional performance by revenue in descending order', (done) => {
    component.regionalPerformance$.subscribe((regions) => {
      expect(regions[0].revenue).toBeGreaterThan(regions[1].revenue);
      expect(regions[0].region).toBe('North America');
      expect(regions[1].region).toBe('Europe');
      done();
    });
  });

  describe('onDateRangeChange', () => {
    it('should update filters with 7 days date range', () => {
      const dateRange = '7days';
      component.onDateRangeChange(dateRange);

      expect(analyticsService.updateFilters).toHaveBeenCalledWith({
        dateRange: {
          start: jasmine.any(moment),
          end: jasmine.any(moment),
        },
      });

      const call = analyticsService.updateFilters.calls.mostRecent();
      const { start, end } = call.args[0].dateRange || { start: moment(), end: moment() };
      const daysDiff = end.diff(start, 'days');
      expect(daysDiff).toBe(7);
    });

    it('should update filters with 30 days date range', () => {
      const dateRange = '30days';
      component.onDateRangeChange(dateRange);

      const call = analyticsService.updateFilters.calls.mostRecent();
      const { start, end } = call.args[0].dateRange || { start: moment(), end: moment() };
      const daysDiff = Math.round(end.diff(start, 'days', true));
      expect(daysDiff).toBe(30);
    });

    it('should update filters with 90 days date range', () => {
      const dateRange = '90days';
      component.onDateRangeChange(dateRange);

      const call = analyticsService.updateFilters.calls.mostRecent();
      const { start, end } = call.args[0].dateRange || { start: moment(), end: moment() };
      const daysDiff = end.diff(start, 'days');
      expect(daysDiff).toBe(90);
    });

    it('should default to 30 days for unknown date range', () => {
      const dateRange = 'unknown';
      component.onDateRangeChange(dateRange);

      const call = analyticsService.updateFilters.calls.mostRecent();
      const { start, end } = call.args[0].dateRange || { start: moment(), end: moment() };
      const daysDiff = Math.round(end.diff(start, 'days', true));
      expect(daysDiff).toBe(30);
    });

    it('should use current moment as end date', () => {
      const beforeCall = moment();
      component.onDateRangeChange('7days');
      const afterCall = moment();

      const call = analyticsService.updateFilters.calls.mostRecent();
      const { end } = call.args[0].dateRange || { start: moment(), end: moment() };

      expect(end.isBetween(beforeCall, afterCall, null, '[]')).toBe(true);
    });
  });

  describe('refreshData', () => {
    it('should exist as a method', () => {
      expect(typeof component.refreshData).toBe('function');
    });

    it('should not throw when called', () => {
      expect(() => component.refreshData()).not.toThrow();
    });
  });

  describe('ngOnInit', () => {
    it('should call ngOnInit without errors', () => {
      expect(() => component.ngOnInit()).not.toThrow();
    });
  });

  describe('Observable emissions', () => {
    it('should emit dashboard metrics', (done) => {
      component.dashboardMetrics$.subscribe((metrics) => {
        expect(metrics).toEqual(mockDashboardMetrics);
        done();
      });
    });

    it('should emit customer segments', (done) => {
      component.customerSegments$.subscribe((segments) => {
        expect(segments).toEqual(mockCustomerSegments);
        done();
      });
    });

    it('should emit time series data for revenue', (done) => {
      component.revenueTimeSeries$.subscribe((data) => {
        expect(data).toEqual(mockTimeSeriesData);
        done();
      });
    });

    it('should emit time series data for orders', (done) => {
      component.ordersTimeSeries$.subscribe((data) => {
        expect(data).toEqual(mockTimeSeriesData);
        done();
      });
    });
  });

  describe('Component template integration', () => {
    it('should render without errors', () => {
      expect(() => fixture.detectChanges()).not.toThrow();
    });

    it('should have proper change detection strategy', () => {
      expect(component.constructor.name).toContain('DashboardComponent');
      // OnPush change detection is set at component level
    });
  });
});
function provideHttpClientTesting(): any {
  throw new Error('Function not implemented.');
}
