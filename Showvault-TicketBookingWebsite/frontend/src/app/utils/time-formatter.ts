/**
 * Utility functions for time formatting
 */

/**
 * Converts time from 12-hour format (e.g., "7:30 PM") to 24-hour format (e.g., "19:30")
 * @param time12h Time in 12-hour format
 * @returns Time in 24-hour format (HH:mm)
 */
export function convert12hTo24h(time12h: string): string {
  if (!time12h) return '';
  
  // If already in 24h format, return as is
  if (time12h.match(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)) {
    return time12h;
  }
  
  try {
    // Parse the 12-hour time format
    const [timePart, modifier] = time12h.split(' ');
    let [hours, minutes] = timePart.split(':');
    
    // Convert hours to 24-hour format
    let hoursNum = parseInt(hours, 10);
    
    if (modifier?.toLowerCase() === 'pm' && hoursNum < 12) {
      hoursNum += 12;
    } else if (modifier?.toLowerCase() === 'am' && hoursNum === 12) {
      hoursNum = 0;
    }
    
    // Format the time in 24-hour format (HH:mm)
    return `${hoursNum.toString().padStart(2, '0')}:${minutes}`;
  } catch (error) {
    console.error('Error converting time format:', error);
    return '';
  }
}

/**
 * Converts time from 24-hour format (e.g., "19:30") to 12-hour format (e.g., "7:30 PM")
 * @param time24h Time in 24-hour format
 * @returns Time in 12-hour format
 */
export function convert24hTo12h(time24h: string): string {
  if (!time24h) return '';
  
  try {
    const [hours, minutes] = time24h.split(':');
    let hoursNum = parseInt(hours, 10);
    const period = hoursNum >= 12 ? 'PM' : 'AM';
    
    // Convert to 12-hour format
    hoursNum = hoursNum % 12;
    hoursNum = hoursNum === 0 ? 12 : hoursNum; // Handle midnight/noon
    
    return `${hoursNum}:${minutes} ${period}`;
  } catch (error) {
    console.error('Error converting time format:', error);
    return '';
  }
}