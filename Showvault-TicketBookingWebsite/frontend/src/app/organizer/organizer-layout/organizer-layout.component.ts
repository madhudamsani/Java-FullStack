import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { OrganizerSidebarComponent } from '../organizer-sidebar/organizer-sidebar.component';
import { OrganizerHeaderComponent } from '../organizer-header/organizer-header.component';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-organizer-layout',
  templateUrl: './organizer-layout.component.html',
  styleUrls: ['./organizer-layout.component.css'],
  standalone: true,
  imports: [CommonModule, RouterModule, OrganizerSidebarComponent, OrganizerHeaderComponent]
})
export class OrganizerLayoutComponent implements OnInit {
  isSidebarCollapsed = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) { }

  ngOnInit(): void {
    // Check screen size on init
    this.checkScreenSize();
    
    // Listen for window resize events
    window.addEventListener('resize', () => {
      this.checkScreenSize();
    });
  }

  toggleSidebar(): void {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
  }

  private checkScreenSize(): void {
    // Automatically collapse sidebar on small screens
    this.isSidebarCollapsed = window.innerWidth < 768;
  }
  
  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}