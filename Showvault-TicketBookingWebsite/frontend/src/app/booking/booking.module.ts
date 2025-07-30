import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

import { BookingComponent } from './booking/booking.component';
import { SeatSelectionComponent } from './seat-selection/seat-selection.component';
import { PaymentFormComponent } from './payment-form/payment-form.component';
import { BookingConfirmationComponent } from './booking-confirmation/booking-confirmation.component';
import { BookingSummaryComponent } from './booking-summary/booking-summary.component';
import { TheaterSelectionComponent } from './theater-selection/theater-selection.component';
import { AuthGuard } from '../guards/auth.guard';
import { SafeHtmlPipe } from '../pipes/safe-html.pipe';
import { SharedModule } from '../components/shared/shared.module';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';

const routes: Routes = [
  {
    path: '',
    component: BookingComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'theater-selection/:id',
    component: TheaterSelectionComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'theaters/:id',  // Keep for backward compatibility
    component: TheaterSelectionComponent,
    canActivate: [AuthGuard]
  },
  { 
    path: 'seat-selection', 
    component: SeatSelectionComponent, 
    canActivate: [AuthGuard] 
  },
  { 
    path: 'payment', 
    component: PaymentFormComponent, 
    canActivate: [AuthGuard] 
  },
  { 
    path: 'payment-form', 
    component: PaymentFormComponent, 
    canActivate: [AuthGuard] 
  },
  { 
    path: 'confirmation', 
    component: BookingConfirmationComponent, 
    canActivate: [AuthGuard] 
  }
];

@NgModule({
  declarations: [
    BookingComponent,
    SeatSelectionComponent,
    PaymentFormComponent,
    BookingConfirmationComponent,
    BookingSummaryComponent,
    TheaterSelectionComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    RouterModule.forChild(routes),
    NgbModule,
    SharedModule,
    MatProgressSpinnerModule,
    MatIconModule,
    MatDialogModule,
    MatButtonModule
  ],
  exports: [
    BookingComponent,
    SeatSelectionComponent,
    PaymentFormComponent,
    BookingConfirmationComponent,
    BookingSummaryComponent,
    TheaterSelectionComponent
  ]
})
export class BookingModule { }