import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const workerRegisterSchema = z.object({
  fullName: z.string().min(2).max(200),
  phone: z.string().min(10).max(20),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  city: z.string().min(2).max(100),
  specialty: z.string().min(2).max(100),
  experience: z.number().int().min(0).max(50),
  bankDetails: z
    .object({
      bankName: z.string().optional(),
      accountNumber: z.string().optional(),
      bik: z.string().optional(),
    })
    .optional(),
});

export const workerUpdateSchema = workerRegisterSchema.partial();

export const companyCreateSchema = z.object({
  name: z.string().min(2).max(200),
  inn: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  address: z.string().optional(),
});

export const objectCreateSchema = z.object({
  name: z.string().min(2).max(200),
  address: z.string().min(5).max(500),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  description: z.string().optional(),
});

export const shiftCreateSchema = z.object({
  objectId: z.string().cuid(),
  title: z.string().min(2).max(200),
  address: z.string().min(5).max(500),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  cost: z.number().positive(),
  maxWorkers: z.number().int().positive(),
  description: z.string().optional(),
  requirements: z.string().optional(),
  minRating: z.number().min(0).max(200).default(0),
  registrationDeadline: z.string().datetime().optional(),
  foremanId: z.string().cuid().optional(),
  gpsRadiusMeters: z.number().int().positive().default(200),
});

export const attendanceItemSchema = z.object({
  applicationId: z.string().cuid(),
  status: z.enum(['PRESENT', 'ABSENT', 'LATE', 'LEFT_EARLY', 'FULL_SHIFT']),
  stars: z.number().int().min(1).max(5).optional(),
  comment: z.string().max(1000).optional(),
  isBestWorker: z.boolean().optional(),
});

export const attendanceBatchSchema = z.object({
  shiftId: z.string().cuid(),
  items: z.array(attendanceItemSchema).min(1),
});

export const ratingRulesSchema = z.object({
  ON_TIME: z.number(),
  GOOD_RATING: z.number(),
  BEST_WORKER: z.number(),
  LATE: z.number(),
  CANCEL_LESS_24H: z.number(),
  NO_SHOW: z.number(),
  BAD_RATING: z.number(),
});

export const paymentUpdateSchema = z.object({
  status: z.enum(['PENDING', 'PROCESSING', 'PAID', 'CANCELLED']),
  comment: z.string().optional(),
  paidAt: z.string().datetime().optional(),
});

export const workerSearchSchema = z.object({
  search: z.string().optional(),
  city: z.string().optional(),
  specialty: z.string().optional(),
  minRating: z.coerce.number().optional(),
  maxRating: z.coerce.number().optional(),
  status: z.enum(['ACTIVE', 'BLOCKED', 'PENDING_VERIFICATION']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const shiftFilterSchema = z.object({
  objectId: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  foremanId: z.string().optional(),
  status: z.string().optional(),
  city: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type WorkerRegisterInput = z.infer<typeof workerRegisterSchema>;
export type ShiftCreateInput = z.infer<typeof shiftCreateSchema>;
export type AttendanceBatchInput = z.infer<typeof attendanceBatchSchema>;
