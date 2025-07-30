import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';
import { VenueFormComponent } from './venue-form/venue-form.component';

/**
 * Note: VenueListComponent and TheatreMoviesComponent are standalone components
 * and are imported directly in the AppModule. They're not included here to avoid duplication.
 */
@NgModule({
  declarations: [
    VenueFormComponent
  ],
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule
  ],
  exports: [
    VenueFormComponent,
    ReactiveFormsModule
  ]
})
export class VenuesModule { }