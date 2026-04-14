import { db } from "./db";
import {
  users, vendors, contracts, contractSections, auditLogs, notifications, contractTemplates, owners, architects,
  type InsertUser, type InsertVendor, type InsertContract, type InsertContractSection, type InsertNotification, type InsertContractTemplate,
  type User, type Vendor, type Contract, type ContractSection, type AuditLog, type Notification, type ContractTemplate,
  type UpdateContractRequest, type UpdateVendorRequest, type UpdateSectionRequest, type InsertOwner, type InsertArchitect, type Owner, type Architect,
  type UpdateOwnerRequest, type UpdateArchitectRequest
} from "@shared/schema";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;

  // Vendors
  getVendor(id: number): Promise<Vendor | undefined>;
  getVendors(): Promise<Vendor[]>;
  createVendor(vendor: InsertVendor): Promise<Vendor>;
  updateVendor(id: number, vendor: UpdateVendorRequest): Promise<Vendor>;

  // Templates
  getTemplates(): Promise<ContractTemplate[]>;
  getTemplate(id: number): Promise<ContractTemplate | undefined>;
  createTemplate(template: InsertContractTemplate): Promise<ContractTemplate>;

  // Contracts
  getContract(id: number): Promise<Contract | undefined>;
  getContracts(): Promise<Contract[]>;
  createContract(contract: InsertContract): Promise<Contract>;
  updateContract(id: number, updates: UpdateContractRequest): Promise<Contract>;

  // Sections
  getSectionsByContract(contractId: number): Promise<ContractSection[]>;
  updateSection(id: number, updates: UpdateSectionRequest): Promise<ContractSection>;
  createSection(section: InsertContractSection): Promise<ContractSection>;

  // Audit Logs
  getAuditLogsByContract(contractId: number): Promise<AuditLog[]>;
  createAuditLog(log: { contractId: number, userId: number, action: string, details?: string }): Promise<AuditLog>;

  // Notifications
  getNotifications(userId: number): Promise<Notification[]>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationRead(id: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }
  async getUsers(): Promise<User[]> {
    return await db.select().from(users);
  }
  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }

  // Vendors
  async getVendor(id: number): Promise<Vendor | undefined> {
    const [vendor] = await db.select().from(vendors).where(eq(vendors.id, id));
    return vendor;
  }
  async getVendors(): Promise<Vendor[]> {
    return await db.select().from(vendors);
  }
  async createVendor(vendor: InsertVendor): Promise<Vendor> {
    const [newVendor] = await db.insert(vendors).values(vendor).returning();
    return newVendor;
  }
  async updateVendor(id: number, updates: UpdateVendorRequest): Promise<Vendor> {
    const [updated] = await db.update(vendors).set(updates).where(eq(vendors.id, id)).returning();
    return updated;
  }

  // Owners
  async getOwners(): Promise<Owner[]> {
    return await db.select().from(owners);
  }
  async getOwner(id: number): Promise<Owner | undefined> {
    const [owner] = await db.select().from(owners).where(eq(owners.id, id));
    return owner;
  }
  async createOwner(owner: InsertOwner): Promise<Owner> {
    const [newOwner] = await db.insert(owners).values(owner).returning();
    return newOwner;
  }
  async updateOwner(id: number, updates: UpdateOwnerRequest): Promise<Owner> {
    const [updated] = await db.update(owners).set(updates).where(eq(owners.id, id)).returning();
    return updated;
  }

  // Architects
  async getArchitects(): Promise<Architect[]> {
    return await db.select().from(architects);
  }
  async getArchitect(id: number): Promise<Architect | undefined> {
    const [architect] = await db.select().from(architects).where(eq(architects.id, id));
    return architect;
  }
  async createArchitect(architect: InsertArchitect): Promise<Architect> {
    const [newArchitect] = await db.insert(architects).values(architect).returning();
    return newArchitect;
  }
  async updateArchitect(id: number, updates: UpdateArchitectRequest): Promise<Architect> {
    const [updated] = await db.update(architects).set(updates).where(eq(architects.id, id)).returning();
    return updated;
  }

  // Templates
  async getTemplates(): Promise<ContractTemplate[]> {
    return await db.select().from(contractTemplates);
  }
  async getTemplate(id: number): Promise<ContractTemplate | undefined> {
    const [template] = await db.select().from(contractTemplates).where(eq(contractTemplates.id, id));
    return template;
  }
  async createTemplate(template: InsertContractTemplate): Promise<ContractTemplate> {
    const [newTemplate] = await db.insert(contractTemplates).values(template).returning();
    return newTemplate;
  }

  // Contracts
  async getContract(id: number): Promise<Contract | undefined> {
    const [contract] = await db.select().from(contracts).where(eq(contracts.id, id));
    return contract;
  }
  async getContracts(): Promise<Contract[]> {
    return await db.select().from(contracts);
  }
  async createContract(contract: InsertContract): Promise<Contract> {
    const [newContract] = await db.insert(contracts).values(contract).returning();
    return newContract;
  }
  async updateContract(id: number, updates: UpdateContractRequest): Promise<Contract> {
    const [updated] = await db.update(contracts).set(updates).where(eq(contracts.id, id)).returning();
    return updated;
  }

  // Sections
  async getSectionsByContract(contractId: number): Promise<ContractSection[]> {
    return await db.select().from(contractSections).where(eq(contractSections.contractId, contractId));
  }
  async updateSection(id: number, updates: UpdateSectionRequest): Promise<ContractSection> {
    const [updated] = await db.update(contractSections).set(updates).where(eq(contractSections.id, id)).returning();
    return updated;
  }
  async createSection(section: InsertContractSection): Promise<ContractSection> {
    const [newSection] = await db.insert(contractSections).values(section).returning();
    return newSection;
  }

  // Audit Logs
  async getAuditLogsByContract(contractId: number): Promise<AuditLog[]> {
    return await db.select().from(auditLogs).where(eq(auditLogs.contractId, contractId));
  }
  async createAuditLog(log: { contractId: number, userId: number, action: string, details?: string }): Promise<AuditLog> {
    const [newLog] = await db.insert(auditLogs).values(log).returning();
    return newLog;
  }

  // Notifications
  async getNotifications(userId: number): Promise<Notification[]> {
    return await db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt));
  }
  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [newNotification] = await db.insert(notifications).values(notification).returning();
    return newNotification;
  }
  async markNotificationRead(id: number): Promise<void> {
    await db.update(notifications).set({ read: true }).where(eq(notifications.id, id));
  }
}

export const storage = new DatabaseStorage();
