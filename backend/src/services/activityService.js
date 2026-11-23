const { PrismaClient } = require('@prisma/client');
const { z } = require('zod');

const prisma = new PrismaClient();

const dateSchema = z.string().refine((value) => !Number.isNaN(Date.parse(value)), {
  message: 'Invalid date format',
});

const auditLogQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(1000).optional(),
  startDate: dateSchema.optional(),
  endDate: dateSchema.optional(),
});

async function getAuditLogs(query = {}) {
  const parsed = auditLogQuerySchema.safeParse(query);
  if (!parsed.success) {
    const error = new Error('Invalid input');
    error.code = 'INVALID_INPUT';
    error.status = 400;
    error.details = parsed.error.flatten();
    throw error;
  }

  const { limit, startDate, endDate } = parsed.data;

  const where = {};
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) {
      where.createdAt.gte = new Date(startDate);
    }
    if (endDate) {
      where.createdAt.lte = new Date(endDate);
    }
  }

  return prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit || 100,
  });
}

module.exports = {
  getAuditLogs,
  auditLogQuerySchema,
};
