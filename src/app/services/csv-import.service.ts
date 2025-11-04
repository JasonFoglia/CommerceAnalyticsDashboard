import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { SalesData } from '../models/analytics.models';
import moment from 'moment';

@Injectable({
  providedIn: 'root',
})
export class CsvImportService {
  constructor(private http: HttpClient) {}

  /**
   * Load sales data from CSV file
   * @param csvFilePath Path to the CSV file
   * @returns Observable of parsed sales data
   */
  loadSalesDataFromCsv(csvFilePath: string): Observable<SalesData[]> {
    return this.http
      .get(csvFilePath, { responseType: 'text' })
      .pipe(map((csvText) => this.parseCsvToSalesData(csvText)));
  }

  /**
   * Parse CSV text to SalesData array
   * @param csvText Raw CSV text content
   * @returns Array of SalesData objects
   */
  parseCsvToSalesData(csvText: string): SalesData[] {
    const lines = csvText.split('\n').filter((line) => line.trim() !== '');
    const headers = lines[0].split(',').map((header) => header.trim());

    const salesData: SalesData[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCsvLine(lines[i]);

      if (values.length !== headers.length) {
        console.warn(`Skipping line ${i + 1}: Column count mismatch`);
        continue;
      }

      try {
        const row: any = {};
        headers.forEach((header, index) => {
          row[header] = values[index];
        });

        // Map CSV row to SalesData interface
        const salesItem: SalesData = {
          id: row.id || `order_${i}`,
          date: moment(row.date),
          revenue: parseFloat(row.revenue) || 0,
          orders: parseInt(row.orders) || 1,
          customerId: row.customerId || `customer_${i}`,
          productId: row.productId || `product_${i}`,
          category: row.category || 'Unknown',
          region: row.region || 'Unknown',
        };

        // Validate the data
        if (this.isValidSalesData(salesItem)) {
          salesData.push(salesItem);
        } else {
          console.warn(`Skipping invalid data at line ${i + 1}:`, salesItem);
        }
      } catch (error) {
        console.error(`Error parsing line ${i + 1}:`, error);
      }
    }

    return salesData;
  }

  /**
   * Parse a single CSV line, handling quoted values and commas within quotes
   * @param line CSV line to parse
   * @returns Array of values
   */
  private parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    result.push(current.trim());
    return result;
  }

  /**
   * Validate SalesData object
   * @param data SalesData object to validate
   * @returns boolean indicating if data is valid
   */
  private isValidSalesData(data: SalesData): boolean {
    return !!(
      data.id &&
      data.date &&
      data.date.isValid() &&
      typeof data.revenue === 'number' &&
      data.revenue >= 0 &&
      data.customerId &&
      data.productId &&
      data.category &&
      data.region
    );
  }

  /**
   * Parse uploaded file to sales data
   * @param file File object from file input
   * @returns Promise of parsed sales data
   */
  parseUploadedFile(file: File): Promise<SalesData[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const csvText = e.target?.result as string;
          const salesData = this.parseCsvToSalesData(csvText);
          resolve(salesData);
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };

      reader.readAsText(file);
    });
  }

  /**
   * Generate sample CSV content for download
   * @returns CSV content as string
   */
  generateSampleCsvContent(): string {
    const headers = [
      'id',
      'date',
      'revenue',
      'orders',
      'customerId',
      'productId',
      'productName',
      'category',
      'region',
    ];

    const sampleRows = [
      [
        'order_001',
        '2025-10-01',
        '125.99',
        '1',
        'customer_1001',
        'product_501',
        'Wireless Headphones',
        'Electronics',
        'North America',
      ],
      [
        'order_002',
        '2025-10-01',
        '89.50',
        '1',
        'customer_1002',
        'product_502',
        'Cotton T-Shirt',
        'Clothing',
        'Europe',
      ],
      [
        'order_003',
        '2025-10-02',
        '234.75',
        '1',
        'customer_1003',
        'product_503',
        'Garden Tools',
        'Home & Garden',
        'Asia Pacific',
      ],
      [
        'order_004',
        '2025-10-02',
        '67.25',
        '1',
        'customer_1004',
        'product_504',
        'Running Shoes',
        'Sports',
        'North America',
      ],
      [
        'order_005',
        '2025-10-03',
        '29.99',
        '1',
        'customer_1005',
        'product_505',
        'Programming Book',
        'Books',
        'Europe',
      ],
      [
        'order_006',
        '2025-10-06',
        '29.99',
        '1',
        'customer_1005',
        'product_505',
        'Programming Book',
        'Books',
        'Europe',
      ],
    ];

    const csvContent = [headers.join(','), ...sampleRows.map((row) => row.join(','))].join('\n');

    return csvContent;
  }

  /**
   * Download sample CSV file
   */
  downloadSampleCsv(): void {
    const csvContent = this.generateSampleCsvContent();
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = 'sample-sales-data.csv';
    link.click();

    window.URL.revokeObjectURL(url);
  }
}
