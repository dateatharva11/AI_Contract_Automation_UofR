import { z } from 'zod';
import { insertContractSchema, insertVendorSchema, insertOwnerSchema, insertArchitectSchema, insertContractSectionSchema, insertUserSchema, 
  contracts, vendors, contractSections, auditLogs, users, owners, architects, 
  contractTemplates, notifications, adminActivityQuerySchema } from './schema';

export const errorSchemas = {
  validation: z.object({ message: z.string(), field: z.string().optional() }),
  notFound: z.object({ message: z.string() }),
  internal: z.object({ message: z.string() }),
};

export const api = {
  vendors: {
    list: {
      method: 'GET' as const,
      path: '/api/vendors' as const,
      responses: { 200: z.array(z.custom<typeof vendors.$inferSelect>()) },
    },
    get: {
      method: 'GET' as const,
      path: '/api/vendors/:id' as const,
      responses: { 200: z.custom<typeof vendors.$inferSelect>(), 404: errorSchemas.notFound },
    },
    create: {
      method: 'POST' as const,
      path: '/api/vendors' as const,
      input: insertVendorSchema,
      responses: { 201: z.custom<typeof vendors.$inferSelect>(), 400: errorSchemas.validation },
    },
    update: { 
      method: 'PUT' as const,
      path: '/api/vendors/:id' as const,
      input: insertVendorSchema.partial(), 
      responses: { 200: z.custom<typeof vendors.$inferSelect>(), 400: errorSchemas.validation, 404: errorSchemas.notFound },
    },
    delete: {   
      method: 'DELETE' as const,
      path: '/api/vendors/:id' as const,
      responses: { 200: z.object({ success: z.boolean(), message: z.string() }), 404: errorSchemas.notFound },
    },
  },
  owners: {
    list: {
      method: 'GET' as const,
      path: '/api/owners' as const,
      responses: { 200: z.array(z.custom<typeof owners.$inferSelect>()) },
    },
    get: {
      method: 'GET' as const,
      path: '/api/owners/:id' as const,
      responses: { 200: z.custom<typeof owners.$inferSelect>(), 404: errorSchemas.notFound },
    },
    create: {
      method: 'POST' as const,
      path: '/api/owners' as const,
      input: insertOwnerSchema,
      responses: { 201: z.custom<typeof owners.$inferSelect>(), 400: errorSchemas.validation },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/owners/:id' as const,
      input: insertOwnerSchema.partial(),
      responses: { 200: z.custom<typeof owners.$inferSelect>(), 400: errorSchemas.validation, 404: errorSchemas.notFound },
    },
    delete: {   
      method: 'DELETE' as const,
      path: '/api/owners/:id' as const,
      responses: { 200: z.object({ success: z.boolean(), message: z.string() }), 404: errorSchemas.notFound },
    },
  },
  architects: {
    list: {
      method: 'GET' as const,
      path: '/api/architects' as const,
      responses: { 200: z.array(z.custom<typeof architects.$inferSelect>()) },
    },
    get: {
      method: 'GET' as const,
      path: '/api/architects/:id' as const,
      responses: { 200: z.custom<typeof architects.$inferSelect>(), 404: errorSchemas.notFound },
    },
    create: {
      method: 'POST' as const,
      path: '/api/architects' as const,
      input: insertArchitectSchema,
      responses: { 201: z.custom<typeof architects.$inferSelect>(), 400: errorSchemas.validation },
    },
    update: { 
      method: 'PUT' as const,
      path: '/api/architects/:id' as const,
      input: insertArchitectSchema.partial(),
      responses: { 200: z.custom<typeof architects.$inferSelect>(), 400: errorSchemas.validation, 404: errorSchemas.notFound },
    },
    delete: {   
      method: 'DELETE' as const,
      path: '/api/architects/:id' as const,
      responses: { 200: z.object({ success: z.boolean(), message: z.string() }), 404: errorSchemas.notFound },
    },
  },
  contracts: {
    list: {
      method: 'GET' as const,
      path: '/api/contracts' as const,
      responses: { 200: z.array(z.custom<typeof contracts.$inferSelect>()) },
    },
    get: {
      method: 'GET' as const,
      path: '/api/contracts/:id' as const,
      responses: { 200: z.custom<typeof contracts.$inferSelect>(), 404: errorSchemas.notFound },
    },
    create: {
      method: 'POST' as const,
      path: '/api/contracts' as const,
      input: insertContractSchema.extend({
        startDate: z.coerce.date(),
        endDate: z.coerce.date(),
        budgetAmount: z.union([z.string(), z.number()]).transform(val => String(val)),
        vendorId: z.coerce.number(),
        documentContent: z.string().optional(), 
        placeholderData: z.record(z.string(), z.string()).optional(),
      }),
      responses: { 201: z.custom<typeof contracts.$inferSelect>(), 400: errorSchemas.validation },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/contracts/:id' as const,
      input: z.object({
        status: z.string().optional(),
        documentContent: z.string().optional(),
        userId: z.number().optional(),
        placeholderData: z.record(z.string(), z.string()).optional(),
      }),
      responses: { 200: z.custom<typeof contracts.$inferSelect>(), 400: errorSchemas.validation, 404: errorSchemas.notFound },
    },
    generateDraft: {
      method: 'POST' as const,
      path: '/api/contracts/:id/generate-draft' as const,
      responses: { 200: z.object({ success: z.boolean(), documentContent: z.string() }), 404: errorSchemas.notFound },
    },
    analyze: {
      method: 'POST' as const,
      path: '/api/contracts/:id/analyze' as const,
      responses: { 200: z.object({ aiAnalysis: z.any(), checklist: z.any() }), 404: errorSchemas.notFound },
    },
    getAuditLogs: {
      method: 'GET' as const,
      path: '/api/contracts/:id/audit-logs' as const,
      responses: { 200: z.array(z.custom<typeof auditLogs.$inferSelect>()) },
    }
  },
  users: {
    list: {
      method: 'GET' as const,
      path: '/api/users' as const,
      responses: { 200: z.array(z.custom<typeof users.$inferSelect>()) },
    },
    meActivity: {
      method: 'GET' as const,
      path: '/api/users/me/activity' as const,
      responses: {
        200: z.array(z.object({
          id: z.number(),
          action: z.string(),
          details: z.string().nullable(),
          createdAt: z.coerce.date().nullable(),
          contractId: z.number(),
          projectName: z.string(),
          projectNumber: z.string(),
          contractStatus: z.string(),
        })),
      },
    },
  },
  templates: {
    list: {
      method: 'GET' as const,
      path: '/api/templates' as const,
      responses: { 200: z.array(z.custom<typeof contractTemplates.$inferSelect>()) },
    },
    get: {
      method: 'GET' as const,
      path: '/api/templates/:id' as const,
      responses: { 200: z.custom<typeof contractTemplates.$inferSelect>(), 404: errorSchemas.notFound },
    }
  },
  notifications: {
    list: {
      method: 'GET' as const,
      path: '/api/notifications' as const,
      responses: { 200: z.array(z.custom<typeof notifications.$inferSelect>()) },
    },
    markRead: {
      method: 'POST' as const,
      path: '/api/notifications/:id/read' as const,
      responses: { 200: z.object({ success: z.boolean() }) },
    }
  },
  sections: {
    list: {
      method: 'GET' as const,
      path: '/api/contracts/:contractId/sections' as const,
      responses: { 200: z.array(z.custom<typeof contractSections.$inferSelect>()) },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/sections/:id' as const,
      input: insertContractSectionSchema.partial(),
      responses: { 200: z.custom<typeof contractSections.$inferSelect>(), 404: errorSchemas.notFound },
    }
  },
  admin: {
    activity: {
      method: 'GET' as const,
      path: '/api/admin/activity' as const,
      query: adminActivityQuerySchema,
      responses: {
        200: z.object({
          items: z.array(z.object({
            id: z.number(),
            action: z.string(),
            details: z.string().nullable(),
            createdAt: z.coerce.date().nullable(),
            contractId: z.number(),
            projectName: z.string(),
            projectNumber: z.string(),
            contractStatus: z.string(),
            userId: z.number(),
            userFullName: z.string(),
            userRole: z.string(),
          })),
          total: z.number(),
          page: z.number(),
          pageSize: z.number(),
        }),
        403: z.object({ message: z.string() }),
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
