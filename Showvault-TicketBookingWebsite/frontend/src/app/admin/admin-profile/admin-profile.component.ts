import { Component, OnInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { User, PasswordChangeRequest, UserPreferences } from '../../models/user.model';
import { AuthService } from '../../services/auth.service';
import { ImageService } from '../../services/image.service';

@Component({
  selector: 'app-admin-profile',
  templateUrl: './admin-profile.component.html',
  styleUrls: ['./admin-profile.component.css']
})
export class AdminProfileComponent implements OnInit, OnDestroy {
  @ViewChild('fileInput') fileInput!: ElementRef;
  
  profileForm: FormGroup;
  passwordForm: FormGroup;
  preferencesForm: FormGroup;
  currentUser: User | null = null;
  isEditing = false;
  showPasswordForm = false;
  showPreferencesForm = false;
  updateSuccess = false;
  updateError = '';
  passwordUpdateSuccess = false;
  passwordUpdateError = '';
  preferencesUpdateSuccess = false;
  preferencesUpdateError = '';
  activeTab = 'profile';
  
  // Password visibility toggles
  showCurrentPassword = false;
  showNewPassword = false;
  showConfirmPassword = false;
  
  // For profile picture upload
  selectedFile: File | null = null;
  uploadProgress = 0;
  uploadError = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private imageService: ImageService
  ) {
    this.profileForm = this.fb.group({
      username: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      phoneNumber: ['', [Validators.pattern('^[0-9]{10}$')]],
    });
    
    this.passwordForm = this.fb.group({
      currentPassword: ['', [Validators.required]],
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]]
    }, { validator: this.passwordMatchValidator });
    
    this.preferencesForm = this.fb.group({
      emailNotifications: [true],
      smsNotifications: [false],
      showRevenueStats: [true],
      showUserStats: [true],
      showBookingStats: [true],
      language: ['en'],
      currency: ['INR']
    });
  }
  
  // Custom validator to check if passwords match
  passwordMatchValidator(form: FormGroup) {
    const newPassword = form.get('newPassword')?.value;
    const confirmPassword = form.get('confirmPassword')?.value;
    
    if (newPassword !== confirmPassword) {
      form.get('confirmPassword')?.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    }
    
    return null;
  }

  ngOnInit(): void {
    this.loadUserProfile();
    
    // Set up periodic refresh of user profile to ensure data is up-to-date
    this.setupPeriodicRefresh();
  }
  
  setupPeriodicRefresh(): void {
    // Refresh user profile every 60 seconds to ensure we have the latest data
    const refreshInterval = setInterval(() => {
      console.log('Performing periodic refresh of admin profile...');
      this.refreshUserProfile();
    }, 60000); // 60 seconds
    
    // Store the interval ID so we can clear it when the component is destroyed
    // @ts-ignore - Property might not exist on window
    window['adminProfileRefreshInterval'] = refreshInterval;
  }
  
  refreshUserProfile(): void {
    // This is a silent refresh that doesn't show loading indicators
    console.log('Silently refreshing admin profile...');
    
    this.authService.getUserProfile().subscribe({
      next: (user) => {
        console.log('Received updated admin profile:', user);
        
        // Check if there are any changes
        const hasChanges = this.hasUserProfileChanges(this.currentUser, user);
        
        if (hasChanges) {
          console.log('Detected changes in admin profile, updating view...');
          this.currentUser = user;
          
          // Only update form if not currently editing
          if (!this.isEditing) {
            this.updateFormValues(user);
          }
          
          // Update preferences form if not currently editing preferences
          if (!this.showPreferencesForm && user.preferences) {
            this.preferencesForm.patchValue({
              emailNotifications: user.preferences.emailNotifications,
              smsNotifications: user.preferences.smsNotifications,
              language: user.preferences.language || 'en',
              currency: user.preferences.currency || 'INR'
            });
          }
        } else {
          console.log('No changes detected in admin profile');
        }
      },
      error: (error) => {
        console.error('Error refreshing admin profile:', error);
        // Don't show error to user for silent refresh
      }
    });
  }
  
  hasUserProfileChanges(oldUser: User | null, newUser: User): boolean {
    if (!oldUser) return true;
    
    // Check for changes in basic profile fields
    if (oldUser.username !== newUser.username ||
        oldUser.email !== newUser.email ||
        oldUser.phoneNumber !== newUser.phoneNumber) {
      return true;
    }
    
    // Check for changes in preferences
    if (oldUser.preferences && newUser.preferences) {
      if (oldUser.preferences.emailNotifications !== newUser.preferences.emailNotifications ||
          oldUser.preferences.smsNotifications !== newUser.preferences.smsNotifications ||
          oldUser.preferences.language !== newUser.preferences.language ||
          oldUser.preferences.currency !== newUser.preferences.currency) {
        return true;
      }
    } else if (oldUser.preferences !== newUser.preferences) {
      return true;
    }
    
    return false;
  }

  loadUserProfile(): void {
    this.authService.getCurrentUser().subscribe({
      next: (user) => {
        this.currentUser = user;
        this.updateFormValues(user);
      },
      error: (error) => {
        console.error('Error loading admin profile:', error);
        this.updateError = 'Failed to load profile. Please refresh the page.';
      }
    });
  }

  private updateFormValues(user: User): void {
    // Update profile form
    this.profileForm.patchValue({
      username: user.username,
      email: user.email,
      phoneNumber: user.phoneNumber || user.phone || ''
    });
    this.profileForm.get('email')?.disable();
    this.profileForm.get('username')?.disable();

    // Update preferences form if preferences exist
    if (user.preferences) {
      this.preferencesForm.patchValue({
        emailNotifications: user.preferences.emailNotifications,
        smsNotifications: user.preferences.smsNotifications,
        language: user.preferences.language || 'en',
        currency: user.preferences.currency || 'INR'
      });
    }
  }

  setActiveTab(tab: string): void {
    this.activeTab = tab;
  }

  toggleEdit(): void {
    this.isEditing = !this.isEditing;
    
    if (!this.isEditing) {
      // Reset form to original values if canceling edit
      this.updateFormValues(this.currentUser!);
    }
  }

  onSubmit(): void {
    if (this.profileForm.invalid) {
      return;
    }
    
    const formValues = this.profileForm.getRawValue();
    
    // Create updated user object
    const updatedUser: User = {
      ...this.currentUser!,
      phoneNumber: formValues.phoneNumber
    };
    
    this.authService.updateUserProfile(updatedUser).subscribe({
      next: (user) => {
        this.currentUser = user;
        this.updateSuccess = true;
        this.updateError = '';
        this.isEditing = false;
        
        // Hide success message after 3 seconds
        setTimeout(() => {
          this.updateSuccess = false;
        }, 3000);
      },
      error: (error) => {
        console.error('Error updating profile:', error);
        this.updateError = 'Failed to update profile. Please try again.';
        this.updateSuccess = false;
      }
    });
  }

  onChangePassword(): void {
    if (this.passwordForm.invalid) {
      return;
    }
    
    const passwordChangeRequest: PasswordChangeRequest = {
      currentPassword: this.passwordForm.value.currentPassword,
      newPassword: this.passwordForm.value.newPassword,
      confirmPassword: this.passwordForm.value.confirmPassword
    };
    
    this.authService.changePassword(passwordChangeRequest).subscribe({
      next: () => {
        this.passwordUpdateSuccess = true;
        this.passwordUpdateError = '';
        this.passwordForm.reset();
        
        // Hide success message after 3 seconds
        setTimeout(() => {
          this.passwordUpdateSuccess = false;
        }, 3000);
      },
      error: (error) => {
        console.error('Error changing password:', error);
        this.passwordUpdateError = 'Failed to change password. Please check your current password and try again.';
        this.passwordUpdateSuccess = false;
      }
    });
  }

  onUpdatePreferences(): void {
    if (this.preferencesForm.invalid) {
      return;
    }
    
    const preferences: UserPreferences = {
      ...this.preferencesForm.value
    };
    
    this.authService.updateUserPreferences(preferences).subscribe({
      next: (user) => {
        this.currentUser = user;
        this.preferencesUpdateSuccess = true;
        this.preferencesUpdateError = '';
        
        // Hide success message after 3 seconds
        setTimeout(() => {
          this.preferencesUpdateSuccess = false;
        }, 3000);
      },
      error: (error) => {
        console.error('Error updating preferences:', error);
        this.preferencesUpdateError = 'Failed to update preferences. Please try again.';
        this.preferencesUpdateSuccess = false;
      }
    });
  }

  triggerFileInput(): void {
    this.fileInput.nativeElement.click();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
      this.uploadProfilePicture();
    }
  }

  uploadProfilePicture(): void {
    if (!this.selectedFile) {
      return;
    }
    
    this.uploadProgress = 0;
    this.uploadError = '';
    
    this.authService.uploadProfilePicture(this.selectedFile).subscribe({
      next: (user) => {
        this.currentUser = user;
        this.uploadProgress = 100;
        
        // Reset progress after 2 seconds
        setTimeout(() => {
          this.uploadProgress = 0;
        }, 2000);
      },
      error: (error) => {
        console.error('Error uploading profile picture:', error);
        this.uploadError = 'Failed to upload profile picture. Please try again.';
        this.uploadProgress = 0;
      }
    });
  }

  getImageUrl(imageUrl: string | null | undefined, type: string = 'user'): string {
    return this.imageService.getImageUrl(imageUrl, type);
  }
  
  togglePasswordVisibility(field: string): void {
    if (field === 'current') {
      this.showCurrentPassword = !this.showCurrentPassword;
    } else if (field === 'new') {
      this.showNewPassword = !this.showNewPassword;
    } else if (field === 'confirm') {
      this.showConfirmPassword = !this.showConfirmPassword;
    }
  }

  ngOnDestroy(): void {
    // Clear the refresh interval when component is destroyed
    // @ts-ignore - Property might not exist on window
    if (window['adminProfileRefreshInterval']) {
      // @ts-ignore - Property might not exist on window
      clearInterval(window['adminProfileRefreshInterval']);
    }
  }
}
