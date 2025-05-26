'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { 
  Users, 
  Settings, 
  MessageSquare, 
  FolderOpen, 
  Bot, 
  Activity,
  TrendingUp,
  Database,
  Shield,
  Clock
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface AdminStats {
  totalUsers: number
  activeUsers: number
  totalChats: number
  totalProjects: number
  totalDocuments: number
  aiProviders: number
  tokensUsedToday: number
  systemHealth: 'healthy' | 'warning' | 'error'
}

export default function AdminDashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    } else if (session?.user?.role !== 'admin') {
      router.push('/unauthorized')
    }
  }, [status, session, router])

  useEffect(() => {
    if (session?.user?.role === 'admin') {
      fetchAdminStats()
    }
  }, [session])

  async function fetchAdminStats() {
    try {
      const response = await fetch('/api/admin/stats')
      if (response.ok) {
        const data = await response.json()
        setStats(data.data)
      }
    } catch (error) {
      console.error('Failed to fetch admin stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-pulse text-muted-foreground">Loading admin dashboard...</div>
      </div>
    )
  }

  if (!session || session.user.role !== 'admin') {
    return null
  }

  const quickActions = [
    {
      title: 'Manage Users',
      description: 'View, edit, and manage user accounts',
      href: '/admin/users',
      icon: Users,
      color: 'text-blue-500'
    },
    {
      title: 'AI Providers',
      description: 'Configure OpenAI and other AI provider settings',
      href: '/admin/ai-providers',
      icon: Bot,
      color: 'text-green-500'
    },
    {
      title: 'System Settings',
      description: 'Configure global application settings',
      href: '/admin/settings',
      icon: Settings,
      color: 'text-purple-500'
    },
    {
      title: 'Analytics',
      description: 'View usage analytics and reports',
      href: '/admin/analytics',
      icon: TrendingUp,
      color: 'text-orange-500'
    },
    {
      title: 'System Logs',
      description: 'Monitor system logs and errors',
      href: '/admin/logs',
      icon: Activity,
      color: 'text-red-500'
    },
    {
      title: 'Database',
      description: 'Database management and maintenance',
      href: '/admin/database',
      icon: Database,
      color: 'text-indigo-500'
    }
  ]

  const statCards = [
    {
      title: 'Total Users',
      value: stats?.totalUsers || 0,
      description: `${stats?.activeUsers || 0} active today`,
      icon: Users,
      color: 'text-blue-500'
    },
    {
      title: 'Total Chats',
      value: stats?.totalChats || 0,
      description: 'All chat conversations',
      icon: MessageSquare,
      color: 'text-green-500'
    },
    {
      title: 'Projects',
      value: stats?.totalProjects || 0,
      description: 'Active projects',
      icon: FolderOpen,
      color: 'text-purple-500'
    },
    {
      title: 'Documents',
      value: stats?.totalDocuments || 0,
      description: 'Uploaded documents',
      icon: Database,
      color: 'text-orange-500'
    },
    {
      title: 'AI Providers',
      value: stats?.aiProviders || 0,
      description: 'Configured providers',
      icon: Bot,
      color: 'text-indigo-500'
    },
    {
      title: 'Tokens Today',
      value: stats?.tokensUsedToday || 0,
      description: 'API tokens consumed',
      icon: Activity,
      color: 'text-red-500'
    }
  ]

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
            <p className="text-muted-foreground">
              Manage your AI Chat Platform
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge 
              variant={stats?.systemHealth === 'healthy' ? 'default' : 
                      stats?.systemHealth === 'warning' ? 'secondary' : 'destructive'}
              className="flex items-center gap-1"
            >
              <Activity className="h-3 w-3" />
              System {stats?.systemHealth || 'Unknown'}
            </Badge>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              Last updated: {new Date().toLocaleTimeString()}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 mb-8">
        {statCards.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <Icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {quickActions.map((action) => {
            const Icon = action.icon
            return (
              <Card key={action.title} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg bg-muted ${action.color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{action.title}</CardTitle>
                      <CardDescription>{action.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Button asChild className="w-full">
                    <Link href={action.href}>
                      Open {action.title}
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent User Activity</CardTitle>
            <CardDescription>Latest user registrations and activity</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div>
                  <p className="font-medium">5 new users registered</p>
                  <p className="text-sm text-muted-foreground">In the last 24 hours</p>
                </div>
                <Badge>Today</Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div>
                  <p className="font-medium">127 chat conversations</p>
                  <p className="text-sm text-muted-foreground">Active conversations today</p>
                </div>
                <Badge variant="secondary">Active</Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div>
                  <p className="font-medium">23 new projects created</p>
                  <p className="text-sm text-muted-foreground">This week</p>
                </div>
                <Badge variant="outline">This Week</Badge>
              </div>
            </div>
            <Button asChild className="w-full mt-4" variant="outline">
              <Link href="/admin/analytics">View Detailed Analytics</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Health</CardTitle>
            <CardDescription>Current system status and alerts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                  <span className="font-medium">Database Connection</span>
                </div>
                <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                  Healthy
                </Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                  <span className="font-medium">AI Provider APIs</span>
                </div>
                <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                  Operational
                </Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 bg-yellow-500 rounded-full"></div>
                  <span className="font-medium">Storage Usage</span>
                </div>
                <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100">
                  78% Used
                </Badge>
              </div>
            </div>
            <Button asChild className="w-full mt-4" variant="outline">
              <Link href="/admin/logs">View System Logs</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
