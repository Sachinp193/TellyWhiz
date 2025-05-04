import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format, parseISO } from "date-fns"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a date string into a readable format
 * @param dateString Date string in ISO format
 * @param formatStr Optional format string (defaults to 'MMM d, yyyy')
 * @returns Formatted date string or 'Unknown' if invalid
 */
export function formatDate(dateString: string | null | undefined, formatStr = 'MMM d, yyyy'): string {
  if (!dateString) return 'Unknown';
  
  try {
    return format(parseISO(dateString), formatStr);
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Unknown';
  }
}

/**
 * Format a year or range of years
 * @param yearString Year string (e.g., "2008-2013" or "2016-Present")
 * @returns Formatted year string or original if valid
 */
export function formatYear(yearString: string | null | undefined): string {
  if (!yearString) return 'Unknown';
  return yearString;
}
