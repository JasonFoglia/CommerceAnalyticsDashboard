import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatTabsModule } from '@angular/material/tabs';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { DataImportComponent } from './components/data-import/data-import.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, CommonModule, MatTabsModule, DashboardComponent, DataImportComponent],
  template: `
    <div class="app-container">
      <mat-tab-group animationDuration="0ms" class="main-tabs">
        <mat-tab label="Data Import">
          <div class="tab-content">
            <app-data-import></app-data-import>
          </div>
        </mat-tab>
        <mat-tab label="Dashboard">
          <div class="tab-content">
            <app-dashboard></app-dashboard>
          </div>
        </mat-tab>
      </mat-tab-group>
    </div>
    <router-outlet />
  `,
  styleUrl: './app.scss',
})
export class App {
  protected readonly title = signal('commerce-analytics-dashboard');
}
