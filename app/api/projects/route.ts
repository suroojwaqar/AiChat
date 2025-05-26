import { NextRequest } from 'next/server'
import connectDB from '@/lib/mongodb'
import Project from '@/models/Project'
import { requireAuth } from '@/lib/auth-utils'
import { createProjectSchema } from '@/lib/validations/project'
import {
  successResponse,
  errorResponse,
  validationErrorResponse,
  serverErrorResponse,
  notFoundResponse
} from '@/lib/api-response'

// GET /api/projects - Get all projects for the authenticated user
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    await connectDB()

    const projects = await Project.find({
      $or: [
        { owner: user.id },
        { contributors: user.id },
        { isPublic: true }
      ]
    })
    .populate('owner', 'name email')
    .populate('contributors', 'name email')
    .sort({ createdAt: -1 })

    return successResponse({
      projects,
      count: projects.length
    })
  } catch (error) {
    if (error instanceof NextRequest) {
      return error
    }
    return serverErrorResponse(error, 'Failed to fetch projects')
  }
}

// POST /api/projects - Create a new project
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await request.json()

    // Validate input
    const validationResult = createProjectSchema.safeParse(body)
    if (!validationResult.success) {
      return validationErrorResponse(validationResult.error)
    }

    const { title, description, isPublic, settings } = validationResult.data

    await connectDB()

    // Check for duplicate project title for this user
    const existingProject = await Project.findOne({
      owner: user.id,
      title: { $regex: new RegExp(`^${title}$`, 'i') }
    })

    if (existingProject) {
      return errorResponse('You already have a project with this title', 409)
    }

    // Create the project
    const project = await Project.create({
      title,
      description,
      owner: user.id,
      contributors: [],
      isPublic: isPublic || false,
      settings: settings || {}
    })

    // Populate owner info
    await project.populate('owner', 'name email')

    return successResponse(
      {
        project,
        message: 'Project created successfully'
      },
      201
    )
  } catch (error) {
    if (error instanceof NextRequest) {
      return error
    }
    return serverErrorResponse(error, 'Failed to create project')
  }
}
