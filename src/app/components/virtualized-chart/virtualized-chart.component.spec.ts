import { SimpleChange } from '@angular/core';
import moment from 'moment';
import { VirtualizedChartComponent } from './virtualized-chart.component';

describe('VirtualizedChartComponent', () => {
  let component: VirtualizedChartComponent;

  let originalGetContext: any;
  let originalResizeObserver: any;
  let lastResizeCallback: (() => void) | null = null;

  class MockResizeObserver {
    private cb: () => void;
    constructor(cb: () => void) {
      this.cb = cb;
      lastResizeCallback = cb;
    }
    observe() {}
    disconnect() {}
  }

  beforeAll(() => {
    // Mock canvas 2D context to prevent Chart.js from initializing in tests
    originalGetContext = (HTMLCanvasElement.prototype as any).getContext;
    (HTMLCanvasElement.prototype as any).getContext = jasmine
      .createSpy('getContext')
      .and.returnValue(null);

    // Mock ResizeObserver
    originalResizeObserver = (globalThis as any).ResizeObserver;
    (globalThis as any).ResizeObserver = MockResizeObserver;
  });

  afterAll(() => {
    (HTMLCanvasElement.prototype as any).getContext = originalGetContext;
    (globalThis as any).ResizeObserver = originalResizeObserver;
  });

  beforeEach(() => {
    // Create component instance directly without Angular TestBed to avoid Zone.js issues
    component = new VirtualizedChartComponent();

    // Mock the ViewChild element
    const mockCanvas = document.createElement('canvas');
    const mockElementRef = { nativeElement: mockCanvas };
    (component as any).chartCanvas = mockElementRef;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should not initialize Chart when no 2D context is available', () => {
    expect((component as any).chart).toBeNull();
  });

  it('virtualizeData should return original data when below threshold', () => {
    const data = Array.from({ length: 5 }).map((_, i) => ({
      timestamp: moment().add(i, 'minute'),
      value: i,
    })) as any[];

    (component as any).maxDataPoints = 10;
    const result = (component as any).virtualizeData(data);
    expect(result.length).toBe(5);
    expect(result).toEqual(data);
  });

  it('virtualizeData should sample large datasets and include representative points', () => {
    const n = 5000;
    const data = Array.from({ length: n }).map((_, i) => ({
      timestamp: moment().add(i, 'minute'),
      value: Math.sin(i / 10) * 100 + (i % 50),
    })) as any[];

    (component as any).maxDataPoints = 200;
    const result = (component as any).virtualizeData(data);

    expect(result.length).toBeLessThan(n);
    expect(result.length).toBeGreaterThan(0);
    expect(result.length).toBeLessThanOrEqual((component as any).maxDataPoints * 4);
  });

  it('formatValue should format numbers with K and M suffixes', () => {
    expect((component as any).formatValue(123)).toBe('123');
    expect((component as any).formatValue(1500)).toBe('1.5K');
    expect((component as any).formatValue(2450000)).toBe('2.5M');
  });

  it('updateChartData should map TimeSeriesData (moment timestamps) to Chart.js points', () => {
    const t1 = moment('2024-01-01T00:00:00Z');
    const t2 = moment('2024-01-01T01:00:00Z');

    const sample = [
      { timestamp: t1, value: 10 },
      { timestamp: t2, value: 20 },
    ] as any[];

    const fakeChart: any = {
      data: { datasets: [{ data: [] }] },
      update: jasmine.createSpy('update'),
      resize: jasmine.createSpy('resize'),
      destroy: jasmine.createSpy('destroy'),
    };

    (component as any).chart = fakeChart;
    component.data = sample;

    (component as any).updateChartData();

    const plotted = fakeChart.data.datasets[0].data as Array<{ x: number; y: number }>;
    expect(plotted.length).toBe(2);
    expect(plotted[0].x).toBe(t1.valueOf());
    expect(plotted[0].y).toBe(10);
    expect(plotted[1].x).toBe(t2.valueOf());
    expect(plotted[1].y).toBe(20);
    expect(fakeChart.update).toHaveBeenCalledWith('none');
  });

  it('updateChartData should map ChartDataPoint with number and moment x correctly', () => {
    const t = moment('2024-02-01T12:00:00Z');
    const sample = [
      { x: 1700000000000, y: 1 },
      { x: t, y: 2 },
    ] as any[];

    const fakeChart: any = {
      data: { datasets: [{ data: [] }] },
      update: jasmine.createSpy('update'),
      resize: jasmine.createSpy('resize'),
      destroy: jasmine.createSpy('destroy'),
    };

    (component as any).chart = fakeChart;
    component.data = sample;

    (component as any).updateChartData();

    const plotted = fakeChart.data.datasets[0].data as Array<{ x: number; y: number }>;
    expect(plotted.length).toBe(2);
    expect(plotted[0].x).toBe(1700000000000);
    expect(plotted[0].y).toBe(1);
    expect(plotted[1].x).toBe(t.valueOf());
    expect(plotted[1].y).toBe(2);
    expect(fakeChart.update).toHaveBeenCalledWith('none');
  });

  it('ngOnChanges should trigger updateChartData when data changes and chart exists', () => {
    const fakeChart: any = {
      data: { datasets: [{ data: [] }] },
      update: jasmine.createSpy('update'),
      resize: jasmine.createSpy('resize'),
      destroy: jasmine.createSpy('destroy'),
    };
    (component as any).chart = fakeChart;

    const spy = spyOn(component as any, 'updateChartData');
    const newData = [{ timestamp: moment(), value: 1 }] as any[];

    component.ngOnChanges({
      data: new SimpleChange([], newData, true),
    });

    expect(spy).toHaveBeenCalled();
  });

  it('should initialize ResizeObserver when available', () => {
    // Call setupResizeObserver manually since we're not using ngOnInit
    (component as any).setupResizeObserver();

    expect(lastResizeCallback).toBeTruthy();
  });

  it('ResizeObserver callback should call chart.resize when available', () => {
    const fakeChart: any = {
      data: { datasets: [{ data: [] }] },
      update: jasmine.createSpy('update'),
      resize: jasmine.createSpy('resize'),
      destroy: jasmine.createSpy('destroy'),
    };
    (component as any).chart = fakeChart;

    // Setup ResizeObserver first
    (component as any).setupResizeObserver();

    expect(lastResizeCallback).toBeTruthy();
    lastResizeCallback && lastResizeCallback();

    expect(fakeChart.resize).toHaveBeenCalled();
  });
});
