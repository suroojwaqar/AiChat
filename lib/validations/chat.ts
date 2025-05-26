import { z } from 'zod'

export const createChatSchema = z.object({
  projectId: z.string().optional(),
  title: z.string()
    .min(1, 'Title is required')
    .max(200, 'Title cannot exceed 200 characters'),
  message: z.string()
    .min(1, 'Message is required')
    .max(4000, 'Message cannot exceed 4000 characters'),
})

export const sendMessageSchema = z.object({
  chatId: z.string().min(1, 'Chat ID is required'),
  message: z.string()
    .min(1, 'Message is required')
    .max(4000, 'Message cannot exceed 4000 characters'),
  model: z.string().optional(),
  temperature: z.number()
    .min(0)
    .max(2)
    .optional(),
  maxTokens: z.number()
    .min(100)
    .max(4000)
    .optional(),
})

export type CreateChatInput = z.infer<typeof createChatSchema>
export type SendMessageInput = z.infer<typeof sendMessageSchema>
