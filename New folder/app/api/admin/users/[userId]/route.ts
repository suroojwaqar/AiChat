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
  notFoundResponse,
  validationErrorResponse
} from '@/lib/api-response'
import { z } from 'zod'

const updateUserSchema = z.object({
  name: z.string().min(2).max(50).optional(),
  role: z.enum(['admin', 'user']).optional(),
  isActive: z.boolean().optional()
})

// GET /api/admin/users/[userId] - Get specific user details
export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    await requireAdmin()
    const { userId } = params
    await connectDB()

    const user = await User.findById(userId).select('-passwordHash')
    if (!user) {
      return notFoundResponse('User not found')
    }

    // Get detailed stats
    const [chatCount, projectCount, recentChats, recentProjects] = await Promise.all([
      Chat.countDocuments({ userId: user._id, isActive: true }),
      Project.countDocuments({ 
        $or: [
          { ownerId: user._id },
          { contributors: { $elemMatch: { userId: user._id } } }
        ]
      }),
      Chat.find({ userId: user._id, isActive: true })
        .sort({ updatedAt: -1 })
        .limit(5)
        .select('title updatedAt')
        .populate('projectId', 'title'),
      Project.find({ 
        $or: [
          { ownerId: user._id },
          { contributors: { $elemMatch: { userId: user._id } } }
        ]
      })
        .sort({ updatedAt: -1 })
        .limit(5)
        .select('title description updatedAt')
    ])

    return successResponse({
      user: {
        ...user.toObject(),
        chatCount,
        projectCount,
        recentChats,
        recentProjects
      }
    })
  } catch (error) {
    if (error instanceof NextRequest) {
      return error
    }
    return serverErrorResponse(error, 'Failed to fetch user details')
  }
}

// PATCH /api/admin/users/[userId] - Update user
export async function PATCH(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    await requireAdmin()
    const { userId } = params
    const body = await request.json()

    // Validate input
    const validationResult = updateUserSchema.safeParse(body)
    if (!validationResult.success) {
      return validationErrorResponse(validationResult.error)
    }

    const updateData = validationResult.data
    await connectDB()

    const user = await User.findById(userId)
    if (!user) {
      return notFoundResponse('User not found')
    }

    // Update user fields
    if (updateData.name !== undefined) {
      user.name = updateData.name
    }
    if (updateData.role !== undefined) {
      user.role = updateData.role
    }
    if (updateData.isActive !== undefined) {
      user.isActive = updateData.isActive
    }

    await user.save()

    return successResponse({
      user: {
        ...user.toObject(),
        passwordHash: undefined
      },
      message: 'User updated successfully'
    })
  } catch (error) {
    if (error instanceof NextRequest) {
      return error
    }
    return serverErrorResponse(error, 'Failed to update user')
  }
}

// DELETE /api/admin/users/[userId] - Delete user
export async function DELETE(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    await requireAdmin()
    const { userId } = params
    await connectDB()

    const user = await User.findById(userId)
    if (!user) {
      return notFoundResponse('User not found')
    }

    // Don't allow deleting the last admin
    if (user.role === 'admin') {
      const adminCount = await User.countDocuments({ role: 'admin', isActive: true })
      if (adminCount <= 1) {
        return errorResponse('Cannot delete the last admin user', 400)
      }
    }

    // Soft delete user data
    await Promise.all([
      // Deactivate user chats
      Chat.updateMany(
        { userId: user._id },
        { isActive: false }
      ),
      // Remove user from project contributors
      Project.updateMany(
        { 'contributors.userId': user._id },
        { $pull: { contributors: { userId: user._id } } }
      ),
      // Transfer ownership of projects to first admin
      (async () => {
        const firstAdmin = await User.findOne({ role: 'admin', _id: { $ne: user._id }, isActive: true })
        if (firstAdmin) {
          await Project.updateMany(
            { ownerId: user._id },
            { ownerId: firstAdmin._id }
          )
        }
      })()
    ])

    // Delete the user
    await User.findByIdAndDelete(userId)

    return successResponse({
      message: 'User deleted successfully'
    })
  } catch (error) {
    if (error instanceof NextRequest) {
      return error
    }
    return serverErrorResponse(error, 'Failed to delete user')
  }
}
