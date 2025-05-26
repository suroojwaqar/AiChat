import { NextRequest } from 'next/server'
import connectDB from '@/lib/mongodb'
import AIProviderSettings from '@/models/AIProviderSettings'
import { requireAdmin } from '@/lib/auth-utils'
import { encrypt, decrypt } from '@/lib/encryption'
import {
  successResponse,
  errorResponse,
  serverErrorResponse,
  validationErrorResponse
} from '@/lib/api-response'
import { z } from 'zod'

const aiProviderSchema = z.object({
  provider: z.enum(['openai', 'anthropic', 'custom']),
  apiKey: z.string().min(1, 'API key is required'),
  defaultModel: z.string().min(1, 'Default model is required'),
  defaultTemperature: z.number().min(0).max(2).default(0.7),
  defaultMaxTokens: z.number().min(100).max(4000).default(2000),
  models: z.array(z.object({
    name: z.string(),
    displayName: z.string(),
    maxTokens: z.number(),
    isActive: z.boolean().default(true)
  })).optional(),
  isActive: z.boolean().default(true)
})

// GET /api/admin/ai-providers - Get all AI provider settings
export async function GET(request: NextRequest) {
  try {
    await requireAdmin()
    await connectDB()

    const providers = await AIProviderSettings.find()

    // Decrypt API keys for display (masked)
    const providersWithMaskedKeys = providers.map(provider => {
      const decryptedKey = decrypt(
        provider.apiKey.encryptedData,
        provider.apiKey.iv,
        provider.apiKey.authTag
      )
      
      // Mask the key for security
      const maskedKey = decryptedKey.substring(0, 6) + '...' + decryptedKey.substring(decryptedKey.length - 4)
      
      return {
        ...provider.toObject(),
        apiKey: maskedKey,
        hasApiKey: true
      }
    })

    return successResponse({
      providers: providersWithMaskedKeys
    })
  } catch (error) {
    if (error instanceof NextRequest) {
      return error
    }
    return serverErrorResponse(error, 'Failed to fetch AI providers')
  }
}

// POST /api/admin/ai-providers - Create or update AI provider settings
export async function POST(request: NextRequest) {
  try {
    await requireAdmin()
    const body = await request.json()

    // Validate input
    const validationResult = aiProviderSchema.safeParse(body)
    if (!validationResult.success) {
      return validationErrorResponse(validationResult.error)
    }

    const { provider, apiKey, ...settings } = validationResult.data

    await connectDB()

    // Encrypt the API key
    const encryptedApiKey = encrypt(apiKey)

    // Default models for providers
    const defaultModels = {
      openai: [
        { name: 'gpt-4', displayName: 'GPT-4', maxTokens: 8192, isActive: true },
        { name: 'gpt-4-turbo-preview', displayName: 'GPT-4 Turbo', maxTokens: 128000, isActive: true },
        { name: 'gpt-3.5-turbo', displayName: 'GPT-3.5 Turbo', maxTokens: 4096, isActive: true },
        { name: 'gpt-3.5-turbo-16k', displayName: 'GPT-3.5 Turbo 16K', maxTokens: 16384, isActive: true }
      ],
      anthropic: [
        { name: 'claude-3-opus-20240229', displayName: 'Claude 3 Opus', maxTokens: 200000, isActive: true },
        { name: 'claude-3-sonnet-20240229', displayName: 'Claude 3 Sonnet', maxTokens: 200000, isActive: true },
        { name: 'claude-3-haiku-20240307', displayName: 'Claude 3 Haiku', maxTokens: 200000, isActive: true }
      ],
      custom: []
    }

    // Check if provider already exists
    const existingProvider = await AIProviderSettings.findOne({ provider })

    if (existingProvider) {
      // Update existing provider
      existingProvider.apiKey = encryptedApiKey
      existingProvider.defaultModel = settings.defaultModel
      existingProvider.defaultTemperature = settings.defaultTemperature
      existingProvider.defaultMaxTokens = settings.defaultMaxTokens
      existingProvider.models = settings.models || defaultModels[provider] || []
      existingProvider.isActive = settings.isActive
      
      await existingProvider.save()
      
      return successResponse({
        provider: {
          ...existingProvider.toObject(),
          apiKey: 'Updated successfully'
        },
        message: 'AI provider settings updated successfully'
      })
    } else {
      // Create new provider
      const newProvider = await AIProviderSettings.create({
        provider,
        apiKey: encryptedApiKey,
        models: settings.models || defaultModels[provider] || [],
        ...settings
      })

      return successResponse({
        provider: {
          ...newProvider.toObject(),
          apiKey: 'Added successfully'
        },
        message: 'AI provider settings created successfully'
      }, 201)
    }
  } catch (error) {
    if (error instanceof NextRequest) {
      return error
    }
    return serverErrorResponse(error, 'Failed to save AI provider settings')
  }
}

// DELETE /api/admin/ai-providers/[provider] - Delete AI provider settings
export async function DELETE(
  request: NextRequest,
  { params }: { params: { provider: string } }
) {
  try {
    await requireAdmin()
    await connectDB()

    const result = await AIProviderSettings.deleteOne({ provider: params.provider })

    if (result.deletedCount === 0) {
      return errorResponse('Provider not found', 404)
    }

    return successResponse({
      message: 'AI provider settings deleted successfully'
    })
  } catch (error) {
    if (error instanceof NextRequest) {
      return error
    }
    return serverErrorResponse(error, 'Failed to delete AI provider settings')
  }
}
