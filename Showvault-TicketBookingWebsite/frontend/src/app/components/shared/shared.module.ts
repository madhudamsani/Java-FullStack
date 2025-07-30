import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';

import { StatusBadgeComponent } from './status-badge/status-badge.component';
import { EnumSelectorComponent } from './enum-selector/enum-selector.component';
import { EnumFilterComponent } from './enum-filter/enum-filter.component';
import { SpinnerComponent } from './spinner/spinner.component';

@NgModule({
  declarations: [
    StatusBadgeComponent,
    EnumSelectorComponent,
    EnumFilterComponent,
    SpinnerComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatProgressSpinnerModule,
    MatIconModule
  ],
  exports: [
    StatusBadgeComponent,
    EnumSelectorComponent,
    EnumFilterComponent,
    SpinnerComponent,
    MatProgressSpinnerModule,
    MatIconModule
  ]
})
export class SharedModule { }