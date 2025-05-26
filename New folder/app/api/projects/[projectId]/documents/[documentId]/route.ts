import { NextRequest } from 'next/server'
import connectDB from '@/lib/mongodb'
import Document from '@/models/Document'
import Project from '@/models/Project'
import { requireAuth } from '@/lib/auth-utils'
import {
  successResponse,
  serverErrorResponse,
  notFoundResponse,
  forbiddenResponse
} from '@/lib/api-response'

// DELETE /api/projects/[projectId]/documents/[documentId] - Delete a document
export async function DELETE(
  request: NextRequest,
  { params }: { params: { projectId: string; documentId: string } }
) {
  try {
    const user = await requireAuth()
    const { projectId, documentId } = params

    await connectDB()

    // Verify project exists and user has access
    const project = await Project.findById(projectId)
    if (!project) {
      return notFoundResponse('Project not found')
    }

    if (!project.hasAccess(user.id)) {
      return forbiddenResponse('You do not have access to this project')
    }

    // Find the document
    const document = await Document.findOne({
      _id: documentId,
      projectId: projectId
    })

    if (!document) {
      return notFoundResponse('Document not found')
    }

    // Only project owner or document creator can delete
    if (project.owner.toString() !== user.id && document.createdBy.toString() !== user.id) {
      return forbiddenResponse('Only the project owner or document creator can delete this document')
    }

    // Delete the document
    await document.deleteOne()

    return successResponse({
      message: 'Document deleted successfully'
    })
  } catch (error) {
    if (error instanceof NextRequest) {
      return error
    }
    return serverErrorResponse(error, 'Failed to delete document')
  }
}

// GET /api/projects/[projectId]/documents/[documentId] - Get a single document
export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string; documentId: string } }
) {
  try {
    const user = await requireAuth()
    const { projectId, documentId } = params

    await connectDB()

    // Verify project exists and user has access
    const project = await Project.findById(projectId)
    if (!project) {
      return notFoundResponse('Project not found')
    }

    if (!project.hasAccess(user.id)) {
      return forbiddenResponse('You do not have access to this project')
    }

    // Find the document
    const document = await Document.findOne({
      _id: documentId,
      projectId: projectId
    })
    .select('-embedding -chunks.embedding') // Exclude embeddings
    .populate('createdBy', 'name email')

    if (!document) {
      return notFoundResponse('Document not found')
    }

    return successResponse({
      document
    })
  } catch (error) {
    if (error instanceof NextRequest) {
      return error
    }
    return serverErrorResponse(error, 'Failed to fetch document')
  }
}
