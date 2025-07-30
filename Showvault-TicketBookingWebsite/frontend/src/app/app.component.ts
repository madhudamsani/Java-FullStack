import { Component, OnInit } from '@angular/core';
import { Router, NavigationEnd, Event } from '@angular/router';
import { AuthService } from './services/auth.service';
import { filter } from 'rxjs/operators';
declare var bootstrap: any;

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styles: [`
    .navbar {
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .nav-link.active {
      font-weight: bold;
    }
    .feature-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 3rem;
      height: 3rem;
      font-size: 1.5rem;
      border-radius: 50%;
    }
    .search-box {
      position: relative;
      width: 100%;
      max-width: 300px;
    }
    .search-input {
      padding-left: 35px;
      border-radius: 20px;
    }
    .search-icon {
      position: absolute;
      left: 12px;
      top: 50%;
      transform: translateY(-50%);
      color: #6c757d;
    }
  `]
})
export class AppComponent implements OnInit {
  title = 'ShowVault';
  userRole: string | null = null;
  loginModal: any;
  searchQuery: string = '';
  isAdminRoute: boolean = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {
    // Subscribe to router events to detect admin and organizer routes
    this.router.events.pipe(
      filter((event: Event): event is NavigationEnd => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      this.isAdminRoute = event.url.includes('/admin/') || event.url.includes('/organizer/');
      console.log('Current route:', event.url, 'Is admin/organizer route:', this.isAdminRoute);
    });
  }

  ngOnInit(): void {
    // Check if user is logged in and get their role
    if (this.isLoggedIn()) {
      this.getUserRole();
      
      // Check if we need to force a logout due to token changes
      const forceLogout = localStorage.getItem('force_logout');
      if (forceLogout === 'true') {
        console.log('Forcing logout due to token changes');
        localStorage.removeItem('force_logout');
        this.logout();
        
        // Show a message to the user
        setTimeout(() => {
          alert('Please log in again to continue using the application.');
        }, 500);
        
        return;
      }
    }
    
    // Initialize login modal
    setTimeout(() => {
      this.initializeLoginModal();
    }, 500);
    
    // Subscribe to auth state changes
    this.authService.authStateChanged().subscribe(isLoggedIn => {
      if (isLoggedIn) {
        this.getUserRole();
      } else {
        this.userRole = null;
      }
    });
  }

  isLoggedIn(): boolean {
    return this.authService.isLoggedIn();
  }

  getUserRole(): void {
    this.authService.getCurrentUser().subscribe({
      next: (user) => {
        // Convert the role to lowercase for easier comparison in the template
        switch (user.role) {
          case 'ROLE_ADMIN':
            this.userRole = 'admin';
            break;
          case 'ROLE_ORGANIZER':
            this.userRole = 'organizer';
            break;
          default:
            this.userRole = 'user';
        }
        console.log('User role set to:', this.userRole);
      },
      error: (error: unknown) => {
        console.error('Error getting user role:', error);
        this.userRole = null;
      }
    });
  }

  logout(): void {
    this.authService.logout();
    this.userRole = null;
    this.router.navigate(['/']);
  }
  
  checkLoginBeforeNavigate(event: MouseEvent, url: string): void {
    if (!this.isLoggedIn()) {
      event.preventDefault();
      this.showLoginRequiredModal();
    }
  }
  
  private showLoginRequiredModal(): void {
    if (this.loginModal) {
      this.loginModal.show();
    }
  }
  
  private initializeLoginModal(): void {
    const modalElement = document.getElementById('loginRequiredModal');
    if (modalElement) {
      this.loginModal = new bootstrap.Modal(modalElement);
    }
  }
  
  searchTheatres(): void {
    if (this.searchQuery.trim()) {
      this.router.navigate(['/venues'], { 
        queryParams: { search: this.searchQuery.trim() } 
      });
      this.searchQuery = ''; // Clear search after navigating
    }
  }
}