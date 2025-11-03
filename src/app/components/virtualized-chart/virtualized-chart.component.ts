import {
  Component,
  Input,
  OnInit,
  OnDestroy,
  ElementRef,
  ViewChild,
  ChangeDetectionStrategy,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart, ChartConfiguration, ChartType, registerables } from 'chart.js';
import 'chartjs-adapter-date-fns';
import { TimeSeriesData, ChartDataPoint } from '../../models/analytics.models';
import moment from 'moment';

// Register Chart.js components
Chart.register(...registerables);

@Component({
  selector: 'app-virtualized-chart',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './virtualized-chart.component.html',
  styleUrl: './virtualized-chart.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VirtualizedChartComponent implements OnInit, OnDestroy, OnChanges {
  @ViewChild('chartCanvas', { static: true }) chartCanvas!: ElementRef<HTMLCanvasElement>;

  @Input() data: TimeSeriesData[] | ChartDataPoint[] = [];
  @Input() chartType: ChartType = 'line';
  @Input() height: number = 400;
  @Input() title: string = '';
  @Input() loading: boolean = false;
  @Input() maxDataPoints: number = 1000; // Virtualization threshold

  private chart: Chart | null = null;
  private resizeObserver: ResizeObserver | null = null;

  ngOnInit(): void {
    this.initializeChart();
    this.setupResizeObserver();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data'] && this.chart) {
      this.updateChartData();
    }
  }

  ngOnDestroy(): void {
    if (this.chart) {
      this.chart.destroy();
    }
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
  }

  private initializeChart(): void {
    const ctx = this.chartCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    const configuration: ChartConfiguration = {
      type: this.chartType,
      data: {
        datasets: [
          {
            label: this.title,
            data: [],
            borderColor: '#3498db',
            backgroundColor: 'rgba(52, 152, 219, 0.1)',
            borderWidth: 2,
            pointRadius: 0, // Hide points for better performance
            pointHoverRadius: 4,
            tension: 0.4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          intersect: false,
          mode: 'index',
        },
        plugins: {
          title: {
            display: !!this.title,
            text: this.title,
            font: {
              size: 16,
              weight: 'bold',
            },
          },
          legend: {
            display: false,
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            titleColor: '#fff',
            bodyColor: '#fff',
            cornerRadius: 8,
            displayColors: false,
          },
        },
        scales: {
          x: {
            type: 'time',
            time: {
              displayFormats: {
                day: 'MMM dd',
                week: 'MMM dd',
                month: 'MMM yyyy',
              },
            },
            ticks: {
              maxTicksLimit: 10,
              maxRotation: 45,
            },
            grid: {
              display: false,
            },
          },
          y: {
            beginAtZero: true,
            ticks: {
              callback: (value) => {
                if (typeof value === 'number') {
                  return this.formatValue(value);
                }
                return value;
              },
            },
            grid: {
              color: 'rgba(0, 0, 0, 0.1)',
            },
          },
        },
        elements: {
          point: {
            hoverBackgroundColor: '#3498db',
          },
        },
        // Performance optimizations
        animation: {
          duration: 0, // Disable animations for better performance
        },
        parsing: false, // Disable parsing for better performance
        normalized: true, // Use normalized data
      },
    };

    this.chart = new Chart(ctx, configuration);
    this.updateChartData();
  }

  private updateChartData(): void {
    if (!this.chart || !this.data?.length) return;

    // Implement data virtualization for large datasets
    const virtualizedData = this.virtualizeData(this.data);

    // Convert data to Chart.js format
    const chartData = virtualizedData.map((item) => {
      if ('timestamp' in item) {
        return {
          x: item.timestamp.valueOf(),
          y: item.value,
        };
      } else {
        return {
          x: typeof item.x === 'object' ? (item.x as moment.Moment).valueOf() : item.x,
          y: item.y,
        };
      }
    });

    this.chart.data.datasets[0].data = chartData;
    this.chart.update('none'); // Use 'none' mode for better performance
  }

  private virtualizeData(
    data: (TimeSeriesData | ChartDataPoint)[]
  ): (TimeSeriesData | ChartDataPoint)[] {
    if (data.length <= this.maxDataPoints) {
      return data;
    }

    // Implement smart sampling for large datasets
    const step = Math.ceil(data.length / this.maxDataPoints);
    const virtualizedData: (TimeSeriesData | ChartDataPoint)[] = [];

    for (let i = 0; i < data.length; i += step) {
      // Take one point every 'step' points, but also include local extrema
      const chunk = data.slice(i, Math.min(i + step, data.length));

      if (chunk.length === 1) {
        virtualizedData.push(chunk[0]);
      } else {
        // Find min and max in this chunk for better representation
        const values = chunk.map((item) => ('value' in item ? item.value : item.y));
        const minIndex = values.indexOf(Math.min(...values));
        const maxIndex = values.indexOf(Math.max(...values));

        // Add the first point, min, max, and last point of the chunk
        const indicesToAdd = new Set([0, minIndex, maxIndex, chunk.length - 1]);
        indicesToAdd.forEach((index) => {
          if (index < chunk.length) {
            virtualizedData.push(chunk[index]);
          }
        });
      }
    }

    return virtualizedData;
  }

  private setupResizeObserver(): void {
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => {
        if (this.chart) {
          this.chart.resize();
        }
      });

      this.resizeObserver.observe(this.chartCanvas.nativeElement.parentElement!);
    }
  }

  private formatValue(value: number): string {
    if (value >= 1000000) {
      return (value / 1000000).toFixed(1) + 'M';
    } else if (value >= 1000) {
      return (value / 1000).toFixed(1) + 'K';
    }
    return value.toFixed(0);
  }
}
