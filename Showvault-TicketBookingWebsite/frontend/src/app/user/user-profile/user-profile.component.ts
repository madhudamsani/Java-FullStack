import { Component, OnInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { User, PasswordChangeRequest, UserPreferences } from '../../models/user.model';
import { AuthService } from '../../services/auth.service';
import { ImageService } from '../../services/image.service';

@Component({
  selector: 'app-user-profile',
  templateUrl: './user-profile.component.html',
  styleUrls: ['./user-profile.component.css']
})
export class UserProfileComponent implements OnInit, OnDestroy {
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
      favoriteCategories: [[]],
      language: ['en'],
      currency: ['INR'] // Default to INR for Indian entertainment focus
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
      console.log('Performing periodic refresh of user profile...');
      this.refreshUserProfile();
    }, 60000); // 60 seconds
    
    // Store the interval ID so we can clear it when the component is destroyed
    // @ts-ignore - Property might not exist on window
    window['userProfileRefreshInterval'] = refreshInterval;
  }
  
  refreshUserProfile(): void {
    // This is a silent refresh that doesn't show loading indicators
    console.log('Silently refreshing user profile...');
    
    this.authService.getUserProfile().subscribe({
      next: (user) => {
        console.log('Received updated user profile:', user);
        
        // Check if there are any changes
        const hasChanges = this.hasUserProfileChanges(this.currentUser, user);
        
        if (hasChanges) {
          console.log('Detected changes in user profile, updating view...');
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
              favoriteCategories: user.preferences.favoriteCategories || [],
              language: user.preferences.language || 'en',
              currency: user.preferences.currency || 'INR' // Default to INR for Indian entertainment focus
            });
          }
        } else {
          console.log('No changes detected in user profile');
        }
      },
      error: (error) => {
        console.error('Error refreshing user profile:', error);
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
      
      // Check for changes in favorite categories
      if (JSON.stringify(oldUser.preferences.favoriteCategories) !== 
          JSON.stringify(newUser.preferences.favoriteCategories)) {
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
        console.error('Error loading user profile:', error);
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
        favoriteCategories: user.preferences.favoriteCategories || [],
        language: user.preferences.language || 'en',
        currency: user.preferences.currency || 'INR'
      });
    }
  }
  
  setActiveTab(tab: string): void {
    this.activeTab = tab;
    // Reset forms and states when switching tabs
    this.updateSuccess = false;
    this.updateError = '';
    this.passwordUpdateSuccess = false;
    this.passwordUpdateError = '';
    this.preferencesUpdateSuccess = false;
    this.preferencesUpdateError = '';
  }

  toggleEdit(): void {
    this.isEditing = !this.isEditing;
    this.updateSuccess = false;
    this.updateError = '';
  }

  onSubmit(): void {
    if (this.profileForm.valid && this.currentUser) {
      const updatedUser = {
        ...this.currentUser,
        phoneNumber: this.profileForm.value.phoneNumber
      };

      this.authService.updateUserProfile(updatedUser).subscribe({
        next: (response) => {
          this.updateSuccess = true;
          this.isEditing = false;
          this.currentUser = response;
          this.updateFormValues(response);
          setTimeout(() => this.updateSuccess = false, 3000);
        },
        error: (error) => {
          this.updateError = error.message || 'Failed to update profile. Please try again.';
          console.error('Error updating profile:', error);
        }
      });
    } else {
      this.updateError = 'Please fill in all required fields correctly.';
    }
  }
  
  onChangePassword(): void {
    if (this.passwordForm.valid) {
      const passwordData: PasswordChangeRequest = {
        currentPassword: this.passwordForm.value.currentPassword,
        newPassword: this.passwordForm.value.newPassword,
        confirmPassword: this.passwordForm.value.confirmPassword
      };
      
      this.authService.changePassword(passwordData).subscribe({
        next: () => {
          this.passwordUpdateSuccess = true;
          this.passwordForm.reset();
          setTimeout(() => {
            this.passwordUpdateSuccess = false;
            this.showPasswordForm = false;
          }, 3000);
        },
        error: (error) => {
          this.passwordUpdateError = error.message || 'Failed to change password. Please verify your current password.';
          console.error('Error changing password:', error);
        }
      });
    }
  }
  
  onUpdatePreferences(): void {
    if (this.preferencesForm.valid && this.currentUser) {
      const preferences: UserPreferences = {
        emailNotifications: this.preferencesForm.value.emailNotifications,
        smsNotifications: this.preferencesForm.value.smsNotifications,
        favoriteCategories: this.preferencesForm.value.favoriteCategories,
        language: this.preferencesForm.value.language,
        currency: this.preferencesForm.value.currency
      };
      
      this.authService.updateUserPreferences(preferences).subscribe({
        next: (response) => {
          this.preferencesUpdateSuccess = true;
          this.currentUser = response;
          setTimeout(() => {
            this.preferencesUpdateSuccess = false;
          }, 3000);
        },
        error: (error) => {
          this.preferencesUpdateError = 'Failed to update preferences. Please try again.';
          console.error('Error updating preferences:', error);
        }
      });
    }
  }
  
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
      this.uploadProfilePicture();
    }
  }
  
  triggerFileInput(): void {
    this.fileInput.nativeElement.click();
  }
  
  uploadProfilePicture(): void {
    if (!this.selectedFile) return;
    
    this.uploadProgress = 0;
    this.uploadError = '';
    
    // Simulate upload progress (in a real app, this would use HttpClient's progress events)
    const interval = setInterval(() => {
      this.uploadProgress += 10;
      if (this.uploadProgress >= 100) {
        clearInterval(interval);
      }
    }, 200);
    
    this.authService.uploadProfilePicture(this.selectedFile).subscribe({
      next: (response) => {
        this.currentUser = response;
        this.selectedFile = null;
        this.uploadProgress = 100;
        setTimeout(() => {
          this.uploadProgress = 0;
        }, 1000);
      },
      error: (error) => {
        this.uploadError = error.message || 'Failed to upload profile picture. Please try again.';
        this.uploadProgress = 0;
        clearInterval(interval);
        console.error('Error uploading profile picture:', error);
      }
    });
  }

  viewBookingHistory(): void {
    this.router.navigate(['/user/bookings']);
  }
  
  /**
   * Get image URL with fallback to appropriate default image
   * Public wrapper for imageService.getImageUrl
   * @param imageUrl The original image URL
   * @param type The type of content (user, profile, etc.)
   * @returns A valid image URL
   */
  getImageUrl(imageUrl: string | undefined | null, type: string = 'user'): string {
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
    // Clean up the refresh interval when the component is destroyed
    // @ts-ignore - Property might not exist on window
    if (window['userProfileRefreshInterval']) {
      // @ts-ignore - Property might not exist on window
      clearInterval(window['userProfileRefreshInterval']);
      console.log('Cleared user profile refresh interval');
    }
  }
}