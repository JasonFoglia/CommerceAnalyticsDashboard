import { provideHttpClient } from '@angular/common/http';
import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import moment from 'moment';
import { of, throwError } from 'rxjs';
import { SalesData } from '../../models/analytics.models';
import { AnalyticsDataService } from '../../services/analytics-data.service';
import { DataImportComponent } from './data-import.component';

describe('DataImportComponent', () => {
  let component: DataImportComponent;
  let fixture: ComponentFixture<DataImportComponent>;
  let mockAnalyticsService: jasmine.SpyObj<AnalyticsDataService>;
  let mockSnackBar: jasmine.SpyObj<MatSnackBar>;

  const mockSalesData = [
    {
      id: '1',
      orders: 10,
      customerId: 'cust1',
      category: 'cat1',
      region: 'region1',
      date: moment('2024-01-01'),
      revenue: 1000,
      productId: 'prod1',
    },
    {
      id: '2',
      orders: 15,
      customerId: 'cust2',
      category: 'cat2',
      region: 'region2',
      date: moment('2024-01-02'),
      revenue: 1500,
      productId: 'prod2',
    },
    {
      id: '3',
      orders: 20,
      customerId: 'cust3',
      category: 'cat3',
      region: 'region3',
      date: moment('2024-01-03'),
      revenue: 2000,
      productId: 'prod1',
    },
  ] as SalesData[];

  beforeEach(async () => {
    mockAnalyticsService = jasmine.createSpyObj('AnalyticsDataService', [
      'importSalesDataFromFile',
      'importSalesDataFromCsv',
      'downloadSampleCsv',
      'clearData',
    ]);
    mockSnackBar = jasmine.createSpyObj('MatSnackBar', ['open']);

    await TestBed.configureTestingModule({
      imports: [DataImportComponent, NoopAnimationsModule, MatSnackBarModule],
      providers: [
        provideHttpClient(),
        provideZonelessChangeDetection(),
        { provide: AnalyticsDataService, useValue: mockAnalyticsService },
        { provide: MatSnackBar, useValue: mockSnackBar },
      ],
    })
      .overrideComponent(DataImportComponent, {
        set: {
          providers: [
            { provide: AnalyticsDataService, useValue: mockAnalyticsService },
            { provide: MatSnackBar, useValue: mockSnackBar },
          ],
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(DataImportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Drag and Drop', () => {
    it('should set isDragOver to true on dragover', () => {
      const event = new DragEvent('dragover');
      spyOn(event, 'preventDefault');
      spyOn(event, 'stopPropagation');

      component.onDragOver(event);

      expect(component.isDragOver()).toBe(true);
      expect(event.preventDefault).toHaveBeenCalled();
      expect(event.stopPropagation).toHaveBeenCalled();
    });

    it('should set isDragOver to false on dragleave', () => {
      component.isDragOver.set(true);
      const event = new DragEvent('dragleave');
      spyOn(event, 'preventDefault');
      spyOn(event, 'stopPropagation');

      component.onDragLeave(event);

      expect(component.isDragOver()).toBe(false);
      expect(event.preventDefault).toHaveBeenCalled();
      expect(event.stopPropagation).toHaveBeenCalled();
    });

    it('should process file on drop', () => {
      const mockFile = new File(['test'], 'test.csv', { type: 'text/csv' });
      const mockDataTransfer = {
        files: { 0: mockFile, length: 1 } as unknown as FileList,
      } as DataTransfer;
      const event = new DragEvent('drop');
      Object.defineProperty(event, 'dataTransfer', { value: mockDataTransfer });

      spyOn(event, 'preventDefault');
      spyOn(event, 'stopPropagation');
      spyOn(component, 'processFile' as any);

      component.onDrop(event);

      expect(component.isDragOver()).toBe(false);
      expect(event.preventDefault).toHaveBeenCalled();
      expect(event.stopPropagation).toHaveBeenCalled();
      expect((component as any).processFile).toHaveBeenCalledWith(mockFile);
    });
  });

  describe('File Selection', () => {
    it('should process file when file is selected', () => {
      const mockFile = new File(['test'], 'test.csv', { type: 'text/csv' });
      const event = { target: { files: [mockFile] } } as any;
      spyOn(component, 'processFile' as any);

      component.onFileSelected(event);

      expect((component as any).processFile).toHaveBeenCalledWith(mockFile);
    });

    it('should not process file when no file is selected', () => {
      const event = { target: { files: [] } } as any;
      spyOn(component, 'processFile' as any);

      component.onFileSelected(event);

      expect((component as any).processFile).not.toHaveBeenCalled();
    });
  });

  describe('File Processing', () => {
    it('should reject non-CSV files', async () => {
      const mockFile = new File(['test'], 'test.txt', { type: 'text/plain' });

      await (component as any).processFile(mockFile);
      fixture.detectChanges();

      expect(mockSnackBar.open).toHaveBeenCalledWith('Please select a CSV file', 'Close', {
        duration: 3000,
      });
      expect(mockAnalyticsService.importSalesDataFromFile).not.toHaveBeenCalled();
    });

    it('should reject files larger than 10MB', async () => {
      const mockFile = {
        name: 'test.csv',
        size: 11 * 1024 * 1024, // 11MB
      } as File;

      await (component as any).processFile(mockFile);
      fixture.detectChanges();

      expect(mockSnackBar.open).toHaveBeenCalledWith('File size must be less than 10MB', 'Close', {
        duration: 3000,
      });
      expect(mockAnalyticsService.importSalesDataFromFile).not.toHaveBeenCalled();
    });

    it('should successfully process valid CSV file', async () => {
      const mockFile = new File(['test'], 'test.csv', { type: 'text/csv' });
      mockAnalyticsService.importSalesDataFromFile.and.returnValue(Promise.resolve(mockSalesData));

      await (component as any).processFile(mockFile);
      fixture.detectChanges();

      expect(component.isUploading()).toBe(false);
      expect(component.uploadedFileName()).toBe('test.csv');
      expect(component.importStats()).toEqual({
        recordsImported: 3,
        dateRange: '01/01/2024 - 01/03/2024',
        totalRevenue: 4500,
        uniqueProducts: 2,
      });
      expect(mockSnackBar.open).toHaveBeenCalledWith('Successfully imported 3 records', 'Close', {
        duration: 5000,
      });
    });

    it('should handle file processing errors', async () => {
      const mockFile = new File(['test'], 'test.csv', { type: 'text/csv' });
      mockAnalyticsService.importSalesDataFromFile.and.returnValue(Promise.reject('Import error'));

      await (component as any).processFile(mockFile);
      fixture.detectChanges();

      expect(component.isUploading()).toBe(false);
      expect(component.uploadedFileName()).toBeNull();
      expect(mockSnackBar.open).toHaveBeenCalledWith(
        'Error importing CSV file. Please check the format.',
        'Close',
        { duration: 5000 }
      );
    });
  });

  describe('Import Statistics', () => {
    it('should calculate stats for empty data', () => {
      const stats = (component as any).calculateImportStats([]);

      expect(stats).toEqual({
        recordsImported: 0,
        dateRange: 'No data',
        totalRevenue: 0,
        uniqueProducts: 0,
      });
    });

    it('should calculate stats correctly for valid data', () => {
      const stats = (component as any).calculateImportStats(mockSalesData);

      expect(stats.recordsImported).toBe(3);
      expect(stats.dateRange).toBe('01/01/2024 - 01/03/2024');
      expect(stats.totalRevenue).toBe(4500);
      expect(stats.uniqueProducts).toBe(2);
    });

    it('should handle missing revenue values', () => {
      const dataWithMissingRevenue = [
        { date: '2024-01-01', productId: 'prod1' },
        { date: '2024-01-02', revenue: 1000, productId: 'prod2' },
      ];

      const stats = (component as any).calculateImportStats(dataWithMissingRevenue);

      expect(stats.totalRevenue).toBe(1000);
    });
  });

  describe('Sample Data Operations', () => {
    it('should download sample CSV', () => {
      component.downloadSampleCsv();

      expect(mockAnalyticsService.downloadSampleCsv).toHaveBeenCalled();
      expect(mockSnackBar.open).toHaveBeenCalledWith('Sample CSV downloaded', 'Close', {
        duration: 3000,
      });
    });

    it('should load sample data successfully', () => {
      mockAnalyticsService.importSalesDataFromCsv.and.returnValue(of(mockSalesData));

      component.loadSampleData();
      fixture.detectChanges();

      expect(component.isUploading()).toBe(false);
      expect(component.uploadedFileName()).toBe('sample-sales-data.csv');
      expect(component.importStats()).toBeDefined();
      expect(mockSnackBar.open).toHaveBeenCalledWith('Sample data loaded: 3 records', 'Close', {
        duration: 3000,
      });
    });

    it('should handle sample data loading errors', async () => {
      mockAnalyticsService.importSalesDataFromCsv.and.returnValue(throwError(() => 'Load error'));

      component.loadSampleData();

      // Wait a short time for the observable to complete
      await new Promise((resolve) => setTimeout(resolve, 0));
      fixture.detectChanges();

      expect(component.isUploading()).toBe(false);
      expect(mockSnackBar.open).toHaveBeenCalledWith('Error loading sample data', 'Close', {
        duration: 3000,
      });
    });
  });

  describe('Data Management', () => {
    it('should clear data and reset state', () => {
      component.uploadedFileName.set('test.csv');
      component.importStats.set({
        recordsImported: 1,
        dateRange: 'test',
        totalRevenue: 100,
        uniqueProducts: 1,
      });

      component.clearData();
      fixture.detectChanges();

      expect(mockAnalyticsService.clearData).toHaveBeenCalled();
      expect(component.uploadedFileName()).toBeNull();
      expect(component.importStats()).toBeNull();
      expect(mockSnackBar.open).toHaveBeenCalledWith('Data cleared', 'Close', { duration: 3000 });
    });
  });

  describe('Currency Formatting', () => {
    it('should format currency correctly', () => {
      expect(component.formatCurrency(1000)).toBe('$1,000');
      expect(component.formatCurrency(1234.56)).toBe('$1,235');
      expect(component.formatCurrency(0)).toBe('$0');
    });
  });

  describe('Component State', () => {
    it('should initialize with correct default values', () => {
      expect(component.isDragOver()).toBe(false);
      expect(component.isUploading()).toBe(false);
      expect(component.uploadedFileName()).toBeNull();
      expect(component.importStats()).toBeNull();
    });

    it('should update loading state during file processing', async () => {
      const mockFile = new File(['test'], 'test.csv', { type: 'text/csv' });
      mockAnalyticsService.importSalesDataFromFile.and.returnValue(
        new Promise((resolve) => {
          setTimeout(() => resolve(mockSalesData), 100);
        })
      );

      const processPromise = (component as any).processFile(mockFile);

      expect(component.isUploading()).toBe(true);

      await processPromise;

      expect(component.isUploading()).toBe(false);
    });
  });
});
