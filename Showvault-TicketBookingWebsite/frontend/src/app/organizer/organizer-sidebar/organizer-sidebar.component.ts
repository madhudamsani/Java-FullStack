import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-organizer-sidebar',
  templateUrl: './organizer-sidebar.component.html',
  styleUrls: ['./organizer-sidebar.component.css'],
  standalone: true,
  imports: [CommonModule, RouterModule]
})
export class OrganizerSidebarComponent {
  constructor(
    private router: Router,
    private authService: AuthService
  ) { }
  
  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}