// Interface for non-A141 templates (standard construction contracts)
export interface StandardAIPlaceholderResponse {
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

// Interface for A141-2014 Design-Build Amendment template
export interface A141PlaceholderResponse {
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

// Union type for all placeholder responses
export type AIPlaceholderResponse = StandardAIPlaceholderResponse | A141PlaceholderResponse;

interface UserFormData {
  projectName: string;
  projectNumber: string;
  projectLocation?: string;
  projectDescription?: string;
  budgetAmount: string;
  startDate: string;
  endDate: string;
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
  selectedTemplateName?: string;
}

/**
 * Calls the AI API to generate values for the appropriate placeholder set
 * @param formData - All form data from the contract form
 * @param plainTemplateContent - The HTML template content with placeholders
 * @returns Promise with the AI-generated values for the placeholders
 */
export async function generateAIPlaceholderValues(
  formData: UserFormData,
  plainTemplateContent: string
): Promise<AIPlaceholderResponse> {
  try {
    console.log("formData", formData);
    
    // Determine template type based on name
    const isA141Template = formData.selectedTemplateName === "A141-2014 Design-Build Amendment";
    
    const response = await fetch('/api/contracts/generate-placeholders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        formData,
        plainTemplateContent,
        templateType: isA141Template ? 'a141' : 'standard',
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to generate AI placeholder values');
    }

    const data = await response.json();
    
    // Validate that the response matches the expected template type
    if (isA141Template) {
      // Ensure A141-specific fields are present
      return {
        owner_program: data.owner_program || '',
        owner_design_requirements: data.owner_design_requirements || '',
        project_physical_characteristics: data.project_physical_characteristics || '',
        sustainable_objective: data.sustainable_objective || '',
        incentive_programs: data.incentive_programs || '',
        owner_budget: data.owner_budget || '',
        design_milestone_dates: data.design_milestone_dates || '',
        design_builder_proposal_submission: data.design_builder_proposal_submission || '',
        phased_completion_dates: data.phased_completion_dates || '',
        substantial_completion_date: data.substantial_completion_date || '',
        other_milestone_dates: data.other_milestone_dates || '',
        consultant_name: data.consultant_name || '',
        consultant_address: data.consultant_address || '',
        consultant_status: data.consultant_status || '',
        consultant_info: data.consultant_info || '',
        additional_owner_criteria: data.additional_owner_criteria || '',
        project_manager_name: data.project_manager_name || '',
        project_manager_address: data.project_manager_address || '',
        project_manager_info: data.project_manager_info || '',
        submittal_reviewers: data.submittal_reviewers || '',
        owner_consultants_and_contractors: data.owner_consultants_and_contractors || '',
        design_builder_representative: data.design_builder_representative || '',
        pre_amendment_compensation: data.pre_amendment_compensation || '',
        hourly_billing_rates: data.hourly_billing_rates || '',
      };
    } else {
      // Ensure standard fields are present
      return {
        contractor_fee: data.contractor_fee || '',
        fee_adjustment_method: data.fee_adjustment_method || '',
        subcontractor_profit_limitations: data.subcontractor_profit_limitations || '',
        rental_rate_percent_words: data.rental_rate_percent_words || '',
        rental_rate_percent: data.rental_rate_percent || '',
        unit_price_item_1: data.unit_price_item_1 || '',
        unit_price_limits_1: data.unit_price_limits_1 || '',
        unit_price_value_1: data.unit_price_value_1 || '',
        liquidated_damages: data.liquidated_damages || '',
        other_bonus_provisions: data.other_bonus_provisions || '',
        gmp_words: data.gmp_words || '',
        gmp_amount: data.gmp_amount || '',
        alternate_item_1: data.alternate_item_1 || '',
        alternate_price_1: data.alternate_price_1 || '',
        alternate_conditional_item_1: data.alternate_conditional_item_1 || '',
        alternate_conditional_price_1: data.alternate_conditional_price_1 || '',
        alternate_condition_1: data.alternate_condition_1 || '',
        allowance_item_1: data.allowance_item_1 || '',
        allowance_price_1: data.allowance_price_1 || '',
        gmp_assumptions: data.gmp_assumptions || '',
        off_site_personnel_costs: data.off_site_personnel_costs || '',
      };
    }
  } catch (error) {
    console.error('Error generating AI placeholder values:', error);
    
    // Return empty values based on template type
    const isA141Template = formData.selectedTemplateName === "A141-2014 Design-Build Amendment";
    
    if (isA141Template) {
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
    } else {
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
  }
}