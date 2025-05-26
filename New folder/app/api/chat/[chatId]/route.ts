import { NextRequest } from 'next/server'
import connectDB from '@/lib/mongodb'
import Chat from '@/models/Chat'
import { requireAuth } from '@/lib/auth-utils'
import {
  successResponse,
  serverErrorResponse,
  notFoundResponse,
  forbiddenResponse
} from '@/lib/api-response'

// GET /api/chat/[chatId] - Get a single chat with messages
export async function GET(
  request: NextRequest,
  { params }: { params: { chatId: string } }
) {
  try {
    const user = await requireAuth()
    const { chatId } = params

    await connectDB()

    const chat = await Chat.findById(chatId)
      .populate('projectId', 'title')

    if (!chat) {
      return notFoundResponse('Chat not found')
    }

    // Verify ownership
    if (chat.userId.toString() !== user.id) {
      return forbiddenResponse('You do not have access to this chat')
    }

    return successResponse({
      chat
    })
  } catch (error) {
    if (error instanceof NextRequest) {
      return error
    }
    return serverErrorResponse(error, 'Failed to fetch chat')
  }
}

// DELETE /api/chat/[chatId] - Delete a chat
export async function DELETE(
  request: NextRequest,
  { params }: { params: { chatId: string } }
) {
  try {
    const user = await requireAuth()
    const { chatId } = params

    await connectDB()

    const chat = await Chat.findById(chatId)

    if (!chat) {
      return notFoundResponse('Chat not found')
    }

    // Verify ownership
    if (chat.userId.toString() !== user.id) {
      return forbiddenResponse('You do not have access to this chat')
    }

    // Soft delete
    chat.isActive = false
    await chat.save()

    return successResponse({
      message: 'Chat deleted successfully'
    })
  } catch (error) {
    if (error instanceof NextRequest) {
      return error
    }
    return serverErrorResponse(error, 'Failed to delete chat')
  }
}
