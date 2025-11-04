import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import moment from 'moment';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Observable, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';

import { AnalyticsDataService } from '../../services/analytics-data.service';
import { VirtualizedChartComponent } from '../virtualized-chart/virtualized-chart.component';
import {
  DashboardMetrics,
  ProductMetrics,
  CustomerSegment,
  RegionalPerformance,
  TimeSeriesData,
} from '../../models/analytics.models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatFormFieldModule,
    MatInputModule,
    MatGridListModule,
    MatIconModule,
    MatProgressBarModule,
    VirtualizedChartComponent,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent implements OnInit {
  dashboardMetrics$: Observable<DashboardMetrics>;
  productMetrics$: Observable<ProductMetrics[]>;
  customerSegments$: Observable<CustomerSegment[]>;
  regionalPerformance$: Observable<RegionalPerformance[]>;
  revenueTimeSeries$: Observable<TimeSeriesData[]>;
  ordersTimeSeries$: Observable<TimeSeriesData[]>;

  constructor(private analyticsService: AnalyticsDataService) {
    this.dashboardMetrics$ = this.analyticsService.dashboardMetrics$;
    this.productMetrics$ = this.analyticsService.productMetrics$.pipe(
      map((products) => products.sort((a, b) => b.totalRevenue - a.totalRevenue))
    );
    this.customerSegments$ = this.analyticsService.customerSegments$;
    this.regionalPerformance$ = this.analyticsService.regionalPerformance$.pipe(
      map((regions) => regions.sort((a, b) => b.revenue - a.revenue))
    );
    this.revenueTimeSeries$ = this.analyticsService.getTimeSeriesData('revenue', 'day');
    this.ordersTimeSeries$ = this.analyticsService.getTimeSeriesData('orders', 'day');
  }

  ngOnInit(): void {
    // Component initialization
  }

  onDateRangeChange(dateRange: string) {
    // Handle date range change - convert string to proper date range format
    const now = moment();
    let start: moment.Moment;
    let end: moment.Moment = now;

    switch (dateRange) {
      case '7days':
        start = moment().subtract(7, 'days');
        break;
      case '30days':
        start = moment().subtract(30, 'days');
        break;
      case '90days':
        start = moment().subtract(90, 'days');
        break;
      default:
        start = moment().subtract(30, 'days');
    }

    this.analyticsService.updateFilters({
      dateRange: { start, end },
    });
  }
  refreshData() {
    // Refresh data based on the current filters
  }
}
