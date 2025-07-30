import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { AdminService } from '../../services/admin.service';
import { User } from '../../models/user.model';

@Component({
  selector: 'app-user-management',
  templateUrl: './user-management.component.html',
  styleUrls: ['./user-management.component.css']
})
export class UserManagementComponent implements OnInit {
  users: User[] = [];
  totalUsers = 0;
  currentPage = 1;
  pageSize = 10;
  isLoading = false;
  error = '';
  success = '';
  Math = Math; // Make Math available to template
  
  filterForm: FormGroup;
  
  selectedUser: User | null = null;
  showUserModal = false;
  showConfirmDelete = false;
  processingAction = false;
  
  // For pagination
  totalPages = 1;
  
  // For sorting
  sortField = 'name';
  sortOrder: 'asc' | 'desc' = 'asc';

  constructor(
    private adminService: AdminService,
    private fb: FormBuilder
  ) {
    this.filterForm = this.fb.group({
      role: ['all'],
      status: ['all'],
      search: ['']
    });
  }

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.isLoading = true;
    this.error = '';
    
    const filters = {
      role: this.filterForm.value.role !== 'all' ? this.filterForm.value.role : undefined,
      status: this.filterForm.value.status !== 'all' ? this.filterForm.value.status : undefined,
      search: this.filterForm.value.search || undefined,
      sortBy: this.sortField,
      sortOrder: this.sortOrder
    };
    
    console.log('Loading users with filters:', filters);
    
    this.adminService.getUsers(this.currentPage, this.pageSize, filters).subscribe({
      next: (response) => {
        console.log('Received users:', response.users);
        
        // Process users to ensure they have all required fields
        this.users = response.users.map(user => {
          // Ensure name is set
          if (!user.name && user.firstName && user.lastName) {
            user.name = `${user.firstName} ${user.lastName}`;
          }
          
          // Ensure status is set
          if (!user.status) {
            user.status = 'active'; // Default to active if status is not provided
          }
          
          // Ensure role is set
          if (!user.role) {
            user.role = 'ROLE_USER'; // Default to user role if not provided
          }
          
          // Ensure dates are properly formatted
          if (user.createdAt && typeof user.createdAt === 'string') {
            user.createdAt = new Date(user.createdAt);
          }
          
          if (user.lastLogin && typeof user.lastLogin === 'string') {
            user.lastLogin = new Date(user.lastLogin);
          } else if (user.lastLoginDate && typeof user.lastLoginDate === 'string') {
            user.lastLogin = new Date(user.lastLoginDate);
          }
          
          return user;
        });
        
        this.totalUsers = response.total;
        this.totalPages = Math.ceil(this.totalUsers / this.pageSize);
        this.isLoading = false;
        
        console.log('Processed users:', this.users);
      },
      error: (error) => {
        this.error = 'Failed to load users. Please try again.';
        this.isLoading = false;
        console.error('Error loading users:', error);
      }
    });
  }

  applyFilters(): void {
    this.currentPage = 1; // Reset to first page when applying filters
    this.loadUsers();
  }

  resetFilters(): void {
    this.filterForm.reset({
      role: 'all',
      status: 'all',
      search: ''
    });
    this.applyFilters();
  }

  changePage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.loadUsers();
  }

  sortBy(field: string): void {
    if (this.sortField === field) {
      // Toggle sort order if clicking the same field
      this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      // Default to ascending order for a new sort field
      this.sortField = field;
      this.sortOrder = 'asc';
    }
    
    this.loadUsers();
  }

  getSortIcon(field: string): string {
    if (this.sortField !== field) return 'bi-arrow-down-up';
    return this.sortOrder === 'asc' ? 'bi-sort-down' : 'bi-sort-up';
  }

  openUserModal(user: User): void {
    this.selectedUser = user;
    this.showUserModal = true;
  }

  closeUserModal(): void {
    this.selectedUser = null;
    this.showUserModal = false;
  }

  updateUserStatus(user: User, status: 'active' | 'suspended' | 'inactive' | 'deleted'): void {
    if (confirm(`Are you sure you want to change ${user.name}'s status to ${status}?`)) {
      this.processingAction = true;
      
      console.log(`Updating user ${user.id} status to ${status}`);
      
      this.adminService.updateUserStatus(user.id!, status).subscribe({
        next: (updatedUser) => {
          console.log('User status updated successfully:', updatedUser);
          
          // Update user in the list
          const index = this.users.findIndex(u => u.id === user.id);
          if (index !== -1) {
            // Update the status in the list
            this.users[index].status = status;
            
            // If the backend returned a name, update it
            if (updatedUser.name) {
              this.users[index].name = updatedUser.name;
            } else if (updatedUser.firstName && updatedUser.lastName) {
              this.users[index].name = `${updatedUser.firstName} ${updatedUser.lastName}`;
            }
          }
          
          this.success = `User status updated to ${status} successfully.`;
          this.processingAction = false;
          
          // Clear success message after 3 seconds
          setTimeout(() => {
            this.success = '';
          }, 3000);
        },
        error: (error) => {
          this.error = `Failed to update user status: ${error.message}`;
          this.processingAction = false;
          console.error('Error updating user status:', error);
        }
      });
    }
  }

  updateUserRole(user: User, role: 'ROLE_USER' | 'ROLE_ORGANIZER' | 'ROLE_ADMIN'): void {
    if (confirm(`Are you sure you want to change ${user.name}'s role to ${role.replace('ROLE_', '')}?`)) {
      this.processingAction = true;
      
      // Convert role format for the service (remove 'ROLE_' prefix)
      const serviceRole = role.replace('ROLE_', '').toLowerCase() as 'user' | 'organizer' | 'admin';
      
      console.log(`Updating user ${user.id} role to ${serviceRole}`);
      
      this.adminService.updateUserRole(user.id!, serviceRole).subscribe({
        next: (updatedUser) => {
          console.log('User role updated successfully:', updatedUser);
          
          // Update user in the list
          const index = this.users.findIndex(u => u.id === user.id);
          if (index !== -1) {
            // Get the updated role from the response
            let updatedRole = role;
            
            // If the backend returned a role, use it
            if (updatedUser.role) {
              updatedRole = updatedUser.role;
            }
            
            // Update the user in the list
            this.users[index].role = updatedRole;
            
            // If the backend returned a name, update it
            if (updatedUser.name) {
              this.users[index].name = updatedUser.name;
            } else if (updatedUser.firstName && updatedUser.lastName) {
              this.users[index].name = `${updatedUser.firstName} ${updatedUser.lastName}`;
            }
          }
          
          this.success = `User role updated to ${role.replace('ROLE_', '')} successfully.`;
          this.processingAction = false;
          
          // Clear success message after 3 seconds
          setTimeout(() => {
            this.success = '';
          }, 3000);
        },
        error: (error) => {
          this.error = `Failed to update user role: ${error.message}`;
          this.processingAction = false;
          console.error('Error updating user role:', error);
        }
      });
    }
  }

  resetPassword(user: User): void {
    if (confirm(`Are you sure you want to reset the password for ${user.name}?`)) {
      this.processingAction = true;
      
      console.log(`Resetting password for user ${user.id}`);
      
      this.adminService.resetUserPassword(user.id!).subscribe({
        next: (response) => {
          console.log('Password reset response:', response);
          
          this.success = response.message || 'Password has been reset successfully.';
          this.processingAction = false;
          
          // Clear success message after 3 seconds
          setTimeout(() => {
            this.success = '';
          }, 3000);
        },
        error: (error) => {
          this.error = `Failed to reset password: ${error.message}`;
          this.processingAction = false;
          console.error('Error resetting password:', error);
        }
      });
    }
  }

  confirmDelete(user: User): void {
    this.selectedUser = user;
    this.showConfirmDelete = true;
  }

  cancelDelete(): void {
    this.selectedUser = null;
    this.showConfirmDelete = false;
  }

  deleteUser(): void {
    if (!this.selectedUser) return;
    
    this.isLoading = true;
    this.error = '';
    
    console.log(`Deleting user ${this.selectedUser.id}`);
    
    this.adminService.deleteUser(this.selectedUser.id!).subscribe({
      next: () => {
        console.log('User deleted successfully');
        
        // Update the user status in the list to "deleted"
        const index = this.users.findIndex(u => u.id === this.selectedUser!.id);
        if (index !== -1) {
          this.users[index].status = 'deleted';
        } else {
          // If not found, remove from the list
          this.users = this.users.filter(u => u.id !== this.selectedUser!.id);
        }
        
        this.showConfirmDelete = false;
        this.selectedUser = null;
        this.isLoading = false;
        
        this.success = 'User deleted successfully.';
        
        // Reload the user list to reflect the changes
        this.loadUsers();
        
        // Clear success message after 3 seconds
        setTimeout(() => {
          this.success = '';
        }, 3000);
      },
      error: (error) => {
        this.isLoading = false;
        this.showConfirmDelete = false;
        console.error('Error deleting user:', error);
        
        // Check for specific error messages
        if (error.status === 403) {
          this.error = 'Cannot delete the last admin user.';
        } else if (error.status === 409 || 
                  (error.error && error.error.message && 
                   error.error.message.includes('foreign key constraint'))) {
          this.error = 'This user has associated records and cannot be hard deleted. The user has been marked as deleted instead.';
          
          // Reload the user list to reflect the changes
          this.loadUsers();
        } else {
          this.error = 'Failed to delete user. Please try again.';
        }
      }
    });
  }

  // Helper method to format date
  formatDate(date: string | Date | undefined): string {
    if (!date) return 'N/A';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString();
  }
}