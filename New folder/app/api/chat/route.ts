import { NextRequest } from 'next/server'
import connectDB from '@/lib/mongodb'
import Chat from '@/models/Chat'
import Project from '@/models/Project'
import { requireAuth } from '@/lib/auth-utils'
import { createChatSchema } from '@/lib/validations/chat'
import {
  successResponse,
  errorResponse,
  validationErrorResponse,
  serverErrorResponse,
  forbiddenResponse
} from '@/lib/api-response'

// GET /api/chat - Get all chats for the authenticated user
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')

    await connectDB()

    const query: any = { userId: user.id, isActive: true }
    if (projectId) {
      query.projectId = projectId
    }

    const chats = await Chat.find(query)
      .populate('projectId', 'title')
      .sort({ updatedAt: -1 })
      .select('-messages') // Exclude messages for performance

    return successResponse({
      chats,
      count: chats.length
    })
  } catch (error) {
    if (error instanceof NextRequest) {
      return error
    }
    return serverErrorResponse(error, 'Failed to fetch chats')
  }
}

// POST /api/chat - Create a new chat
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await request.json()

    // Validate input
    const validationResult = createChatSchema.safeParse(body)
    if (!validationResult.success) {
      return validationErrorResponse(validationResult.error)
    }

    const { projectId, title, message } = validationResult.data

    await connectDB()

    // If projectId is provided, verify access
    if (projectId) {
      const project = await Project.findById(projectId)
      if (!project) {
        return errorResponse('Project not found', 404)
      }

      if (!project.hasAccess(user.id)) {
        return forbiddenResponse('You do not have access to this project')
      }
    }

    // Create the chat with initial user message
    const chat = await Chat.create({
      userId: user.id,
      projectId,
      title,
      messages: [{
        role: 'user',
        content: message,
        timestamp: new Date()
      }],
      metadata: {},
      isActive: true
    })

    await chat.populate('projectId', 'title')

    return successResponse(
      {
        chat,
        message: 'Chat created successfully'
      },
      201
    )
  } catch (error) {
    if (error instanceof NextRequest) {
      return error
    }
    return serverErrorResponse(error, 'Failed to create chat')
  }
}
