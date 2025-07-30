/**
 * Utility functions for checking show-related permissions
 */
import { getCurrentUserRole } from './role-checker';
import { ShowCreator } from '../models/show.model';

/**
 * Checks if the current user has permission to update a specific show
 * @param show The show object containing creator information
 * @returns boolean indicating if user has permission to update the show
 */
export function canUpdateShow(show: { createdBy?: ShowCreator }): boolean {
  try {
    // Get the current user from localStorage
    const currentUserStr = localStorage.getItem('currentUser');
    if (!currentUserStr) {
      console.error('No user data found in localStorage');
      return false;
    }
    
    const currentUser = JSON.parse(currentUserStr);
    if (!currentUser || !currentUser.role || !currentUser.id) {
      console.error('Invalid user data or missing role/id');
      return false;
    }
    
    // Normalize the role
    let userRole = currentUser.role;
    if (!userRole.startsWith('ROLE_')) {
      const roleUpperCase = userRole.toUpperCase();
      if (roleUpperCase === 'ADMIN') {
        userRole = 'ROLE_ADMIN';
      } else if (roleUpperCase === 'ORGANIZER') {
        userRole = 'ROLE_ORGANIZER';
      } else {
        userRole = 'ROLE_USER';
      }
    }
    
    // Admin can update any show
    if (userRole === 'ROLE_ADMIN') {
      return true;
    }
    
    // Organizer can only update their own shows
    if (userRole === 'ROLE_ORGANIZER') {
      // Check if the show has creator information
      if (!show.createdBy || !show.createdBy.id) {
        console.warn('Show is missing creator information');
        return false;
      }
      
      // Check if the current user is the creator of the show
      return currentUser.id === show.createdBy.id;
    }
    
    // Regular users cannot update shows
    return false;
  } catch (error) {
    console.error('Error checking show update permission:', error);
    return false;
  }
}

/**
 * Checks if the current user has permission to create shows
 * @returns boolean indicating if user has permission to create shows
 */
export function canCreateShow(): boolean {
  const userRole = getCurrentUserRole();
  return userRole === 'ROLE_ORGANIZER' || userRole === 'ROLE_ADMIN';
}

/**
 * Checks if the current user has permission to delete a specific show
 * @param show The show object containing creator information
 * @returns boolean indicating if user has permission to delete the show
 */
export function canDeleteShow(show: { createdBy?: ShowCreator }): boolean {
  // Same logic as updating shows
  return canUpdateShow(show);
}

/**
 * Gets a user-friendly error message for show permission errors
 * @param action The action being attempted (e.g., 'update', 'delete')
 * @param show Optional show object for more specific messages
 * @returns A user-friendly error message
 */
export function getShowPermissionErrorMessage(action: string, show?: { createdBy?: ShowCreator }): string {
  const userRole = getCurrentUserRole();
  
  if (!userRole) {
    return `You must be logged in to ${action} shows.`;
  }
  
  if (userRole === 'ROLE_USER') {
    return `Regular users cannot ${action} shows. This action requires Organizer or Admin role.`;
  }
  
  if (userRole === 'ROLE_ORGANIZER' && show && show.createdBy) {
    return `You can only ${action} shows that you have created. This show was created by another organizer.`;
  }
  
  return `You do not have permission to ${action} this show.`;
}