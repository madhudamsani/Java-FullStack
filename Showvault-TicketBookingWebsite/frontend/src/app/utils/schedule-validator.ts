import { Show, ShowSchedule, ShowStatus } from '../models/show.model';

/**
 * Utility functions for validating show schedules and determining status
 */

/**
 * Check if a show has any future schedules
 */
export function hasFutureSchedules(show: Show): boolean {
  if (!show.schedules || show.schedules.length === 0) {
    return false;
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  return show.schedules.some(schedule => {
    const scheduleDate = new Date(schedule.showDate);
    const scheduleDateOnly = new Date(scheduleDate.getFullYear(), scheduleDate.getMonth(), scheduleDate.getDate());
    
    // Check if schedule is in the future (tomorrow or later)
    return scheduleDateOnly > today && schedule.status !== 'CANCELLED';
  });
}

/**
 * Check if a show has schedules for today
 */
export function hasTodaySchedules(show: Show): boolean {
  if (!show.schedules || show.schedules.length === 0) {
    return false;
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  return show.schedules.some(schedule => {
    const scheduleDate = new Date(schedule.showDate);
    const scheduleDateOnly = new Date(scheduleDate.getFullYear(), scheduleDate.getMonth(), scheduleDate.getDate());
    
    return scheduleDateOnly.getTime() === today.getTime() && schedule.status !== 'CANCELLED';
  });
}

/**
 * Check if a show has any past schedules
 */
export function hasPastSchedules(show: Show): boolean {
  if (!show.schedules || show.schedules.length === 0) {
    return false;
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  return show.schedules.some(schedule => {
    const scheduleDate = new Date(schedule.showDate);
    const scheduleDateOnly = new Date(scheduleDate.getFullYear(), scheduleDate.getMonth(), scheduleDate.getDate());
    
    return scheduleDateOnly < today;
  });
}

/**
 * Get the next upcoming schedule for a show
 */
export function getNextSchedule(show: Show): ShowSchedule | null {
  if (!show.schedules || show.schedules.length === 0) {
    return null;
  }

  const now = new Date();
  const futureSchedules = show.schedules
    .filter(schedule => {
      const scheduleDateTime = new Date(`${schedule.showDate}T${schedule.showTime}`);
      return scheduleDateTime > now && schedule.status !== 'CANCELLED';
    })
    .sort((a, b) => {
      const dateA = new Date(`${a.showDate}T${a.showTime}`);
      const dateB = new Date(`${b.showDate}T${b.showTime}`);
      return dateA.getTime() - dateB.getTime();
    });

  return futureSchedules.length > 0 ? futureSchedules[0] : null;
}

/**
 * Get the last completed schedule for a show
 */
export function getLastSchedule(show: Show): ShowSchedule | null {
  if (!show.schedules || show.schedules.length === 0) {
    return null;
  }

  const now = new Date();
  const pastSchedules = show.schedules
    .filter(schedule => {
      const scheduleDateTime = new Date(`${schedule.showDate}T${schedule.showTime}`);
      return scheduleDateTime < now;
    })
    .sort((a, b) => {
      const dateA = new Date(`${a.showDate}T${a.showTime}`);
      const dateB = new Date(`${b.showDate}T${b.showTime}`);
      return dateB.getTime() - dateA.getTime(); // Descending order
    });

  return pastSchedules.length > 0 ? pastSchedules[0] : null;
}

/**
 * Determine what the show status should be based on its schedules
 */
export function determineShowStatus(show: Show): ShowStatus {
  // If show is already cancelled or in draft, don't change it
  if (show.status === ShowStatus.CANCELLED || show.status === ShowStatus.DRAFT) {
    return show.status;
  }

  const hasToday = hasTodaySchedules(show);
  const hasFuture = hasFutureSchedules(show);
  const hasPast = hasPastSchedules(show);

  // If there are schedules today, show is ongoing
  if (hasToday) {
    return ShowStatus.ONGOING;
  }

  // If there are future schedules, show is upcoming
  if (hasFuture) {
    return ShowStatus.UPCOMING;
  }

  // If there are past schedules but no future ones, show is completed
  if (hasPast && !hasFuture) {
    return ShowStatus.COMPLETED;
  }

  // Default to upcoming if no schedules exist yet
  return ShowStatus.UPCOMING;
}

/**
 * Check if a show needs status update
 */
export function needsStatusUpdate(show: Show): boolean {
  const currentStatus = show.status;
  const suggestedStatus = determineShowStatus(show);
  
  return currentStatus !== suggestedStatus;
}

/**
 * Get warning message for shows with scheduling issues
 */
export function getScheduleWarning(show: Show): string | null {
  const hasToday = hasTodaySchedules(show);
  const hasFuture = hasFutureSchedules(show);
  const hasPast = hasPastSchedules(show);

  // Show is playing today but no future schedules
  if (hasToday && !hasFuture) {
    return `⚠️ This show is playing today but has no future schedules. Consider adding more dates or updating status to COMPLETED.`;
  }

  // Show has past schedules but no future ones and status is not completed
  if (hasPast && !hasFuture && !hasToday && show.status !== ShowStatus.COMPLETED) {
    return `⚠️ This show has finished all scheduled performances. Status should be updated to COMPLETED.`;
  }

  // Show has no schedules at all
  if (!show.schedules || show.schedules.length === 0) {
    return `⚠️ This show has no scheduled performances. Add schedules to make it available for booking.`;
  }

  // Show is marked as ongoing but has no today's schedules
  if (show.status === ShowStatus.ONGOING && !hasToday && !hasFuture) {
    return `⚠️ Show is marked as ONGOING but has no current or future schedules.`;
  }

  return null;
}

/**
 * Get days until next schedule
 */
export function getDaysUntilNextSchedule(show: Show): number | null {
  const nextSchedule = getNextSchedule(show);
  if (!nextSchedule) {
    return null;
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const scheduleDate = new Date(nextSchedule.showDate);
  const scheduleDateOnly = new Date(scheduleDate.getFullYear(), scheduleDate.getMonth(), scheduleDate.getDate());

  const diffTime = scheduleDateOnly.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
}

/**
 * Get days since last schedule
 */
export function getDaysSinceLastSchedule(show: Show): number | null {
  const lastSchedule = getLastSchedule(show);
  if (!lastSchedule) {
    return null;
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const scheduleDate = new Date(lastSchedule.showDate);
  const scheduleDateOnly = new Date(scheduleDate.getFullYear(), scheduleDate.getMonth(), scheduleDate.getDate());

  const diffTime = today.getTime() - scheduleDateOnly.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
}