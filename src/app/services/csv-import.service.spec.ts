import { HttpClient } from '@angular/common/http';
import moment from 'moment';
import { of } from 'rxjs';
import { CsvImportService } from './csv-import.service';

describe('CsvImportService', () => {
  let service: CsvImportService;
  let mockHttpClient: jasmine.SpyObj<HttpClient>;

  const headersLine = 'id,date,revenue,orders,customerId,productId,productName,category,region';

  beforeEach(() => {
    // Create mock HttpClient
    mockHttpClient = jasmine.createSpyObj('HttpClient', ['get']);

    // Create service instance directly with mock dependencies
    service = new CsvImportService(mockHttpClient);
  });

  it('should load sales data from CSV over HTTP', (done) => {
    const path = '/assets/data.csv';
    const csv = [headersLine, 'id1,2025-10-01,10.5,2,c1,p1,Name,Cat,Region'].join('\n');

    // Mock the HTTP GET call to return the CSV data
    mockHttpClient.get.and.returnValue(of(csv));

    service.loadSalesDataFromCsv(path).subscribe((data) => {
      expect(data.length).toBe(1);
      const item = data[0];
      expect(item.id).toBe('id1');
      expect(item.revenue).toBe(10.5);
      expect(item.orders).toBe(2);
      expect(item.customerId).toBe('c1');
      expect(item.productId).toBe('p1');
      expect(item.category).toBe('Cat');
      expect(item.region).toBe('Region');
      expect(moment.isMoment(item.date)).toBeTrue();
      expect(item.date.isSame(moment('2025-10-01', 'YYYY-MM-DD'), 'day')).toBeTrue();

      // Verify the HTTP call was made correctly
      expect(mockHttpClient.get).toHaveBeenCalledWith(
        path,
        jasmine.objectContaining({ responseType: 'text' })
      );

      done();
    });
  });

  it('should parse CSV with quoted commas correctly', () => {
    const csv = [
      headersLine,
      'id2,2025-10-02,99.99,1,c2,p2,"ACME, Inc.",Electronics,"North, America"',
    ].join('\n');

    const data = service.parseCsvToSalesData(csv);
    expect(data.length).toBe(1);
    const item = data[0];
    expect(item.id).toBe('id2');
    expect(item.revenue).toBe(99.99);
    expect(item.orders).toBe(1);
    expect(item.category).toBe('Electronics');
    expect(item.region).toBe('North, America');
    expect(item.date.isSame(moment('2025-10-02', 'YYYY-MM-DD'), 'day')).toBeTrue();
  });

  it('should skip lines with mismatched columns and log a warning', () => {
    const warnSpy = spyOn(console, 'warn');
    const csv = [
      headersLine,
      // Missing region column
      'id3,2025-10-03,20.00,1,c3,p3,Prod,Category',
      // Correct row
      'id4,2025-10-03,30.00,1,c4,p4,Prod,Category,Region',
    ].join('\n');

    const data = service.parseCsvToSalesData(csv);
    expect(data.length).toBe(1);
    expect(data[0].id).toBe('id4');
    expect(warnSpy).toHaveBeenCalled();
    expect(
      warnSpy.calls.allArgs().some((args) => String(args[0]).includes('Column count mismatch'))
    ).toBeTrue();
  });

  it('should skip invalid rows (invalid date) and log a warning', () => {
    const warnSpy = spyOn(console, 'warn');
    const csv = [headersLine, 'id5,not-a-date,20.00,1,c5,p5,Prod,Category,Region'].join('\n');

    const data = service.parseCsvToSalesData(csv);
    expect(data.length).toBe(0);
    expect(warnSpy).toHaveBeenCalled();
    expect(
      warnSpy.calls.allArgs().some((args) => String(args[0]).includes('Skipping invalid data'))
    ).toBeTrue();
  });

  it('should skip invalid rows (negative revenue)', () => {
    const csv = [headersLine, 'id6,2025-10-04,-1,1,c6,p6,Prod,Category,Region'].join('\n');

    const data = service.parseCsvToSalesData(csv);
    expect(data.length).toBe(0);
  });

  it('should apply sensible defaults when fields are missing or empty', () => {
    // 9 columns total, only date is provided
    const csv = [headersLine, ',2025-10-05,,,,,,,'].join('\n');

    const data = service.parseCsvToSalesData(csv);
    expect(data.length).toBe(1);
    const item = data[0];
    expect(item.id).toBe('order_1');
    expect(item.revenue).toBe(0);
    expect(item.orders).toBe(1);
    expect(item.customerId).toBe('customer_1');
    expect(item.productId).toBe('product_1');
    expect(item.category).toBe('Unknown');
    expect(item.region).toBe('Unknown');
    expect(item.date.isSame(moment('2025-10-05', 'YYYY-MM-DD'), 'day')).toBeTrue();
  });

  it('should ignore empty lines', () => {
    const csv = [headersLine, '', 'id7,2025-10-06,12.34,1,c7,p7,Prod,Category,Region', '   '].join(
      '\n'
    );

    const data = service.parseCsvToSalesData(csv);
    expect(data.length).toBe(1);
    expect(data[0].id).toBe('id7');
  });

  it('generateSampleCsvContent should produce parseable CSV with expected rows', () => {
    const csv = service.generateSampleCsvContent();
    const data = service.parseCsvToSalesData(csv);
    expect(data.length).toBe(6);
    expect(data[0].id).toBe('order_001');
    expect(data[0].region).toBe('North America');
    expect(data[5].id).toBe('order_006');
    expect(data.every((d) => d.date.isValid())).toBeTrue();
  });

  it('downloadSampleCsv should create a blob URL and trigger download', () => {
    const clickSpy = jasmine.createSpy('click');
    const fakeAnchor: any = { click: clickSpy };
    spyOn(document, 'createElement').and.returnValue(fakeAnchor);

    let capturedBlob: Blob | undefined;
    const createUrlSpy = spyOn(window.URL, 'createObjectURL').and.callFake((blob: any) => {
      capturedBlob = blob as Blob;
      return 'blob://test';
    });
    const revokeSpy = spyOn(window.URL, 'revokeObjectURL');

    service.downloadSampleCsv();

    expect(createUrlSpy).toHaveBeenCalled();
    expect(revokeSpy).toHaveBeenCalledWith('blob://test');
    expect(capturedBlob).toBeTruthy();
    expect(capturedBlob!.type).toBe('text/csv');
    expect(fakeAnchor.href).toBe('blob://test');
    expect(fakeAnchor.download).toBe('sample-sales-data.csv');
    expect(clickSpy).toHaveBeenCalled();
  });

  it('parseUploadedFile should read and parse a File', (done) => {
    const csv = [headersLine, 'id8,2025-10-07,55.5,1,c8,p8,Prod,Category,Region'].join('\n');
    const file = new File([csv], 'test.csv', { type: 'text/csv' });

    service
      .parseUploadedFile(file)
      .then((data) => {
        expect(data.length).toBe(1);
        expect(data[0].id).toBe('id8');
        expect(data[0].revenue).toBe(55.5);
        expect(data[0].date.isSame(moment('2025-10-07', 'YYYY-MM-DD'), 'day')).toBeTrue();
        done();
      })
      .catch(done.fail);
  });
});
