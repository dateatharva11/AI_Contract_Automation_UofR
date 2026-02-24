import { z } from 'zod';
import { insertContractSchema, insertVendorSchema, insertContractSectionSchema, insertUserSchema, contracts, vendors, contractSections, auditLogs, users } from './schema';

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
        vendorId: z.coerce.number()
      }),
      responses: { 201: z.custom<typeof contracts.$inferSelect>(), 400: errorSchemas.validation },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/contracts/:id' as const,
      input: z.object({
        status: z.string().optional(),
        documentContent: z.string().optional(),
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
  }
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
