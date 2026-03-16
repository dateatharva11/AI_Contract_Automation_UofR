import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

async function seedDatabase() {
  const users = await storage.getUsers();
  if (users.length === 0) {
    const admin = await storage.createUser({ username: 'admin1', password: 'password', role: 'contract_manager', fullName: 'Alice Admin', email: 'alice@uni.edu' });
    const reviewer = await storage.createUser({ username: 'reviewer1', password: 'password', role: 'reviewer', fullName: 'Bob Reviewer', email: 'bob@uni.edu' });
    const vendorUser = await storage.createUser({ username: 'vendor1', password: 'password', role: 'vendor', fullName: 'Charlie Vendor', email: 'charlie@vendor.com' });
    
    // Seed Vendors
    const vendor1 = await storage.createVendor({
      name: "Turner Construction Company",
      contactEmail: "sarah.johnson@turner.com",
      phone: "212-555-0123",
      address: "212-555-0123",
      defaultRates: "Standard GMP fee 3.5%",
      insuranceCertUrl: "General Liability $5M, Workers Comp, Auto Liability"
    });

    const vendor2 = await storage.createVendor({
      name: "Gilbane Building Company",
      contactEmail: "mchen@gilbane.com",
      phone: "401-555-0456",
      address: "401-555-0456",
      defaultRates: "Standard GMP fee 3.25% with incentive",
      insuranceCertUrl: "General Liability $10M, Umbrella $10M"
    });

    const vendor3 = await storage.createVendor({
      name: "Whiting-Turner Contracting",
      contactEmail: "drodriguez@whiting-turner.com",
      phone: "410-555-0789",
      address: "410-555-0789",
      defaultRates: "Standard GMP fee 3.75%",
      insuranceCertUrl: "General Liability $7.5M, Professional Liability $3M"
    });

    // Seed Templates
    await storage.createTemplate({
      name: "University New Academic Building Contract",
      description: "Standard AIA-based contract for new academic construction projects including classrooms, labs, and faculty offices",
      defaultProjectName: "New Academic Building - [Name]",
      defaultBudgetAmount: "5000000.00",
      defaultDurationMonths: 24,
      baseContent: JSON.stringify({
        template_type: "new_construction",
        standard_clauses: [
          {
            title: "AIA A101-2017 - Standard Form of Agreement",
            content: "This Agreement is made on [DATE] between [UNIVERSITY NAME] (the 'Owner') and [CONTRACTOR NAME] (the 'Contractor') for construction of [PROJECT NAME] located at [PROJECT ADDRESS]...",
            clause_type: "core_agreement"
          },
          {
            title: "AIA A201-2017 - General Conditions",
            content: "The General Conditions of the Contract for Construction, AIA Document A201-2017, are hereby incorporated by reference as if fully set forth herein...",
            clause_type: "general_conditions"
          },
          {
            title: "LEED Certification Requirement",
            content: "Contractor shall design and construct the Project to achieve a minimum LEED Silver certification as defined by the U.S. Green Building Council. All costs associated with certification shall be included in the Contract Sum...",
            clause_type: "special_requirement"
          },
          {
            title: "State Higher Education Compliance",
            content: "All work shall comply with [STATE] Higher Education Facilities Regulations, including but not limited to accessibility standards, fire safety codes, and reporting requirements to the Department of Education...",
            clause_type: "compliance"
          }
        ]
      })
    });

    await storage.createTemplate({
      name: "University Renovation Contract",
      description: "Contract for renovation, rehabilitation, and improvement projects in existing university buildings",
      defaultProjectName: "Campus Renovation - [Building]",
      defaultBudgetAmount: "500000.00",
      defaultDurationMonths: 6,
      baseContent: JSON.stringify({
        template_type: "renovation",
        standard_clauses: [
          {
            title: "AIA A103-2017 - Cost Plus Agreement",
            content: "The Contract Sum is the Cost of the Work as defined in the General Conditions plus the Contractor's Fee. The Contractor's Fee shall be [FEE_PERCENTAGE]% of the Cost of the Work...",
            clause_type: "core_agreement"
          },
          {
            title: "Modified General Conditions for Occupied Buildings",
            content: "Contractor acknowledges that portions of the building may remain occupied during construction. Work in occupied areas shall be performed outside normal business hours (after 6 PM weekdays and weekends) unless otherwise approved in writing by Owner. Contractor shall implement dust control measures, maintain egress paths, and provide temporary barriers...",
            clause_type: "special_condition"
          },
          {
            title: "Hazardous Materials Protocol",
            content: "Prior to commencing any demolition or renovation work, Contractor shall review the Owner-provided Asbestos Inspection Report. Should suspect materials be encountered, work shall cease immediately and Owner notified within 2 hours...",
            clause_type: "safety_requirement"
          }
        ]
      })
    });

    await storage.createTemplate({
      name: "Design-Build Agreement (University)",
      description: "Integrated design-build contract combining architectural design and construction services",
      defaultProjectName: "Design-Build Project - [Project]",
      defaultBudgetAmount: "2000000.00",
      defaultDurationMonths: 18,
      baseContent: JSON.stringify({
        template_type: "design_build",
        standard_clauses: [
          {
            title: "AIA A141-2014 - Design-Build Agreement",
            content: "This Agreement is between [UNIVERSITY NAME] (the 'Owner') and [DESIGN-BUILDER NAME] (the 'Design-Builder') for the design and construction of [PROJECT NAME]. The Design-Builder shall provide all design services and construction necessary to complete the Project in accordance with the Owner's Criteria...",
            clause_type: "core_agreement"
          },
          {
            title: "AIA A142-2014 - Design-Builder's Contract",
            content: "The Design-Builder shall provide architectural, engineering, and other design services through its design team, and construction services through its construction team. The Design-Builder bears sole responsibility for coordination between design and construction phases...",
            clause_type: "subcontractor_agreement"
          },
          {
            title: "Integrated Project Delivery Approach",
            content: "Parties agree to utilize integrated project delivery methods including colocation of key team members, shared risk/reward pools, and building information modeling (BIM) coordination throughout design and construction...",
            clause_type: "methodology"
          },
          {
            title: "Early Contractor Involvement",
            content: "The Design-Builder shall engage key trade contractors during design development to provide constructability review, cost estimating, and value engineering recommendations prior to final design completion...",
            clause_type: "process_requirement"
          }
        ]
      })
    });

    const vendor = vendor1;

    const contract = await storage.createContract({
      projectName: 'Campus Wifi Upgrade',
      projectNumber: 'IT-2025-01',
      vendorId: vendor.id,
      startDate: new Date('2025-06-01'),
      endDate: new Date('2025-12-31'),
      budgetAmount: "250000.00"
    });

    await storage.updateContract(contract.id, {
      status: 'draft',
      documentContent: 'This is the draft agreement between the University and Acme Corp for the Campus Wifi Upgrade project.',
    });
  }
}

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  await seedDatabase();

  // Users
  app.get(api.users.list.path, async (req, res) => {
    const users = await storage.getUsers();
    res.json(users);
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

  app.post(api.contracts.create.path, async (req, res) => {
    try {
      const input = api.contracts.create.input.parse(req.body);
      const contract = await storage.createContract(input);
      await storage.createAuditLog({ contractId: contract.id, userId: 1, action: 'created', details: 'Contract created' });
      res.status(201).json(contract);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      throw err;
    }
  });

  app.put(api.contracts.update.path, async (req, res) => {
    try {
      const input = api.contracts.update.input.parse(req.body);
      const contractId = Number(req.params.id);
      const oldContract = await storage.getContract(contractId);
      const contract = await storage.updateContract(contractId, input);
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
        if (input.status === 'in_review') {
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

  app.post(api.contracts.generateDraft.path, async (req, res) => {
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
      await storage.createAuditLog({ contractId, userId: 1, action: 'draft_generated', details: 'AI draft generated' });
      
      res.json({ success: true, documentContent: updatedContract.documentContent || '' });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ message: error.message || 'Internal error' });
    }
  });

  app.post(api.contracts.analyze.path, async (req, res) => {
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
      await storage.createAuditLog({ contractId, userId: 1, action: 'analyzed', details: 'AI analysis completed' });

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
import { storage } from "./storage";
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
