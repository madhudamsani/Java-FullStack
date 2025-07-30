import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AdminService } from '../../services/admin.service';

@Component({
  selector: 'app-platform-settings',
  templateUrl: './platform-settings.component.html',
  styleUrls: ['./platform-settings.component.css']
})
export class PlatformSettingsComponent implements OnInit {
  activeTab = 'general';
  settings: any = null;
  isLoading = true;
  isSaving = false;
  error = '';
  success = '';
  
  generalForm: FormGroup;
  securityForm: FormGroup;
  emailForm: FormGroup;
  paymentForm: FormGroup;

  constructor(
    private adminService: AdminService,
    private fb: FormBuilder
  ) {
    this.generalForm = this.fb.group({
      siteName: ['', Validators.required],
      siteDescription: ['', Validators.required],
      contactEmail: ['', [Validators.required, Validators.email]],
      supportPhone: ['', Validators.required],
      maintenanceMode: [false]
    });
    
    this.securityForm = this.fb.group({
      minLength: [8, [Validators.required, Validators.min(6)]],
      requireUppercase: [true],
      requireLowercase: [true],
      requireNumbers: [true],
      requireSpecialChars: [true],
      sessionTimeout: [30, [Validators.required, Validators.min(5)]],
      maxLoginAttempts: [5, [Validators.required, Validators.min(1)]],
      twoFactorAuth: [true]
    });
    
    this.emailForm = this.fb.group({
      provider: ['', Validators.required],
      fromEmail: ['', [Validators.required, Validators.email]],
      fromName: ['', Validators.required]
    });
    
    this.paymentForm = this.fb.group({
      currency: ['INR', Validators.required],
      taxRate: [0, [Validators.required, Validators.min(0), Validators.max(100)]]
    });
  }

  ngOnInit(): void {
    this.loadSettings();
  }

  loadSettings(): void {
    this.isLoading = true;
    this.error = '';
    
    this.adminService.getPlatformSettings().subscribe({
      next: (settings) => {
        this.settings = settings;
        this.populateForms();
        this.isLoading = false;
      },
      error: (error) => {
        this.error = 'Failed to load platform settings. Please try again.';
        this.isLoading = false;
        console.error('Error loading platform settings:', error);
      }
    });
  }

  populateForms(): void {
    // Populate General Form
    this.generalForm.patchValue({
      siteName: this.settings.general.siteName,
      siteDescription: this.settings.general.siteDescription,
      contactEmail: this.settings.general.contactEmail,
      supportPhone: this.settings.general.supportPhone,
      maintenanceMode: this.settings.general.maintenanceMode
    });
    
    // Populate Security Form
    this.securityForm.patchValue({
      minLength: this.settings.security.passwordPolicy.minLength,
      requireUppercase: this.settings.security.passwordPolicy.requireUppercase,
      requireLowercase: this.settings.security.passwordPolicy.requireLowercase,
      requireNumbers: this.settings.security.passwordPolicy.requireNumbers,
      requireSpecialChars: this.settings.security.passwordPolicy.requireSpecialChars,
      sessionTimeout: this.settings.security.sessionTimeout,
      maxLoginAttempts: this.settings.security.maxLoginAttempts,
      twoFactorAuth: this.settings.security.twoFactorAuth
    });
    
    // Populate Email Form
    this.emailForm.patchValue({
      provider: this.settings.email.provider,
      fromEmail: this.settings.email.fromEmail,
      fromName: this.settings.email.fromName
    });
    
    // Populate Payment Form
    this.paymentForm.patchValue({
      currency: this.settings.payment.currency,
      taxRate: this.settings.payment.taxRate
    });
  }

  setActiveTab(tab: string): void {
    this.activeTab = tab;
  }

  saveGeneralSettings(): void {
    if (this.generalForm.invalid) return;
    
    this.isSaving = true;
    this.error = '';
    this.success = '';
    
    const updatedSettings = {
      ...this.settings,
      general: {
        ...this.generalForm.value
      }
    };
    
    this.adminService.updatePlatformSettings(updatedSettings).subscribe({
      next: (response) => {
        this.success = response.message;
        this.isSaving = false;
        this.settings = updatedSettings;
      },
      error: (error) => {
        this.error = `Failed to save general settings: ${error.message}`;
        this.isSaving = false;
        console.error('Error saving general settings:', error);
      }
    });
  }

  saveSecuritySettings(): void {
    if (this.securityForm.invalid) return;
    
    this.isSaving = true;
    this.error = '';
    this.success = '';
    
    const formValues = this.securityForm.value;
    
    const updatedSettings = {
      ...this.settings,
      security: {
        passwordPolicy: {
          minLength: formValues.minLength,
          requireUppercase: formValues.requireUppercase,
          requireLowercase: formValues.requireLowercase,
          requireNumbers: formValues.requireNumbers,
          requireSpecialChars: formValues.requireSpecialChars
        },
        sessionTimeout: formValues.sessionTimeout,
        maxLoginAttempts: formValues.maxLoginAttempts,
        twoFactorAuth: formValues.twoFactorAuth
      }
    };
    
    this.adminService.updatePlatformSettings(updatedSettings).subscribe({
      next: (response) => {
        this.success = response.message;
        this.isSaving = false;
        this.settings = updatedSettings;
      },
      error: (error) => {
        this.error = `Failed to save security settings: ${error.message}`;
        this.isSaving = false;
        console.error('Error saving security settings:', error);
      }
    });
  }

  saveEmailSettings(): void {
    if (this.emailForm.invalid) return;
    
    this.isSaving = true;
    this.error = '';
    this.success = '';
    
    const updatedSettings = {
      ...this.settings,
      email: {
        ...this.settings.email,
        provider: this.emailForm.value.provider,
        fromEmail: this.emailForm.value.fromEmail,
        fromName: this.emailForm.value.fromName
      }
    };
    
    this.adminService.updatePlatformSettings(updatedSettings).subscribe({
      next: (response) => {
        this.success = response.message;
        this.isSaving = false;
        this.settings = updatedSettings;
      },
      error: (error) => {
        this.error = `Failed to save email settings: ${error.message}`;
        this.isSaving = false;
        console.error('Error saving email settings:', error);
      }
    });
  }

  savePaymentSettings(): void {
    if (this.paymentForm.invalid) return;
    
    this.isSaving = true;
    this.error = '';
    this.success = '';
    
    const updatedSettings = {
      ...this.settings,
      payment: {
        ...this.settings.payment,
        currency: this.paymentForm.value.currency,
        taxRate: this.paymentForm.value.taxRate
      }
    };
    
    this.adminService.updatePlatformSettings(updatedSettings).subscribe({
      next: (response) => {
        this.success = response.message;
        this.isSaving = false;
        this.settings = updatedSettings;
      },
      error: (error) => {
        this.error = `Failed to save payment settings: ${error.message}`;
        this.isSaving = false;
        console.error('Error saving payment settings:', error);
      }
    });
  }

  togglePaymentProvider(provider: any): void {
    provider.enabled = !provider.enabled;
  }

  toggleTestMode(provider: any): void {
    provider.testMode = !provider.testMode;
  }

  formatDate(date: Date | string): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString();
  }
}