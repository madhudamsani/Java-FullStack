import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent implements OnInit {
  registerForm: FormGroup;
  registrationError: string = '';
  registrationSuccess: string = '';
  isLoading = false;
  showPassword = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.registerForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      lastName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      username: ['', [
        Validators.required, 
        Validators.minLength(3), 
        Validators.maxLength(50),
        Validators.pattern('^[a-zA-Z0-9_]+$')
      ]],
      email: ['', [Validators.required, Validators.email, Validators.maxLength(100)]],
      password: ['', [
        Validators.required, 
        Validators.minLength(8), 
        Validators.maxLength(40),
        Validators.pattern('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&#])[A-Za-z\\d@$!%*?&#]{8,}$')
      ]],
      confirmPassword: ['', [Validators.required]],
      phoneNumber: ['', [Validators.pattern('^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$')]],
      role: ['ROLE_USER', [Validators.required]],
      termsAccepted: [false, [Validators.requiredTrue]]
    }, {
      validators: this.passwordMatchValidator
    });
  }

  ngOnInit(): void {
    // Auto-redirect if already logged in
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/']);
    }
    

  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  passwordMatchValidator(g: AbstractControl): ValidationErrors | null {
    const password = g.get('password')?.value;
    const confirmPassword = g.get('confirmPassword')?.value;
    
    return password === confirmPassword ? null : { 'mismatch': true };
  }

  onSubmit(): void {
    if (this.registerForm.valid) {
      // Mark form as touched to trigger validation styles
      this.registerForm.markAllAsTouched();
      
      // Clear any previous messages
      this.registrationError = '';
      this.registrationSuccess = '';
      this.isLoading = true;
      
      const { confirmPassword, termsAccepted, ...registerData } = this.registerForm.value;
      
      // Remove 'ROLE_' prefix for backend ERole enum
      const role = registerData.role.split('_')[1].toLowerCase();
      
      const registerRequest = {
        ...registerData,
        roles: [role]
      };
      
      this.authService.register(registerRequest)
        .pipe(finalize(() => this.isLoading = false))
        .subscribe({
          next: () => {
            console.log('Registration successful');
            this.registrationSuccess = 'Registration successful! You can now log in.';
            
            // Reset form
            this.registerForm.reset({
              role: 'ROLE_USER',
              termsAccepted: false
            });
            
            // Auto-login the user and redirect to shows page
            const loginRequest = {
              username: registerRequest.username,
              password: registerRequest.password
            };
            
            setTimeout(() => {
              this.authService.login(loginRequest).subscribe({
                next: () => {
                  this.router.navigate(['/shows']);
                },
                error: () => {
                  // If auto-login fails, redirect to login page
                  this.router.navigate(['/login']);
                }
              });
            }, 1000);
          },
          error: (error) => {
            console.error('Registration failed:', error);
            
            // Provide user-friendly error messages
            if (error.status === 400) {
              if (error.error?.message?.includes('Email')) {
                this.registrationError = 'This email is already registered. Please use a different email or try logging in.';
              } else if (error.error?.message?.includes('Username')) {
                this.registrationError = 'This username is already taken. Please choose a different username.';
              } else {
                this.registrationError = error.message || error.error?.message || 'Invalid registration information. Please check your details.';
              }
            } else if (error.status === 0) {
              this.registrationError = 'Unable to connect to the server. Please check your internet connection.';
            } else {
              this.registrationError = error.message || error.error?.message || 'Registration failed. Please try again later.';
            }
          }
        });
    } else {
      // Mark all fields as touched to trigger validation display
      this.markFormGroupTouched(this.registerForm);
    }
  }

  // Helper method to mark all controls as touched
  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }
}