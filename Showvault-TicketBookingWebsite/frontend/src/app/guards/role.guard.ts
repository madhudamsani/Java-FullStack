import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class RoleGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    // Get the required roles from the route data
    const requiredRoles = route.data['roles'] as Array<string>;
    console.log('Required roles for route:', requiredRoles);

    // Check if the user is authenticated
    if (!this.authService.isLoggedIn()) {
      console.log('User not logged in, redirecting to login');
      
      // Special handling for user bookings page
      if (state.url.includes('/user/bookings')) {
        console.log('Attempting to access bookings page without authentication');
        
        // Check if we have a username in session storage
        const username = sessionStorage.getItem('current_username');
        if (username) {
          console.log('Found username in session storage, attempting to recover session');
          // We'll still redirect to login, but with a more specific message
          this.router.navigate(['/login'], { 
            queryParams: { 
              returnUrl: state.url,
              message: 'Please log in again to view your bookings.',
              username: username
            } 
          });
        } else {
          this.router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
        }
      } else {
        this.router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
      }
      return false;
    }

    // Get the current user and check if they have the required role
    const currentUser = this.authService.getCurrentUserSync();
    
    if (!currentUser) {
      console.log('No user data available, redirecting to login');
      this.router.navigate(['/login']);
      return false;
    }
    
    console.log('Checking if user role matches required roles:', currentUser.role);
    
    // Ensure role is properly formatted for comparison
    let userRole = currentUser.role;
    if (!userRole.startsWith('ROLE_')) {
      // Convert to one of the valid role types
      const roleUpperCase = userRole.toUpperCase();
      if (roleUpperCase === 'ADMIN') {
        userRole = 'ROLE_ADMIN';
      } else if (roleUpperCase === 'ORGANIZER') {
        userRole = 'ROLE_ORGANIZER';
      } else {
        userRole = 'ROLE_USER';
      }
    }
    
    if (requiredRoles.includes(userRole)) {
      console.log('Access granted: User has required role');
      return true;
    } else {
      // Redirect to home page if user doesn't have the required role
      console.warn(`Access denied: User with role ${userRole} attempted to access a route requiring ${requiredRoles.join(', ')}`);
      
      // Redirect based on user's actual role
      if (userRole === 'ROLE_ADMIN') {
        this.router.navigate(['/admin/dashboard']);
      } else if (userRole === 'ROLE_ORGANIZER') {
        this.router.navigate(['/organizer/dashboard']);
      } else {
        this.router.navigate(['/user/profile']);
      }
      
      return false;
    }
  }
}