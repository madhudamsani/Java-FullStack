import { Pipe, PipeTransform, OnDestroy } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { Subscription } from 'rxjs';

@Pipe({
  name: 'currencyFormatter',
  pure: false // Make it impure so it updates when user preferences change
})
export class CurrencyFormatterPipe implements PipeTransform, OnDestroy {
  private userCurrency: string = 'INR'; // Default to INR
  private currencySymbols: { [key: string]: string } = {
    'INR': '₹',
    'USD': '$',
    'EUR': '€',
    'GBP': '£',
    'CAD': 'CA$'
  };
  private subscription: Subscription | null = null;

  constructor(private authService: AuthService) {
    // Subscribe to user changes to get the current currency preference
    this.subscription = this.authService.currentUser$.subscribe(user => {
      if (user && user.preferences && user.preferences.currency) {
        this.userCurrency = user.preferences.currency;
      }
    });
  }
  
  ngOnDestroy() {
    // Clean up subscription when pipe is destroyed
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  transform(value: number | string, showSymbol: boolean = true, showCode: boolean = false): string {
    if (value === null || value === undefined) {
      return '';
    }

    // Convert string to number if needed
    const numericValue = typeof value === 'string' ? parseFloat(value) : value;
    
    // Format the number based on the currency
    let formattedValue: string;
    
    switch (this.userCurrency) {
      case 'INR':
        // Format for Indian Rupee (e.g., ₹1,23,456.78)
        formattedValue = this.formatIndianCurrency(numericValue);
        break;
      default:
        // Use standard international formatting for other currencies
        formattedValue = this.formatInternationalCurrency(numericValue);
        break;
    }

    // Add currency symbol if requested
    if (showSymbol) {
      formattedValue = this.currencySymbols[this.userCurrency] + formattedValue;
    }

    // Add currency code if requested
    if (showCode) {
      formattedValue = formattedValue + ' ' + this.userCurrency;
    }

    return formattedValue;
  }

  private formatIndianCurrency(value: number): string {
    // Format with Indian numbering system (e.g., 1,23,456.78)
    const parts = value.toFixed(2).split('.');
    const integerPart = parts[0];
    const decimalPart = parts[1];
    
    // Format the integer part with commas for thousands
    let formattedInteger = '';
    
    // Handle the first 3 digits (from right)
    if (integerPart.length > 3) {
      formattedInteger = ',' + integerPart.substring(integerPart.length - 3);
    } else {
      formattedInteger = integerPart;
    }
    
    // Handle the remaining digits in groups of 2
    let remaining = integerPart.substring(0, integerPart.length - 3);
    while (remaining.length > 0) {
      const chunk = remaining.substring(Math.max(0, remaining.length - 2));
      if (chunk.length > 0) {
        formattedInteger = chunk + ',' + formattedInteger;
      }
      remaining = remaining.substring(0, Math.max(0, remaining.length - 2));
    }
    
    // Remove leading comma if present
    if (formattedInteger.startsWith(',')) {
      formattedInteger = formattedInteger.substring(1);
    }
    
    return formattedInteger + '.' + decimalPart;
  }

  private formatInternationalCurrency(value: number): string {
    // Format with international numbering system (e.g., 123,456.78)
    return value.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }
}