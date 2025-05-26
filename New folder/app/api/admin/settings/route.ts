import { NextRequest } from 'next/server'
import connectDB from '@/lib/mongodb'
import { requireAdmin } from '@/lib/auth-utils'
import {
  successResponse,
  serverErrorResponse,
  validationErrorResponse
} from '@/lib/api-response'
import { z } from 'zod'
import mongoose from 'mongoose'

// System Settings Schema
const systemSettingsSchema = z.object({
  siteName: z.string().min(1, 'Site name is required'),
  siteDescription: z.string().optional(),
  allowRegistration: z.boolean(),
  requireEmailVerification: z.boolean(),
  maxProjectsPerUser: z.number().min(1).max(100),
  maxDocumentsPerProject: z.number().min(1).max(1000),
  maxFileSizeMB: z.number().min(1).max(100),
  defaultUserRole: z.enum(['admin', 'user']),
  sessionTimeoutHours: z.number().min(1).max(168),
  maintenanceMode: z.boolean(),
  maintenanceMessage: z.string().optional()
})

// Create Settings Model (if it doesn't exist)
const settingsSchema = new mongoose.Schema({
  siteName: { type: String, required: true, default: 'AI Chat Platform' },
  siteDescription: { type: String, default: 'A powerful AI-powered chat platform with project-based context' },
  allowRegistration: { type: Boolean, default: true },
  requireEmailVerification: { type: Boolean, default: false },
  maxProjectsPerUser: { type: Number, default: 10, min: 1, max: 100 },
  maxDocumentsPerProject: { type: Number, default: 50, min: 1, max: 1000 },
  maxFileSizeMB: { type: Number, default: 10, min: 1, max: 100 },
  defaultUserRole: { type: String, enum: ['admin', 'user'], default: 'user' },
  sessionTimeoutHours: { type: Number, default: 24, min: 1, max: 168 },
  maintenanceMode: { type: Boolean, default: false },
  maintenanceMessage: { type: String, default: '' }
}, {
  timestamps: true
})

const SystemSettings = mongoose.models.SystemSettings || 
  mongoose.model('SystemSettings', settingsSchema)

// GET /api/admin/settings - Get system settings
export async function GET(request: NextRequest) {
  try {
    await requireAdmin()
    await connectDB()

    // Get or create default settings
    let settings = await SystemSettings.findOne()
    
    if (!settings) {
      // Create default settings if none exist
      settings = await SystemSettings.create({
        siteName: 'AI Chat Platform',
        siteDescription: 'A powerful AI-powered chat platform with project-based context',
        allowRegistration: true,
        requireEmailVerification: false,
        maxProjectsPerUser: 10,
        maxDocumentsPerProject: 50,
        maxFileSizeMB: 10,
        defaultUserRole: 'user',
        sessionTimeoutHours: 24,
        maintenanceMode: false,
        maintenanceMessage: ''
      })
    }

    return successResponse({
      settings
    })
  } catch (error) {
    if (error instanceof NextRequest) {
      return error
    }
    return serverErrorResponse(error, 'Failed to fetch system settings')
  }
}

// POST /api/admin/settings - Update system settings
export async function POST(request: NextRequest) {
  try {
    await requireAdmin()
    const body = await request.json()

    // Validate input
    const validationResult = systemSettingsSchema.safeParse(body)
    if (!validationResult.success) {
      return validationErrorResponse(validationResult.error)
    }

    const updateData = validationResult.data
    await connectDB()

    // Update or create settings
    const settings = await SystemSettings.findOneAndUpdate(
      {},
      updateData,
      { new: true, upsert: true, runValidators: true }
    )

    return successResponse({
      settings,
      message: 'System settings updated successfully'
    })
  } catch (error) {
    if (error instanceof NextRequest) {
      return error
    }
    return serverErrorResponse(error, 'Failed to update system settings')
  }
}
