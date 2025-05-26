import { NextRequest } from 'next/server'
import connectDB from '@/lib/mongodb'
import AIProviderSettings from '@/models/AIProviderSettings'
import { requireAdmin } from '@/lib/auth-utils'
import {
  successResponse,
  errorResponse,
  serverErrorResponse
} from '@/lib/api-response'

// DELETE /api/admin/ai-providers/[provider] - Delete AI provider settings
export async function DELETE(
  request: NextRequest,
  { params }: { params: { provider: string } }
) {
  try {
    await requireAdmin()
    const { provider } = params
    await connectDB()

    const result = await AIProviderSettings.deleteOne({ provider })

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
