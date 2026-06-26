import React, { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCreateContract } from "@/hooks/use-contracts";
import { useVendors } from "@/hooks/use-vendors";
import { useOwners } from "@/hooks/use-owners";
import { useArchitects } from "@/hooks/use-architects";
import { useTemplates } from "@/hooks/use-templates";
import { insertContractSchema } from "@shared/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ArrowLeft, Wand2, FileText, Building2, User, MapPin } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { addMonths, format } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { replacePlaceholders, dateToWords } from "@/lib/placeholder-utils";
import { useToast } from "@/hooks/use-toast";
import { generateAIPlaceholderValues, getTemplateType} from "@/lib/ai-placeholder-utils";
import { numberToWords } from "@/lib/placeholder-utils";
import type { AIPlaceholderResponse, A101PlaceholderResponse, A102PlaceholderResponse, A141PlaceholderResponse } from "@/lib/ai-placeholder-utils";

// Extend the schema for the form specifically
const formSchema = insertContractSchema.extend({
  templateId: z.coerce.number().optional(),
  vendorId: z.coerce.number().min(1, "Vendor is required"),
  ownerId: z.coerce.number().optional(),
  architectId: z.coerce.number().optional(),
  projectName: z.string().min(1, "Project name is required"),
  projectNumber: z.string().min(1, "Project number is required"),
  budgetAmount: z.coerce.number().min(0, "Budget must be positive").transform(v => String(v)),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  // New fields (all optional)
  projectLocation: z.string().optional(),
  projectDescription: z.string().optional(),
  // Owner fields
  ownerName: z.string().optional(),
  ownerStatus: z.string().optional(),
  ownerAddress: z.string().optional(),
  ownerInfo: z.string().optional(),
  // Architect fields
  architectName: z.string().optional(),
  architectStatus: z.string().optional(),
  architectAddress: z.string().optional(),
  architectInfo: z.string().optional(),
  // Vendor fields
  vendorName: z.string().optional(),
  vendorStatus: z.string().optional(),
  vendorAddress: z.string().optional(),
  vendorInfo: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

// Define which fields belong to which tabs
const tabFieldMapping = {
  project: ['projectName', 'projectNumber', 'projectLocation', 'budgetAmount', 'startDate', 'endDate', 'projectDescription'],
  owner: ['ownerId', 'ownerName', 'ownerStatus', 'ownerAddress', 'ownerInfo'],
  architect: ['architectId', 'architectName', 'architectStatus', 'architectAddress', 'architectInfo'],
  vendor: ['vendorId', 'vendorName', 'vendorStatus', 'vendorAddress', 'vendorInfo'],
};

// Helper function to check if a field is required
const isRequiredField = (fieldName: string): boolean => {
  const requiredFields = ['projectName', 'projectNumber', 'budgetAmount', 'startDate', 'endDate', 'vendorId'];
  return requiredFields.includes(fieldName);
};

// false: turn OFF to stop using Google Gemini API
// true: turn ON to use Google Gemini API
const USE_AI_PLACEHOLDERS = true

export default function NewContract() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { data: vendors, isLoading: loadingVendors } = useVendors();
  const { data: owners, isLoading: loadingOwners } = useOwners();
  const { data: architects, isLoading: loadingArchitects } = useArchitects();
  const { data: templates, isLoading: loadingTemplates } = useTemplates();
  const { mutate: createContract, isPending } = useCreateContract();

  // Add state for template content and active tab
  const [templateContent, setTemplateContent] = useState<string>("");
  const [plainTemplateContent, setPlainTemplateContent] = useState<string>("");
  const [activeTab, setActiveTab] = useState<string>("project");

  // Get templateId from query string
  const searchParams = new URLSearchParams(window.location.search);
  const templateIdFromUrl = searchParams.get("templateId");

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      projectName: "",
      projectNumber: "",
      projectLocation: "",
      projectDescription: "",
      ownerId: undefined,
      ownerName: "",
      ownerStatus: "",
      ownerAddress: "",
      ownerInfo: "",
      architectId: undefined,
      architectName: "",
      architectStatus: "",
      architectAddress: "",
      architectInfo: "",
      templateId: templateIdFromUrl ? Number(templateIdFromUrl) : undefined,
      vendorId: 0,
      vendorName: "",
      vendorStatus: "",
      vendorAddress: "",
      vendorInfo: "",
      budgetAmount: "0",
      startDate: format(new Date(), "yyyy-MM-dd"),
      endDate: "",
    },
    mode: "onSubmit", // Only validate on submit to avoid premature errors
    reValidateMode: "onSubmit",
  });

  const selectedTemplateId = form.watch("templateId");
  const selectedTemplate = templates?.find(t => t.id === Number(selectedTemplateId));
  const selectedVendorId = form.watch("vendorId");
  const selectedVendor = vendors?.find(v => v.id === Number(selectedVendorId));
  const selectedOwnerId = form.watch("ownerId");
  const selectedOwner = owners?.find(o => o.id === Number(selectedOwnerId));
  const selectedArchitectId = form.watch("architectId");
  const selectedArchitect = architects?.find(a => a.id === Number(selectedArchitectId));

  // const isA141Template = selectedTemplate?.name === "A141-2014 Design-Build Amendment";
  const templateType = getTemplateType(selectedTemplate?.name);
  const isA101Template = templateType === 'a101';
  const isA141Template = templateType === 'a141';
  const isA102Template = templateType === 'a102';

  // Fetch template content when template is selected
  useEffect(() => {
    if (selectedTemplate && selectedTemplate.docContent && selectedTemplate.plainContent) {
      setTemplateContent(selectedTemplate.docContent);
      setPlainTemplateContent(selectedTemplate.plainContent || "");
    } else if (selectedTemplate) {
      // If docContent isn't loaded with the template, fetch it separately
      const fetchTemplateContent = async () => {
        try {
          const response = await fetch(`/api/templates/${selectedTemplate.id}`);
          const template = await response.json();
          setTemplateContent(template.docContent || "");
          setPlainTemplateContent(template.plainContent || "");
        } catch (error) {
          console.error("Failed to fetch template content:", error);
        }
      };
      fetchTemplateContent();
    }
  }, [selectedTemplate]);

  // Auto-populate vendor fields when vendor is selected
  useEffect(() => {
    if (selectedVendor) {
      // Format vendor contact information
      const contactInfo = [];
      if (selectedVendor.contactEmail) contactInfo.push(`Email: ${selectedVendor.contactEmail}`);
      if (selectedVendor.phone) contactInfo.push(`Phone: ${selectedVendor.phone}`);
      if (selectedVendor.additionalInfo) contactInfo.push(`Additional Info: ${selectedVendor.additionalInfo}`);
      
      const vendorInfoFormatted = contactInfo.join(' | ');
      
      // Set all vendor fields in the form
      form.setValue("vendorName", selectedVendor.name);
      form.setValue("vendorAddress", selectedVendor.address || "");
      form.setValue("vendorStatus", "Active");
      form.setValue("vendorInfo", vendorInfoFormatted);
      
      console.log("Vendor fields populated:", {
        name: selectedVendor.name,
        address: selectedVendor.address,
        info: vendorInfoFormatted
      });
    }
  }, [selectedVendor, form]);

  // Auto-populate owner fields when owner is selected
  useEffect(() => {
    if (selectedOwner) {
      // Format owner contact information
      const ownerInfo = [];
      if (selectedOwner.email) ownerInfo.push(`Email: ${selectedOwner.email}`);
      if (selectedOwner.phone) ownerInfo.push(`Phone: ${selectedOwner.phone}`);
      if (selectedOwner.contactPerson) ownerInfo.push(`Contact Person: ${selectedOwner.contactPerson}`);
      if (selectedOwner.additionalInfo) ownerInfo.push(`Additional Info: ${selectedOwner.additionalInfo}`);
      
      const ownerInfoFormatted = ownerInfo.join(' | ');
      
      // Set all owner fields in the form
      form.setValue("ownerName", selectedOwner.name);
      form.setValue("ownerAddress", selectedOwner.address || "");
      form.setValue("ownerStatus", selectedOwner.status || "Individual");
      form.setValue("ownerInfo", ownerInfoFormatted);
      
      console.log("Owner fields populated:", {
        name: selectedOwner.name,
        address: selectedOwner.address,
        status: selectedOwner.status,
        info: ownerInfoFormatted
      });
    }
  }, [selectedOwner, form]);

  // Auto-populate architect fields when architect is selected
  useEffect(() => {
    if (selectedArchitect) {
      // Format architect contact information
      const architectInfo = [];
      if (selectedArchitect.email) architectInfo.push(`Email: ${selectedArchitect.email}`);
      if (selectedArchitect.phone) architectInfo.push(`Phone: ${selectedArchitect.phone}`);
      if (selectedArchitect.licenseNumber) architectInfo.push(`License: ${selectedArchitect.licenseNumber}`);
      if (selectedArchitect.specialization) architectInfo.push(`Specialization: ${selectedArchitect.specialization}`);
      if (selectedArchitect.additionalInfo) architectInfo.push(`Additional Info: ${selectedArchitect.additionalInfo}`);
      
      const architectInfoFormatted = architectInfo.join(' | ');
      
      // Set all architect fields in the form
      form.setValue("architectName", selectedArchitect.name);
      form.setValue("architectAddress", selectedArchitect.address || "");
      form.setValue("architectStatus", selectedArchitect.status || "Professional Corporation");
      form.setValue("architectInfo", architectInfoFormatted);
      
      console.log("Architect fields populated:", {
        name: selectedArchitect.name,
        address: selectedArchitect.address,
        status: selectedArchitect.status,
        info: architectInfoFormatted
      });
    }
  }, [selectedArchitect, form]);  

  // Auto-populate form when template is selected
  useEffect(() => {
    if (selectedTemplate) {
      if (!form.getValues("projectName") || form.getValues("projectName") === "") {
        form.setValue("projectName", selectedTemplate.defaultProjectName || "");
      }

      if (form.getValues("budgetAmount") === "0" && selectedTemplate.defaultBudgetAmount) {
        form.setValue("budgetAmount", String(selectedTemplate.defaultBudgetAmount));
      }

      if (selectedTemplate.defaultDurationMonths) {
        const start = new Date(form.getValues("startDate") || new Date());
        const end = addMonths(start, selectedTemplate.defaultDurationMonths);
        form.setValue("endDate", format(end, "yyyy-MM-dd"));
      }
    }
  }, [selectedTemplate, form]);

  // If templateId is in URL, wait for templates to load and then set it
  useEffect(() => {
    if (templateIdFromUrl && templates && !selectedTemplateId) {
      form.setValue("templateId", Number(templateIdFromUrl));
    }
  }, [templateIdFromUrl, templates, form, selectedTemplateId]);

  // Function to find which tab contains a field
  const findTabForField = (fieldName: string): string => {
    for (const [tab, fields] of Object.entries(tabFieldMapping)) {
      if (fields.includes(fieldName)) {
        return tab;
      }
    }
    return "project"; // Default to project tab
  };

  // Mock AI responses in case we don't want to consume tokens from the AI Model
  // Mock A101 responses
  const getMockA101Placeholders = (budgetAmount: string = '150000'): A101PlaceholderResponse => {
    const amount = parseFloat(budgetAmount);
    const amountWords = numberToWords(Math.floor(amount));
    
    return {
      contract_words: amountWords,
      contract_amount: budgetAmount,
      alternate_item_1: "Premium finishes package",
      alternate_price_1: "$25,000",
      alternate_conditional_item_1: "Roof terrace addition",
      alternate_conditional_price_1: "$75,000",
      alternate_condition_1: "If approved within 45 days",
      allowance_item_1: "Interior fixtures allowance",
      allowance_price_1: "$15,000",
      unit_price_item_1: "Additional concrete work",
      unit_price_limits_1: "Up to 100 cubic yards",
      unit_price_value_1: "$200 per cubic yard",
      retainage: "10%",
      items_no_retainage: "N/A",
      retainage_provisions: "N/A",
      release_of_retainage: "50% at substantial completion, 50% at final completion",
      interest_rate: "1.5% per month",
      termination_amount: "N/A",
      portion_of_work: "Phase 1 - Foundation",
      completion_date: "March 15, 2025",
      liquidated_damages: "$500 per day of delay",
      other_bonus_provisions: "Early completion bonus of $15,000",
      // doc_1: "&nbsp;X&nbsp;",
      // doc_2: "&nbsp;&nbsp;",
      // doc_3: "&nbsp;&nbsp;",
      // commencement_date: "&nbsp;&nbsp;",
      // bdr_1: "&nbsp;&nbsp;",
      // bdr_2: "&nbsp;X&nbsp;",
      // bdr_3: "&nbsp;&nbsp;",
      // bdr_other: "&nbsp;&nbsp;",
      doc_1: "X",
      doc_2: "",
      doc_3: "",
      commencement_date: "",
      bdr_1: "",
      bdr_2: "X",
      bdr_3: "",
      bdr_other: "",
    };
  };

  // Mock A102 responses
  const getMockA102Placeholders = (): A102PlaceholderResponse => ({
    contractor_fee: "5% of Cost of the Work",
    fee_adjustment_method: "Adjusted based on approved change orders.",
    subcontractor_profit_limitations: "Subcontractor profit capped at 10%.",
    rental_rate_percent_words: "Five",
    rental_rate_percent: "5%",
    unit_price_item_1: "Concrete work per cubic yard",
    unit_price_limits_1: "Up to 500 cubic yards",
    unit_price_value_1: "$180 per cubic yard",
    liquidated_damages: "$1,000 per day of delay",
    other_bonus_provisions: "Early completion bonus of $10,000.",
    gmp_words: "Two Million Dollars",
    gmp_amount: "2,000,000",
    alternate_item_1: "Premium exterior finishes",
    alternate_price_1: "$50,000",
    alternate_conditional_item_1: "Solar panel installation",
    alternate_conditional_price_1: "$120,000",
    alternate_condition_1: "If approved within 30 days.",
    allowance_item_1: "Interior fixtures allowance",
    allowance_price_1: "$40,000",
    gmp_assumptions: "Based on current market pricing.",
    off_site_personnel_costs: "Included in general conditions.",
  });

  // Mock A141 responses (your existing)
  const getMockA141Placeholders = (): A141PlaceholderResponse => ({
    owner_program: "Modern office building with open workspace layout.",
    owner_design_requirements: "Energy-efficient LEED Silver target.",
    project_physical_characteristics: "3-story steel frame structure.",
    sustainable_objective: "Reduce energy consumption by 25%.",
    incentive_programs: "Shared savings incentive.",
    owner_budget: "$2.5M estimated project budget.",
    design_milestone_dates: "Schematic: 30d, Design Dev: 60d.",
    design_builder_proposal_submission: "Within 45 days.",
    phased_completion_dates: "Core & Shell → Interiors.",
    substantial_completion_date: "14 months from start.",
    other_milestone_dates: "Permit approval within 90 days.",
    consultant_name: "ABC Engineering Consultants",
    consultant_address: "123 Market St, Phoenix AZ",
    consultant_status: "Independent Consultant",
    consultant_info: "Structural and MEP services.",
    additional_owner_criteria: "Minimize neighborhood disruption.",
    project_manager_name: "John Doe",
    project_manager_address: "Phoenix AZ",
    project_manager_info: "Owner’s representative.",
    submittal_reviewers: "Architect and Owner PM",
    owner_consultants_and_contractors: "Geotechnical & Survey.",
    design_builder_representative: "Jane Smith",
    pre_amendment_compensation: "$25,000",
    hourly_billing_rates: "PM $150/hr, Engineer $120/hr",
  });

  // Determine template type and get appropriate mocks
  const getMockPlaceholders = (templateType: string, budgetAmount: string): AIPlaceholderResponse => {
    if (templateType === 'a101') {
      return getMockA101Placeholders(budgetAmount);
    } else if (templateType === 'a141') {
      return getMockA141Placeholders();
    } else {
      return getMockA102Placeholders();
    }
  };

  // Handle for AI generation
  const handleFormSubmit = async (values: FormValues) => {
    try {
      // Double-check required fields before proceeding
      if (!values.projectName || !values.projectNumber || !values.budgetAmount || !values.startDate || !values.endDate || !values.vendorId) {
        toast({
          title: "Missing Required Fields",
          description: "Please fill in all required fields",
          variant: "destructive",
        });
        return;
      }
      
      // Show loading toast for AI generation
      toast({
        title: "Generating Contract",
        description: "AI is analyzing your project details and generating a new contract...",
      });
      
      // Prepare the data for placeholder replacement
      // const startDateObj = new Date(values.startDate);
      const startDateObj = new Date();
      const dateWords = dateToWords(startDateObj);
      
      // Format vendor info for display in the template
      let vendorInfoDisplay = values.vendorInfo || '';
      
      // If vendor_info contains JSON, format it nicely
      try {
        const vendorInfoObj = JSON.parse(vendorInfoDisplay);
        vendorInfoDisplay = Object.entries(vendorInfoObj)
          .map(([key, value]) => `${key}: ${value}`)
          .join(', ');
      } catch {
        // If it's not JSON, use as is
      }

      // Create a map of placeholder values
      const placeholderValues: Record<string, string> = {
        // Date placeholders
        start_date_day: dateWords.day,
        start_date_month: dateWords.month,
        start_date_year: dateWords.year,
        // Project placeholders
        project_name: values.projectName || '',
        project_location: values.projectLocation || '',
        project_description: values.projectDescription || '',
        // Owner placeholders
        owner_name: values.ownerName || '',
        owner_status: values.ownerStatus || '',
        owner_address: values.ownerAddress || '',
        owner_info: values.ownerInfo || '',
        // Architect placeholders
        architect_name: values.architectName || '',
        architect_status: values.architectStatus || '',
        architect_address: values.architectAddress || '',
        architect_info: values.architectInfo || '',
        // Vendor placeholders
        vendor_name: values.vendorName || '',
        vendor_status: values.vendorStatus || '',
        vendor_address: values.vendorAddress || '',
        vendor_info: vendorInfoDisplay,
      };
      
      // Generate AI values for all placeholders
      try {
        let aiValues;

        if (!USE_AI_PLACEHOLDERS) {
          console.warn("Using mock placeholders (AI disabled)");
          // aiValues = isA141Template ? getMockA141Placeholders() : getMockStandardPlaceholders();
          aiValues = getMockPlaceholders(templateType, values.budgetAmount);
        } else {
          aiValues = await generateAIPlaceholderValues(
            {
              projectName: values.projectName,
              projectNumber: values.projectNumber,
              projectLocation: values.projectLocation,
              projectDescription: values.projectDescription,
              budgetAmount: values.budgetAmount,
              startDate: values.startDate,
              endDate: values.endDate,
              ownerName: values.ownerName,
              ownerStatus: values.ownerStatus,
              ownerAddress: values.ownerAddress,
              ownerInfo: values.ownerInfo,
              architectName: values.architectName,
              architectStatus: values.architectStatus,
              architectAddress: values.architectAddress,
              architectInfo: values.architectInfo,
              vendorName: values.vendorName,
              vendorStatus: values.vendorStatus,
              vendorAddress: values.vendorAddress,
              vendorInfo: vendorInfoDisplay,
              selectedTemplateName: selectedTemplate?.name,
            },
            plainTemplateContent
          );
        }

        if (isA101Template) {
          // Handle A101-specific placeholders
          const a101Values = aiValues as A101PlaceholderResponse;
          
          a101Values.doc_1 = "&nbsp;" + a101Values.doc_1 + "&nbsp;";
          a101Values.doc_2 = "&nbsp;" + a101Values.doc_2 + "&nbsp;";
          a101Values.doc_3 = "&nbsp;" + a101Values.doc_3 + "&nbsp;";
          a101Values.commencement_date = "&nbsp;" + a101Values.commencement_date + "&nbsp;";
          a101Values.bdr_1 = "&nbsp;" + a101Values.bdr_1 + "&nbsp;";
          a101Values.bdr_2 = "&nbsp;" + a101Values.bdr_2 + "&nbsp;";
          a101Values.bdr_3 = "&nbsp;" + a101Values.bdr_3 + "&nbsp;";
          a101Values.bdr_other = "&nbsp;" + a101Values.bdr_other + "&nbsp;";

          // placeholderValues.contract_words = a101Values.contract_words;
          // placeholderValues.contract_amount = a101Values.contract_amount;
          placeholderValues.contract_words = numberToWords(Math.floor(parseFloat(values.budgetAmount)));
          placeholderValues.contract_amount = values.budgetAmount;
          placeholderValues.alternate_item_1 = a101Values.alternate_item_1;
          placeholderValues.alternate_price_1 = a101Values.alternate_price_1;
          placeholderValues.alternate_conditional_item_1 = a101Values.alternate_conditional_item_1;
          placeholderValues.alternate_conditional_price_1 = a101Values.alternate_conditional_price_1;
          placeholderValues.alternate_condition_1 = a101Values.alternate_condition_1;
          placeholderValues.allowance_item_1 = a101Values.allowance_item_1;
          placeholderValues.allowance_price_1 = a101Values.allowance_price_1;
          placeholderValues.unit_price_item_1 = a101Values.unit_price_item_1;
          placeholderValues.unit_price_limits_1 = a101Values.unit_price_limits_1;
          placeholderValues.unit_price_value_1 = a101Values.unit_price_value_1;
          placeholderValues.retainage = a101Values.retainage;
          placeholderValues.items_no_retainage = a101Values.items_no_retainage;
          placeholderValues.retainage_provisions = a101Values.retainage_provisions;
          placeholderValues.release_of_retainage = a101Values.release_of_retainage;
          placeholderValues.interest_rate = a101Values.interest_rate;
          placeholderValues.termination_amount = a101Values.termination_amount;
          placeholderValues.portion_of_work = a101Values.portion_of_work;
          placeholderValues.completion_date = a101Values.completion_date;
          placeholderValues.liquidated_damages = a101Values.liquidated_damages;
          placeholderValues.other_bonus_provisions = a101Values.other_bonus_provisions;
          placeholderValues.doc_1 = a101Values.doc_1;
          placeholderValues.doc_2 = a101Values.doc_2;
          placeholderValues.doc_3 = a101Values.doc_3;
          placeholderValues.commencement_date = a101Values.commencement_date;
          placeholderValues.bdr_1 = a101Values.bdr_1;
          placeholderValues.bdr_2 = a101Values.bdr_2;
          placeholderValues.bdr_3 = a101Values.bdr_3;
          placeholderValues.bdr_other = a101Values.bdr_other;

          // Set empty for A102/A141 specific fields (they won't be used)
          placeholderValues.contractor_fee = "";
          placeholderValues.fee_adjustment_method = "";
          placeholderValues.subcontractor_profit_limitations = "";
          placeholderValues.rental_rate_percent_words = "";
          placeholderValues.rental_rate_percent = "";
          placeholderValues.gmp_words = "";
          placeholderValues.gmp_amount = "";
          placeholderValues.gmp_assumptions = "";
          placeholderValues.off_site_personnel_costs = "";
          placeholderValues.owner_program = "";
          placeholderValues.owner_design_requirements = "";
          placeholderValues.project_physical_characteristics = "";
          placeholderValues.sustainable_objective = "";
          placeholderValues.incentive_programs = "";
          placeholderValues.owner_budget = "";
          placeholderValues.design_milestone_dates = "";
          placeholderValues.design_builder_proposal_submission = "";
          placeholderValues.phased_completion_dates = "";
          placeholderValues.substantial_completion_date = "";
          placeholderValues.other_milestone_dates = "";
          placeholderValues.consultant_name = "";
          placeholderValues.consultant_address = "";
          placeholderValues.consultant_status = "";
          placeholderValues.consultant_info = "";
          placeholderValues.additional_owner_criteria = "";
          placeholderValues.project_manager_name = "";
          placeholderValues.project_manager_address = "";
          placeholderValues.project_manager_info = "";
          placeholderValues.submittal_reviewers = "";
          placeholderValues.owner_consultants_and_contractors = "";
          placeholderValues.design_builder_representative = "";
          placeholderValues.pre_amendment_compensation = "";
          placeholderValues.hourly_billing_rates = "";

          console.log("Submitting A101 contract with data:", {
            projectName: values.projectName,
            projectNumber: values.projectNumber,
            budgetAmount: values.budgetAmount,
            startDate: values.startDate,
            endDate: values.endDate,
            vendorName: values.vendorName,
            vendorStatus: values.vendorStatus,
            vendorAddress: values.vendorAddress,
            vendorInfo: values.vendorInfo,
            ownerName: values.ownerName,
            ownerStatus: values.ownerStatus,
            ownerAddress: values.ownerAddress,
            ownerInfo: values.ownerInfo,
            architectName: values.architectName,
            architectStatus: values.architectStatus,
            architectAddress: values.architectAddress,
            architectInfo: values.architectInfo,
            retainage: placeholderValues.retainage,
            items_no_retainage: placeholderValues.items_no_retainage,
            retainage_provisions: placeholderValues.retainage_provisions,
            release_of_retainage: placeholderValues.release_of_retainage,
            interest_rate: placeholderValues.interest_rate,
            termination_amount: placeholderValues.termination_amount,
            portion_of_work: placeholderValues.portion_of_work,
            completion_date: placeholderValues.completion_date,
            liquidated_damages: placeholderValues.liquidated_damages,
            other_bonus_provisions: placeholderValues.other_bonus_provisions,
            alternate_item_1: placeholderValues.alternate_item_1,
            alternate_price_1: placeholderValues.alternate_price_1,
            alternate_conditional_item_1: placeholderValues.alternate_conditional_item_1,
            alternate_conditional_price_1: placeholderValues.alternate_conditional_price_1,
            alternate_condition_1: placeholderValues.alternate_condition_1,
            allowance_item_1: placeholderValues.allowance_item_1,
            allowance_price_1: placeholderValues.allowance_price_1,
            unit_price_item_1: placeholderValues.unit_price_item_1,
            unit_price_limits_1: placeholderValues.unit_price_limits_1,
            unit_price_value_1: placeholderValues.unit_price_value_1,
            doc_1: placeholderValues.doc_1,
            doc_2: placeholderValues.doc_2,
            doc_3: placeholderValues.doc_3,
            commencement_date: placeholderValues.commencement_date,
            bdr_1: placeholderValues.bdr_1,
            bdr_2: placeholderValues.bdr_2,
            bdr_3: placeholderValues.bdr_3,
            bdr_other: placeholderValues.bdr_other,
          });
        } 
        else if (isA141Template) {
          // Handle A141-specific placeholders
          const a141Values = aiValues as A141PlaceholderResponse;
          
          placeholderValues.owner_program = a141Values.owner_program;
          placeholderValues.owner_design_requirements = a141Values.owner_design_requirements;
          placeholderValues.project_physical_characteristics = a141Values.project_physical_characteristics;
          placeholderValues.sustainable_objective = a141Values.sustainable_objective;
          placeholderValues.incentive_programs = a141Values.incentive_programs;
          placeholderValues.owner_budget = a141Values.owner_budget;
          placeholderValues.design_milestone_dates = a141Values.design_milestone_dates;
          placeholderValues.design_builder_proposal_submission = a141Values.design_builder_proposal_submission;
          placeholderValues.phased_completion_dates = a141Values.phased_completion_dates;
          placeholderValues.substantial_completion_date = a141Values.substantial_completion_date;
          placeholderValues.other_milestone_dates = a141Values.other_milestone_dates;
          placeholderValues.consultant_name = a141Values.consultant_name;
          placeholderValues.consultant_address = a141Values.consultant_address;
          placeholderValues.consultant_status = a141Values.consultant_status;
          placeholderValues.consultant_info = a141Values.consultant_info;
          placeholderValues.additional_owner_criteria = a141Values.additional_owner_criteria;
          placeholderValues.project_manager_name = a141Values.project_manager_name;
          placeholderValues.project_manager_address = a141Values.project_manager_address;
          placeholderValues.project_manager_info = a141Values.project_manager_info;
          placeholderValues.submittal_reviewers = a141Values.submittal_reviewers;
          placeholderValues.owner_consultants_and_contractors = a141Values.owner_consultants_and_contractors;
          placeholderValues.design_builder_representative = a141Values.design_builder_representative;
          placeholderValues.pre_amendment_compensation = a141Values.pre_amendment_compensation;
          placeholderValues.hourly_billing_rates = a141Values.hourly_billing_rates;
          
          // Set empty/default values for standard placeholders (they won't be used)
          placeholderValues.contractor_fee = "";
          placeholderValues.fee_adjustment_method = "";
          placeholderValues.subcontractor_profit_limitations = "";
          placeholderValues.rental_rate_percent_words = "";
          placeholderValues.rental_rate_percent = "";
          placeholderValues.unit_price_item_1 = "";
          placeholderValues.unit_price_limits_1 = "";
          placeholderValues.unit_price_value_1 = "";
          placeholderValues.liquidated_damages = "";
          placeholderValues.other_bonus_provisions = "";
          placeholderValues.gmp_words = "";
          placeholderValues.gmp_amount = "";
          placeholderValues.alternate_item_1 = "";
          placeholderValues.alternate_price_1 = "";
          placeholderValues.alternate_conditional_item_1 = "";
          placeholderValues.alternate_conditional_price_1 = "";
          placeholderValues.alternate_condition_1 = "";
          placeholderValues.allowance_item_1 = "";
          placeholderValues.allowance_price_1 = "";
          placeholderValues.gmp_assumptions = "";
          placeholderValues.off_site_personnel_costs = "";

          console.log("Submitting A141 contract with data:", {
            projectName: values.projectName,
            projectNumber: values.projectNumber,
            budgetAmount: values.budgetAmount,
            startDate: values.startDate,
            endDate: values.endDate,
            vendorName: values.vendorName,
            vendorStatus: values.vendorStatus,
            vendorAddress: values.vendorAddress,
            vendorInfo: values.vendorInfo,
            ownerName: values.ownerName,
            ownerStatus: values.ownerStatus,
            ownerAddress: values.ownerAddress,
            ownerInfo: values.ownerInfo,
            architectName: values.architectName,
            architectStatus: values.architectStatus,
            architectAddress: values.architectAddress,
            architectInfo: values.architectInfo,
            ownerprogram: placeholderValues.owner_program,
            ownerdesignrequirements: placeholderValues.owner_design_requirements,
            projectphysicalcharacteristics: placeholderValues.project_physical_characteristics,
            sustainableobjective: placeholderValues.sustainable_objective,
            incentiveprograms: placeholderValues.incentive_programs,
            ownerbudget: placeholderValues.owner_budget,
            designmilestonedates: placeholderValues.design_milestone_dates,
            designbuilderproposalsubmission: placeholderValues.design_builder_proposal_submission,
            phasedcompletiondates: placeholderValues.phased_completion_dates,
            substantialcompletiondate: placeholderValues.substantial_completion_date,
            othermilestonedates: placeholderValues.other_milestone_dates,
            consultantname: placeholderValues.consultant_name,
            consultantaddress: placeholderValues.consultant_address,
            consultantstatus: placeholderValues.consultant_status,
            consultantinfo: placeholderValues.consultant_info,
            additionalownercriteria: placeholderValues.additional_owner_criteria,
            projectmanagername: placeholderValues.project_manager_name,
            projectmanageraddress: placeholderValues.project_manager_address,
            projectmanagerinfo: placeholderValues.project_manager_info,
            submittalreviewers: placeholderValues.submittal_reviewers,
            ownerconsultantsandcontractors: placeholderValues.owner_consultants_and_contractors,
            designbuilderrepresentative: placeholderValues.design_builder_representative,
            preamendmentcompensation: placeholderValues.pre_amendment_compensation,
            hourlybillingrates: placeholderValues.hourly_billing_rates,
          });     
          
          console.log("Submitting A141 contract with data:", {
            projectName: values.projectName,
            projectNumber: values.projectNumber,
            budgetAmount: values.budgetAmount,
            startDate: values.startDate,
            endDate: values.endDate,
            vendorName: values.vendorName,
            vendorStatus: values.vendorStatus,
            vendorAddress: values.vendorAddress,
            vendorInfo: values.vendorInfo,
            ownerName: values.ownerName,
            ownerStatus: values.ownerStatus,
            ownerAddress: values.ownerAddress,
            ownerInfo: values.ownerInfo,
            architectName: values.architectName,
            architectStatus: values.architectStatus,
            architectAddress: values.architectAddress,
            architectInfo: values.architectInfo,
            ownerprogram: placeholderValues.owner_program,
            ownerdesignrequirements: placeholderValues.owner_design_requirements,
            projectphysicalcharacteristics: placeholderValues.project_physical_characteristics,
            sustainableobjective: placeholderValues.sustainable_objective,
            incentiveprograms: placeholderValues.incentive_programs,
            ownerbudget: placeholderValues.owner_budget,
            designmilestonedates: placeholderValues.design_milestone_dates,
            designbuilderproposalsubmission: placeholderValues.design_builder_proposal_submission,
            phasedcompletiondates: placeholderValues.phased_completion_dates,
            substantialcompletiondate: placeholderValues.substantial_completion_date,
            othermilestonedates: placeholderValues.other_milestone_dates,
            consultantname: placeholderValues.consultant_name,
            consultantaddress: placeholderValues.consultant_address,
            consultantstatus: placeholderValues.consultant_status,
            consultantinfo: placeholderValues.consultant_info,
            additionalownercriteria: placeholderValues.additional_owner_criteria,
            projectmanagername: placeholderValues.project_manager_name,
            projectmanageraddress: placeholderValues.project_manager_address,
            projectmanagerinfo: placeholderValues.project_manager_info,
            submittalreviewers: placeholderValues.submittal_reviewers,
            ownerconsultantsandcontractors: placeholderValues.owner_consultants_and_contractors,
            designbuilderrepresentative: placeholderValues.design_builder_representative,
            preamendmentcompensation: placeholderValues.pre_amendment_compensation,
            hourlybillingrates: placeholderValues.hourly_billing_rates,
          });
        } 
        else {
          // Handle standard template placeholders
          const standardValues = aiValues as A102PlaceholderResponse;
          
          placeholderValues.contractor_fee = standardValues.contractor_fee;
          placeholderValues.fee_adjustment_method = standardValues.fee_adjustment_method;
          placeholderValues.subcontractor_profit_limitations = standardValues.subcontractor_profit_limitations;
          placeholderValues.rental_rate_percent_words = standardValues.rental_rate_percent_words;
          placeholderValues.rental_rate_percent = standardValues.rental_rate_percent;
          placeholderValues.unit_price_item_1 = standardValues.unit_price_item_1;
          placeholderValues.unit_price_limits_1 = standardValues.unit_price_limits_1;
          placeholderValues.unit_price_value_1 = standardValues.unit_price_value_1;
          placeholderValues.liquidated_damages = standardValues.liquidated_damages;
          placeholderValues.other_bonus_provisions = standardValues.other_bonus_provisions;
          placeholderValues.gmp_words = standardValues.gmp_words;
          placeholderValues.gmp_amount = standardValues.gmp_amount;
          placeholderValues.alternate_item_1 = standardValues.alternate_item_1;
          placeholderValues.alternate_price_1 = standardValues.alternate_price_1;
          placeholderValues.alternate_conditional_item_1 = standardValues.alternate_conditional_item_1;
          placeholderValues.alternate_conditional_price_1 = standardValues.alternate_conditional_price_1;
          placeholderValues.alternate_condition_1 = standardValues.alternate_condition_1;
          placeholderValues.allowance_item_1 = standardValues.allowance_item_1;
          placeholderValues.allowance_price_1 = standardValues.allowance_price_1;
          placeholderValues.gmp_assumptions = standardValues.gmp_assumptions;
          placeholderValues.off_site_personnel_costs = standardValues.off_site_personnel_costs;
          
          // Set empty/default values for A141 placeholders
          placeholderValues.owner_program = "";
          placeholderValues.owner_design_requirements = "";
          placeholderValues.project_physical_characteristics = "";
          placeholderValues.sustainable_objective = "";
          placeholderValues.incentive_programs = "";
          placeholderValues.owner_budget = "";
          placeholderValues.design_milestone_dates = "";
          placeholderValues.design_builder_proposal_submission = "";
          placeholderValues.phased_completion_dates = "";
          placeholderValues.substantial_completion_date = "";
          placeholderValues.other_milestone_dates = "";
          placeholderValues.consultant_name = "";
          placeholderValues.consultant_address = "";
          placeholderValues.consultant_status = "";
          placeholderValues.consultant_info = "";
          placeholderValues.additional_owner_criteria = "";
          placeholderValues.project_manager_name = "";
          placeholderValues.project_manager_address = "";
          placeholderValues.project_manager_info = "";
          placeholderValues.submittal_reviewers = "";
          placeholderValues.owner_consultants_and_contractors = "";
          placeholderValues.design_builder_representative = "";
          placeholderValues.pre_amendment_compensation = "";
          placeholderValues.hourly_billing_rates = "";

          console.log("Submitting standard contract with data:", {
            projectName: values.projectName,
            projectNumber: values.projectNumber,
            budgetAmount: values.budgetAmount,
            startDate: values.startDate,
            endDate: values.endDate,
            vendorName: values.vendorName,
            vendorStatus: values.vendorStatus,
            vendorAddress: values.vendorAddress,
            vendorInfo: values.vendorInfo,
            ownerName: values.ownerName,
            ownerStatus: values.ownerStatus,
            ownerAddress: values.ownerAddress,
            ownerInfo: values.ownerInfo,
            architectName: values.architectName,
            architectStatus: values.architectStatus,
            architectAddress: values.architectAddress,
            architectInfo: values.architectInfo,
            contractor_fee: placeholderValues.contractor_fee,
            off_site_personnel_costs: placeholderValues.off_site_personnel_costs,
            subcontractor_profit_limitations: placeholderValues.subcontractor_profit_limitations,
            rental_rate_percent_words: placeholderValues.rental_rate_percent_words,
            rental_rate_percent: placeholderValues.rental_rate_percent,
            unit_price_item_1: placeholderValues.unit_price_item_1,
            unit_price_limits_1: placeholderValues.unit_price_limits_1,
            unit_price_value_1: placeholderValues.unit_price_value_1,
            liquidated_damages: placeholderValues.liquidated_damages,
            other_bonus_provisions: placeholderValues.other_bonus_provisions,
            gmp_words: placeholderValues.gmp_words,
            gmp_amount: placeholderValues.gmp_amount,
            alternate_item_1: placeholderValues.alternate_item_1,
            alternate_price_1: placeholderValues.alternate_price_1,
            alternate_conditional_item_1: placeholderValues.alternate_conditional_item_1,
            alternate_conditional_price_1: placeholderValues.alternate_conditional_price_1,
            alternate_condition_1: placeholderValues.alternate_condition_1,
            allowance_item_1: placeholderValues.allowance_item_1,
            allowance_price_1: placeholderValues.allowance_price_1,
            gmp_assumptions: placeholderValues.gmp_assumptions,
          });    
        }

        // Merge AI values into placeholderValues
        Object.assign(placeholderValues, aiValues);

        console.log("AI-generated placeholder values:", aiValues);
        
      } catch (aiError) {
        console.error("Error generating AI placeholders:", aiError);
        // Continue with empty values for AI placeholders
        toast({
          title: "AI Generation Warning",
          description: "Could not generate some contract details. You can edit them manually later.",
          variant: "default",
        });
      }
      
      // Replace placeholders in the template content
      const finalDocumentContent = replacePlaceholders(templateContent, placeholderValues);

      // Prepare the contract data
      const contractData = {
        ...values,
        startDate: new Date(values.startDate).toISOString(),
        endDate: new Date(values.endDate).toISOString(),
        documentContent: finalDocumentContent,
        placeholderData: placeholderValues,            // Include all the AI-generated values in placeholderData. This will be sent to the server
        ownerId: values.ownerId,
        ownerName: values.ownerName,
        ownerStatus: values.ownerStatus,
        ownerAddress: values.ownerAddress,
        ownerInfo: values.ownerInfo,
        architectId: values.architectId,
        architectName: values.architectName,
        architectStatus: values.architectStatus,
        architectAddress: values.architectAddress,
        architectInfo: values.architectInfo,
        vendorName: values.vendorName,
        vendorStatus: values.vendorStatus,
        vendorAddress: values.vendorAddress,
        vendorInfo: values.vendorInfo,
      };

      createContract(contractData, {
        onSuccess: (createdContract) => {
          toast({
            title: "Success",
            description: "Contract created successfully with AI-generated content!",
          });
          setLocation(`/contracts/${createdContract.id}`);
        },
        onError: (error) => {
          console.error("Contract creation error:", error);
          toast({
            title: "Error Creating Contract",
            description: error.message || "An unexpected error occurred",
            variant: "destructive",
          });
        }
      });
    } catch (error) {
      console.error("Form submission error:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };

  // Custom submit handler that checks for errors and switches tabs
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Trigger validation for all fields
    const isValid = await form.trigger();
    
    // Get all validation errors
    const errors = form.formState.errors;
    
    if (!isValid && Object.keys(errors).length > 0) {
      // Log all errors for debugging
      console.log("Validation errors:", errors);
      
      // Find the first field with an error
      const firstErrorField = Object.keys(errors)[0];
      const tabWithError = findTabForField(firstErrorField);
      
      // Switch to the tab containing the error
      setActiveTab(tabWithError);
      
      // Create a detailed error message
      const errorMessages = Object.entries(errors)
        .map(([field, error]) => `${field}: ${error.message}`)
        .join('\n');
      
      console.log("Error details:", errorMessages);
      
      // Show a toast notification with the specific error
      toast({
        title: "Validation Error",
        description: errors[firstErrorField]?.message || `Please fix the errors in the ${tabWithError} tab`,
        variant: "destructive",
      });
      
      // Scroll to the first error field after tab switch
      setTimeout(() => {
        // Try to find the field by various selectors
        const fieldName = firstErrorField;
        const errorElement = 
          document.querySelector(`[name="${fieldName}"]`) ||
          document.querySelector(`#${fieldName}`) ||
          document.querySelector(`[data-testid="${fieldName}"]`);
        
        if (errorElement) {
          errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          // Highlight the field briefly
          errorElement.classList.add('ring-2', 'ring-destructive', 'ring-offset-2');
          setTimeout(() => {
            errorElement.classList.remove('ring-2', 'ring-destructive', 'ring-offset-2');
          }, 2000);
        }
      }, 150);
    } else {
      // No errors, proceed with form submission
      form.handleSubmit(handleFormSubmit)(e);
    }
  };

  // Show loading state
  if (loadingTemplates) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  // Show error if no template found from URL
  if (templateIdFromUrl && (!templates || !templates.find(t => t.id === Number(templateIdFromUrl)))) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Button variant="ghost" onClick={() => setLocation("/contracts/select-template")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Template Selection
        </Button>
        <div className="text-center p-12 bg-destructive/10 rounded-xl">
          <FileText className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h3 className="text-lg font-bold text-destructive">Template Not Found</h3>
          <p className="text-muted-foreground mt-1">The selected template doesn't exist.</p>
          <Button className="mt-4" onClick={() => setLocation("/contracts/select-template")}>
            Choose Another Template
          </Button>
        </div>
      </div>
    );
  }
   
  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">
      <Button variant="ghost" className="mb-2 hover-elevate text-muted-foreground hover:text-foreground" onClick={() => setLocation("/contracts/select-template")}>
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Template Selection
      </Button>

      <div className="mb-6">
        <h1 className="text-3xl font-display font-bold text-foreground">Initiate Contract</h1>
        <p className="text-muted-foreground mt-1">Fill in the details to create a new contract.</p>
      </div>

      {selectedTemplate && (
        <div className="bg-primary/5 p-4 rounded-xl border border-primary/20 mb-4">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-primary" />
            <div>
              <p className="text-sm font-medium">Selected Template: <span className="text-primary">{selectedTemplate.name}</span></p>
              <p className="text-xs text-muted-foreground">{selectedTemplate.description}</p>
            </div>
          </div>
        </div>
      )}

      <Card className="glass-panel border-none shadow-xl">
        <Form {...form}>
          <form onSubmit={onSubmit}>
            <CardHeader className="bg-primary/5 border-b border-border/50 pb-6">
              <CardTitle className="text-xl text-primary font-display flex items-center">
                <FileText className="w-5 h-5 mr-2" />
                Contract Details
              </CardTitle>
              <CardDescription>Enter the project and owner information below.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-4 mb-6">
                <TabsTrigger value="project" className="relative">
                  Project Info
                  {form.formState.errors.projectName && activeTab !== "project" && (
                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-destructive"></span>
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="owner" className="relative">
                  Owner Info
                  {Object.keys(form.formState.errors).some(f => tabFieldMapping.owner.includes(f)) && activeTab !== "owner" && (
                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-destructive"></span>
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="architect" className="relative">
                  {isA141Template ? "Design-Builder Info" : "Architect Info"}
                  {Object.keys(form.formState.errors).some(f => tabFieldMapping.architect.includes(f)) && activeTab !== "architect" && (
                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-destructive"></span>
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="vendor" className="relative">
                  Vendor Info
                  {Object.keys(form.formState.errors).some(f => tabFieldMapping.vendor.includes(f)) && activeTab !== "vendor" && (
                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-destructive"></span>
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>

                <TabsContent value="project" className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="projectName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-semibold text-foreground">Project Name *</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. Science Lab Renovation" className="rounded-xl" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="projectNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-semibold text-foreground">Project Number *</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. PRJ-2024-001" className="rounded-xl" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="projectLocation"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-semibold text-foreground">Project Location</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                              <Input placeholder="e.g. 123 Main St, City" className="pl-10 rounded-xl" {...field} />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="budgetAmount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-semibold text-foreground">Budget Amount ($) *</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="50000" className="rounded-xl" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="startDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-semibold text-foreground">Start Date *</FormLabel>
                          <FormControl>
                            <Input type="date" className="rounded-xl" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="endDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-semibold text-foreground">End Date *</FormLabel>
                          <FormControl>
                            <Input type="date" className="rounded-xl" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="projectDescription"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-semibold text-foreground">Project Description</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Describe the project scope, objectives, and key deliverables..." 
                            className="rounded-xl min-h-[100px]" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>

                <TabsContent value="owner" className="space-y-6">
                  {/* Owner Selection Dropdown */}
                  <div className="grid grid-cols-1 gap-6">
                    <FormField
                      control={form.control}
                      name="ownerId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-semibold text-foreground">Select Owner (Optional)</FormLabel>
                          <Select 
                            disabled={loadingOwners} 
                            onValueChange={(val) => {
                              field.onChange(Number(val));
                              // The useEffect will handle populating other owner fields
                            }} 
                            value={field.value ? String(field.value) : undefined}
                          >
                            <FormControl>
                              <SelectTrigger className="rounded-xl">
                                <SelectValue placeholder="Choose an Owner" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {owners?.map(o => (
                                <SelectItem key={o.id} value={String(o.id)}>
                                  <div className="flex items-center gap-2">
                                    <User className="h-4 w-4" />
                                    {o.name}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="ownerName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-semibold text-foreground">Owner Name</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                              <Input 
                                placeholder={selectedOwner ? "Auto-populated from selected owner" : "e.g. John Smith"} 
                                className={`pl-10 rounded-xl ${selectedOwner ? "bg-muted" : ""}`} 
                                {...field} 
                                disabled={!!selectedOwner}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="ownerStatus"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-semibold text-foreground">Owner Status</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            value={field.value}
                            disabled={!!selectedOwner}
                          >
                            <FormControl>
                              <SelectTrigger className={`rounded-xl ${selectedOwner ? "bg-muted" : ""}`}>
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Individual">Individual</SelectItem>
                              <SelectItem value="Corporation">Corporation</SelectItem>
                              <SelectItem value="LLC">LLC</SelectItem>
                              <SelectItem value="Partnership">Partnership</SelectItem>
                              <SelectItem value="Trust">Trust</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="ownerAddress"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel className="font-semibold text-foreground">Owner Address</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                              <Input 
                                placeholder={selectedOwner ? "Auto-populated from selected owner" : "e.g. 456 Owner St, City"} 
                                className={`pl-10 rounded-xl ${selectedOwner ? "bg-muted" : ""}`} 
                                {...field} 
                                disabled={!!selectedOwner}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="ownerInfo"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel className="font-semibold text-foreground">Additional Owner Information</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder={selectedOwner ? "Auto-populated from selected owner" : "Any additional details about the owner..."} 
                              className={`rounded-xl min-h-[80px] ${selectedOwner ? "bg-muted" : ""}`} 
                              {...field} 
                              disabled={!!selectedOwner}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="architect" className="space-y-6">
                  {/* Architect Selection Dropdown */}
                  <div className="grid grid-cols-1 gap-6">
                    <FormField
                      control={form.control}
                      name="architectId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-semibold text-foreground">
                            {isA141Template ? "Select Design-Builder" : "Select Architect (Optional)"}
                          </FormLabel>
                          <Select 
                            disabled={loadingArchitects} 
                            onValueChange={(val) => {
                              field.onChange(Number(val));
                              // The useEffect will handle populating other architect fields
                            }} 
                            value={field.value ? String(field.value) : undefined}
                          >
                            <FormControl>
                              <SelectTrigger className="rounded-xl">
                                <SelectValue placeholder={isA141Template ? "Choose a Design-Builder" : "Choose an Architect"} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {architects?.map(a => (
                                <SelectItem key={a.id} value={String(a.id)}>
                                  <div className="flex items-center gap-2">
                                    <Building2 className="h-4 w-4" />
                                    {a.name}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="architectName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-semibold text-foreground">
                            {isA141Template ? "Design-Builder Name" : "Architect Name"}
                          </FormLabel>
                          <FormControl>
                            <div className="relative">
                              <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                              <Input 
                                placeholder={selectedArchitect ? "Auto-populated from selected architect" : (isA141Template ? "e.g. Design-Build Corp" : "e.g. Jane Smith Architects")} 
                                className={`pl-10 rounded-xl ${selectedArchitect ? "bg-muted" : ""}`} 
                                {...field} 
                                disabled={!!selectedArchitect}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="architectStatus"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-semibold text-foreground">
                            {isA141Template ? "Design-Builder Status" : "Architect Status"}
                          </FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            value={field.value}
                            disabled={!!selectedArchitect}
                          >
                            <FormControl>
                              {/* <SelectTrigger className="rounded-xl"> */}
                              <SelectTrigger className={`rounded-xl ${selectedArchitect ? "bg-muted" : ""}`}>
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Individual">Individual</SelectItem>
                              <SelectItem value="Corporation">Corporation</SelectItem>
                              <SelectItem value="LLC">LLC</SelectItem>
                              <SelectItem value="Partnership">Partnership</SelectItem>
                              <SelectItem value="Professional Corporation">Professional Corporation</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="architectAddress"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel className="font-semibold text-foreground">
                            {isA141Template ? "Design-Builder Address" : "Architect Address"}
                          </FormLabel>
                          <FormControl>
                            <div className="relative">
                              <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                              <Input 
                                placeholder={selectedArchitect ? "Auto-populated from selected architect" : (isA141Template ? "e.g. 123 Design Way, City" : "e.g. 789 Design St, City")} 
                                className={`pl-10 rounded-xl ${selectedArchitect ? "bg-muted" : ""}`} 
                                {...field} 
                                disabled={!!selectedArchitect}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="architectInfo"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel className="font-semibold text-foreground">
                            {isA141Template ? "Additional Design-Builder Information" : "Additional Architect Information"}
                          </FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder={selectedArchitect ? "Auto-populated from selected architect" : (isA141Template ? "License number, contact details, project experience..." : "License number, contact details, specializations...")} 
                              className={`rounded-xl min-h-[80px] ${selectedArchitect ? "bg-muted" : ""}`} 
                              {...field} 
                              disabled={!!selectedArchitect}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="vendor" className="space-y-6">
                <div className="grid grid-cols-1 gap-6">
                  <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
                    <FormField
                      control={form.control}
                      name="vendorId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-semibold text-foreground">Select Vendor *</FormLabel>
                          <Select 
                            disabled={loadingVendors} 
                            onValueChange={(val) => {
                              field.onChange(Number(val));
                              // The useEffect will handle populating other vendor fields
                            }} 
                            value={field.value ? String(field.value) : undefined}
                          >
                            <FormControl>
                              <SelectTrigger className="rounded-xl">
                                <SelectValue placeholder="Choose a vendor" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {vendors?.map(v => (
                                <SelectItem key={v.id} value={String(v.id)}>
                                  <div className="flex items-center gap-2">
                                    <Building2 className="h-4 w-4" />
                                    {v.name}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="vendorName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-semibold text-foreground">Vendor Name</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Will auto-populate from selected vendor" 
                              className="rounded-xl bg-muted" 
                              {...field} 
                              disabled
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="vendorStatus"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-semibold text-foreground">Vendor Status</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Will auto-populate" 
                              className="rounded-xl bg-muted" 
                              {...field} 
                              disabled
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Third row - Vendor Address full width */}
                  <div className="grid grid-cols-1 gap-6">
                    <FormField
                      control={form.control}
                      name="vendorAddress"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-semibold text-foreground">Vendor Address</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Will auto-populate from selected vendor" 
                              className="rounded-xl bg-muted" 
                              {...field} 
                              disabled
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Fourth row - Vendor Contact Information full width */}
                  <div className="grid grid-cols-1 gap-6">
                    <FormField
                      control={form.control}
                      name="vendorInfo"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-semibold text-foreground">Vendor Contact Information</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Will auto-populate from selected vendor" 
                              className="rounded-xl bg-muted min-h-[80px]" 
                              {...field} 
                              disabled
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </TabsContent>
              </Tabs>
            </CardContent>
            <CardFooter className="bg-muted/30 border-t border-border/50 py-4 flex justify-end">
              <Button type="submit" disabled={isPending} className="hover-elevate shadow-lg bg-gradient-to-r from-primary to-primary/80 rounded-xl px-8 py-6 h-auto text-base">
                {isPending ? "Creating..." : (
                  <>
                    <Wand2 className="w-5 h-5 mr-2" />
                    Create Contract
                  </>
                )}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
}