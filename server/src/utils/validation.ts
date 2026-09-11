import { z } from 'zod';
import { TaskStatus, TaskPriority } from '@prisma/client';

// ==========================================
// AUTHENTICATION SCHEMAS
// ==========================================

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

// ==========================================
// CLIENT SCHEMAS
// ==========================================

export const createClientSchema = z.object({
  name: z.string().min(2, 'Client name must be at least 2 characters'),
  email: z.string().email('Invalid email address').optional().nullable(),
  phone: z.string().optional().nullable(),
  company: z.string().optional().nullable(),
});

export const updateClientSchema = createClientSchema.partial();

// ==========================================
// PROJECT SCHEMAS
// ==========================================

export const createProjectSchema = z.object({
  name: z.string().min(2, 'Project name must be at least 2 characters'),
  description: z.string().optional().nullable(),
  clientId: z.string().uuid('Invalid client ID format'),
});

export const updateProjectSchema = createProjectSchema.partial();

// ==========================================
// TASK SCHEMAS
// ==========================================

const dateSchema = z
  .string()
  .refine((val) => !isNaN(Date.parse(val)), { message: 'Invalid date format' })
  .optional()
  .nullable();

// Flexible status schema supporting both TO_DO and TODO
const statusEnum = z.preprocess(
  (val) => (val === 'TO_DO' ? TaskStatus.TODO : val),
  z.nativeEnum(TaskStatus)
);
const statusEnumOptional = z.preprocess(
  (val) => (val === 'TO_DO' ? TaskStatus.TODO : val),
  z.nativeEnum(TaskStatus).optional()
);

export const createTaskSchema = z.object({
  title: z.string().min(2, 'Task title must be at least 2 characters'),
  description: z.string().optional().nullable(),
  assignedToId: z.string().uuid('Invalid developer user ID format').optional().nullable(),
  status: statusEnum.optional().default(TaskStatus.TODO),
  priority: z.nativeEnum(TaskPriority).optional().default(TaskPriority.MEDIUM),
  dueDate: dateSchema,
});

export const updateTaskSchema = z.object({
  title: z.string().min(2, 'Task title must be at least 2 characters').optional(),
  description: z.string().optional().nullable(),
  assignedToId: z.string().uuid('Invalid developer user ID format').optional().nullable(),
  status: statusEnumOptional,
  priority: z.nativeEnum(TaskPriority).optional(),
  dueDate: dateSchema,
});

// Developer status-only update schema
export const developerUpdateTaskSchema = z.object({
  status: statusEnum,
});

// ==========================================
// QUERY PARAMETER SCHEMAS
// ==========================================

export const taskQuerySchema = z.object({
  status: statusEnumOptional,
  priority: z.nativeEnum(TaskPriority).optional(),
  dueDateFrom: z.string().optional(),
  dueDateTo: z.string().optional(),
});

export const activityQuerySchema = z.object({
  page: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 1)),
  limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 20)),
});

// Types
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateClientInput = z.infer<typeof createClientSchema>;
export type UpdateClientInput = z.infer<typeof updateClientSchema>;
export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type TaskQueryInput = z.infer<typeof taskQuerySchema>;
export type ActivityQueryInput = z.infer<typeof activityQuerySchema>;
