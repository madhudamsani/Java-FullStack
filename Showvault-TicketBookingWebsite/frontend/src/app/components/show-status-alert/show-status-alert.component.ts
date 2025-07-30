import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Show, ShowStatus } from '../../models/show.model';
import { 
  getScheduleWarning, 
  needsStatusUpdate, 
  determineShowStatus,
  getDaysUntilNextSchedule,
  getDaysSinceLastSchedule,
  hasFutureSchedules,
  hasTodaySchedules
} from '../../utils/schedule-validator';

export interface ShowStatusAlert {
  type: 'warning' | 'info' | 'danger' | 'success';
  message: string;
  action?: {
    label: string;
    callback: () => void;
  };
}

@Component({
  selector: 'app-show-status-alert',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="alerts.length > 0" class="show-status-alerts">
      <div *ngFor="let alert of alerts" 
           class="alert alert-dismissible fade show mb-2"
           [ngClass]="getAlertClass(alert.type)"
           role="alert">
        <div class="d-flex align-items-center">
          <i class="me-2" [ngClass]="getAlertIcon(alert.type)"></i>
          <div class="flex-grow-1">
            <span [innerHTML]="alert.message"></span>
          </div>
          <div *ngIf="alert.action" class="ms-2">
            <button type="button" 
                    class="btn btn-sm"
                    [ngClass]="getActionButtonClass(alert.type)"
                    (click)="alert.action!.callback()">
              {{ alert.action.label }}
            </button>
          </div>
          <button type="button" 
                  class="btn-close ms-2" 
                  (click)="dismissAlert(alert)"
                  aria-label="Close"></button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .show-status-alerts {
      margin-bottom: 1rem;
    }
    
    .alert {
      border-left: 4px solid;
      border-radius: 0.375rem;
    }
    
    .alert-warning {
      border-left-color: #ffc107;
      background-color: #fff3cd;
      border-color: #ffecb5;
      color: #664d03;
    }
    
    .alert-info {
      border-left-color: #0dcaf0;
      background-color: #d1ecf1;
      border-color: #b8daff;
      color: #055160;
    }
    
    .alert-danger {
      border-left-color: #dc3545;
      background-color: #f8d7da;
      border-color: #f5c6cb;
      color: #721c24;
    }
    
    .alert-success {
      border-left-color: #198754;
      background-color: #d1e7dd;
      border-color: #badbcc;
      color: #0f5132;
    }
    
    .btn-sm {
      font-size: 0.75rem;
      padding: 0.25rem 0.5rem;
    }
  `]
})
export class ShowStatusAlertComponent {
  @Input() show!: Show;
  @Input() showAutoUpdateButton = true;
  @Input() showScheduleInfo = true;
  @Output() statusUpdateRequested = new EventEmitter<{ show: Show; newStatus: ShowStatus }>();
  @Output() scheduleManagementRequested = new EventEmitter<Show>();

  alerts: ShowStatusAlert[] = [];

  ngOnInit() {
    this.generateAlerts();
  }

  ngOnChanges() {
    this.generateAlerts();
  }

  private generateAlerts() {
    this.alerts = [];

    if (!this.show) return;

    // Check for schedule warnings
    const warning = getScheduleWarning(this.show);
    if (warning) {
      this.alerts.push({
        type: 'warning',
        message: warning,
        action: {
          label: 'Manage Schedules',
          callback: () => this.scheduleManagementRequested.emit(this.show)
        }
      });
    }

    // Check for status update needs
    if (needsStatusUpdate(this.show)) {
      const suggestedStatus = determineShowStatus(this.show);
      this.alerts.push({
        type: 'info',
        message: `Show status should be updated to <strong>${suggestedStatus}</strong> based on current schedules.`,
        action: this.showAutoUpdateButton ? {
          label: `Update to ${suggestedStatus}`,
          callback: () => this.statusUpdateRequested.emit({ show: this.show, newStatus: suggestedStatus })
        } : undefined
      });
    }

    // Additional schedule information
    if (this.showScheduleInfo) {
      this.addScheduleInfoAlerts();
    }
  }

  private addScheduleInfoAlerts() {
    const hasToday = hasTodaySchedules(this.show);
    const hasFuture = hasFutureSchedules(this.show);
    const daysUntilNext = getDaysUntilNextSchedule(this.show);
    const daysSinceLast = getDaysSinceLastSchedule(this.show);

    // Show is playing today
    if (hasToday) {
      this.alerts.push({
        type: 'success',
        message: `🎭 <strong>Show is playing today!</strong> ${hasFuture ? `Next performance in ${daysUntilNext} day(s).` : 'No future performances scheduled.'}`
      });
    }

    // Next performance soon
    if (daysUntilNext !== null && daysUntilNext <= 3 && daysUntilNext > 0) {
      this.alerts.push({
        type: 'info',
        message: `📅 Next performance is in <strong>${daysUntilNext} day(s)</strong>.`
      });
    }

    // Long gap since last performance
    if (daysSinceLast !== null && daysSinceLast > 7 && hasFuture) {
      this.alerts.push({
        type: 'warning',
        message: `⏰ It's been <strong>${daysSinceLast} days</strong> since the last performance. Consider promoting upcoming shows.`
      });
    }

    // Show completed but status not updated
    if (daysSinceLast !== null && daysSinceLast > 0 && !hasFuture && !hasToday && this.show.status !== ShowStatus.COMPLETED) {
      this.alerts.push({
        type: 'danger',
        message: `🏁 All performances completed <strong>${daysSinceLast} day(s) ago</strong>. Status should be updated to COMPLETED.`,
        action: this.showAutoUpdateButton ? {
          label: 'Mark as Completed',
          callback: () => this.statusUpdateRequested.emit({ show: this.show, newStatus: ShowStatus.COMPLETED })
        } : undefined
      });
    }
  }

  getAlertClass(type: string): string {
    return `alert-${type}`;
  }

  getAlertIcon(type: string): string {
    switch (type) {
      case 'warning': return 'bi bi-exclamation-triangle-fill';
      case 'info': return 'bi bi-info-circle-fill';
      case 'danger': return 'bi bi-x-circle-fill';
      case 'success': return 'bi bi-check-circle-fill';
      default: return 'bi bi-info-circle-fill';
    }
  }

  getActionButtonClass(type: string): string {
    switch (type) {
      case 'warning': return 'btn-warning';
      case 'info': return 'btn-info';
      case 'danger': return 'btn-danger';
      case 'success': return 'btn-success';
      default: return 'btn-secondary';
    }
  }

  dismissAlert(alert: ShowStatusAlert) {
    const index = this.alerts.indexOf(alert);
    if (index > -1) {
      this.alerts.splice(index, 1);
    }
  }
}