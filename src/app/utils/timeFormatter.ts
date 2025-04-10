/**
 * Converts time from 24-hour format (HH:MM:SS) to 12-hour format (HH:MM AM/PM)
 * @param time - Time string in 24-hour format (e.g., "09:00:00" or "14:30:00")
 * @returns Time string in 12-hour format (e.g., "9:00 AM" or "2:30 PM")
 */

export function formatTimeTo12Hour(time: string): string {
  if (!time) return '';

  // Extract hours and minutes from the time string
  const [hours, minutes] = time.split(':');
  const hoursNum = parseInt(hours, 10);

  // Determine period (AM/PM)
  const period = hoursNum >= 12 ? 'PM' : 'AM';

  // Convert hours to 12-hour format
  const hours12 = hoursNum % 12 || 12; // 0 should be displayed as 12

  return `${hours12}:${minutes} ${period}`;
}
