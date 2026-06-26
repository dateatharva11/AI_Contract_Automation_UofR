import type { Express, Request, Response } from "express";
import bcrypt from 'bcrypt';
import type { User } from "@shared/schema";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { generateEmbedding } from "./vector/embeddings";
import { getContractContext } from "./vector/search";
import dotenv from 'dotenv';
import { generateDocxFromTemplate } from './services/docx-generator';
import { 
  buildCompletePlaceholderValues, 
  buildPlaceholderValuesFromForm,
  getEmptyStandardPlaceholders,
  getEmptyA141Placeholders 
} from '@shared/placeholder-builder';
import { supabase } from "./supabase";
import { generatePdfFromDocx } from './services/pdf-generator-libreoffice';
import multer from 'multer';
import { mergePdfs, downloadExhibitFromStorage } from './services/pdf-merger';
import { adminActivityQuerySchema } from "@shared/schema";

const upload = multer({ storage: multer.memoryStorage() });

dotenv.config();

function normalizeRole(role: string): string {
  if (role === "admin") return "contract_manager";
  return role;
}

function sanitizeUser(user: User) {
  const { password, ...safe } = user;
  return { ...safe, role: normalizeRole(safe.role) };
}

function requireSessionUserId(req: Request): number | null {
  return (req.session as any)?.userId ?? null;
}

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_STUDIO_API_KEY || '');

// Add type definition for the response (remove it later)
interface AIPlaceholderResponse {
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
  gmp_words: string;                      // Apply any formula to GMP amount later with respect to project budget
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

function buildA141Prompt(formData: any, plainTemplateContent: string, context: string): string {
  return `
  You are a legal contract assistant specializing in AIA documents. Your task is to generate realistic and appropriate content for specific placeholders in a construction contract.

  Contract Template:
  ${plainTemplateContent}

  User Form Data (JSON):
  ${JSON.stringify(formData, null, 2)}

  ${context ? `Historical Contract Examples (from similar past projects):
  ${context}` : 'No similar historical contracts found. Use your best judgment based on the project details.'}

  Your Goal: Analyze the provided information and generate a JSON object containing values for the following placeholders. Be realistic and consistent with the project size and complexity.

  Placeholders to populate with appropriate instructions for each one:

  1. owner_program:
    - Describe the Owner's program for the Project. This can be a high-level description of the project's purpose, functional requirements, and goals.
    - For a project like a office renovation, this might include: "See attached Project Program Exhibit E. The Project Program outlines 45,000 SF of Class A office space with open floor plan, 12 conference rooms, 2 kitchenettes, and collaborative zones. Program includes LEED Silver certification requirements, energy efficiency targets (15% below ASHRAE 90.1), and occupancy schedule requiring phased completion to maintain tenant operations during construction."
    - Be concise but descriptive. The output should be a paragraph or short list suitable for inserting into a contract.

  2. owner_design_requirements:
    - Identify or describe the documentation containing the Owner's design requirements.
    - Example: "See Project Program Exhibit E."
    - Be concise. The output should be a short paragraph.

  3. project_physical_characteristics:
    - Identify or describe physical characteristics such as size, location, geotechnical reports, utility availability, etc.
    - Example: "See attached Project Program Exhibit E."

  4. sustainable_objective:
    - State the Owner's anticipated Sustainable Objective, if any.
    - Example: "LEED Silver certification is the Owner's Sustainable Objective. The Design-Builder shall incorporate sustainable design principles, including energy efficiency, water conservation, and the use of recycled materials, to achieve this certification. AIA Document A141-2014, Exhibit C, Sustainable Projects, is incorporated into this Agreement."
    - If none, state: "N/A"

  5. incentive_programs:
    - Identify any incentive programs the Owner intends to pursue.
    - Example: "The Owner intends to pursue energy efficiency incentives from the New York State Energy Research and Development Authority (NYSERDA). The Design-Builder shall assist in preparing and submitting all necessary applications. Deadline for application is 30 days after Substantial Completion."
    - If none, state: "N/A"

  6. owner_budget:
    - Based on the project's budget amount.
    - Provide the Owner's budget for Design Services and Construction Work.
    - Example: "$18,500,000.00"

  7. design_milestone_dates:
    - Provide a concise summary of the design phase milestone dates. Use "N/A" if none.
    - Example: "Schematic Design: 05/15/25; Design Development: 07/15/25; Construction Documents: 09/15/25"

  8. design_builder_proposal_submission:
    - Provide dates for the submission of the Design-Builder's Proposal. Use "N/A" if none.
    - Example: "GMP Proposal: 10/01/25; Final Design-Build Amendment: 10/15/25"

  9. phased_completion_dates:
    - State any phased completion dates. Use "N/A" if none.
    - Example: "Phase 1 (Floor 12): 02/15/26; Phase 2 (Floor 13): 04/15/26; Phase 3 (Floors 14-15): 06/15/26"

  10. substantial_completion_date:
    - State the target date for Substantial Completion.
    - Example: "06/15/2026"

  11. other_milestone_dates:
    - State any other milestone dates.
    - Example: "Tenant Occupancy Floor 12: 03/01/26; Final Punch List: 06/30/26; Final Completion: 07/15/26"

  12. consultant_name, consultant_address, consultant_status, consultant_info:
    - Populate these with the primary engineering consultants' information. For multiple, list them in a single field with line breaks.
    - Example: "Engineering Design Collaborative", "500 Woodward Avenue, Suite 300, Detroit, MI 48226", "Professional Corporation", "License #: PE-78901 | Mechanical, Electrical, Plumbing, Structural Engineering | Contact: Sarah Chen, PE | schen@edc.com"

  13. additional_owner_criteria:
    - List any special characteristics or needs not identified elsewhere.
    - Example: "(1) All work to be performed during off-hours (6pm-6am) to maintain tenant operations; (2) Security protocols required for after-hours access; (3) Elevator protection and dedicated construction elevator required; (4) Asbestos abatement required prior to demolition; (5) Historic preservation requirements: exterior facade modifications prohibited."

  14. project_manager_name, project_manager_address, project_manager_info:
    - Populate with the Owner's Project Manager information.
    - Example: "Brandon Gross - PPM", "3000 John R Street, Detroit, MI 48201", "Owner's Project Manager"

  15. submittal_reviewers:
    - List any entities in addition to the Owner's Project Manager who review submittals.
    - Example: "None other than Owner's Project Manager"

  16. owner_consultants_and_contractors:
    - List the consultants and separate contractors the Owner will retain.
    - Example: "TBD as needed"

  17. design_builder_representative:
    - Identify the Design-Builder's representative.
    - Example: "Michael Turner, AIA - Lead Designer; Robert Williams - Construction Superintendent"

  18. pre_amendment_compensation:
    - Based on the project's budget amount.
    - State the compensation for work performed prior to the Design-Build Amendment.
    - Example: "Design Services Stipulated Sum: $385,000"

  19. hourly_billing_rates:
    - Provide a summary of the hourly billing rates for key personnel.
    - Format as a clear list. Based on the sample, this could be detailed.
    - Example: "Design-Builder Principal: $185/hr; Senior Project Manager: $145/hr; Senior Architect: $135/hr; Project Architect: $115/hr; Interior Designer: $105/hr; Mechanical Engineer: $125/hr; Electrical Engineer: $125/hr; Structural Engineer: $130/hr; Project Engineer: $85/hr; CAD Technician: $65/hr; Construction Superintendent: $95/hr; Project Coordinator: $65/hr"

  Output Format: Respond only with a valid JSON object. Do not include any explanatory text, introductions, or markdown formatting.

  Example Output:
  {
    "owner_program": "See attached Project Program Exhibit E. The Project Program outlines 45,000 SF of Class A office space with open floor plan, 12 conference rooms, 2 kitchenettes, and collaborative zones. Program includes LEED Silver certification requirements, energy efficiency targets (15% below ASHRAE 90.1), and occupancy schedule requiring phased completion to maintain tenant operations during construction.",
    "owner_design_requirements": "See Project Program Exhibit E.",
    "project_physical_characteristics": "See Project Program Exhibit E.",
    "sustainable_objective": "LEED Silver certification is the Owner's Sustainable Objective. The Design-Builder shall incorporate sustainable design principles, including energy efficiency, water conservation, and the use of recycled materials, to achieve this certification. AIA Document A141-2014, Exhibit C, Sustainable Projects, is incorporated into this Agreement.",
    "incentive_programs": "The Owner intends to pursue energy efficiency incentives from the New York State Energy Research and Development Authority (NYSERDA). The Design-Builder shall assist in preparing and submitting all necessary applications. Deadline for application is 30 days after Substantial Completion.",
    "owner_budget": "$18,500,000.00",
    "design_milestone_dates": "Schematic Design: 05/15/25; Design Development: 07/15/25; Construction Documents: 09/15/25",
    "design_builder_proposal_submission": "GMP Proposal: 10/01/25; Final Design-Build Amendment: 10/15/25",
    "phased_completion_dates": "Phase 1 (Floor 12): 02/15/26; Phase 2 (Floor 13): 04/15/26; Phase 3 (Floors 14-15): 06/15/26",
    "substantial_completion_date": "06/15/2026",
    "other_milestone_dates": "Tenant Occupancy Floor 12: 03/01/26; Final Punch List: 06/30/26; Final Completion: 07/15/26",
    "consultant_name": "Engineering Design Collaborative",
    "consultant_address": "500 Woodward Avenue, Suite 300, Detroit, MI 48226",
    "consultant_status": "Professional Corporation",
    "consultant_info": "License #: PE-78901 | Mechanical, Electrical, Plumbing, Structural Engineering | Contact: Sarah Chen, PE | schen@edc.com",
    "additional_owner_criteria": "(1) All work to be performed during off-hours (6pm-6am) to maintain tenant operations; (2) Security protocols required for after-hours access; (3) Elevator protection and dedicated construction elevator required; (4) Asbestos abatement required prior to demolition; (5) Historic preservation requirements: exterior facade modifications prohibited.",
    "project_manager_name": "Brandon Gross - PPM",
    "project_manager_address": "3000 John R Street, Detroit, MI 48201",
    "project_manager_info": "Owner's Project Manager",
    "submittal_reviewers": "None other than Owner's Project Manager",
    "owner_consultants_and_contractors": "TBD as needed",
    "design_builder_representative": "Michael Turner, AIA - Lead Designer; Robert Williams - Construction Superintendent",
    "pre_amendment_compensation": "Design Services Stipulated Sum: $385,000",
    "hourly_billing_rates": "Design-Builder Principal: $185/hr; Senior Project Manager: $145/hr; Senior Architect: $135/hr; Project Architect: $115/hr; Interior Designer: $105/hr; Mechanical Engineer: $125/hr; Electrical Engineer: $125/hr; Structural Engineer: $130/hr; Project Engineer: $85/hr; CAD Technician: $65/hr; Construction Superintendent: $95/hr; Project Coordinator: $65/hr",
  }
  `;
}

function buildStandardPrompt(formData: any, plainTemplateContent: string, context: string): string {
  return `
  You are a legal contract assistant specializing in AIA documents. Your task is to generate realistic and appropriate content for specific placeholders in a construction contract.

  Contract Template:
  ${plainTemplateContent}

  User Form Data (JSON):
  ${JSON.stringify(formData, null, 2)}

  ${context ? `Historical Contract Examples (from similar past projects):
  ${context}` : 'No similar historical contracts found. Use your best judgment based on the project details.'}

  Your Goal: Analyze the provided information and generate a JSON object containing values for the following placeholders. Be realistic and consistent with the project size and complexity.

  Placeholders to populate with appropriate instructions for each one:

  1. contractor_fee: 
    - This can be a lump sum (e.g., "$150,000"), a percentage of the Cost of the Work (e.g., "5% of the Cost of the Work"), or another brief, standard arrangement.
    - Be concise. The output should be a short string suitable for inserting into a contract.

  2. fee_adjustment_method: 
    - Typically something like this: "For changes in the Work, the Contractor's Fee shall be adjusted by applying the same percentage to the net cost of the Change Order work."
    - Be concise. The output should be a short string suitable for inserting into a contract.

  3. subcontractor_profit_limitations:
    - Usually something like this: "Subcontractor overhead and profit for changes shall not exceed 15% combined (10% overhead + 5% profit)."
    - Be concise. The output should be a short string suitable for inserting into a contract.

  4. rental_rate_percent_words and rental_rate_percent:
    - Common percentages: 70-85%
    - Example: "eighty" and "80" or "seventy-five" and "75"

  5. unit_price_item_1, unit_price_limits_1, unit_price_value_1:
    - Create one relevant unit price item based on project type
    - Examples: "Additional electrical outlets", "Additional square feet of drywall", "Linear feet of data cabling"
    - Include quantity limits
    - Price per unit should be reasonable (e.g., $275, $85, $45)

  6. liquidated_damages:
    - Format: "$X per calendar day for delay in achieving Substantial Completion beyond the guaranteed completion date, up to a maximum of X% of the Contract Sum"
    - Common rates: $1,000-$5,000 per day, maximum 5-10% of contract sum
    - Adjust based on project size

  7. other_bonus_provisions:
    - Early completion bonus and/or cost savings incentive
    - Example: "Early completion bonus of $5,000 per day for each day Substantial Completion is achieved prior to the guaranteed completion date, up to a maximum of $75,000. Cost savings incentive: 50% of any savings below the Guaranteed Maximum Price shall be shared with Contractor, up to $100,000."
    - Be concise. The output should be a short string suitable for inserting into a contract.

  8. gmp_words and gmp_amount:
    - Guaranteed Maximum Price amount (typically budget + 5-10% contingency)
    - gmp_words: amount in words (e.g., "Four Million Two Hundred Fifty Thousand and 00/100 Dollars")
    - gmp_amount: numeric with formatting (e.g., "4,250,000.00")

  9. alternate_item_1 and alternate_price_1:
    - Create one alternate item that could be added to the project
    - Example: "Premium acoustic ceiling system", "High-end millwork package"
    - Price should be realistic (e.g., "$45,000", "$95,000")

  10. alternate_conditional_item_1, alternate_conditional_price_1, alternate_condition_1:
    - Create one conditional alternate
    - Include a realistic condition for acceptance
    - Example: "Green roof access terrace", "$185,000", "Owner to obtain additional financing approval; must be exercised within 60 days"

  11. allowance_item_1 and allowance_price_1:
    - Create one allowance item
    - Examples: "Furniture allowance", "Audio/visual equipment"
    - Price should be reasonable percentage of budget (e.g., "$350,000", "$125,000")

  12. gmp_assumptions:
    - List 5-6 realistic assumptions upon which the GMP is based
    - Include: site conditions, permitting, access, existing conditions, etc.
    - Format as numbered list

  13. off_site_personnel_costs:
    - Identify plausible types of supervisory or administrative personnel who might work off-site.
    - Propose a brief description of their allowed activities and, optionally, a percentage of their time allocated to the project.
    - The output should be a clear, narrative sentence or two.

  Output Format: Respond only with a valid JSON object. Do not include any explanatory text, introductions, or markdown formatting.

  Example Output:
  {
    "contractor_fee": "6% of the Cost of the Work",
    "fee_adjustment_method": "For changes in the Work, the Contractor's Fee shall be adjusted by applying the same percentage (6.5%) to the net cost of the Change Order work.",
    "subcontractor_profit_limitations": "Subcontractor overhead and profit for changes shall not exceed 15% combined (10% overhead + 5% profit) on the net cost of change order work.",
    "rental_rate_percent_words": "eighty",
    "rental_rate_percent": "80%",
    "unit_price_item_1": "Additional electrical outlets (beyond specified quantity)",
    "unit_price_limits_1": "Minimum 10 outlets; maximum 50 outlets",
    "unit_price_value_1": "$275.00",
    "liquidated_damages": "$2,500 per calendar day for delay in achieving Substantial Completion beyond the guaranteed completion date, up to a maximum of 10% of the Guaranteed Maximum Price.",
    "other_bonus_provisions": "Early completion bonus of $5,000 per day for each day Substantial Completion is achieved prior to the guaranteed completion date, up to a maximum of $75,000. Cost savings incentive: 50% of any savings below the Guaranteed Maximum Price (excluding approved Change Orders) shall be shared with Contractor, up to $100,000.",
    "gmp_words": "Four Million Two Hundred Fifty Thousand and 00/100 Dollars",
    "gmp_amount": "4,250,000.00",
    "alternate_item_1": "Premium acoustic ceiling system (upgrade from standard)",
    "alternate_price_1": "$45,000",
    "alternate_conditional_item_1": "Green roof access terrace",
    "alternate_conditional_price_1": "$185,000",
    "alternate_condition_1": "Owner to obtain additional financing approval; must be exercised within 60 days of Substantial Completion of core work",
    "allowance_item_1": "Furniture allowance (Owner-furnished, Contractor-installed)",
    "allowance_price_1": "$350,000",
    "gmp_assumptions": "1) Existing structure is sound and requires no remediation beyond normal repairs; 2) Hazardous materials (asbestos, lead) are not present in areas of work; 3) Owner will provide 24/7 access to floors; 4) All necessary permits can be obtained within 45 days of application; 5) No work required during normal business hours (8am-6pm Monday-Friday); 6) Elevator availability for material transport during off-hours",
    "off_site_personnel_costs": "Project Executive (25% time) for strategic oversight; Senior Estimator (50% time) for bid package preparation.",
  }
  `;
}

function buildA101Prompt(formData: any, plainTemplateContent: string, context: string): string {
  return `
  You are a legal contract assistant specializing in AIA documents. Your task is to generate realistic and appropriate content for specific placeholders in an AIA A101-2017 Standard Form of Agreement Between Owner and Contractor (Lump Sum).

  Contract Template:
  ${plainTemplateContent}

  User Form Data (JSON):
  ${JSON.stringify(formData, null, 2)}

  ${context ? `Historical Contract Examples (from similar past projects):
  ${context}` : 'No similar historical contracts found. Use your best judgment based on the project details.'}

  Your Goal: Analyze the provided information and generate a JSON object containing values for the following placeholders. Be realistic and consistent with the project size and complexity.

  Placeholders to populate with appropriate instructions for each one:

  1. retainage, items_no_retainage, retainage_provisions:
    - Standard retainage percentage (typically 5% or 10%)
    - Example: "Five (5%) percent of each Application for Payment until final payment is properly due pursuant to the terms of this Agreement."
    - Default values for items_no_retainage: "N/A" and retainage_provisions: "N/A"

  2. release_of_retainage:
    - Describes when retainage will be released
    - Example: "Five (5%) of the remaining Contract Sum shall be held as retainage until final payment is properly due pursuant to this Agreement."

  3. interest_rate:
    - Interest rate for late payments (typically 6-10% per annum)
    - Example: "Six percent per annum (6%)"
  
  4. termination_amount:
    - Amount for the termination of the contract
    - Default value: "N/A"

  5. portion_of_work:
    - Description of work portion for phased completions
    - Example: "Phase 1 - Site Preparation and Foundations"

  6. completion_date:
    - Project end date should be used for this placeholder. Format: MM/DD/YYYY
    - Example: "10/15/2025"

  7. liquidated_damages:
    - Amount for the damages or delays
    - Format: "The Contractor acknowledges that Owner will incur severe harm and damages if the Work is not timely completed.  The Contractor agrees that the Owner’s damages under such circumstances will likely be difficult to precisely calculate.  Accordingly, without limiting any other remedies available to Owner at law or equity, the Contractor agrees that the Owner shall be entitled to liquidated damages from Contractor (to be paid by Contractor upon Owner’s demand, or at Owner’s election, to be deducted from any unpaid amounts due the Contractor on the Contract Sum) in the amount of XXXXX ($XXX.00) for each day commencing on the day after the scheduled date of Substantial Completion set forth herein as may hereafter be amended by duly executed Change Orders and continuing in effect until Substantial Completion has been achieved.  The Contractor acknowledges that said liquidated damages are a fair and reasonable approximation of Owner’s damages in the event of such delayed completion and are not penal in nature.  The foregoing liquidated damages shall not apply to the extent that the delay in reaching Substantial Completion is caused by events of force majeure not within the reasonable control of the Contractor"
    - Common amount to be filled in place of XXXXX $(XXX.00) in the range of $500-$2,500. Example: "One Thousand Five Hundred Dollars ($1,500.00)"

  8. other_bonus_provisions:
    - Other bonuses or incentives
    - Example: "If the Contractor is authorized by the Owner to perform any Work on an hourly rate basis, the Contractor’s hourly rates shall be as set forth in Exhibit D attached hereto."

  9. alternate_item_1 and alternate_price_1:
    - One firm alternate item that could be added to the project
    - Example: "Premium flooring upgrade", "$35,000"

  10. alternate_conditional_item_1, alternate_conditional_price_1, alternate_condition_1:
    - One conditional alternate with acceptance condition
    - Example: "Solar panel array", "$125,000", "Owner to obtain additional financing approval; must be exercised within 45 days of Contract execution"

  11. allowance_item_1 and allowance_price_1:
    - One allowance item
    - Example: "Interior furnishings allowance", "$75,000"

  12. unit_price_item_1, unit_price_limits_1, unit_price_value_1:
    - One unit price work item
    - Example: "Additional electrical outlets", "Up to 50 additional outlets", "$275 each"

  13. doc_1, doc_2, doc_3, commencement_date:
    - Three options for selecting a date of commencement. Only one of the three options should be selected.
    - Default should be "X", " ", " ", " " for doc_1, doc_2, doc_3, commencement_date respectively.
    - If doc_2 = X or doc_3 = X, then commencement_date should be the same as the project start date.
    - Example: "X", " ", " ", " " if doc_1 is "X"
    - Example: " ", "X", " ", "10/15/2025" if doc_2 is "X"
    - Example: " ", " ", "X", "10/15/2025" if doc_3 is "X"

  15. bdr_1, bdr_2, bdr_3, bdr_other:
    - Three options for selecting a Binding Dispute Resolution item. Only one of the three options should be selected.
    - Default should be " ", "X", " ", " " for bdr_1, bdr_2, bdr_3, bdr_other respectively.
    - If bdr_2 = X, then bdr_1 and bdr_3 should be " ".
    - If bdr_3 = X, then bdr_1 and bdr_2 should be " " and bdr_other should be specified.
    - Example: "X", " ", " ", " " if bdr_1 is "X".
    - Example: " ", "X", " ", " " if bdr_2 is "X".
    - Example: " ", " ", "X", "Binding Dispute Resolution by Arbitration" if bdr_3 is "X".

  Output Format: Respond only with a valid JSON object. Do not include any explanatory text, introductions, or markdown formatting.

  Example Output:
  {
    "alternate_item_1": "Premium flooring upgrade",
    "alternate_price_1": "$35,000",
    "alternate_conditional_item_1": "Solar panel array",
    "alternate_conditional_price_1": "$125,000",
    "alternate_condition_1": "Owner to obtain additional financing approval; must be exercised within 45 days of Contract execution",
    "allowance_item_1": "Interior furnishings allowance",
    "allowance_price_1": "$75,000",
    "unit_price_item_1": "Additional electrical outlets",
    "unit_price_limits_1": "Up to 50 additional outlets",
    "unit_price_value_1": "$275 each",
    "retainage": "Five (5%) percent of each Application for Payment until final payment is properly due pursuant to the terms of this Agreement.",
    "items_no_retainage": "N/A",
    "retainage_provisions": "N/A",
    "release_of_retainage": "Five (5%) of the remaining Contract Sum shall be held as retainage until final payment is properly due pursuant to this Agreement.",
    "interest_rate": "Six percent per annum (6%)",
    "termination_amount": "N/A",
    "portion_of_work": "Phase 1 - Site Preparation and Foundations",
    "completion_date": "10/15/2025",
    "liquidated_damages": "The Contractor acknowledges that Owner will incur severe harm and damages if the Work is not timely completed.  The Contractor agrees that the Owner’s damages under such circumstances will likely be difficult to precisely calculate.  Accordingly, without limiting any other remedies available to Owner at law or equity, the Contractor agrees that the Owner shall be entitled to liquidated damages from Contractor (to be paid by Contractor upon Owner’s demand, or at Owner’s election, to be deducted from any unpaid amounts due the Contractor on the Contract Sum) in the amount of XXXXX ($XXX.00) for each day commencing on the day after the scheduled date of Substantial Completion set forth herein as may hereafter be amended by duly executed Change Orders and continuing in effect until Substantial Completion has been achieved.  The Contractor acknowledges that said liquidated damages are a fair and reasonable approximation of Owner’s damages in the event of such delayed completion and are not penal in nature.  The foregoing liquidated damages shall not apply to the extent that the delay in reaching Substantial Completion is caused by events of force majeure not within the reasonable control of the Contractor",
    "other_bonus_provisions": "If the Contractor is authorized by the Owner to perform any Work on an hourly rate basis, the Contractor’s hourly rates shall be as set forth in Exhibit D attached hereto.",
    "doc_1": " X ",
    "doc_2": "  ",
    "doc_3": "  ",
    "commencement_date": "  ",
    "bdr_1": "  ",
    "bdr_2": " X ",
    "bdr_3": "  ",
    "bdr_other": "  "
  }
  `;
}

function getEmptyResponse(isA101OrA141: boolean | string): any {
  // Check if it's A101 or A141
  const isA101 = isA101OrA141 === 'a101' || isA101OrA141 === true;
  const isA141 = isA101OrA141 === 'a141';
  
  if (isA101) {
    return {
      contract_words: '',
      contract_amount: '',
      alternate_item_1: '',
      alternate_price_1: '',
      alternate_conditional_item_1: '',
      alternate_conditional_price_1: '',
      alternate_condition_1: '',
      allowance_item_1: '',
      allowance_price_1: '',
      unit_price_item_1: '',
      unit_price_limits_1: '',
      unit_price_value_1: '',
      retainage: '',
      items_no_retainage: '',
      retainage_provisions: '',
      release_of_retainage: '',
      interest_rate: '',
      termination_amount: '',
      portion_of_work: '',
      completion_date: '',
      liquidated_damages: '',
      other_bonus_provisions: '',
      doc_1: 'X',
      doc_2: '',
      doc_3: '',
      commencement_date: '',
      bdr_1: '',
      bdr_2: 'X',
      bdr_3: '',
      bdr_other: '',
    };
  } else if (isA141) {
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

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  // await seedDatabase();

  async function requireContractManager(req: Request): Promise<User | null> {
    const userId = requireSessionUserId(req);
    if (!userId) return null;
    const user = await storage.getUser(userId);
    if (!user) return null;
    const role = normalizeRole(user.role);
    if (role !== "contract_manager") return null;
    return user;
  }

  // Admin Activity endpoint
  app.get("/api/admin/activity", async (req, res) => {
    try {
      const admin = await requireContractManager(req);
      if (!admin) {
        return res.status(403).json({ message: "Forbidden - Contract manager access required" });
      }

      // Parse and validate query parameters
      const query = adminActivityQuerySchema.parse({
        userIds: req.query.userIds,
        actions: req.query.actions,
        search: req.query.search,
        dateFrom: req.query.dateFrom,
        dateTo: req.query.dateTo,
        sortBy: req.query.sortBy || 'createdAt',
        sortOrder: req.query.sortOrder || 'desc',
        page: parseInt(req.query.page as string) || 1,
        pageSize: parseInt(req.query.pageSize as string) || 25,
      });

      const offset = (query.page - 1) * query.pageSize;

      const result = await storage.getAuditLogs({
        userIds: query.userIds,
        actions: query.actions,
        search: query.search,
        dateFrom: query.dateFrom,
        dateTo: query.dateTo,
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
        limit: query.pageSize,
        offset,
      });

      res.json({
        items: result.items,
        total: result.total,
        page: query.page,
        pageSize: query.pageSize,
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      console.error('Error fetching admin activity:', err);
      res.status(500).json({ message: 'Failed to fetch activity logs' });
    }
  });


  // --- Auth Routes ---
  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }
    
    const users = await storage.getUsers();
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }
    
    // Compare provided password with stored hash
    const isValidPassword = await bcrypt.compare(password, user.password);
    
    if (!isValidPassword) {
      return res.status(401).json({ message: "Invalid email or password" });
    }
    
    // Update login timestamps
    const now = new Date();
    await storage.updateUser(user.id, {
      lastLoginAt: now,
      lastActiveAt: now,
    });
    
    req.session.userId = user.id;
    
    // Return user with timestamp fields
    const userWithTimestamps = {
      ...sanitizeUser(user),
      lastLoginAt: now,
      lastActiveAt: now,
    };
    
    return res.json(userWithTimestamps);
  });

  app.get("/api/auth/me", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const user = await storage.getUser(req.session.userId);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }
    return res.json(sanitizeUser(user));
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.clearCookie("connect.sid"); 
      return res.json({ success: true });
    });
  });

  app.get(api.users.meActivity.path, async (req, res) => {
    const userId = requireSessionUserId(req);
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    const limit = Math.min(Number(req.query.limit) || 20, 50);
    const activity = await storage.getAuditLogsByUser(userId, limit);
    res.json(activity);
  });

  // Users
  app.get(api.users.list.path, async (req, res) => {
    const admin = await requireContractManager(req);
    if (!admin) {
      return res.status(403).json({ message: "Forbidden" });
    }
    
    const users = await storage.getUsers();
    res.json(users.map(sanitizeUser));
  });

  // Vendors
  app.get(api.vendors.list.path, async (req, res) => {
    const vendors = await storage.getVendors();
    res.json(vendors);
  });
  
  app.get(api.vendors.get.path, async (req, res) => {
    const vendor = await storage.getVendor(Number(req.params.id));
    if (!vendor) return res.status(404).json({ message: 'Vendor not found' });
    res.json(vendor);
  });

  app.post(api.vendors.create.path, async (req, res) => {
    try {
      const input = api.vendors.create.input.parse(req.body);
      const vendor = await storage.createVendor(input);
      res.status(201).json(vendor);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      throw err;
    }
  });

  app.put(api.vendors.update.path, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const existing = await storage.getVendor(id);
      if (!existing) {
        return res.status(404).json({ message: 'Vendor not found' });
      }
      
      const input = api.vendors.update.input.parse(req.body);
      const updated = await storage.updateVendor(id, input);
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      throw err;
    }
  });    

  app.delete(api.vendors.delete.path, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const existing = await storage.getVendor(id);
      if (!existing) {
        return res.status(404).json({ message: 'Vendor not found' });
      }
      
      // Check if vendor is used in any contracts
      const contracts = await storage.getContracts();
      const isVendorInUse = contracts.some(c => c.vendorId === id);
      
      if (isVendorInUse) {
        return res.status(400).json({ 
          message: 'Cannot delete vendor because they are associated with existing contracts. Consider marking them as inactive instead.' 
        });
      }
      
      await storage.deleteVendor(id);
      res.json({ success: true, message: 'Vendor deleted successfully' });
    } catch (err) {
      console.error('Error deleting vendor:', err);
      res.status(500).json({ message: 'Failed to delete vendor' });
    }
  });

  // Owners
  app.get(api.owners.list.path, async (req, res) => {
    const owners = await storage.getOwners();
    res.json(owners);
  });

  app.get(api.owners.get.path, async (req, res) => {
    const owner = await storage.getOwner(Number(req.params.id));
    if (!owner) return res.status(404).json({ message: 'Owner not found' });
    res.json(owner);
  });

  app.post(api.owners.create.path, async (req, res) => {
    try {
      const input = api.owners.create.input.parse(req.body);
      const owner = await storage.createOwner(input);
      res.status(201).json(owner);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      throw err;
    }
  });

  app.put(api.owners.update.path, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const existing = await storage.getOwner(id);
      if (!existing) {
        return res.status(404).json({ message: 'Owner not found' });
      }
      
      const input = api.owners.update.input.parse(req.body);
      const updated = await storage.updateOwner(id, input);
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      throw err;
    }
  });  

  app.delete(api.owners.delete.path, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const existing = await storage.getOwner(id);
      if (!existing) {
        return res.status(404).json({ message: 'Owner not found' });
      }
      
      // Check if owner is used in any contracts
      const contracts = await storage.getContracts();
      // Note: You may need to add ownerId to contracts table or check in contract data
      // For now, we'll just check if owner name appears in contract ownerName field
      const isOwnerInUse = contracts.some(c => c.ownerName === existing.name);
      
      if (isOwnerInUse) {
        return res.status(400).json({ 
          message: 'Cannot delete owner because they are associated with existing contracts. Consider marking them as inactive instead.' 
        });
      }
      
      await storage.deleteOwner(id);
      res.json({ success: true, message: 'Owner deleted successfully' });
    } catch (err) {
      console.error('Error deleting owner:', err);
      res.status(500).json({ message: 'Failed to delete owner' });
    }
  });

  // Architects
  app.get(api.architects.list.path, async (req, res) => {
    const architects = await storage.getArchitects();
    res.json(architects);
  });

  app.get(api.architects.get.path, async (req, res) => {
    const architect = await storage.getArchitect(Number(req.params.id));
    if (!architect) return res.status(404).json({ message: 'Architect not found' });
    res.json(architect);
  });

  app.post(api.architects.create.path, async (req, res) => {
    try {
      const input = api.architects.create.input.parse(req.body);
      const architect = await storage.createArchitect(input);
      res.status(201).json(architect);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      throw err;
    }
  });

  app.put(api.architects.update.path, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const existing = await storage.getArchitect(id);
      if (!existing) {
        return res.status(404).json({ message: 'Architect not found' });
      }
      
      const input = api.architects.update.input.parse(req.body);
      const updated = await storage.updateArchitect(id, input);
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      throw err;
    }
  });

  app.delete(api.architects.delete.path, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const existing = await storage.getArchitect(id);
      if (!existing) {
        return res.status(404).json({ message: 'Architect not found' });
      }
      
      // Check if architect is used in any contracts
      const contracts = await storage.getContracts();
      // Note: You may need to add architectId to contracts table or check in contract data
      const isArchitectInUse = contracts.some(c => c.architectName === existing.name);
      
      if (isArchitectInUse) {
        return res.status(400).json({ 
          message: 'Cannot delete architect because they are associated with existing contracts. Consider marking them as inactive instead.' 
        });
      }
      
      await storage.deleteArchitect(id);
      res.json({ success: true, message: 'Architect deleted successfully' });
    } catch (err) {
      console.error('Error deleting architect:', err);
      res.status(500).json({ message: 'Failed to delete architect' });
    }
  });

  // Contracts
  app.get(api.contracts.list.path, async (req, res) => {
    const contracts = await storage.getContracts();
    res.json(contracts);
  });

  app.get(api.contracts.get.path, async (req, res) => {
    const contract = await storage.getContract(Number(req.params.id));
    if (!contract) return res.status(404).json({ message: 'Contract not found' });
    res.json(contract);
  });

  app.get('/api/contracts/:id/download-docx', async (req, res) => {
    try {
      const contractId = Number(req.params.id);
      const contract = await storage.getContract(contractId);
      
      if (!contract) {
        return res.status(404).json({ message: 'Contract not found' });
      }
      
      if (!contract.contract_docx_url) {
        return res.status(404).json({ message: 'DOCX file not found for this contract' });
      }
      
      // The stored value is just the filename
      let filePath = contract.contract_docx_url;
      
      // If it contains a URL, extract just the filename
      if (filePath.includes('supabase.co/storage')) {
        const filenameMatch = filePath.match(/\/([^\/]+\.docx)$/);
        if (filenameMatch) {
          filePath = filenameMatch[1];
        } else {
          // Fallback: try to get the last part after last slash
          const parts = filePath.split('/');
          filePath = parts[parts.length - 1].split('?')[0];
        }
      }
      
      console.log('Downloading file from bucket "contracts" with filename:', filePath);
      
      // Download from Supabase storage
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('contracts')
        .download(filePath);
      
      if (downloadError) {
        console.error('Download error:', downloadError);
        return res.status(500).json({ message: `Failed to download file: ${downloadError.message}` });
      }
      
      if (!fileData) {
        return res.status(404).json({ message: 'File data not found' });
      }
      
      // Set appropriate headers for file download
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', `attachment; filename="${contract.projectName}_${contract.projectNumber}.docx"`);
      
      // Send the file
      const buffer = Buffer.from(await fileData.arrayBuffer());
      res.send(buffer);
      
    } catch (error: any) {
      console.error('Error downloading DOCX:', error);
      res.status(500).json({ message: error.message || 'Failed to download DOCX' });
    }
  });

  app.post(api.contracts.create.path, async (req, res) => {
    try {
      const userId = requireSessionUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      const input = api.contracts.create.input.parse(req.body);
      
      // Get template to check if it's A141
      const template = await storage.getTemplate(Number(input.templateId));
      if (!template) {
        return res.status(400).json({ message: 'Template not found' });
      }

      // Initialize checklist from template exhibits
      const templateExhibits = (template.exhibits as string[]) || [];
      const initialChecklist = templateExhibits.map(exhibit => ({
        task: exhibit,
        done: false,
        file_url: null,
        file_name: null,
        uploaded_at: null,
      }));
      
      const isA141Template = template.name === "A141-2014 Design-Build Amendment";
      
      // IMPORTANT: If client sent placeholderData, use it directly instead of rebuilding
      // The client already has all the AI-generated values merged
      let placeholderData;
      
      if (input.placeholderData) {
        // Client already built the complete placeholder values including AI
        // Just use them directly
        placeholderData = input.placeholderData;
        
        // Ensure all required placeholders for the template type are present
        if (isA141Template) {
          const emptyA141 = getEmptyA141Placeholders();
          placeholderData = { ...emptyA141, ...placeholderData };
        } else {
          const emptyStandard = getEmptyStandardPlaceholders();
          placeholderData = { ...emptyStandard, ...placeholderData };
        }
      } else {
        // No AI values from client, build from form only
        placeholderData = buildPlaceholderValuesFromForm(input);
        
        // Add empty AI placeholders based on template type
        if (isA141Template) {
          Object.assign(placeholderData, getEmptyA141Placeholders());
        } else {
          Object.assign(placeholderData, getEmptyStandardPlaceholders());
        }
      }
      
      console.log("Final placeholderData keys:", Object.keys(placeholderData));
      console.log("Sample AI values:", {
        contractor_fee: placeholderData.contractor_fee,
        gmp_amount: placeholderData.gmp_amount,
        // Log other AI values you expect
      });

      // Sanitize placeholder data for DOCX generation
      let placeholderDataForDocx = placeholderData;
      if (placeholderDataForDocx) {
        // Create a copy to avoid modifying the original
        placeholderDataForDocx = { ...placeholderDataForDocx };
        Object.keys(placeholderDataForDocx).forEach(key => {
          if (typeof placeholderDataForDocx[key] === 'string') {
            // Replace &nbsp; with regular space
            placeholderDataForDocx[key] = placeholderDataForDocx[key].replace(/&nbsp;/g, ' ');
          }
        });
      }
      
      // Generate DOCX from template using sanitized data
      const docxUrl = await generateDocxFromTemplate(
        template.template_file_path || '',
        placeholderDataForDocx,  // Use sanitized version
        `${input.projectNumber}_${input.projectName}`
      );
      
      // Create contract with placeholder_data and docx_url
      const contract = await storage.createContract({
        ...input,
        placeholder_data: placeholderData,
        contract_docx_url: docxUrl,
        checklist: initialChecklist,
        // contractStartDate is omitted from insert, so defaultNow() will be used
      });
      
      await storage.createAuditLog({ 
        contractId: contract.id, 
        userId: userId, 
        action: 'created', 
        details: 'Contract created' 
      });
      
      res.status(201).json(contract);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      throw err;
    }
  });

  // regenerate docx endpoint to handle AI values
  app.post('/api/contracts/:id/regenerate-docx', async (req, res) => {
    try {
      const contractId = Number(req.params.id);
      const { placeholderData, isA141Template } = req.body;
      
      const contract = await storage.getContract(contractId);
      if (!contract) {
        return res.status(404).json({ message: 'Contract not found' });
      }
      
      const template = await storage.getTemplate(contract.templateId);
      if (!template || !template.template_file_path) {
        return res.status(400).json({ message: 'Template file not found' });
      }
      
      // Ensure all required placeholders are present
      let completePlaceholderData = placeholderData;
      if (isA141Template) {
        const emptyA141 = getEmptyA141Placeholders();
        completePlaceholderData = { ...emptyA141, ...placeholderData };
      } else {
        const emptyStandard = getEmptyStandardPlaceholders();
        completePlaceholderData = { ...emptyStandard, ...placeholderData };
      }
      
      // Regenerate DOCX with updated data
      const docxUrl = await generateDocxFromTemplate(
        template.template_file_path,
        completePlaceholderData,
        `${contract.projectNumber}_${contract.projectName}_v${Date.now()}`
      );
      
      // Update contract with new DOCX URL and placeholder data
      const updatedContract = await storage.updateContract(contractId, {
        contract_docx_url: docxUrl,
        placeholder_data: completePlaceholderData
      });
      
      res.json({ success: true, docxUrl, placeholderData: completePlaceholderData });
    } catch (error: any) {
      console.error('DOCX regeneration error:', error);
      res.status(500).json({ message: error.message || 'Failed to regenerate DOCX' });
    }
  });

  app.put(api.contracts.update.path, async (req, res) => {
    try {
      const input = api.contracts.update.input.parse(req.body);
      const contractId = Number(req.params.id);
      const oldContract = await storage.getContract(contractId);
      
      // Prepare updates object
      const updates: any = {};
      if (input.status !== undefined) updates.status = input.status;
      if (input.documentContent !== undefined) updates.documentContent = input.documentContent;
      if (input.placeholderData !== undefined) updates.placeholder_data = input.placeholderData; // Add this line
      
      const contract = await storage.updateContract(contractId, updates);
      if (!contract) return res.status(404).json({ message: 'Contract not found' });
      
      const userId = input.userId || 1;
      let auditAction = 'updated';
      let auditDetails = '';
  
      if (input.documentContent && input.documentContent !== oldContract?.documentContent) {
        const user = await storage.getUser(userId);
        auditAction = 'edited';
        auditDetails = `Contract edited by ${user?.fullName || 'Unknown User'}`;
      } else if (input.status && input.status !== oldContract?.status) {
        auditAction = 'updated';
        auditDetails = `Contract status changed to ${contract.status}`;
      }
  
      await storage.createAuditLog({ contractId: contract.id, userId, action: auditAction, details: auditDetails });
  
      // Handle Notifications on status change
      if (input.status && input.status !== oldContract?.status) {
        if (input.status === 'review') {
          // Store who submitted the contract for review
          if (input.userId) {
            await storage.updateContract(contractId, { 
              submittedByUserId: input.userId 
            });
          }
          
          // Notify Reviewers
          const allUsers = await storage.getUsers();
          const reviewers = allUsers.filter(u => u.role === 'reviewer');
          for (const reviewer of reviewers) {
            await storage.createNotification({
              userId: reviewer.id,
              contractId: contract.id,
              type: 'approval_request',
              message: `New contract "${contract.projectName}" is ready for your review.`,
              read: false
            });
          }
        } else if (input.status === 'approved') {
          // Notify Vendor
          const allUsers = await storage.getUsers();
          const vendorUser = allUsers.find(u => u.role === 'vendor');
          if (vendorUser) {
            await storage.createNotification({
              userId: vendorUser.id,
              contractId: contract.id,
              type: 'signing_request',
              message: `Contract "${contract.projectName}" has been approved and is ready for your signature.`,
              read: false
            });
          }
        } else if (input.status === 'signed') {
          // Notify Contract Manager
          const allUsers = await storage.getUsers();
          const managers = allUsers.filter(u => u.role === 'contract_manager');
          for (const manager of managers) {
            await storage.createNotification({
              userId: manager.id,
              contractId: contract.id,
              type: 'status_update',
              message: `Contract "${contract.projectName}" has been signed by the vendor.`,
              read: false
            });
          }
        }
      }

      res.json(contract);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      throw err;
    }
  });

  // Assign reviewer to contract
  app.post('/api/contracts/:id/assign-reviewer', async (req, res) => {
    try {
      const contractId = Number(req.params.id);
      const { reviewerId } = req.body;
      
      if (!reviewerId) {
        return res.status(400).json({ message: 'reviewerId is required' });
      }
      
      const contract = await storage.getContract(contractId);
      if (!contract) {
        return res.status(404).json({ message: 'Contract not found' });
      }
      
      // Store reviewer assignment on the contract
      await storage.updateContract(contractId, { 
        assignedReviewerId: reviewerId 
      });
      
      // Also notify the contract manager that it was submitted
      const allUsers = await storage.getUsers();
      const contractManagers = allUsers.filter(u => u.role === 'contract_manager');
      
      for (const manager of contractManagers) {
        await storage.createNotification({
          userId: manager.id,
          contractId: contract.id,
          type: 'status_update',
          message: `Contract "${contract.projectName}" has been assigned to reviewer ID ${reviewerId}`,
          read: false
        });
      }
      
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error assigning reviewer:', error);
      res.status(500).json({ message: error.message || 'Failed to assign reviewer' });
    }
  });

  // Return contract from reviewer back to admin
  app.post('/api/contracts/:id/return-to-admin', async (req, res) => {
    try {
      const contractId = Number(req.params.id);
      const { reason, userId } = req.body;
      
      if (!userId) {
        return res.status(400).json({ message: 'userId is required' });
      }
      
      const contract = await storage.getContract(contractId);
      if (!contract) {
        return res.status(404).json({ message: 'Contract not found' });
      }
      
      // Verify user is a reviewer
      const user = await storage.getUser(userId);
      if (!user || user.role !== 'reviewer') {
        return res.status(403).json({ message: 'Only reviewers can return contracts to admin' });
      }
      
      // Verify contract is in review status
      if (contract.status !== 'review') {
        return res.status(400).json({ message: `Cannot return contract in '${contract.status}' status. Contract must be in 'review' status.` });
      }
      
      // Get the admin who submitted the contract
      const submittedByUserId = contract.submittedByUserId;
      if (!submittedByUserId) {
        return res.status(400).json({ message: 'No submitting admin found for this contract' });
      }
      
      // Get the admin user details for the audit log
      const adminUser = await storage.getUser(submittedByUserId);
      const adminName = adminUser?.fullName || 'Unknown Admin';
      
      // Update contract status back to draft with return reason
      const updatedContract = await storage.updateContract(contractId, {
        status: 'draft',
        returnedToAdminReason: reason || 'Contract returned by reviewer for revisions',
        lastActivityAt: new Date(),
      });
      
      await storage.createAuditLog({
        contractId: contract.id,
        userId: userId,
        action: 'returned to admin',
        details: `Contract returned to ${adminName} by ${user.fullName}. Reason: ${reason || 'Revisions requested'}`
      });
      
      // Notify the admin who submitted the contract
      await storage.createNotification({
        userId: submittedByUserId,
        contractId: contract.id,
        type: 'status_update',
        message: `Contract "${contract.projectName}" has been returned by reviewer ${user.fullName} for revisions.${reason ? ` Reason: ${reason}` : ''}`,
        read: false
      });
      
      // Also notify all contract managers as backup
      const allUsers = await storage.getUsers();
      const contractManagers = allUsers.filter(u => u.role === 'contract_manager' && u.id !== submittedByUserId);
      
      for (const manager of contractManagers) {
        await storage.createNotification({
          userId: manager.id,
          contractId: contract.id,
          type: 'status_update',
          message: `Contract "${contract.projectName}" has been returned to admin by reviewer ${user.fullName}.${reason ? ` Reason: ${reason}` : ''}`,
          read: false
        });
      }
      
      res.json({ 
        success: true, 
        message: 'Contract returned to admin successfully',
        contract: updatedContract
      });
    } catch (error: any) {
      console.error('Error returning contract to admin:', error);
      res.status(500).json({ message: error.message || 'Failed to return contract to admin' });
    }
  });

  // Return contract from vendor back to reviewer
  app.post('/api/contracts/:id/return-to-reviewer', async (req, res) => {
    try {
      const contractId = Number(req.params.id);
      const { reason, userId } = req.body;
      
      if (!userId) {
        return res.status(400).json({ message: 'userId is required' });
      }
      
      const contract = await storage.getContract(contractId);
      if (!contract) {
        return res.status(404).json({ message: 'Contract not found' });
      }
      
      // Verify user is a vendor
      const user = await storage.getUser(userId);
      if (!user || user.role !== 'vendor') {
        return res.status(403).json({ message: 'Only vendors can return contracts to reviewer' });
      }
      
      // Verify contract is in approved status (ready for signature)
      if (contract.status !== 'approved') {
        return res.status(400).json({ message: `Cannot return contract in '${contract.status}' status. Contract must be in 'approved' status.` });
      }
      
      // Get the assigned reviewer
      const assignedReviewerId = contract.assignedReviewerId;
      if (!assignedReviewerId) {
        return res.status(400).json({ message: 'No assigned reviewer found for this contract' });
      }
      
      // Get the reviewer user details for the audit log
      const reviewerUser = await storage.getUser(assignedReviewerId);
      const reviewerName = reviewerUser?.fullName || 'Unknown Reviewer';
      
      // Update contract status back to review with return reason
      const updatedContract = await storage.updateContract(contractId, {
        status: 'review',
        returnedToReviewerReason: reason || 'Contract returned by vendor for changes',
        lastActivityAt: new Date(),
      });
      
      await storage.createAuditLog({
        contractId: contract.id,
        userId: userId,
        action: 'returned to reviewer', 
        details: `Contract returned to ${reviewerName} by ${user.fullName}. Reason: ${reason || 'Changes requested'}`
      });
      
      // Notify the assigned reviewer
      await storage.createNotification({
        userId: assignedReviewerId,
        contractId: contract.id,
        type: 'approval_request',
        message: `Contract "${contract.projectName}" has been returned by vendor ${user.fullName} for additional review.${reason ? ` Reason: ${reason}` : ''}`,
        read: false
      });
      
      // Also notify all reviewers as backup
      const allUsers = await storage.getUsers();
      const reviewers = allUsers.filter(u => u.role === 'reviewer' && u.id !== assignedReviewerId);
      
      for (const reviewer of reviewers) {
        await storage.createNotification({
          userId: reviewer.id,
          contractId: contract.id,
          type: 'approval_request',
          message: `Contract "${contract.projectName}" has been returned for review by vendor ${user.fullName}.${reason ? ` Reason: ${reason}` : ''}`,
          read: false
        });
      }
      
      res.json({ 
        success: true, 
        message: 'Contract returned to reviewer successfully',
        contract: updatedContract
      });
    } catch (error: any) {
      console.error('Error returning contract to reviewer:', error);
      res.status(500).json({ message: error.message || 'Failed to return contract to reviewer' });
    }
  });

  app.post('/api/contracts/generate-placeholders', async (req, res) => {
    try {
      const { formData, plainTemplateContent, templateType } = req.body;
      let queryForContext = '';
      let prompt = '';
  
      if (!formData || !plainTemplateContent) {
        return res.status(400).json({ 
          message: 'Missing required fields: formData and templateContent are required' 
        });
      }
  
      const isA101Template = templateType === 'a101';
      const isA141Template = templateType === 'a141';
      const isA102Template = templateType === 'a102';
  
      if (isA101Template) {
        queryForContext = 
        ` We need to fill these values in an A101-2017 Lump Sum Contract:
          - Contract Sum (words and amount)
          - Alternates (firm and conditional)
          - Allowances
          - Unit prices
          - Retainage percentage
          - Release of retainage terms
          - Interest rate for late payments
          - Portion of work for phased completion
          - Completion date
          - Liquidated damages
          - Bonus provisions
  
          Project: ${formData.projectName || ''}
          Location: ${formData.projectLocation || ''}
          Description: ${formData.projectDescription || ''}
          Owner: ${formData.ownerName || ''}
          Owner Status: ${formData.ownerStatus || ''}
          Contractor: ${formData.vendorName || ''}
          Contractor Status: ${formData.vendorStatus || ''}
          Budget Amount: ${formData.budgetAmount || ''}
          Type: Lump Sum Construction
  
          Look for historical examples showing the following:
          1. Typical Contract Sum as percentage of budget
          2. Common retainage percentages (5% or 10%)
          3. Standard interest rates for late payments
          4. Liquidated damages amounts appropriate for project size
          5. Realistic unit prices for additional work
          6. Common allowance items and amounts
        `;
      } 
      else if (isA141Template) {
        queryForContext = 
        ` We need to fill these values in an ${formData.selectedTemplateName}:
            - Owner's Program
            - Owner's Design Requirements
            - Project Physical Characteristics
            - Sustainable Objective
            - Incentive Programs
            - Owner's Budget
            - Design Milestone Dates
            - Design-Builder Proposal Submission Dates
            - Phased Completion Dates
            - Substantial Completion Date
            - Other Milestone Dates
            - Consultant Information (Name, Address, Status, Info)
            - Additional Owner's Criteria
            - Project Manager (Name, Address, Info)
            - Submittal Reviewers
            - Owner's Consultants and Separate Contractors
            - Design-Builder's Representative
            - Pre-Amendment Compensation (for Design and Pre-Construction)
            - Hourly Billing Rates for Design-Builder, Architect, and Consultants
  
            Project: ${formData.projectName || ''}
            Location: ${formData.projectLocation || ''}
            Description: ${formData.projectDescription || ''}
            Owner: ${formData.ownerName || ''}
            Owner Status: ${formData.ownerStatus || ''}
            Design-Builder (Architect): ${formData.architectName || ''}
            Design-Builder (Architect) Status: ${formData.architectStatus || ''}
            Budget Amount: ${formData.budgetAmount || ''}
            Type: ${formData.contractType || 'Design-Build'}
  
            Look for historical examples showing the following:
            1. How the Owner's Program was defined (e.g., as a separate exhibit or within the contract text)
            2. The level of detail in design requirements
            3. What physical characteristics were described for similar project types
            4. Typical Sustainable Objectives (e.g., LEED certification levels)
            5. Common incentive programs
            6. Realistic budget amounts and breakdowns for similar projects
            7. How design and construction milestones were structured
            8. What additional criteria were included (e.g., environmental studies)
            9. Standard hourly rates for design and construction management personnel
        `;
      }
      else {
        // A102 or standard templates
        queryForContext = 
        ` We need to fill these values in an ${formData.selectedTemplateName || 'A102 Cost Plus Contract'}:
            - Contractor's Fee
            - Fee adjustment method for changes
            - Subcontractor profit limitations  
            - Equipment rental rate percentage
            - Unit prices for additional work items
            - Liquidated damages amounts
            - Bonus and incentive provisions
            - Guaranteed Maximum Price (GMP) amount and wording
            - Alternates and allowances
            - GMP assumptions
            - Off-site personnel costs
          
            Project: ${formData.projectName || ''}
            Location: ${formData.projectLocation || ''}
            Description: ${formData.projectDescription || ''}
            Owner: ${formData.ownerName || ''}
            Owner Status: ${formData.ownerStatus || ''}
            Contractor: ${formData.vendorName || ''}
            Contractor Status: ${formData.vendorStatus || ''}
            Architect: ${formData.architectName || ''}
            Architect Status: ${formData.architectStatus || ''}
            Budget Amount: ${formData.budgetAmount || ''}
            Type: ${formData.contractType || 'Construction'}
  
            Look for historical examples showing the following: 
            1. What percentage fee structures were used for similar projects 
            2. How change orders affected the fee 
            3. What subcontractor markup caps were set 
            4. Equipment rental rate percentages
            5. Typical unit prices for common construction items
            6. Liquidated damages rates and caps
            7. Bonus structures and cost savings incentives
            8. GMP amount formatting and contingency amounts
            9. Common alternates and allowances for office renovations
            10. Realistic GMP assumptions
            11. What off-site personnel percentages were approved
        `;
      }
  
      // console.log("query for context", queryForContext);
      
      // Generate embedding for the query
      let context = '';
      try {
        console.log('Generating embedding for query...');
        const embedding = await generateEmbedding(queryForContext);
        
        // Get context from similar contracts
        console.log('Searching for similar contracts...');
        context = await getContractContext(queryForContext, embedding, 5);
        
        if (context) {
          console.log(`Found context from similar contracts (${context.length} characters)`);
        } else {
          console.log('No similar contracts found');
        }
      } catch (error) {
        console.error('Error fetching vector context:', error);
        context = ''; // Continue without context if error
      }
  
      // Build prompt based on template type
      if (isA101Template) {
        prompt = buildA101Prompt(formData, plainTemplateContent, context);
      } else if (isA141Template) {
        prompt = buildA141Prompt(formData, plainTemplateContent, context);
      } else {
        prompt = buildStandardPrompt(formData, plainTemplateContent, context);
      }
  
      const model = genAI.getGenerativeModel({ 
        model: "gemini-3.1-flash-lite", 
        generationConfig: {
          temperature: 0.7, // Reduced for more consistent output
          maxOutputTokens: 2500,
        },
      });
  
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const content = response.text();
      
      if (!content) {
        throw new Error('No content generated from AI');
      }
  
      // Clean the response - remove any markdown code blocks if present
      let cleanedContent = content.trim();
      if (cleanedContent.startsWith('```json')) {
        cleanedContent = cleanedContent.replace(/```json\n?/, '').replace(/```$/, '');
      } else if (cleanedContent.startsWith('```')) {
        cleanedContent = cleanedContent.replace(/```\n?/, '').replace(/```$/, '');
      }
  
      // Parse the JSON response
      let aiResponse;
      try {
        aiResponse = JSON.parse(cleanedContent);
      } catch (parseError) {
        console.error('Failed to parse AI response:', content);
        console.error('Cleaned content that failed to parse:', cleanedContent);
        
        // Try to extract JSON from the response using regex as a fallback
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            aiResponse = JSON.parse(jsonMatch[0]);
          } catch {
            // Fallback to default values if parsing fails
            const isA141 = formData.selectedTemplateName === "A141-2014 Design-Build Amendment";
            const isA101 = formData.selectedTemplateName?.includes('A101') || formData.selectedTemplateName?.includes('Lump Sum');
            aiResponse = getEmptyResponse(isA101 || isA141);
          }
        } else {
          // Fallback to default values if parsing fails
          const isA141 = formData.selectedTemplateName === "A141-2014 Design-Build Amendment";
          const isA101 = formData.selectedTemplateName?.includes('A101') || formData.selectedTemplateName?.includes('Lump Sum');
          aiResponse = getEmptyResponse(isA101 || isA141);
        }
      }
  
      res.json({ 
        success: true,
        ...aiResponse,
        contextUsed: context.length > 0 // Let the client know if context was used
      });
    } catch (error: any) {
      console.error('Error in AI placeholder generation:', error);
      res.status(500).json({ 
        message: error.message || 'Failed to generate AI placeholder values',
        success: false,
        // Return empty values based on template type
        ...getEmptyResponse(req.body.templateType === 'a101')
      });
    }
  });
  
  /**
   * Get context from similar contracts for AI generation
   */
  app.post('/api/contracts/get-context', async (req, res) => {
    try {
      const { query, maxChunks = 5 } = req.body;
      
      if (!query) {
        return res.status(400).json({ message: 'Query is required' });
      }
      
      // Generate embedding for the query
      const embedding = await generateEmbedding(query);
      
      // Get context from similar contracts
      const context = await getContractContext(query, embedding, maxChunks);
      
      res.json({ 
        success: true, 
        context,
        hasContext: context.length > 0
      });
    } catch (error: any) {
      console.error('Error in get-context:', error);
      res.status(500).json({ 
        message: error.message || 'Internal error',
        success: false 
      });
    }
  });

  app.post('/api/contracts/:id/regenerate-docx', async (req, res) => {
    try {
      const contractId = Number(req.params.id);
      const { placeholderData } = req.body;
      
      const contract = await storage.getContract(contractId);
      if (!contract) {
        return res.status(404).json({ message: 'Contract not found' });
      }
      
      const template = await storage.getTemplate(contract.templateId);
      if (!template || !template.templateFilePath) {
        return res.status(400).json({ message: 'Template file not found' });
      }
      
      // Regenerate DOCX with updated data
      const docxUrl = await generateDocxFromTemplate(
        template.templateFilePath,
        placeholderData,
        `${contract.projectNumber}_${contract.projectName}_v${Date.now()}`
      );
      
      // Update contract with new DOCX URL
      const updatedContract = await storage.updateContract(contractId, {
        contract_docx_url: docxUrl
      });
      
      res.json({ success: true, docxUrl });
    } catch (error: any) {
      console.error('DOCX regeneration error:', error);
      res.status(500).json({ message: error.message || 'Failed to regenerate DOCX' });
    }
  });

  app.post('/api/contracts/:id/attach-exhibit', upload.single('exhibit'), async (req, res) => {
    try {
      const contractId = Number(req.params.id);
      const { exhibitName } = req.body;
      const file = req.file;
  
      if (!file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }
  
      if (!exhibitName) {
        return res.status(400).json({ message: 'exhibitName is required' });
      }
  
      const contract = await storage.getContract(contractId);
      if (!contract) {
        return res.status(404).json({ message: 'Contract not found' });
      }
  
      // Sanitize exhibit name for filename
      const sanitizedName = exhibitName.replace(/[^a-zA-Z0-9]/g, '_');
      const timestamp = Date.now();
      const filePath = `exhibits/${contractId}/${sanitizedName}_${timestamp}.pdf`;
  
      console.log(`Uploading exhibit to: ${filePath}`);
  
      // Upload file to Supabase storage in exhibits folder structure
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('contracts')
        .upload(filePath, file.buffer, {
          contentType: 'application/pdf',
          cacheControl: '3600',
          upsert: true,
        });
  
      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw new Error(`Failed to upload exhibit: ${uploadError.message}`);
      }
  
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('contracts')
        .getPublicUrl(filePath);
  
      // Update contract's exhibit attachments
      const currentChecklist = (contract.checklist as any[]) || [];
      const updatedChecklist = currentChecklist.map((item: any) => {
        if (item.task === exhibitName) {
          return { 
            ...item, 
            done: true, 
            file_url: publicUrl,
            file_name: file.originalname,
            uploaded_at: new Date().toISOString()
          };
        }
        return item;
      });
  
      await storage.updateContract(contractId, { checklist: updatedChecklist });
  
      res.json({ success: true, fileUrl: publicUrl, fileName: file.originalname });
    } catch (error: any) {
      console.error('Error attaching exhibit:', error);
      res.status(500).json({ message: error.message || 'Failed to attach exhibit' });
    }
  });
  
  // Detach exhibit from contract
  app.delete('/api/contracts/:id/detach-exhibit', async (req, res) => {
    try {
      const contractId = Number(req.params.id);
      const { exhibitName } = req.body;
  
      const contract = await storage.getContract(contractId);
      if (!contract) {
        return res.status(404).json({ message: 'Contract not found' });
      }
  
      // Get the file URL before removing
      const currentChecklist = (contract.checklist as any[]) || [];
      const exhibitItem = currentChecklist.find((item: any) => item.task === exhibitName);
      
      if (exhibitItem?.file_url) {
        // Extract file path from URL to delete from storage
        try {
          const url = new URL(exhibitItem.file_url);
          const pathParts = url.pathname.split('/');
          // Find the exhibits/contract_id/... part
          const exhibitsIndex = pathParts.findIndex(part => part === 'exhibits');
          if (exhibitsIndex !== -1) {
            const filePath = pathParts.slice(exhibitsIndex).join('/');
            console.log(`Deleting file from storage: ${filePath}`);
            
            const { error: deleteError } = await supabase.storage
              .from('contracts')
              .remove([filePath]);
              
            if (deleteError) {
              console.error('Error deleting file from storage:', deleteError);
              // Continue even if delete fails - we still remove from checklist
            }
          }
        } catch (err) {
          console.error('Error parsing file URL:', err);
        }
      }
  
      const updatedChecklist = currentChecklist.map((item: any) => {
        if (item.task === exhibitName) {
          return { 
            ...item, 
            done: false, 
            file_url: null,
            file_name: null,
            uploaded_at: null
          };
        }
        return item;
      });
  
      await storage.updateContract(contractId, { checklist: updatedChecklist });
  
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error detaching exhibit:', error);
      res.status(500).json({ message: error.message || 'Failed to detach exhibit' });
    }
  });
  
  // Get checklist
  app.get('/api/contracts/:id/checklist', async (req, res) => {
    try {
      const contractId = Number(req.params.id);
      const contract = await storage.getContract(contractId);
      if (!contract) {
        return res.status(404).json({ message: 'Contract not found' });
      }
      res.json({ checklist: contract.checklist || [] });
    } catch (error: any) {
      console.error('Error fetching checklist:', error);
      res.status(500).json({ message: error.message || 'Failed to fetch checklist' });
    }
  });
  
  // Update checklist item
  app.put('/api/contracts/:id/checklist', async (req, res) => {
    try {
      const contractId = Number(req.params.id);
      const { taskIndex, done, fileUrl, fileName } = req.body;
      
      if (taskIndex === undefined) {
        return res.status(400).json({ message: 'taskIndex is required' });
      }
      
      const contract = await storage.getContract(contractId);
      if (!contract) {
        return res.status(404).json({ message: 'Contract not found' });
      }
      
      const currentChecklist = (contract.checklist as any[]) || [];
      
      if (taskIndex >= currentChecklist.length) {
        return res.status(400).json({ message: 'Invalid task index' });
      }
      
      const updatedChecklist = [...currentChecklist];
      updatedChecklist[taskIndex] = {
        ...updatedChecklist[taskIndex],
        done: done,
        ...(fileUrl !== undefined && { file_url: fileUrl }),
        ...(fileName !== undefined && { file_name: fileName }),
        ...(fileUrl === null && { uploaded_at: null }),
        ...(fileUrl && { uploaded_at: new Date().toISOString() }),
      };
      
      const updatedContract = await storage.updateContract(contractId, {
        checklist: updatedChecklist,
      });
      
      res.json({ success: true, checklist: updatedContract.checklist });
    } catch (error: any) {
      console.error('Error updating checklist:', error);
      res.status(500).json({ message: error.message || 'Failed to update checklist' });
    }
  });

  app.get('/api/contracts/:id/status-history', async (req, res) => {
    try {
      const contractId = Number(req.params.id);
      
      // Get contract details
      const contract = await storage.getContract(contractId);
      if (!contract) {
        return res.status(404).json({ message: 'Contract not found' });
      }
      
      // Get all audit logs for this contract
      const auditLogs = await storage.getAuditLogsByContract(contractId);
      
      // Get all users for reference
      const allUsers = await storage.getUsers();
      const userMap = new Map();
      allUsers.forEach(user => {
        userMap.set(user.id, user);
      });
      
      // Find admin user (contract_manager)
      const adminUser = allUsers.find(u => u.role === 'admin');
      // Find vendor user
      const vendorUser = allUsers.find(u => u.role === 'vendor');
      
      // Build timeline events from audit logs
      const timelineEvents: { 
        status: string; 
        timestamp: Date; 
      }[] = [];
      
      for (const log of auditLogs) {
        // Handle status changes from 'updated' actions
        if (log.action === 'updated' && log.details?.includes('Contract status changed to')) {
          const match = log.details.match(/changed to (\w+)/);
          if (match) {
            timelineEvents.push({
              status: match[1],
              timestamp: new Date(log.createdAt!),
            });
          }
        }
        // Handle return to admin - this sets status to 'draft'
        else if (log.action === 'returned_to_admin' || log.action === 'returned to the admin' || log.action === 'returned to admin') {
          timelineEvents.push({
            status: 'draft',
            timestamp: new Date(log.createdAt!),
          });
        }
        // Handle return to reviewer - this sets status to 'review'
        else if (log.action === 'returned_to_reviewer' || log.action === 'returned to the reviewer' || log.action === 'returned to reviewer') {
          timelineEvents.push({
            status: 'review',
            timestamp: new Date(log.createdAt!),
          });
        }
        // Handle contract creation
        else if (log.action === 'created') {
          timelineEvents.push({
            status: 'draft',
            timestamp: new Date(log.createdAt!),
          });
        }
      }
      
      // Sort chronologically
      timelineEvents.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      
      // If no events, add current status with contract start date
      if (timelineEvents.length === 0) {
        timelineEvents.push({
          status: contract.status,
          timestamp: new Date(contract.createdAt!),
        });
      }
      
      // Status configuration
      const statusConfig: Record<string, { label: string; icon: string; color: string }> = {
        draft: { label: 'Draft', icon: '📄', color: 'text-gray-500' },
        review: { label: 'Review', icon: '🔍', color: 'text-amber-500' },
        approved: { label: 'Approved', icon: '✅', color: 'text-emerald-500' },
        signed: { label: 'Signed', icon: '✍️', color: 'text-primary' }
      };
      
      // Get responsible user for each status based on status type and contract data
      const getResponsibleUser = (status: string, eventIndex: number, totalEvents: number): { userId: number; userName: string; userRole: string } => {
        switch (status) {
          case 'draft':
            // For draft status, always show the admin
            return {
              userId: adminUser?.id || 0,
              userName: adminUser?.fullName || 'Unknown Admin',
              userRole: 'admin'
            };
          case 'review':
            // For review status, show the assigned reviewer
            const reviewerUser = contract.assignedReviewerId ? userMap.get(contract.assignedReviewerId) : null;
            return {
              userId: reviewerUser?.id || 0,
              userName: reviewerUser?.fullName || 'Unknown Reviewer',
              userRole: 'reviewer'
            };
          case 'approved':
          case 'signed':
            // For approved/signed status, show the vendor
            return {
              userId: vendorUser?.id || 0,
              userName: vendorUser?.fullName || 'Unknown Vendor',
              userRole: 'vendor'
            };
          default:
            return { userId: 0, userName: 'System', userRole: 'system' };
        }
      };
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Build status history with durations and responsible users
      const statusHistory: {
        status: string;
        startDate: Date;
        endDate: Date | null;
        durationDays: number;
        displayLabel: string;
        icon: string;
        color: string;
        userId: number;
        userName: string;
        userRole: string;
      }[] = [];
      
      for (let i = 0; i < timelineEvents.length; i++) {
        const event = timelineEvents[i];
        const nextEvent = timelineEvents[i + 1];
        
        let endDate: Date | null = nextEvent ? nextEvent.timestamp : null;
        
        // If this is the last event and status is not 'signed', use today as end date
        if (!endDate && event.status !== 'signed') {
          endDate = today;
        }
        
        let durationDays = 0;
        if (endDate) {
          const start = new Date(event.timestamp);
          const end = new Date(endDate);
          start.setHours(0, 0, 0, 0);
          end.setHours(0, 0, 0, 0);
          const diffTime = end.getTime() - start.getTime();
          durationDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        }
        
        const config = statusConfig[event.status] || { 
          label: event.status, 
          icon: '📋', 
          color: 'text-gray-500' 
        };
        
        // Get the responsible user for this status period
        const responsibleUser = getResponsibleUser(event.status, i, timelineEvents.length);
        
        statusHistory.push({
          status: event.status,
          startDate: event.timestamp,
          endDate: endDate,
          durationDays: Math.max(0, durationDays),
          displayLabel: config.label,
          icon: config.icon,
          color: config.color,
          userId: responsibleUser.userId,
          userName: responsibleUser.userName,
          userRole: responsibleUser.userRole
        });
      }
      
      // Calculate total lifecycle days
      let totalLifecycleDays = 0;
      let isCompleted = false;
      
      for (const item of statusHistory) {
        totalLifecycleDays += item.durationDays;
        if (item.status === 'signed') {
          isCompleted = true;
        }
      }
      
      // For ongoing contracts, calculate total from first event to today
      if (!isCompleted && statusHistory.length > 0) {
        const firstStart = statusHistory[0].startDate;
        const start = new Date(firstStart);
        const end = new Date(today);
        start.setHours(0, 0, 0, 0);
        end.setHours(0, 0, 0, 0);
        const totalFromStart = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        totalLifecycleDays = totalFromStart;
      }
      
      res.json({
        success: true,
        statusHistory,
        totalLifecycleDays,
        currentStatus: contract.status,
        isCompleted
      });
      
    } catch (error: any) {
      console.error('Error fetching status history:', error);
      res.status(500).json({ message: error.message || 'Failed to fetch status history' });
    }
  });

  app.post(api.contracts.generateDraft.path, async (req, res) => {
    const userId = requireSessionUserId(req);
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const contractId = Number(req.params.id);
    const contract = await storage.getContract(contractId);
    if (!contract) return res.status(404).json({ message: 'Contract not found' });

    const vendor = await storage.getVendor(contract.vendorId);
    let templateData: any = null;
    if (contract.templateId) {
      const template = await storage.getTemplate(contract.templateId);
      if (template && template.baseContent) {
        try {
          templateData = JSON.parse(template.baseContent);
        } catch (e) {
          console.error("Failed to parse template content", e);
        }
      }
    }
    
    try {
      let prompt = `Draft a professional university contract for project '${contract.projectName}' (No. ${contract.projectNumber}). Vendor: ${vendor?.name}. Start: ${contract.startDate}, End: ${contract.endDate}, Budget: $${contract.budgetAmount}. Keep it under 500 words and use formal legal language.`;
      
      if (templateData && templateData.standard_clauses) {
        const clauses = templateData.standard_clauses.map((c: any) => `${c.title}:\n${c.content}`).join('\n\n');
        prompt += `\n\nPlease incorporate the following standard clauses into the draft:\n${clauses}`;
      }

      const response = await openai.chat.completions.create({
        model: "gpt-5.2",
        messages: [
          { role: "system", content: "You are an expert contract drafter for a university." },
          { role: "user", content: prompt }
        ]
      });

      const documentContent = response.choices[0]?.message?.content || "Failed to generate.";
      
      const updatedContract = await storage.updateContract(contractId, { documentContent });
      await storage.createAuditLog({ contractId, userId: userId, action: 'draft_generated', details: 'AI draft generated' });
      
      res.json({ success: true, documentContent: updatedContract.documentContent || '' });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ message: error.message || 'Internal error' });
    }
  });

  app.post(api.contracts.analyze.path, async (req, res) => {
    const userId = requireSessionUserId(req);
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const contractId = Number(req.params.id);
    const contract = await storage.getContract(contractId);
    if (!contract) return res.status(404).json({ message: 'Contract not found' });

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-5.2",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: "You are a university contract reviewer. Analyze the following contract content and return JSON with two keys: 'aiAnalysis' (string summarizing risks) and 'checklist' (array of strings for review steps)." },
          { role: "user", content: `Contract Content:\n\n${contract.documentContent}` }
        ]
      });

      const result = JSON.parse(response.choices[0]?.message?.content || '{"aiAnalysis": "No analysis available", "checklist": []}');
      
      const updatedContract = await storage.updateContract(contractId, { 
        aiAnalysis: result.aiAnalysis,
        checklist: result.checklist
      });
      await storage.createAuditLog({ contractId, userId: userId, action: 'analyzed', details: 'AI analysis completed' });

      res.json({ aiAnalysis: updatedContract.aiAnalysis, checklist: updatedContract.checklist });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ message: error.message || 'Internal error' });
    }
  });

  app.get(api.contracts.getAuditLogs.path, async (req, res) => {
    const logs = await storage.getAuditLogsByContract(Number(req.params.id));
    res.json(logs);
  });

  app.get(api.sections.list.path, async (req, res) => {
    const sections = await storage.getSectionsByContract(Number(req.params.contractId));
    res.json(sections);
  });

  app.put(api.sections.update.path, async (req, res) => {
    try {
      const input = api.sections.update.input.parse(req.body);
      const section = await storage.updateSection(Number(req.params.id), input);
      if (!section) return res.status(404).json({ message: 'Section not found' });
      res.json(section);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      throw err;
    }
  });

  app.get('/api/contracts/:id/download-pdf', async (req, res) => {
    try {
      const contractId = Number(req.params.id);
      const contract = await storage.getContract(contractId);
      
      if (!contract) {
        return res.status(404).json({ message: 'Contract not found' });
      }
      
      if (!contract.contract_docx_url) {
        return res.status(404).json({ message: 'DOCX file not found for this contract' });
      }
      
      console.log(`Processing PDF download for contract ${contractId}`);
      
      // Extract filename from URL
      let filePath = contract.contract_docx_url;
      if (filePath.includes('supabase.co/storage')) {
        const filenameMatch = filePath.match(/\/([^\/]+\.docx)$/);
        if (filenameMatch) {
          filePath = filenameMatch[1];
        } else {
          const parts = filePath.split('/');
          filePath = parts[parts.length - 1].split('?')[0];
        }
      }
      
      console.log('Downloading DOCX file from path:', filePath);
      
      // Download the DOCX file from Supabase
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('contracts')
        .download(filePath);
      
      if (downloadError) {
        console.error('Download error:', downloadError);
        return res.status(500).json({ message: `Failed to download file: ${downloadError.message}` });
      }
      
      if (!fileData) {
        return res.status(404).json({ message: 'File data not found' });
      }
      
      console.log('File downloaded successfully, size:', fileData.size, 'bytes');
      
      // Convert DOCX to PDF
      let pdfBuffer = await generatePdfFromDocx(fileData);
      
      // Check for exhibits and merge if any are attached
      const checklist = (contract.checklist as any[]) || [];
      const attachedExhibits = checklist.filter(item => item.done === true && item.file_url);
      
      if (attachedExhibits.length > 0) {
        console.log(`Found ${attachedExhibits.length} attached exhibits, merging...`);
        
        // Download all exhibit PDFs from the exhibits folder structure
        const exhibitBuffers: Buffer[] = [];
        for (const exhibit of attachedExhibits) {
          try {
            // Extract file path from URL
            const url = new URL(exhibit.file_url);
            const pathParts = url.pathname.split('/');
            // Find the exhibits/contract_id/... part
            const exhibitsIndex = pathParts.findIndex(part => part === 'exhibits');
            if (exhibitsIndex !== -1) {
              const exhibitPath = pathParts.slice(exhibitsIndex).join('/');
              console.log(`Downloading exhibit from storage: ${exhibitPath}`);
              
              const exhibitBuffer = await downloadExhibitFromStorage('contracts', exhibitPath);
              exhibitBuffers.push(exhibitBuffer);
              console.log(`Downloaded exhibit: ${exhibit.task}`);
            } else {
              console.error(`Could not extract path from URL: ${exhibit.file_url}`);
            }
          } catch (error) {
            console.error(`Failed to download exhibit ${exhibit.task}:`, error);
            // Continue with other exhibits even if one fails
          }
        }
        
        // Merge exhibits with main PDF
        if (exhibitBuffers.length > 0) {
          console.log(`Merging ${exhibitBuffers.length} exhibits with contract PDF`);
          pdfBuffer = await mergePdfs(pdfBuffer, exhibitBuffers);
        }
      }
      
      // Set PDF headers
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${contract.projectName || 'contract'}_${contract.projectNumber || 'document'}.pdf"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      
      // Send PDF
      res.send(pdfBuffer);
      
    } catch (error: any) {
      console.error('Error generating PDF:', error);
      res.status(500).json({ 
        message: error.message || 'Failed to generate PDF',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  });

  // Notifications
  app.get(api.notifications.list.path, async (req, res) => {
    const userId = Number(req.query.userId);
    if (isNaN(userId)) {
      return res.status(400).json({ message: "userId query parameter is required" });
    }
    const notifications = await storage.getNotifications(userId); 
    res.json(notifications);
  });

  app.post(api.notifications.markRead.path, async (req, res) => {
    await storage.markNotificationRead(Number(req.params.id));
    res.json({ success: true });
  });

  // Templates
  app.get(api.templates.list.path, async (req, res) => {
    const templates = await storage.getTemplates();
    res.json(templates);
  });

  app.get(api.templates.get.path, async (req, res) => {
    const template = await storage.getTemplate(Number(req.params.id));
    if (!template) return res.status(404).json({ message: 'Template not found' });
    res.json(template);
  });

  return httpServer;
}

// Seed reviewers if they don't exist
(async () => {
  const users = await storage.getUsers();
  const reviewers = users.filter(u => u.role === 'reviewer');
  if (reviewers.length === 0) {
    const sampleReviewers = [
      { username: "legal_rev", password: "password", role: "reviewer", fullName: "Legal Department", email: "legal@university.edu" },
      { username: "fac_rev", password: "password", role: "reviewer", fullName: "Facilities Office", email: "facilities@university.edu" },
      { username: "proc_rev", password: "password", role: "reviewer", fullName: "Procurement Team", email: "procurement@university.edu" }
    ];
    for (const r of sampleReviewers) {
      await storage.createUser(r);
    }
  }
})();
