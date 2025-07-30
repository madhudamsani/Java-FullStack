import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SafeHtmlPipe } from './safe-html.pipe';
import { CurrencyFormatterPipe } from './currency-formatter.pipe';
import { AuthService } from '../services/auth.service';

@NgModule({
  declarations: [
    CurrencyFormatterPipe
  ],
  imports: [
    CommonModule,
    SafeHtmlPipe
  ],
  exports: [
    SafeHtmlPipe,
    CurrencyFormatterPipe
  ],
  providers: [
    AuthService
  ]
})
export class PipesModule { }