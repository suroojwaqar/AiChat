import { NextRequest } from 'next/server'
import connectDB from '@/lib/mongodb'
import Project from '@/models/Project'
import Document from '@/models/Document'
import Chat from '@/models/Chat'
import { requireAuth } from '@/lib/auth-utils'
import { updateProjectSchema } from '@/lib/validations/project'
import {
  successResponse,
  errorResponse,
  validationErrorResponse,
  serverErrorResponse,
  notFoundResponse,
  forbiddenResponse
} from '@/lib/api-response'

// GET /api/projects/[projectId] - Get a single project
export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const user = await requireAuth()
    const { projectId } = params

    await connectDB()

    const project = await Project.findById(projectId)
      .populate('owner', 'name email')
      .populate('contributors', 'name email')

    if (!project) {
      return notFoundResponse('Project not found')
    }

    // Check access
    if (!project.hasAccess(user.id)) {
      return forbiddenResponse('You do not have access to this project')
    }

    // Get document count
    const documentCount = await Document.countDocuments({ projectId })

    // Get chat count
    const chatCount = await Chat.countDocuments({ projectId, userId: user.id })

    return successResponse({
      project,
      stats: {
        documentCount,
        chatCount
      }
    })
  } catch (error) {
    if (error instanceof NextRequest) {
      return error
    }
    return serverErrorResponse(error, 'Failed to fetch project')
  }
}

// PATCH /api/projects/[projectId] - Update a project
export async function PATCH(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const user = await requireAuth()
    const { projectId } = params
    const body = await request.json()

    // Validate input
    const validationResult = updateProjectSchema.safeParse(body)
    if (!validationResult.success) {
      return validationErrorResponse(validationResult.error)
    }

    await connectDB()

    const project = await Project.findById(projectId)

    if (!project) {
      return notFoundResponse('Project not found')
    }

    // Only owner can update project
    if (project.owner.toString() !== user.id) {
      return forbiddenResponse('Only the project owner can update this project')
    }

    // Update project
    Object.assign(project, validationResult.data)
    await project.save()

    await project.populate('owner', 'name email')
    await project.populate('contributors', 'name email')

    return successResponse({
      project,
      message: 'Project updated successfully'
    })
  } catch (error) {
    if (error instanceof NextRequest) {
      return error
    }
    return serverErrorResponse(error, 'Failed to update project')
  }
}

// DELETE /api/projects/[projectId] - Delete a project
export async function DELETE(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const user = await requireAuth()
    const { projectId } = params

    await connectDB()

    const project = await Project.findById(projectId)

    if (!project) {
      return notFoundResponse('Project not found')
    }

    // Only owner can delete project
    if (project.owner.toString() !== user.id) {
      return forbiddenResponse('Only the project owner can delete this project')
    }

    // Delete all related data
    await Promise.all([
      Document.deleteMany({ projectId }),
      Chat.deleteMany({ projectId }),
      project.deleteOne()
    ])

    return successResponse({
      message: 'Project and all related data deleted successfully'
    })
  } catch (error) {
    if (error instanceof NextRequest) {
      return error
    }
    return serverErrorResponse(error, 'Failed to delete project')
  }
}
