import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { NgChartsModule } from 'ng2-charts';

import { AdminLayoutComponent } from './admin-layout/admin-layout.component';
import { AdminSidebarComponent } from './admin-sidebar/admin-sidebar.component';
import { AdminHeaderComponent } from './admin-header/admin-header.component';
import { AdminDashboardComponent } from './admin-dashboard/admin-dashboard.component';
import { UserManagementComponent } from './user-management/user-management.component';
import { AdminReportsComponent } from './admin-reports/admin-reports.component';
import { PlatformSettingsComponent } from './platform-settings/platform-settings.component';

import { BookingManagementComponent } from './booking-management/booking-management.component';
import { ReportManagementComponent } from './report-management/report-management.component';

import { ShowManagementComponent } from './show-management/show-management.component';
import { AdminProfileComponent } from './admin-profile/admin-profile.component';
import { DatabaseMaintenanceComponent } from './database-maintenance/database-maintenance.component';
import { SeatManagementComponent } from './seat-management/seat-management.component';


const routes: Routes = [
  { 
    path: '', 
    component: AdminLayoutComponent,
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: AdminDashboardComponent },
      { path: 'users', component: UserManagementComponent },
      { path: 'bookings', component: BookingManagementComponent },
      { path: 'shows', component: ShowManagementComponent },
      { path: 'seat-management', component: SeatManagementComponent },
      { path: 'reports', component: AdminReportsComponent },
      { path: 'report-management', component: ReportManagementComponent },
      { path: 'settings', component: PlatformSettingsComponent },


      { path: 'profile', component: AdminProfileComponent },
      { path: 'database-maintenance', component: DatabaseMaintenanceComponent }
    ]
  }
];

@NgModule({
  declarations: [
    AdminLayoutComponent,
    AdminSidebarComponent,
    AdminHeaderComponent,
    AdminDashboardComponent,
    UserManagementComponent,
    BookingManagementComponent,
    AdminReportsComponent,
    PlatformSettingsComponent,
    ReportManagementComponent,
    ShowManagementComponent,
    SeatManagementComponent,
    AdminProfileComponent,
    DatabaseMaintenanceComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    HttpClientModule,
    RouterModule.forChild(routes),
    NgChartsModule
  ],
  providers: [
  ],
  exports: [
    AdminLayoutComponent,
    AdminSidebarComponent,
    AdminHeaderComponent,
    AdminDashboardComponent,
    UserManagementComponent,
    BookingManagementComponent,
    AdminReportsComponent,
    PlatformSettingsComponent,
    ReportManagementComponent,
    ShowManagementComponent,
    SeatManagementComponent,
    DatabaseMaintenanceComponent
  ]
})
export class AdminModule { }