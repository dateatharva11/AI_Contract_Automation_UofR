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
    const admin = await storage.createUser({ username: 'admin1', password: 'password', role: 'admin', fullName: 'Alice Admin', email: 'alice@uni.edu' });
    const reviewer = await storage.createUser({ username: 'reviewer1', password: 'password', role: 'reviewer', fullName: 'Bob Reviewer', email: 'bob@uni.edu' });
    const vendorUser = await storage.createUser({ username: 'vendor1', password: 'password', role: 'vendor', fullName: 'Charlie Vendor', email: 'charlie@vendor.com' });
    
    const vendor = await storage.createVendor({
      name: 'Acme Corp',
      contactEmail: 'contact@acme.com',
      phone: '555-0192',
      address: '123 Acme Way',
      defaultRates: '$150/hr',
      insuranceCertUrl: 'https://example.com/cert.pdf'
    });

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
      const contract = await storage.updateContract(Number(req.params.id), input);
      if (!contract) return res.status(404).json({ message: 'Contract not found' });
      await storage.createAuditLog({ contractId: contract.id, userId: 1, action: 'updated', details: 'Contract updated' });
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
    
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-5.2",
        messages: [
          { role: "system", content: "You are an expert contract drafter for a university." },
          { role: "user", content: `Draft a professional university contract for project '${contract.projectName}' (No. ${contract.projectNumber}). Vendor: ${vendor?.name}. Start: ${contract.startDate}, End: ${contract.endDate}, Budget: $${contract.budgetAmount}. Keep it under 500 words and use formal legal language.` }
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

  return httpServer;
}
