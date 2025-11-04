import moment from 'moment';
import { of, throwError } from 'rxjs';
import { FilterOptions, SalesData } from '../models/analytics.models';
import { AnalyticsDataService } from './analytics-data.service';
import { CsvImportService } from './csv-import.service';

describe('AnalyticsDataService', () => {
  let service: AnalyticsDataService;
  let csvImportServiceSpy: jasmine.SpyObj<CsvImportService>;

  const mockSalesData: SalesData[] = [
    {
      id: 'order1',
      date: moment('2024-01-15'),
      customerId: 'customer1',
      productId: 'product1',
      productName: 'Widget A',
      category: 'Electronics',
      region: 'North',
      revenue: 250,
      orders: 2,
    },
    {
      id: 'order2',
      date: moment('2024-01-16'),
      customerId: 'customer2',
      productId: 'product2',
      productName: 'Widget B',
      category: 'Electronics',
      region: 'South',
      revenue: 150,
      orders: 1,
    },
    {
      id: 'order3',
      date: moment('2024-01-17'),
      customerId: 'customer1',
      productId: 'product1',
      productName: 'Widget A',
      category: 'Electronics',
      region: 'North',
      revenue: 300,
      orders: 3,
    },
    {
      id: 'order4',
      date: moment('2024-01-18'),
      customerId: 'customer3',
      productId: 'product3',
      productName: 'Widget C',
      category: 'Home',
      region: 'East',
      revenue: 50,
      orders: 1,
    },
  ];

  beforeEach(() => {
    csvImportServiceSpy = jasmine.createSpyObj('CsvImportService', [
      'loadSalesDataFromCsv',
      'parseUploadedFile',
      'downloadSampleCsv',
    ]);

    csvImportServiceSpy.loadSalesDataFromCsv.and.returnValue(of([]));

    service = new AnalyticsDataService(csvImportServiceSpy);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Initialization', () => {
    it('should load sample data from assets on initialization', () => {
      expect(csvImportServiceSpy.loadSalesDataFromCsv).toHaveBeenCalledWith(
        'assets/sample-sales-data.csv'
      );
    });

    it('should handle failed sample data load gracefully', (done) => {
      csvImportServiceSpy.loadSalesDataFromCsv.and.returnValue(
        throwError(() => new Error('Failed to load'))
      );

      const newService = new AnalyticsDataService(csvImportServiceSpy);

      newService.salesData$.subscribe((data) => {
        expect(data).toEqual([]);
        done();
      });
    });
  });

  describe('Filter Management', () => {
    it('should update filters correctly', (done) => {
      const newFilters: Partial<FilterOptions> = {
        regions: ['North', 'South'],
        categories: ['Electronics'],
      };

      service.updateFilters(newFilters);

      service.filters$.subscribe((filters) => {
        expect(filters.regions).toEqual(['North', 'South']);
        expect(filters.categories).toEqual(['Electronics']);
        done();
      });
    });

    it('should merge partial filters with existing filters', (done) => {
      service.updateFilters({ regions: ['North'] });
      service.updateFilters({ categories: ['Electronics'] });

      service.filters$.subscribe((filters) => {
        expect(filters.regions).toEqual(['North']);
        expect(filters.categories).toEqual(['Electronics']);
        done();
      });
    });
  });

  describe('Filtered Sales Data', () => {
    beforeEach(() => {
      // Manually set the mock data since the constructor initialization uses empty mock
      service['salesDataSubject'].next(mockSalesData);
      // Set date range to include our test data from 2024
      service.updateFilters({
        dateRange: {
          start: moment('2024-01-01'),
          end: moment('2024-12-31'),
        },
      });
    });

    it('should filter data by date range', (done) => {
      service.updateFilters({
        dateRange: {
          start: moment('2024-01-15'),
          end: moment('2024-01-16'),
        },
      });

      service.filteredSalesData$.subscribe((data) => {
        expect(data.length).toBe(2);
        expect(
          data.every((item) =>
            item.date.isBetween(moment('2024-01-15'), moment('2024-01-16'), null, '[]')
          )
        ).toBe(true);
        done();
      });
    });

    it('should filter data by region', (done) => {
      service.updateFilters({ regions: ['North'] });

      service.filteredSalesData$.subscribe((data) => {
        expect(data.length).toBe(2);
        expect(data.every((item) => item.region === 'North')).toBe(true);
        done();
      });
    });

    it('should filter data by category', (done) => {
      service.updateFilters({ categories: ['Home'] });

      service.filteredSalesData$.subscribe((data) => {
        expect(data.length).toBe(1);
        expect(data[0].category).toBe('Home');
        done();
      });
    });

    it('should apply multiple filters simultaneously', (done) => {
      service.updateFilters({
        regions: ['North'],
        categories: ['Electronics'],
      });

      service.filteredSalesData$.subscribe((data) => {
        expect(data.length).toBe(2);
        expect(
          data.every((item) => item.region === 'North' && item.category === 'Electronics')
        ).toBe(true);
        done();
      });
    });
  });

  describe('Dashboard Metrics', () => {
    beforeEach(() => {
      // Manually set the mock data since the constructor initialization uses empty mock
      service['salesDataSubject'].next(mockSalesData);
      // Set date range to include our test data from 2024
      service.updateFilters({
        dateRange: {
          start: moment('2024-01-01'),
          end: moment('2024-12-31'),
        },
      });
    });

    it('should calculate total revenue correctly', (done) => {
      service.dashboardMetrics$.subscribe((metrics) => {
        expect(metrics.totalRevenue).toBe(750);
        done();
      });
    });

    it('should calculate total orders correctly', (done) => {
      service.dashboardMetrics$.subscribe((metrics) => {
        expect(metrics.totalOrders).toBe(4);
        done();
      });
    });

    it('should calculate average order value correctly', (done) => {
      service.dashboardMetrics$.subscribe((metrics) => {
        expect(metrics.averageOrderValue).toBe(187.5);
        done();
      });
    });

    it('should calculate unique customer count correctly', (done) => {
      service.dashboardMetrics$.subscribe((metrics) => {
        expect(metrics.customerCount).toBe(3);
        done();
      });
    });

    it('should handle empty data gracefully', (done) => {
      service['salesDataSubject'].next([]);

      service.dashboardMetrics$.subscribe((metrics) => {
        expect(metrics.totalRevenue).toBe(0);
        expect(metrics.totalOrders).toBe(0);
        expect(metrics.averageOrderValue).toBe(0);
        expect(metrics.customerCount).toBe(0);
        done();
      });
    });
  });

  describe('Product Metrics', () => {
    beforeEach(() => {
      // Manually set the mock data since the constructor initialization uses empty mock
      service['salesDataSubject'].next(mockSalesData);
      // Set date range to include our test data from 2024
      service.updateFilters({
        dateRange: {
          start: moment('2024-01-01'),
          end: moment('2024-12-31'),
        },
      });
    });

    it('should aggregate metrics by product', (done) => {
      service.productMetrics$.subscribe((metrics) => {
        expect(metrics.length).toBe(3);
        done();
      });
    });

    it('should calculate product revenue correctly', (done) => {
      service.productMetrics$.subscribe((metrics) => {
        const product1 = metrics.find((p) => p.productId === 'product1');
        expect(product1?.totalRevenue).toBe(550);
        done();
      });
    });

    it('should use actual product names when available', (done) => {
      service.productMetrics$.subscribe((metrics) => {
        const product1 = metrics.find((p) => p.productId === 'product1');
        expect(product1?.name).toBe('Widget A');
        done();
      });
    });

    it('should calculate average order value per product', (done) => {
      service.productMetrics$.subscribe((metrics) => {
        const product1 = metrics.find((p) => p.productId === 'product1');
        expect(product1?.averageOrderValue).toBe(275);
        done();
      });
    });
  });

  describe('Customer Segments', () => {
    beforeEach(() => {
      // Manually set the mock data since the constructor initialization uses empty mock
      service['salesDataSubject'].next(mockSalesData);
      // Set date range to include our test data from 2024
      service.updateFilters({
        dateRange: {
          start: moment('2024-01-01'),
          end: moment('2024-12-31'),
        },
      });
    });

    it('should create customer segments', (done) => {
      service.customerSegments$.subscribe((segments) => {
        expect(segments.length).toBe(4);
        expect(segments.map((s) => s.name)).toEqual([
          'High Value',
          'Regular',
          'New Customer',
          'At Risk',
        ]);
        done();
      });
    });

    it('should segment high value customers correctly', (done) => {
      service.customerSegments$.subscribe((segments) => {
        const highValue = segments.find((s) => s.name === 'High Value');
        expect(highValue?.customerCount).toBeGreaterThan(0);
        done();
      });
    });

    it('should calculate segment revenue correctly', (done) => {
      service.customerSegments$.subscribe((segments) => {
        const totalRevenue = segments.reduce((sum, s) => sum + s.totalRevenue, 0);
        expect(totalRevenue).toBeGreaterThanOrEqual(0);
        done();
      });
    });
  });

  describe('Regional Performance', () => {
    beforeEach(() => {
      // Manually set the mock data since the constructor initialization uses empty mock
      service['salesDataSubject'].next(mockSalesData);
      // Set date range to include our test data from 2024
      service.updateFilters({
        dateRange: {
          start: moment('2024-01-01'),
          end: moment('2024-12-31'),
        },
      });
    });

    it('should aggregate data by region', (done) => {
      service.regionalPerformance$.subscribe((performance) => {
        expect(performance.length).toBe(3);
        done();
      });
    });

    it('should calculate regional revenue correctly', (done) => {
      service.regionalPerformance$.subscribe((performance) => {
        const north = performance.find((r) => r.region === 'North');
        expect(north?.revenue).toBe(550);
        done();
      });
    });

    it('should count unique customers per region', (done) => {
      service.regionalPerformance$.subscribe((performance) => {
        const north = performance.find((r) => r.region === 'North');
        expect(north?.customers).toBe(1);
        done();
      });
    });
  });

  describe('Time Series Data', () => {
    beforeEach(() => {
      // Manually set the mock data since the constructor initialization uses empty mock
      service['salesDataSubject'].next(mockSalesData);
      // Set date range to include our test data from 2024
      service.updateFilters({
        dateRange: {
          start: moment('2024-01-01'),
          end: moment('2024-12-31'),
        },
      });
    });

    it('should aggregate revenue by day', (done) => {
      service.getTimeSeriesData('revenue', 'day').subscribe((timeSeries) => {
        expect(timeSeries.length).toBeGreaterThan(0);
        expect(timeSeries[0].value).toBeGreaterThan(0);
        done();
      });
    });

    it('should aggregate orders by day', (done) => {
      service.getTimeSeriesData('orders', 'day').subscribe((timeSeries) => {
        expect(timeSeries.length).toBeGreaterThan(0);
        done();
      });
    });

    it('should sort time series data chronologically', (done) => {
      service.getTimeSeriesData('revenue', 'day').subscribe((timeSeries) => {
        for (let i = 1; i < timeSeries.length; i++) {
          expect(timeSeries[i].timestamp.valueOf()).toBeGreaterThanOrEqual(
            timeSeries[i - 1].timestamp.valueOf()
          );
        }
        done();
      });
    });
  });

  describe('CSV Import', () => {
    it('should import sales data from CSV file path', (done) => {
      csvImportServiceSpy.loadSalesDataFromCsv.and.returnValue(of(mockSalesData));

      service.importSalesDataFromCsv('test.csv').subscribe((data) => {
        expect(data).toEqual(mockSalesData);
        expect(csvImportServiceSpy.loadSalesDataFromCsv).toHaveBeenCalledWith('test.csv');
        done();
      });
    });

    it('should import sales data from uploaded file', async () => {
      const mockFile = new File([''], 'test.csv');
      csvImportServiceSpy.parseUploadedFile.and.returnValue(Promise.resolve(mockSalesData));

      const result = await service.importSalesDataFromFile(mockFile);

      expect(result).toEqual(mockSalesData);
      expect(csvImportServiceSpy.parseUploadedFile).toHaveBeenCalledWith(mockFile);
    });

    it('should update sales data subject after import', (done) => {
      csvImportServiceSpy.loadSalesDataFromCsv.and.returnValue(of(mockSalesData));

      service.importSalesDataFromCsv('test.csv').subscribe(() => {
        service.salesData$.subscribe((data) => {
          expect(data).toEqual(mockSalesData);
          done();
        });
      });
    });
  });

  describe('Data Management', () => {
    it('should clear all data', (done) => {
      service['salesDataSubject'].next(mockSalesData);
      service.clearData();

      service.salesData$.subscribe((data) => {
        expect(data).toEqual([]);
        done();
      });
    });

    it('should trigger sample CSV download', () => {
      service.downloadSampleCsv();
      expect(csvImportServiceSpy.downloadSampleCsv).toHaveBeenCalled();
    });
  });
});
