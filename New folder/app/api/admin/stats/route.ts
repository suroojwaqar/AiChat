import { NextRequest } from 'next/server'
import connectDB from '@/lib/mongodb'
import User from '@/models/User'
import Chat from '@/models/Chat'
import Project from '@/models/Project'
import Document from '@/models/Document'
import AIProviderSettings from '@/models/AIProviderSettings'
import { requireAdmin } from '@/lib/auth-utils'
import {
  successResponse,
  serverErrorResponse
} from '@/lib/api-response'

// GET /api/admin/stats - Get admin dashboard statistics
export async function GET(request: NextRequest) {
  try {
    await requireAdmin()
    await connectDB()

    // Calculate date ranges
    const today = new Date()
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)

    // Get all statistics in parallel
    const [
      totalUsers,
      activeUsers,
      totalChats,
      totalProjects,
      totalDocuments,
      aiProviders,
      newUsersThisWeek,
      chatsToday,
      systemHealth
    ] = await Promise.all([
      // Total users
      User.countDocuments(),
      
      // Active users (logged in within last 30 days or have active chats)
      User.countDocuments({ 
        isActive: true,
        $or: [
          { updatedAt: { $gte: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000) } },
          { _id: { $in: await Chat.distinct('userId', { 
            updatedAt: { $gte: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000) },
            isActive: true 
          }) } }
        ]
      }),
      
      // Total chats
      Chat.countDocuments({ isActive: true }),
      
      // Total projects
      Project.countDocuments(),
      
      // Total documents
      Document.countDocuments(),
      
      // AI providers
      AIProviderSettings.countDocuments(),
      
      // New users this week
      User.countDocuments({ 
        createdAt: { $gte: weekAgo }
      }),
      
      // Chats created today
      Chat.countDocuments({
        createdAt: { $gte: todayStart },
        isActive: true
      }),
      
      // System health check
      checkSystemHealth()
    ])

    // Calculate token usage (approximate)
    const tokensUsedToday = await estimateTokenUsage(todayStart)

    return successResponse({
      totalUsers,
      activeUsers,
      totalChats,
      totalProjects,
      totalDocuments,
      aiProviders,
      newUsersThisWeek,
      chatsToday,
      tokensUsedToday,
      systemHealth,
      lastUpdated: new Date().toISOString()
    })
  } catch (error) {
    if (error instanceof NextRequest) {
      return error
    }
    return serverErrorResponse(error, 'Failed to fetch admin statistics')
  }
}

// Helper function to check system health
async function checkSystemHealth(): Promise<'healthy' | 'warning' | 'error'> {
  try {
    // Check database connection
    const dbCheck = await User.findOne().limit(1)
    
    // Check if AI providers are configured
    const activeProviders = await AIProviderSettings.countDocuments({ isActive: true })
    
    // Check for recent errors (this would need to be implemented with a logging system)
    // For now, we'll do basic checks
    
    if (activeProviders === 0) {
      return 'warning' // No AI providers configured
    }
    
    if (!dbCheck && dbCheck !== null) {
      return 'error' // Database issues
    }
    
    return 'healthy'
  } catch (error) {
    return 'error'
  }
}

// Helper function to estimate token usage
async function estimateTokenUsage(since: Date): Promise<number> {
  try {
    // Get chats created/updated since the specified date
    const recentChats = await Chat.find({
      updatedAt: { $gte: since },
      isActive: true
    }).select('messages metadata')

    let totalTokens = 0
    
    for (const chat of recentChats) {
      // Use metadata if available
      if (chat.metadata?.totalTokens) {
        totalTokens += chat.metadata.totalTokens
      } else {
        // Estimate based on message content (rough approximation)
        const messageContent = chat.messages
          .filter((msg: any) => msg.timestamp >= since)
          .map((msg: any) => msg.content)
          .join(' ')
        
        // Rough estimation: ~4 characters per token
        totalTokens += Math.ceil(messageContent.length / 4)
      }
    }
    
    return totalTokens
  } catch (error) {
    console.error('Error estimating token usage:', error)
    return 0
  }
}
