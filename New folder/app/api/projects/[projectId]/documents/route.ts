import { NextRequest } from 'next/server'
import connectDB from '@/lib/mongodb'
import Document from '@/models/Document'
import Project from '@/models/Project'
import { requireAuth } from '@/lib/auth-utils'
import { openAIService } from '@/lib/services/openai'
import {
  successResponse,
  errorResponse,
  serverErrorResponse,
  notFoundResponse,
  forbiddenResponse,
  validationErrorResponse
} from '@/lib/api-response'
import { z } from 'zod'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_FILE_TYPES = ['text/plain', 'application/pdf', 'text/markdown']
const CHUNK_SIZE = 1000 // Characters per chunk for embeddings

// GET /api/projects/[projectId]/documents - Get all documents for a project
export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const user = await requireAuth()
    const { projectId } = params

    await connectDB()

    // Verify project exists and user has access
    const project = await Project.findById(projectId)
    if (!project) {
      return notFoundResponse('Project not found')
    }

    if (!project.hasAccess(user.id)) {
      return forbiddenResponse('You do not have access to this project')
    }

    const documents = await Document.find({ projectId })
      .select('-embedding -chunks.embedding') // Exclude embeddings from response
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })

    return successResponse({
      documents,
      count: documents.length
    })
  } catch (error) {
    if (error instanceof NextRequest) {
      return error
    }
    return serverErrorResponse(error, 'Failed to fetch documents')
  }
}

// POST /api/projects/[projectId]/documents - Upload a document
export async function POST(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const user = await requireAuth()
    const { projectId } = params

    await connectDB()

    // Verify project exists and user has access
    const project = await Project.findById(projectId)
    if (!project) {
      return notFoundResponse('Project not found')
    }

    if (!project.hasAccess(user.id)) {
      return forbiddenResponse('You do not have access to this project')
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const title = formData.get('title') as string | null
    const type = formData.get('type') as string || 'text'

    if (!file && type !== 'text') {
      return errorResponse('File is required', 400)
    }

    if (!title) {
      return errorResponse('Title is required', 400)
    }

    let content = ''
    let metadata: any = {}

    if (type === 'text') {
      content = formData.get('content') as string || ''
      if (!content) {
        return errorResponse('Content is required for text documents', 400)
      }
    } else if (file) {
      // Validate file
      if (file.size > MAX_FILE_SIZE) {
        return errorResponse(`File size must be less than ${MAX_FILE_SIZE / 1024 / 1024}MB`, 400)
      }

      if (!ALLOWED_FILE_TYPES.includes(file.type)) {
        return errorResponse('File type not supported. Allowed types: ' + ALLOWED_FILE_TYPES.join(', '), 400)
      }

      metadata = {
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type
      }

      // Process file based on type
      if (file.type === 'text/plain' || file.type === 'text/markdown') {
        content = await file.text()
      } else if (file.type === 'application/pdf') {
        // TODO: Implement PDF processing
        return errorResponse('PDF processing not yet implemented', 501)
      }
    }

    // Create chunks for large documents
    const chunks = []
    if (content.length > CHUNK_SIZE) {
      for (let i = 0; i < content.length; i += CHUNK_SIZE) {
        const chunkText = content.slice(i, Math.min(i + CHUNK_SIZE, content.length))
        
        try {
          // Generate embedding for chunk
          const embedding = await openAIService.generateEmbedding(chunkText)
          
          chunks.push({
            text: chunkText,
            embedding,
            startIndex: i,
            endIndex: Math.min(i + CHUNK_SIZE, content.length)
          })
        } catch (error) {
          console.error('Failed to generate embedding for chunk:', error)
          // Continue without embedding if it fails
          chunks.push({
            text: chunkText,
            embedding: [],
            startIndex: i,
            endIndex: Math.min(i + CHUNK_SIZE, content.length)
          })
        }
      }
    }

    // Generate embedding for the entire document (for similarity search)
    let documentEmbedding = []
    try {
      // Use first 1000 characters for document-level embedding
      const embeddingText = content.slice(0, 1000)
      documentEmbedding = await openAIService.generateEmbedding(embeddingText)
    } catch (error) {
      console.error('Failed to generate document embedding:', error)
    }

    // Create the document
    const document = await Document.create({
      projectId,
      title,
      content,
      type,
      metadata,
      embedding: documentEmbedding,
      chunks,
      createdBy: user.id
    })

    // Return document without embeddings
    const documentResponse = await Document.findById(document._id)
      .select('-embedding -chunks.embedding')
      .populate('createdBy', 'name email')

    return successResponse(
      {
        document: documentResponse,
        message: 'Document uploaded successfully'
      },
      201
    )
  } catch (error) {
    if (error instanceof NextRequest) {
      return error
    }
    return serverErrorResponse(error, 'Failed to upload document')
  }
}
