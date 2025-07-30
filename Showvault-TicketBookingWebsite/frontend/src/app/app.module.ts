import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { AppRoutingModule } from './app-routing.module';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

import { AppComponent } from './app.component';
import { HomeComponent } from './home/home.component';
import { LoginComponent } from './components/login/login.component';
import { RegisterComponent } from './components/register/register.component';
import { ForgotPasswordComponent } from './components/forgot-password/forgot-password.component';
import { ShowsModule } from './shows/shows.module';
import { PipesModule } from './pipes/pipes.module';
import { SharedModule } from './components/shared/shared.module';
import { NotificationBellModule } from './components/notification-bell/notification-bell.module';

// Add HTTP interceptor for auth token
import { AuthInterceptor } from './interceptors/auth.interceptor';

// Services
import { BookingService } from './services/booking.service';
import { ShowService } from './services/show.service';
import { LocationService } from './services/location.service';
import { NotificationService } from './services/notification.service';

import { WebSocketService } from './services/websocket.service';
import { WebSocketEventService } from './services/websocket-event.service';
import { WebSocketInitService } from './services/websocket-init.service';
import { SeatReservationService } from './services/seat-reservation.service';

@NgModule({
  declarations: [
    AppComponent,
    HomeComponent,
    LoginComponent,
    RegisterComponent,
    ForgotPasswordComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    ReactiveFormsModule,
    FormsModule,
    ShowsModule,
    PipesModule,
    SharedModule,
    NotificationBellModule,
    BrowserAnimationsModule,
    MatDialogModule,
    MatButtonModule
  ],
  providers: [
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
    BookingService,
    ShowService,
    LocationService,
    NotificationService,
    WebSocketEventService,
    WebSocketInitService,

    WebSocketService,
    SeatReservationService
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }