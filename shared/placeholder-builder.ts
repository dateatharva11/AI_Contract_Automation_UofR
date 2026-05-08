/**
 * Shared utility for building placeholder data consistently between client and server
 */

// Type definitions for AI-generated placeholders
export interface StandardPlaceholders {
  contractor_fee: string;
  fee_adjustment_method: string;
  subcontractor_profit_limitations: string;
  rental_rate_percent_words: string;
  rental_rate_percent: string;
  unit_price_item_1: string;
  unit_price_limits_1: string;
  unit_price_value_1: string;
  liquidated_damages: string;
  other_bonus_provisions: string;
  gmp_words: string;
  gmp_amount: string;
  alternate_item_1: string;
  alternate_price_1: string;
  alternate_conditional_item_1: string;
  alternate_conditional_price_1: string;
  alternate_condition_1: string;
  allowance_item_1: string;
  allowance_price_1: string;
  gmp_assumptions: string;
  off_site_personnel_costs: string;
}

export interface A141Placeholders {
  owner_program: string;
  owner_design_requirements: string;
  project_physical_characteristics: string;
  sustainable_objective: string;
  incentive_programs: string;
  owner_budget: string;
  design_milestone_dates: string;
  design_builder_proposal_submission: string;
  phased_completion_dates: string;
  substantial_completion_date: string;
  other_milestone_dates: string;
  consultant_name: string;
  consultant_address: string;
  consultant_status: string;
  consultant_info: string;
  additional_owner_criteria: string;
  project_manager_name: string;
  project_manager_address: string;
  project_manager_info: string;
  submittal_reviewers: string;
  owner_consultants_and_contractors: string;
  design_builder_representative: string;
  pre_amendment_compensation: string;
  hourly_billing_rates: string;
}

/**
 * Converts a number to words for years (e.g., 2026 -> "Two Thousand Twenty-Six")
 */
function numberToYearWords(num: number): string {
  if (num === 0) return 'Zero';
  if (num < 0) return 'Negative ' + numberToYearWords(Math.abs(num));
  
  if (num >= 1000 && num <= 9999) {
    const thousands = Math.floor(num / 1000);
    const remainder = num % 1000;
    
    let result = numberToWords(thousands) + ' Thousand';
    
    if (remainder > 0) {
      if (remainder < 100) {
        result += ' ' + numberToWords(remainder);
      } else {
        result += ' ' + numberToWords(remainder);
      }
    }
    
    return result;
  }
  
  return numberToWords(num);
}

/**
 * Converts a number to words (e.g., 26 -> "Twenty-Six")
 */
function numberToWords(num: number): string {
  if (num === 0) return 'Zero';
  if (num < 0) return 'Negative ' + numberToWords(Math.abs(num));
  
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  
  if (num < 20) return ones[num];
  
  const ten = Math.floor(num / 10);
  const one = num % 10;
  
  if (one === 0) return tens[ten];
  return `${tens[ten]}-${ones[one]}`;
}

/**
 * Converts a number to ordinal words (e.g., 19 -> "Nineteenth")
 */
function numberToOrdinalWords(num: number): string {
  const ordinalExceptions: Record<number, string> = {
    1: 'First', 2: 'Second', 3: 'Third', 4: 'Fourth', 5: 'Fifth',
    6: 'Sixth', 7: 'Seventh', 8: 'Eighth', 9: 'Ninth', 10: 'Tenth',
    11: 'Eleventh', 12: 'Twelfth', 13: 'Thirteenth', 14: 'Fourteenth',
    15: 'Fifteenth', 16: 'Sixteenth', 17: 'Seventeenth', 18: 'Eighteenth',
    19: 'Nineteenth', 20: 'Twentieth', 21: 'Twenty-First', 22: 'Twenty-Second',
    23: 'Twenty-Third', 24: 'Twenty-Fourth', 25: 'Twenty-Fifth', 26: 'Twenty-Sixth',
    27: 'Twenty-Seventh', 28: 'Twenty-Eighth', 29: 'Twenty-Ninth', 30: 'Thirtieth',
    31: 'Thirty-First'
  };
  
  if (ordinalExceptions[num]) return ordinalExceptions[num];
  return numberToWords(num) + 'th';
}

/**
 * Safely parses a date string to avoid timezone issues
 */
function parseDateSafely(dateStr: string): Date {
  const cleanDateStr = dateStr.split('T')[0].split(' ')[0];
  
  if (cleanDateStr.includes('/')) {
    const [month, day, year] = cleanDateStr.split('/').map(Number);
    return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  }
  
  if (cleanDateStr.includes('-')) {
    const [year, month, day] = cleanDateStr.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  }
  
  return new Date(dateStr);
}

/**
 * Converts a date to words format
 */
export function dateToWords(date: Date | string): {
  day: string;
  month: string;
  year: string;
} {
  const d = typeof date === 'string' ? parseDateSafely(date) : date;
  
  const day = d.getUTCDate();
  const month = d.getUTCMonth();
  const year = d.getUTCFullYear();
  
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  return {
    day: numberToOrdinalWords(day),
    month: monthNames[month],
    year: numberToYearWords(year),
  };
}

/**
 * Build placeholder values from form data - matches the shape used in TipTap editor
 */
export function buildPlaceholderValuesFromForm(formData: {
  projectName?: string;
  projectNumber?: string;
  projectLocation?: string;
  projectDescription?: string;
  budgetAmount?: string | number;
  startDate?: string;
  endDate?: string;
  ownerName?: string;
  ownerStatus?: string;
  ownerAddress?: string;
  ownerInfo?: string;
  architectName?: string;
  architectStatus?: string;
  architectAddress?: string;
  architectInfo?: string;
  vendorName?: string;
  vendorStatus?: string;
  vendorAddress?: string;
  vendorInfo?: string;
}): Record<string, string> {
  // Process date
  const startDateObj = formData.startDate ? new Date(formData.startDate) : new Date();
  const dateWordsResult = dateToWords(startDateObj);
  
  // Format vendor info if it contains JSON
  let vendorInfoDisplay = formData.vendorInfo || '';
  try {
    const vendorInfoObj = JSON.parse(vendorInfoDisplay);
    vendorInfoDisplay = Object.entries(vendorInfoObj)
      .map(([key, value]) => `${key}: ${value}`)
      .join(', ');
  } catch {
    // If it's not JSON, use as is
  }
  
  return {
    // Date placeholders (TipTap style)
    start_date_day: dateWordsResult.day,
    start_date_month: dateWordsResult.month,
    start_date_year: dateWordsResult.year,
    
    // Project placeholders
    project_name: formData.projectName || '',
    project_number: formData.projectNumber || '',
    project_location: formData.projectLocation || '',
    project_description: formData.projectDescription || '',
    budget_amount: String(formData.budgetAmount || ''),
    
    // Owner placeholders
    owner_name: formData.ownerName || '',
    owner_status: formData.ownerStatus || '',
    owner_address: formData.ownerAddress || '',
    owner_info: formData.ownerInfo || '',
    
    // Architect placeholders
    architect_name: formData.architectName || '',
    architect_status: formData.architectStatus || '',
    architect_address: formData.architectAddress || '',
    architect_info: formData.architectInfo || '',
    
    // Vendor placeholders
    vendor_name: formData.vendorName || '',
    vendor_status: formData.vendorStatus || '',
    vendor_address: formData.vendorAddress || '',
    vendor_info: vendorInfoDisplay,
    
    // Additional fields that might be needed for DOCX but not in TipTap
    start_date: formData.startDate || '',
    end_date: formData.endDate || '',
  };
}

/**
 * Get empty standard placeholders (for standard templates)
 */
export function getEmptyStandardPlaceholders(): StandardPlaceholders {
  return {
    contractor_fee: '',
    fee_adjustment_method: '',
    subcontractor_profit_limitations: '',
    rental_rate_percent_words: '',
    rental_rate_percent: '',
    unit_price_item_1: '',
    unit_price_limits_1: '',
    unit_price_value_1: '',
    liquidated_damages: '',
    other_bonus_provisions: '',
    gmp_words: '',
    gmp_amount: '',
    alternate_item_1: '',
    alternate_price_1: '',
    alternate_conditional_item_1: '',
    alternate_conditional_price_1: '',
    alternate_condition_1: '',
    allowance_item_1: '',
    allowance_price_1: '',
    gmp_assumptions: '',
    off_site_personnel_costs: '',
  };
}

/**
 * Get empty A141 placeholders (for A141 template)
 */
export function getEmptyA141Placeholders(): A141Placeholders {
  return {
    owner_program: '',
    owner_design_requirements: '',
    project_physical_characteristics: '',
    sustainable_objective: '',
    incentive_programs: '',
    owner_budget: '',
    design_milestone_dates: '',
    design_builder_proposal_submission: '',
    phased_completion_dates: '',
    substantial_completion_date: '',
    other_milestone_dates: '',
    consultant_name: '',
    consultant_address: '',
    consultant_status: '',
    consultant_info: '',
    additional_owner_criteria: '',
    project_manager_name: '',
    project_manager_address: '',
    project_manager_info: '',
    submittal_reviewers: '',
    owner_consultants_and_contractors: '',
    design_builder_representative: '',
    pre_amendment_compensation: '',
    hourly_billing_rates: '',
  };
}

/**
 * Build complete placeholder values including AI-generated content
 * @param formData - The form data from the contract
 * @param aiValues - AI-generated placeholder values (can be partial)
 * @param isA141Template - Whether this is an A141 template
 */
export function buildCompletePlaceholderValues(
  formData: any,
  aiValues?: Partial<StandardPlaceholders & A141Placeholders>,
  isA141Template: boolean = false
): Record<string, string> {
  // Start with base form values
  const basePlaceholders = buildPlaceholderValuesFromForm(formData);
  
  // Add AI-generated values if provided
  if (aiValues) {
    // Merge AI values with base placeholders
    Object.assign(basePlaceholders, aiValues);
  } else if (isA141Template) {
    // If no AI values but it's an A141 template, add empty A141 placeholders
    Object.assign(basePlaceholders, getEmptyA141Placeholders());
  } else {
    // If no AI values and it's a standard template, add empty standard placeholders
    Object.assign(basePlaceholders, getEmptyStandardPlaceholders());
  }
  
  return basePlaceholders;
}

/**
 * Replace placeholders in a template with actual values
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