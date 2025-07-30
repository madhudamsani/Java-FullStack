/**
 * Utility functions for checking user roles
 */

/**
 * Checks if the current user has the required role to update shows
 * @returns boolean indicating if user has required role
 */
export function hasShowUpdatePermission(): boolean {
  try {
    // Get the current user from localStorage
    const currentUserStr = localStorage.getItem('currentUser');
    if (!currentUserStr) {
      console.error('No user data found in localStorage');
      return false;
    }
    
    const currentUser = JSON.parse(currentUserStr);
    if (!currentUser || !currentUser.role) {
      console.error('Invalid user data or missing role');
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
    
    // Check if user has the required role (ORGANIZER or ADMIN)
    return userRole === 'ROLE_ORGANIZER' || userRole === 'ROLE_ADMIN';
  } catch (error) {
    console.error('Error checking user role:', error);
    return false;
  }
}

/**
 * Gets the current user's role
 * @returns string representing the user's role or null if not found
 */
export function getCurrentUserRole(): string | null {
  try {
    // Get the current user from localStorage
    const currentUserStr = localStorage.getItem('currentUser');
    if (!currentUserStr) {
      return null;
    }
    
    const currentUser = JSON.parse(currentUserStr);
    if (!currentUser || !currentUser.role) {
      return null;
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
    
    return userRole;
  } catch (error) {
    console.error('Error getting user role:', error);
    return null;
  }
}