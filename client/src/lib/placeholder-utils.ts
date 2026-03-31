
/**
 * Replaces placeholders in a template with actual values
 * Format: {{placeholder_name}}
 */
export function replacePlaceholders(
  template: string,
  values: Record<string, string>
): string {
  let result = template;
  
  // Replace each placeholder with its value
  Object.entries(values).forEach(([key, value]) => {
    const placeholder = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(placeholder, value || '');
  });
  
  return result;
}

/**
 * Extracts all placeholders from a template
 * Returns an array of placeholder names (without braces)
 */
export function extractPlaceholders(template: string): string[] {
  const regex = /{{(.*?)}}/g;
  const matches = [];
  let match;
  
  while ((match = regex.exec(template)) !== null) {
    matches.push(match[1]);
  }
  
  return [...new Set(matches)]; // Remove duplicates
}

/**
 * Converts a number to words for years (e.g., 2026 -> "Two Thousand Twenty-Six")
 * Ensures proper capitalization for all parts
 */
function numberToYearWords(num: number): string {
  if (num === 0) return 'Zero';
  if (num < 0) return 'Negative ' + numberToYearWords(Math.abs(num));
  
  // Handle years from 1000 to 9999
  if (num >= 1000 && num <= 9999) {
    const thousands = Math.floor(num / 1000);
    const hundreds = Math.floor((num % 1000) / 100);
    const tens = Math.floor((num % 100) / 10);
    const ones = num % 10;
    
    let result = '';
    
    // Convert thousands part
    result += numberToWords(thousands) + ' Thousand';
    
    // Handle the remaining three digits
    const remainder = num % 1000;
    if (remainder > 0) {
      if (remainder < 100) {
        // For numbers like 2026 (remainder 26)
        result += ' ' + numberToWords(remainder);
      } else {
        // For numbers like 1984 (remainder 984)
        result += ' ' + numberToWords(remainder);
      }
    }
    
    return result;
  }
  
  // For other numbers, use the standard converter
  return numberToWords(num);
}

/**
 * Converts a number to words (e.g., 26 -> "Twenty-Six")
 * Ensures proper capitalization for hyphenated parts
 */
function numberToWords(num: number): string {
  if (num === 0) return 'Zero';
  if (num < 0) return 'Negative ' + numberToWords(Math.abs(num));
  
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const thousands = ['', 'Thousand', 'Million', 'Billion'];
  
  let word = '';
  let i = 0;
  
  while (num > 0) {
    if (num % 1000 !== 0) {
      let chunk = num % 1000;
      let chunkWords = '';
      
      if (chunk >= 100) {
        chunkWords += ones[Math.floor(chunk / 100)] + ' Hundred';
        chunk %= 100;
        if (chunk > 0) chunkWords += ' ';
      }
      
      if (chunk >= 20) {
        chunkWords += tens[Math.floor(chunk / 10)];
        chunk %= 10;
        if (chunk > 0) {
          // Capitalize the second part of hyphenated words
          const secondPart = ones[chunk];
          chunkWords += '-' + secondPart;
        }
      } else if (chunk > 0) {
        chunkWords += ones[chunk];
      }
      
      if (i > 0) {
        chunkWords += ' ' + thousands[i];
      }
      
      word = chunkWords + ' ' + word;
    }
    
    num = Math.floor(num / 1000);
    i++;
  }
  
  return word.trim();
}

/**
 * Converts a number to ordinal words (e.g., 19 -> "Nineteenth")
 * Ensures proper capitalization
 */
function numberToOrdinalWords(num: number): string {
  if (num === 0) return 'Zeroth';
  
  // Special cases for ordinals
  const ordinalExceptions: Record<number, string> = {
    1: 'First',
    2: 'Second',
    3: 'Third',
    4: 'Fourth',
    5: 'Fifth',
    6: 'Sixth',
    7: 'Seventh',
    8: 'Eighth',
    9: 'Ninth',
    10: 'Tenth',
    11: 'Eleventh',
    12: 'Twelfth',
    13: 'Thirteenth',
    14: 'Fourteenth',
    15: 'Fifteenth',
    16: 'Sixteenth',
    17: 'Seventeenth',
    18: 'Eighteenth',
    19: 'Nineteenth',
    20: 'Twentieth',
    21: 'Twenty-First',
    22: 'Twenty-Second',
    23: 'Twenty-Third',
    24: 'Twenty-Fourth',
    25: 'Twenty-Fifth',
    26: 'Twenty-Sixth',
    27: 'Twenty-Seventh',
    28: 'Twenty-Eighth',
    29: 'Twenty-Ninth',
    30: 'Thirtieth',
    31: 'Thirty-First'
  };
  
  if (ordinalExceptions[num]) {
    return ordinalExceptions[num];
  }
  
  // For numbers > 31, use cardinal + 'th' (simplified)
  return numberToWords(num) + 'th';
}

/**
 * Safely parses a date string to avoid timezone issues
 * Handles formats: MM/DD/YYYY, YYYY-MM-DD, etc.
 */
function parseDateSafely(dateStr: string): Date {
  // Remove any time information if present
  const cleanDateStr = dateStr.split('T')[0].split(' ')[0];
  
  // Check if it's in MM/DD/YYYY format
  if (cleanDateStr.includes('/')) {
    const [month, day, year] = cleanDateStr.split('/').map(Number);
    // Create date in UTC to avoid timezone shifts
    return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  }
  
  // Check if it's in YYYY-MM-DD format
  if (cleanDateStr.includes('-')) {
    const [year, month, day] = cleanDateStr.split('-').map(Number);
    // Create date in UTC to avoid timezone shifts
    return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  }
  
  // Fallback to regular parsing
  return new Date(dateStr);
}

/**
 * Converts a date to words format with proper handling of timezone issues
 * Day: ordinal (e.g., "Nineteenth")
 * Month: name (e.g., "March")
 * Year: cardinal with proper capitalization (e.g., "Two Thousand Twenty-Six")
 */
export function dateToWords(date: Date | string): {
  day: string;
  month: string;
  year: string;
} {
  // Parse the date safely
  const d = typeof date === 'string' ? parseDateSafely(date) : date;
  
  // Get the day, month, year from the UTC date to avoid timezone issues
  const day = d.getUTCDate();
  const month = d.getUTCMonth();
  const year = d.getUTCFullYear();
  
  // Convert day to ordinal words (e.g., 19 -> "Nineteenth")
  const dayWords = numberToOrdinalWords(day);
  
  // Get month name
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const monthWords = monthNames[month];
  
  // Convert year to words (e.g., 2026 -> "Two Thousand Twenty-Six")
  const yearWords = numberToYearWords(year);
  
  return {
    day: dayWords,
    month: monthWords,
    year: yearWords,
  };
}
