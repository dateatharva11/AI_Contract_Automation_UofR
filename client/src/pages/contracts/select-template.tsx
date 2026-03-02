import React from "react";
import { useLocation } from "wouter";
import { useTemplates } from "@/hooks/use-templates";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function SelectTemplate() {
  const [, setLocation] = useLocation();
  const { data: templates, isLoading } = useTemplates();

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">
      <Button variant="ghost" className="mb-2 hover-elevate text-muted-foreground hover:text-foreground" onClick={() => setLocation("/contracts")}>
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Contracts
      </Button>

      <div className="mb-8 text-center">
        <h1 className="text-4xl font-display font-bold text-foreground">Choose a Contract Template</h1>
        <p className="text-muted-foreground mt-2 text-lg">Select the appropriate blueprint for your new project.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {templates?.map((template) => (
          <Card 
            key={template.id} 
            className="group hover-elevate cursor-pointer border-none shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden bg-card/50 backdrop-blur-sm"
            onClick={() => setLocation(`/contracts/new?templateId=${template.id}`)}
          >
            <CardHeader className="bg-primary/5 group-hover:bg-primary/10 transition-colors pb-4">
              <div className="flex items-start justify-between">
                <div className="bg-primary/10 p-2 rounded-lg text-primary">
                  <FileText className="w-6 h-6" />
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <CardTitle className="text-xl font-display mt-4 group-hover:text-primary transition-colors">{template.name}</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 flex-1 flex flex-col justify-between">
              <div>
                <CardDescription className="text-sm leading-relaxed min-h-[3rem]">
                  {template.description}
                </CardDescription>
                <div className="mt-6 flex flex-wrap gap-2">
                  <span className="text-[10px] uppercase tracking-wider font-bold bg-muted px-2 py-1 rounded">
                    {template.defaultDurationMonths} Months
                  </span>
                  <span className="text-[10px] uppercase tracking-wider font-bold bg-muted px-2 py-1 rounded">
                    Standard Terms
                  </span>
                </div>
              </div>
              <Button variant="outline" size="sm" className="mt-6 w-full group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
                View Sample
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
