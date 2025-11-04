import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import moment from 'moment';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AnalyticsDataService } from '../../services/analytics-data.service';

@Component({
  selector: 'app-data-import',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatSnackBarModule,
  ],
  templateUrl: './data-import.component.html',
  styleUrl: './data-import.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DataImportComponent {
  isDragOver = signal(false);
  isUploading = signal(false);
  uploadedFileName = signal<string | null>(null);
  importStats = signal<{
    recordsImported: number;
    dateRange: string;
    totalRevenue: number;
    uniqueProducts: number;
  } | null>(null);

  constructor(private analyticsService: AnalyticsDataService, private snackBar: MatSnackBar) {}

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(false);

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.processFile(files[0]);
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.processFile(input.files[0]);
    }
  }

  private async processFile(file: File): Promise<void> {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      this.snackBar.open('Please select a CSV file', 'Close', { duration: 3000 });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      // 10MB limit
      this.snackBar.open('File size must be less than 10MB', 'Close', { duration: 3000 });
      return;
    }

    this.isUploading.set(true);
    this.uploadedFileName.set(file.name);

    try {
      const salesData = await this.analyticsService.importSalesDataFromFile(file);

      // Calculate import statistics
      const stats = this.calculateImportStats(salesData);
      this.importStats.set(stats);

      this.snackBar.open(`Successfully imported ${salesData.length} records`, 'Close', {
        duration: 5000,
      });
    } catch (error) {
      console.error('Error importing CSV:', error);
      this.snackBar.open('Error importing CSV file. Please check the format.', 'Close', {
        duration: 5000,
      });
      this.uploadedFileName.set(null);
    } finally {
      this.isUploading.set(false);
    }
  }

  private calculateImportStats(salesData: any[]): {
    recordsImported: number;
    dateRange: string;
    totalRevenue: number;
    uniqueProducts: number;
  } {
    if (salesData.length === 0) {
      return {
        recordsImported: 0,
        dateRange: 'No data',
        totalRevenue: 0,
        uniqueProducts: 0,
      };
    }

    const dates = salesData
      .map((item) => moment(item.date))
      .sort((a, b) => a.valueOf() - b.valueOf());
    const startDate = dates[0];
    const endDate = dates[dates.length - 1];

    const totalRevenue = salesData.reduce((sum, item) => sum + (item.revenue || 0), 0);
    const uniqueProducts = new Set(salesData.map((item) => item.productId)).size;

    return {
      recordsImported: salesData.length,
      dateRange: `${startDate.format('MM/DD/YYYY')} - ${endDate.format('MM/DD/YYYY')}`,
      totalRevenue,
      uniqueProducts,
    };
  }

  downloadSampleCsv(): void {
    this.analyticsService.downloadSampleCsv();
    this.snackBar.open('Sample CSV downloaded', 'Close', { duration: 3000 });
  }

  loadSampleData(): void {
    this.isUploading.set(true);

    // Load from the assets sample data
    this.analyticsService.importSalesDataFromCsv('assets/sample-sales-data.csv').subscribe({
      next: (data) => {
        const stats = this.calculateImportStats(data);
        this.importStats.set(stats);
        this.uploadedFileName.set('sample-sales-data.csv');
        this.snackBar.open(`Sample data loaded: ${data.length} records`, 'Close', {
          duration: 3000,
        });
      },
      error: (error) => {
        console.error('Error loading sample data:', error);
        this.snackBar.open('Error loading sample data', 'Close', { duration: 3000 });
      },
      complete: () => {
        this.isUploading.set(false);
      },
    });
  }

  clearData(): void {
    this.analyticsService.clearData();
    this.uploadedFileName.set(null);
    this.importStats.set(null);
    this.snackBar.open('Data cleared', 'Close', { duration: 3000 });
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  }
}
