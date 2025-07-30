import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';

import { UserProfileComponent } from './user-profile/user-profile.component';
import { BookingHistoryComponent } from './booking-history/booking-history.component';
import { UserFavoritesComponent } from './user-favorites/user-favorites.component';
import { UserNotificationsComponent } from './user-notifications/user-notifications.component';
import { UserRatingsComponent } from './user-ratings/user-ratings.component';

// Import the header components
import { OrganizerHeaderComponent } from '../organizer/organizer-header/organizer-header.component';

const routes: Routes = [
  { path: 'profile', component: UserProfileComponent },
  { path: 'bookings', component: BookingHistoryComponent },
  { path: 'favorites', component: UserFavoritesComponent },
  { path: 'notifications', component: UserNotificationsComponent },
  { path: 'ratings', component: UserRatingsComponent }
];

@NgModule({
  declarations: [
    UserProfileComponent,
    BookingHistoryComponent,
    UserFavoritesComponent,
    UserNotificationsComponent,
    UserRatingsComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    RouterModule.forChild(routes),
    OrganizerHeaderComponent // Standalone component
  ],
  exports: [
    UserProfileComponent,
    BookingHistoryComponent,
    UserFavoritesComponent,
    UserNotificationsComponent,
    UserRatingsComponent
  ]
})
export class UserModule { }