import { NextRequest } from 'next/server'
import connectDB from '@/lib/mongodb'
import User from '@/models/User'
import Chat from '@/models/Chat'
import Project from '@/models/Project'
import { requireAdmin } from '@/lib/auth-utils'
import {
  successResponse,
  errorResponse,
  serverErrorResponse,
  validationErrorResponse
} from '@/lib/api-response'
import { z } from 'zod'

// Create User Schema
const createUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(50, 'Name cannot exceed 50 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  role: z.enum(['admin', 'user']),
  isActive: z.boolean().optional()
})

// GET /api/admin/users - Get all users with stats
export async function GET(request: NextRequest) {
  try {
    await requireAdmin()
    await connectDB()

    const users = await User.find()
      .select('-passwordHash')
      .sort({ createdAt: -1 })

    // Get user stats
    const usersWithStats = await Promise.all(
      users.map(async (user) => {
        const [chatCount, projectCount] = await Promise.all([
          Chat.countDocuments({ userId: user._id, isActive: true }),
          Project.countDocuments({ 
            $or: [
              { ownerId: user._id },
              { contributors: { $elemMatch: { userId: user._id } } }
            ]
          })
        ])

        return {
          ...user.toObject(),
          chatCount,
          projectCount
        }
      })
    )

    return successResponse({
      users: usersWithStats,
      count: usersWithStats.length
    })
  } catch (error) {
    if (error instanceof NextRequest) {
      return error
    }
    return serverErrorResponse(error, 'Failed to fetch users')
  }
}

// POST /api/admin/users - Create a new user
export async function POST(request: NextRequest) {
  try {
    await requireAdmin()
    const body = await request.json()

    // Validate input
    const validationResult = createUserSchema.safeParse(body)
    if (!validationResult.success) {
      return validationErrorResponse(validationResult.error)
    }

    const { name, email, password, role, isActive } = validationResult.data

    await connectDB()

    // Check if user already exists
    const existingUser = await User.findOne({ 
      email: email.toLowerCase() 
    })

    if (existingUser) {
      return errorResponse('A user with this email address already exists', 400)
    }

    // Create new user
    const newUser = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash: password, // This will be hashed by the pre-save middleware
      role: role,
      authProvider: 'credentials',
      isActive: isActive !== undefined ? isActive : true
    })

    // Return user without password hash
    const userResponse = {
      ...newUser.toObject(),
      passwordHash: undefined,
      chatCount: 0,
      projectCount: 0
    }

    return successResponse({
      user: userResponse,
      message: 'User created successfully'
    }, 201)

  } catch (error: any) {
    if (error instanceof NextRequest) {
      return error
    }
    
    // Handle MongoDB duplicate key error
    if (error.code === 11000) {
      return errorResponse('A user with this email address already exists', 400)
    }
    
    return serverErrorResponse(error, 'Failed to create user')
  }
}
