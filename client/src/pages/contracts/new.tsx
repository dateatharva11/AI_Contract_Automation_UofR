// import React, { useEffect } from "react";
// import { useLocation } from "wouter";
// import { useForm } from "react-hook-form";
// import { zodResolver } from "@hookform/resolvers/zod";
// import { z } from "zod";
// import { useCreateContract } from "@/hooks/use-contracts";
// import { useVendors } from "@/hooks/use-vendors";
// import { useTemplates } from "@/hooks/use-templates";
// import { insertContractSchema } from "@shared/schema";
// import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
// import { ArrowLeft, Wand2, FileText } from "lucide-react";
// import { addMonths, format } from "date-fns";

// // Extend the schema for the form specifically
// const formSchema = insertContractSchema.extend({
//   templateId: z.coerce.number().optional(),
//   vendorId: z.coerce.number().min(1, "Vendor is required"),
//   budgetAmount: z.coerce.number().min(0, "Budget must be positive").transform(v => String(v)),
//   startDate: z.string().min(1, "Start date is required"),
//   endDate: z.string().min(1, "End date is required"),
// });

// export default function NewContract() {
//   const [location, setLocation] = useLocation();
//   const { data: vendors, isLoading: loadingVendors } = useVendors();
//   const { data: templates, isLoading: loadingTemplates } = useTemplates();
//   const { mutate: createContract, isPending } = useCreateContract();

//   // Get templateId from query string
//   const searchParams = new URLSearchParams(window.location.search);
//   const templateIdFromUrl = searchParams.get("templateId");

//   const form = useForm<z.infer<typeof formSchema>>({
//     resolver: zodResolver(formSchema),
//     defaultValues: {
//       projectName: "",
//       projectNumber: "",
//       templateId: templateIdFromUrl ? Number(templateIdFromUrl) : 0,
//       vendorId: 0,
//       budgetAmount: "0",
//       startDate: format(new Date(), "yyyy-MM-dd"),
//       endDate: "",
//     },
//   });

//   const selectedTemplateId = form.watch("templateId");

//   useEffect(() => {
//     if (selectedTemplateId && templates) {
//       const template = templates.find(t => t.id === Number(selectedTemplateId));
//       if (template) {
//         form.setValue("projectName", template.defaultProjectName || "");
//         form.setValue("budgetAmount", String(template.defaultBudgetAmount) || "0");
        
//         if (template.defaultDurationMonths) {
//           const start = new Date();
//           const end = addMonths(start, template.defaultDurationMonths);
//           form.setValue("startDate", format(start, "yyyy-MM-dd"));
//           form.setValue("endDate", format(end, "yyyy-MM-dd"));
//         }
//       }
//     }
//   }, [selectedTemplateId, templates, form]);

//   function onSubmit(values: z.infer<typeof formSchema>) {
//     // Ensure dates are parsed properly before sending
//     createContract({
//       ...values,
//       startDate: new Date(values.startDate).toISOString(),
//       endDate: new Date(values.endDate).toISOString(),
//     }, {
//       onSuccess: () => {
//         setLocation("/contracts");
//       }
//     });
//   }

//   return (
//     <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-500">
//       <Button variant="ghost" className="mb-2 hover-elevate text-muted-foreground hover:text-foreground" onClick={() => setLocation("/contracts/select-template")}>
//         <ArrowLeft className="w-4 h-4 mr-2" />
//         Back to Template Selection
//       </Button>

//       <div className="mb-6">
//         <h1 className="text-3xl font-display font-bold text-foreground">Initiate Contract</h1>
//         <p className="text-muted-foreground mt-1">Select a template and enter project details.</p>
//       </div>

//       <Card className="glass-panel border-none shadow-xl">
//         <Form {...form}>
//           <form onSubmit={form.handleSubmit(onSubmit)}>
//             <CardHeader className="bg-primary/5 border-b border-border/50 pb-6">
//               <CardTitle className="text-xl text-primary font-display flex items-center">
//                 <FileText className="w-5 h-5 mr-2" />
//                 Contract Blueprint
//               </CardTitle>
//               <CardDescription>Enter project details to generate an AI-powered draft based on your selected template.</CardDescription>
//             </CardHeader>
//             <CardContent className="space-y-6 pt-6">
//               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//                 <FormField
//                   control={form.control}
//                   name="projectName"
//                   render={({ field }) => (
//                     <FormItem>
//                       <FormLabel className="font-semibold text-foreground">Project Name</FormLabel>
//                       <FormControl>
//                         <Input placeholder="e.g. Science Lab Renovation" className="rounded-xl bg-background border-border focus:ring-primary/20" {...field} />
//                       </FormControl>
//                       <FormMessage />
//                     </FormItem>
//                   )}
//                 />

//                 <FormField
//                   control={form.control}
//                   name="projectNumber"
//                   render={({ field }) => (
//                     <FormItem>
//                       <FormLabel className="font-semibold text-foreground">Project Number</FormLabel>
//                       <FormControl>
//                         <Input placeholder="e.g. PRJ-2024-001" className="rounded-xl bg-background border-border focus:ring-primary/20" {...field} />
//                       </FormControl>
//                       <FormMessage />
//                     </FormItem>
//                   )}
//                 />

//                 <FormField
//                   control={form.control}
//                   name="vendorId"
//                   render={({ field }) => (
//                     <FormItem>
//                       <FormLabel className="font-semibold text-foreground">Select Vendor</FormLabel>
//                       <Select disabled={loadingVendors} onValueChange={(val) => field.onChange(Number(val))} defaultValue={field.value ? String(field.value) : undefined}>
//                         <FormControl>
//                           <SelectTrigger className="rounded-xl bg-background border-border focus:ring-primary/20">
//                             <SelectValue placeholder="Choose a pre-approved vendor" />
//                           </SelectTrigger>
//                         </FormControl>
//                         <SelectContent>
//                           {vendors?.map(v => (
//                             <SelectItem key={v.id} value={String(v.id)}>{v.name}</SelectItem>
//                           ))}
//                         </SelectContent>
//                       </Select>
//                       <FormMessage />
//                     </FormItem>
//                   )}
//                 />

//                 <FormField
//                   control={form.control}
//                   name="budgetAmount"
//                   render={({ field }) => (
//                     <FormItem>
//                       <FormLabel className="font-semibold text-foreground">Budget Amount ($)</FormLabel>
//                       <FormControl>
//                         <Input type="number" placeholder="50000" className="rounded-xl bg-background border-border focus:ring-primary/20" {...field} />
//                       </FormControl>
//                       <FormMessage />
//                     </FormItem>
//                   )}
//                 />

//                 <FormField
//                   control={form.control}
//                   name="startDate"
//                   render={({ field }) => (
//                     <FormItem>
//                       <FormLabel className="font-semibold text-foreground">Start Date</FormLabel>
//                       <FormControl>
//                         <Input type="date" className="rounded-xl bg-background border-border focus:ring-primary/20" {...field} />
//                       </FormControl>
//                       <FormMessage />
//                     </FormItem>
//                   )}
//                 />

//                 <FormField
//                   control={form.control}
//                   name="endDate"
//                   render={({ field }) => (
//                     <FormItem>
//                       <FormLabel className="font-semibold text-foreground">End Date</FormLabel>
//                       <FormControl>
//                         <Input type="date" className="rounded-xl bg-background border-border focus:ring-primary/20" {...field} />
//                       </FormControl>
//                       <FormMessage />
//                     </FormItem>
//                   )}
//                 />
//               </div>
//             </CardContent>
//             <CardFooter className="bg-muted/30 border-t border-border/50 py-4 flex justify-end">
//               <Button type="submit" disabled={isPending} className="hover-elevate shadow-lg bg-gradient-to-r from-primary to-primary/80 rounded-xl px-8 py-6 h-auto text-base">
//                 {isPending ? "Initializing..." : (
//                   <>
//                     <Wand2 className="w-5 h-5 mr-2" />
//                     Create & Generate Draft
//                   </>
//                 )}
//               </Button>
//             </CardFooter>
//           </form>
//         </Form>
//       </Card>
//     </div>
//   );
// }

import React, { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCreateContract } from "@/hooks/use-contracts";
import { useVendors } from "@/hooks/use-vendors";
import { useTemplates } from "@/hooks/use-templates";
import { insertContractSchema } from "@shared/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ArrowLeft, Wand2, FileText } from "lucide-react";
import { addMonths, format } from "date-fns";

// Dummy templates data (same as in select-template)
const DUMMY_TEMPLATES = [
  {
    id: 1,
    name: "Construction Contract",
    description: "Standard construction agreement for building projects including payment terms, milestones, and compliance requirements.",
    defaultProjectName: "Construction Project",
    defaultBudgetAmount: 150000,
    defaultDurationMonths: 12
  },
  {
    id: 2,
    name: "Consulting Services Agreement",
    description: "Professional services contract for consultants covering scope of work, deliverables, and payment terms.",
    defaultProjectName: "Consulting Engagement",
    defaultBudgetAmount: 50000,
    defaultDurationMonths: 6
  },
  {
    id: 3,
    name: "Software Development Contract",
    description: "Agreement for custom software development including IP rights, milestones, and acceptance criteria.",
    defaultProjectName: "Software Development",
    defaultBudgetAmount: 75000,
    defaultDurationMonths: 4
  },
  {
    id: 4,
    name: "Maintenance Services Agreement",
    description: "Ongoing maintenance and support services contract with SLA terms and renewal conditions.",
    defaultProjectName: "Maintenance Services",
    defaultBudgetAmount: 25000,
    defaultDurationMonths: 24
  }
];

// Extend the schema for the form specifically
const formSchema = insertContractSchema.extend({
  templateId: z.coerce.number().optional(),
  vendorId: z.coerce.number().min(1, "Vendor is required"),
  budgetAmount: z.coerce.number().min(0, "Budget must be positive").transform(v => String(v)),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
});

export default function NewContract() {
  const [location, setLocation] = useLocation();
  const { data: vendors, isLoading: loadingVendors } = useVendors();
  const { data: apiTemplates, isLoading: loadingTemplates } = useTemplates();
  const { mutate: createContract, isPending } = useCreateContract();
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);

  // Use API templates if available, otherwise use dummy templates
  const templates = apiTemplates?.length ? apiTemplates : DUMMY_TEMPLATES;

  // Get templateId from query string
  const searchParams = new URLSearchParams(window.location.search);
  const templateIdFromUrl = searchParams.get("templateId");

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      projectName: "",
      projectNumber: "",
      templateId: templateIdFromUrl ? Number(templateIdFromUrl) : 0,
      vendorId: 0,
      budgetAmount: "0",
      startDate: format(new Date(), "yyyy-MM-dd"),
      endDate: "",
    },
  });

  const selectedTemplateId = form.watch("templateId");

  useEffect(() => {
    if (selectedTemplateId && templates) {
      const template = templates.find(t => t.id === Number(selectedTemplateId));
      if (template) {
        setSelectedTemplate(template);
        form.setValue("projectName", template.defaultProjectName || "");
        form.setValue("budgetAmount", String(template.defaultBudgetAmount || "0"));

        if (template.defaultDurationMonths) {
          const start = new Date();
          const end = addMonths(start, template.defaultDurationMonths);
          form.setValue("startDate", format(start, "yyyy-MM-dd"));
          form.setValue("endDate", format(end, "yyyy-MM-dd"));
        }
      }
    }
  }, [selectedTemplateId, templates, form]);

  // If templateId is in URL but not loaded yet, try to find it in templates
  useEffect(() => {
    if (templateIdFromUrl && templates.length > 0 && !selectedTemplate) {
      const template = templates.find(t => t.id === Number(templateIdFromUrl));
      if (template) {
        setSelectedTemplate(template);
        form.setValue("templateId", template.id);
      }
    }
  }, [templateIdFromUrl, templates, selectedTemplate, form]);

  function onSubmit(values: z.infer<typeof formSchema>) {
    // Ensure dates are parsed properly before sending
    createContract({
      ...values,
      startDate: new Date(values.startDate).toISOString(),
      endDate: new Date(values.endDate).toISOString(),
    }, {
      onSuccess: () => {
        setLocation("/contracts");
      }
    });
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-500">
      <Button variant="ghost" className="mb-2 hover-elevate text-muted-foreground hover:text-foreground" onClick={() => setLocation("/contracts/select-template")}>
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Template Selection
      </Button>

      <div className="mb-6">
        <h1 className="text-3xl font-display font-bold text-foreground">Initiate Contract</h1>
        <p className="text-muted-foreground mt-1">Select a template and enter project details.</p>
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
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardHeader className="bg-primary/5 border-b border-border/50 pb-6">
              <CardTitle className="text-xl text-primary font-display flex items-center">
                <FileText className="w-5 h-5 mr-2" />
                Contract Details
              </CardTitle>
              <CardDescription>Enter project details to generate an AI-powered draft based on your selected template.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="projectName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-semibold text-foreground">Project Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Science Lab Renovation" className="rounded-xl bg-background border-border focus:ring-primary/20" {...field} />
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
                      <FormLabel className="font-semibold text-foreground">Project Number</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. PRJ-2024-001" className="rounded-xl bg-background border-border focus:ring-primary/20" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="vendorId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-semibold text-foreground">Select Vendor</FormLabel>
                      <Select disabled={loadingVendors} onValueChange={(val) => field.onChange(Number(val))} value={field.value ? String(field.value) : undefined}>
                        <FormControl>
                          <SelectTrigger className="rounded-xl bg-background border-border focus:ring-primary/20">
                            <SelectValue placeholder="Choose a pre-approved vendor" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {vendors?.map(v => (
                            <SelectItem key={v.id} value={String(v.id)}>{v.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="budgetAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-semibold text-foreground">Budget Amount ($)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="50000" className="rounded-xl bg-background border-border focus:ring-primary/20" {...field} />
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
                      <FormLabel className="font-semibold text-foreground">Start Date</FormLabel>
                      <FormControl>
                        <Input type="date" className="rounded-xl bg-background border-border focus:ring-primary/20" {...field} />
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
                      <FormLabel className="font-semibold text-foreground">End Date</FormLabel>
                      <FormControl>
                        <Input type="date" className="rounded-xl bg-background border-border focus:ring-primary/20" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
            <CardFooter className="bg-muted/30 border-t border-border/50 py-4 flex justify-end">
              <Button type="submit" disabled={isPending} className="hover-elevate shadow-lg bg-gradient-to-r from-primary to-primary/80 rounded-xl px-8 py-6 h-auto text-base">
                {isPending ? "Initializing..." : (
                  <>
                    <Wand2 className="w-5 h-5 mr-2" />
                    Create & Generate Draft
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