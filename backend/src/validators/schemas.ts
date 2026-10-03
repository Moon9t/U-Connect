import { z } from 'zod';
export const loginSchema = z.object({username:z.string().min(1), password:z.string().min(1)});
export const registerSchema = z.object({name:z.string().min(1), username:z.string().min(3), email:z.string().email(), password:z.string().min(8), role:z.enum(['student','staff','admin']).default('student'), department_id:z.number().int().positive().optional()});
export const complaintSchema = z.object({title:z.string().min(1).max(255), description:z.string().min(1), category:z.string().min(1), location:z.string().min(1), anonymous:z.boolean().optional().default(false)});
export const complaintUpdateSchema = complaintSchema.partial();
export const statusSchema = z.object({status:z.enum(['pending','in-progress','resolved','closed'])});
export const assignSchema = z.object({department_id:z.number().int().positive()});
export const commentSchema = z.object({content:z.string().min(1)});
export const feedbackSchema = z.object({rating:z.number().int().min(1).max(5), comment:z.string().optional()});
