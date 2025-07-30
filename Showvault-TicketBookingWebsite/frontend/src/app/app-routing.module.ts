import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { VenueListComponent } from './venues/venue-list/venue-list.component';
import { HomeComponent } from './home/home.component';
import { LoginComponent } from './components/login/login.component';
import { RegisterComponent } from './components/register/register.component';
import { ForgotPasswordComponent } from './components/forgot-password/forgot-password.component';
import { ShowsListComponent } from './shows/shows-list/shows-list.component';
import { ShowDetailsComponent } from './shows/show-details/show-details.component';
import { TheatreMoviesComponent } from './venues/theatre-movies/theatre-movies.component';
import { AuthGuard } from './guards/auth.guard';
import { RoleGuard } from './guards/role.guard';

const routes: Routes = [
  // Public routes
  { path: '', component: HomeComponent },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'forgot-password', component: ForgotPasswordComponent },
  { path: 'shows', component: ShowsListComponent },
  { path: 'shows/:id', component: ShowDetailsComponent },
  
  // Public routes for venues
  { path: 'venues', component: VenueListComponent },
  { path: 'venues/:id/movies', component: TheatreMoviesComponent },
  { path: 'venues/edit/:id', component: VenueListComponent, canActivate: [AuthGuard, RoleGuard], data: { roles: ['ROLE_ADMIN', 'ROLE_ORGANIZER'] } },
  
  // Direct route to theater selection (BookMyShow flow)
  { path: 'theaters/:showId', redirectTo: 'booking/theater-selection/:showId', pathMatch: 'full' },
  
  // Lazy loaded modules with role-based authentication
  { 
    path: 'user', 
    loadChildren: () => import('./user/user.module').then(m => m.UserModule),
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['ROLE_USER', 'ROLE_ORGANIZER', 'ROLE_ADMIN'] }
  },
  { 
    path: 'organizer', 
    loadChildren: () => import('./organizer/organizer.module').then(m => m.OrganizerModule),
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['ROLE_ORGANIZER'] }
  },
  { 
    path: 'admin', 
    loadChildren: () => import('./admin/admin.module').then(m => m.AdminModule),
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['ROLE_ADMIN'] }
  },
  { 
    path: 'booking', 
    loadChildren: () => import('./booking/booking.module').then(m => m.BookingModule),
    canActivate: [AuthGuard]
  },
  { 
    path: 'notifications', 
    loadChildren: () => import('./components/notifications/notifications.module').then(m => m.NotificationsModule),
    canActivate: [AuthGuard]
  },

  
  // Wildcard route for 404
  { path: '**', redirectTo: '' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }