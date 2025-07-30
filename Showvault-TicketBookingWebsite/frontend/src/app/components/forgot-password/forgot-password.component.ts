import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.css']
})
export class ForgotPasswordComponent implements OnInit {
  forgotPasswordForm: FormGroup;
  errorMessage: string = '';
  successMessage: string = '';
  isLoading = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.forgotPasswordForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  ngOnInit(): void {
    // Auto-redirect if already logged in
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/']);
    }
  }

  onSubmit(): void {
    if (this.forgotPasswordForm.valid) {
      // Mark form as touched to trigger validation styles
      this.forgotPasswordForm.markAllAsTouched();
      
      // Clear any previous messages
      this.errorMessage = '';
      this.successMessage = '';
      this.isLoading = true;
      
      const email = this.forgotPasswordForm.value.email;
      
      // In a real implementation, this would call a backend API
      // For now, we'll simulate a successful password reset request
      setTimeout(() => {
        this.isLoading = false;
        this.successMessage = 'Password reset instructions have been sent to your email address.';
        
        // Reset form
        this.forgotPasswordForm.reset();
        
        // Redirect to login after a delay
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 3000);
      }, 1500);
      
      /* 
      // This is how the actual implementation would look:
      this.authService.requestPasswordReset(email)
        .pipe(finalize(() => this.isLoading = false))
        .subscribe({
          next: () => {
            this.successMessage = 'Password reset instructions have been sent to your email address.';
            this.forgotPasswordForm.reset();
            
            // Redirect to login after a delay
            setTimeout(() => {
              this.router.navigate(['/login']);
            }, 3000);
          },
          error: (error) => {
            if (error.status === 404) {
              this.errorMessage = 'Email address not found. Please check your email and try again.';
            } else if (error.status === 0) {
              this.errorMessage = 'Unable to connect to the server. Please check your internet connection.';
            } else {
              this.errorMessage = error.error?.message || 'Failed to process your request. Please try again later.';
            }
          }
        });
      */
    } else {
      // Mark all fields as touched to trigger validation display
      this.forgotPasswordForm.markAllAsTouched();
    }
  }
}