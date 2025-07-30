import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NotificationBellComponent } from './notification-bell.component';

@NgModule({
  declarations: [
    NotificationBellComponent
  ],
  imports: [
    CommonModule,
    RouterModule
  ],
  exports: [
    NotificationBellComponent
  ]
})
export class NotificationBellModule { }