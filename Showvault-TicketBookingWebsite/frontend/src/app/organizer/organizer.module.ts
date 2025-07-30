import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';

import { OrganizerLayoutComponent } from './organizer-layout/organizer-layout.component';
import { OrganizerDashboardComponent } from './organizer-dashboard/organizer-dashboard.component';
import { ShowFormComponent } from './show-form/show-form.component';
import { ShowScheduleComponent } from './show-schedule/show-schedule.component';
import { VenueMappingComponent } from './venue-mapping/venue-mapping.component';
import { SalesReportComponent } from './sales-report/sales-report.component';
import { AudienceAnalyticsComponent } from './audience-analytics/audience-analytics.component';
import { PromotionsComponent } from './promotions/promotions.component';
import { CustomerMessagesComponent } from './customer-messages/customer-messages.component';
import { PerformanceMetricsComponent } from './performance-metrics/performance-metrics.component';
import { ShowsManagementComponent } from './shows-management/shows-management.component';

const routes: Routes = [
  { 
    path: '', 
    component: OrganizerLayoutComponent,
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: OrganizerDashboardComponent },
      { path: 'shows', component: ShowsManagementComponent },
      { path: 'shows/create', component: ShowFormComponent },
      { path: 'shows/edit/:id', component: ShowFormComponent },
      { path: 'shows/:id', component: ShowFormComponent }, // Added route for viewing a show
      { path: 'shows/:id/schedules', component: ShowScheduleComponent },
      { path: 'shows/:id/schedules/:scheduleId/venue-mapping', component: VenueMappingComponent },
      { path: 'sales-report', component: SalesReportComponent },
      { path: 'audience-analytics', component: AudienceAnalyticsComponent },
      { path: 'promotions', component: PromotionsComponent },
      { path: 'shows/:id/promotions', component: PromotionsComponent },
      { path: 'customer-messages', component: CustomerMessagesComponent },
      { path: 'shows/:id/performance', component: PerformanceMetricsComponent }
    ]
  }
];

@NgModule({
  declarations: [
    ShowFormComponent,
    PerformanceMetricsComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    RouterModule.forChild(routes),
    // Import standalone components
    OrganizerLayoutComponent,
    OrganizerDashboardComponent,
    ShowsManagementComponent,
    ShowScheduleComponent,
    VenueMappingComponent,
    SalesReportComponent,
    AudienceAnalyticsComponent,
    PromotionsComponent,
    CustomerMessagesComponent
  ],
  exports: [
    ShowFormComponent,
    PerformanceMetricsComponent
  ]
})
export class OrganizerModule { }