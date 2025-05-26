import { z } from 'zod'

export const createProjectSchema = z.object({
  title: z.string()
    .min(3, 'Title must be at least 3 characters')
    .max(100, 'Title cannot exceed 100 characters'),
  description: z.string()
    .min(10, 'Description must be at least 10 characters')
    .max(500, 'Description cannot exceed 500 characters'),
  isPublic: z.boolean().default(false),
  settings: z.object({
    maxTokens: z.number()
      .min(100, 'Max tokens must be at least 100')
      .max(4000, 'Max tokens cannot exceed 4000')
      .optional(),
    temperature: z.number()
      .min(0, 'Temperature must be at least 0')
      .max(2, 'Temperature cannot exceed 2')
      .optional(),
    model: z.string().optional(),
  }).optional(),
})

export const updateProjectSchema = createProjectSchema.partial()

export const addContributorSchema = z.object({
  email: z.string().email('Invalid email address'),
})

export const createDocumentSchema = z.object({
  projectId: z.string().min(1, 'Project ID is required'),
  title: z.string()
    .min(1, 'Title is required')
    .max(200, 'Title cannot exceed 200 characters'),
  content: z.string().min(1, 'Content is required'),
  type: z.enum(['text', 'pdf', 'url']).default('text'),
})

export type CreateProjectInput = z.infer<typeof createProjectSchema>
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>
export type AddContributorInput = z.infer<typeof addContributorSchema>
export type CreateDocumentInput = z.infer<typeof createDocumentSchema>
