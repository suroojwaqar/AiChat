'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { 
  Activity, 
  AlertCircle, 
  CheckCircle, 
  Info, 
  XCircle,
  RefreshCw,
  Download,
  Filter
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface LogEntry {
  _id: string
  level: 'info' | 'warn' | 'error' | 'debug'
  message: string
  timestamp: string
  source: string
  userId?: string
  metadata?: any
}

export default function AdminLogsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [levelFilter, setLevelFilter] = useState<string>('all')
  const [sourceFilter, setSourceFilter] = useState<string>('all')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    } else if (session?.user?.role !== 'admin') {
      router.push('/unauthorized')
    }
  }, [status, session, router])

  useEffect(() => {
    if (session?.user?.role === 'admin') {
      fetchLogs()
    }
  }, [session, levelFilter, sourceFilter])

  async function fetchLogs() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (levelFilter !== 'all') params.append('level', levelFilter)
      if (sourceFilter !== 'all') params.append('source', sourceFilter)
      
      const response = await fetch(`/api/admin/logs?${params}`)
      if (response.ok) {
        const data = await response.json()
        setLogs(data.data.logs)
      }
    } catch (error) {
      console.error('Failed to fetch logs:', error)
    } finally {
      setLoading(false)
    }
  }

  const getLogIcon = (level: string) => {
    switch (level) {
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'warn':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />
      case 'info':
        return <Info className="h-4 w-4 text-blue-500" />
      case 'debug':
        return <CheckCircle className="h-4 w-4 text-gray-500" />
      default:
        return <Activity className="h-4 w-4 text-muted-foreground" />
    }
  }

  const getLogBadge = (level: string) => {
    switch (level) {
      case 'error':
        return <Badge variant="destructive">Error</Badge>
      case 'warn':
        return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100">Warning</Badge>
      case 'info':
        return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100">Info</Badge>
      case 'debug':
        return <Badge variant="secondary">Debug</Badge>
      default:
        return <Badge variant="outline">{level}</Badge>
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-pulse text-muted-foreground">Loading logs...</div>
      </div>
    )
  }

  if (!session || session.user.role !== 'admin') {
    return null
  }

  // Mock logs for demonstration since we don't have a logging system yet
  const mockLogs: LogEntry[] = [
    {
      _id: '1',
      level: 'info',
      message: 'User authenticated successfully',
      timestamp: new Date().toISOString(),
      source: 'auth',
      userId: 'user123'
    },
    {
      _id: '2',
      level: 'warn',
      message: 'Rate limit approached for API endpoint',
      timestamp: new Date(Date.now() - 300000).toISOString(),
      source: 'api',
      metadata: { endpoint: '/api/chat', count: 45 }
    },
    {
      _id: '3',
      level: 'error',
      message: 'Failed to connect to OpenAI API',
      timestamp: new Date(Date.now() - 600000).toISOString(),
      source: 'ai-provider',
      metadata: { provider: 'openai', error: 'timeout' }
    },
    {
      _id: '4',
      level: 'info',
      message: 'New user registration completed',
      timestamp: new Date(Date.now() - 900000).toISOString(),
      source: 'auth',
      userId: 'user456'
    },
    {
      _id: '5',
      level: 'debug',
      message: 'Database query executed successfully',
      timestamp: new Date(Date.now() - 1200000).toISOString(),
      source: 'database',
      metadata: { query: 'find users', duration: '125ms' }
    }
  ]

  const displayLogs = logs.length > 0 ? logs : mockLogs

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
              <Activity className="h-8 w-8" />
              System Logs
            </h1>
            <p className="text-muted-foreground">
              Monitor system activity and troubleshoot issues
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={fetchLogs} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Log Level</label>
              <Select value={levelFilter} onValueChange={setLevelFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All levels" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                  <SelectItem value="warn">Warning</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="debug">Debug</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Source</label>
              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All sources" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  <SelectItem value="auth">Authentication</SelectItem>
                  <SelectItem value="api">API</SelectItem>
                  <SelectItem value="ai-provider">AI Provider</SelectItem>
                  <SelectItem value="database">Database</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Logs</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{displayLogs.length}</div>
            <p className="text-xs text-muted-foreground">
              Last 24 hours
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Errors</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{displayLogs.filter(l => l.level === 'error').length}</div>
            <p className="text-xs text-muted-foreground">
              Needs attention
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Warnings</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{displayLogs.filter(l => l.level === 'warn').length}</div>
            <p className="text-xs text-muted-foreground">
              Monitor closely
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Info</CardTitle>
            <Info className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{displayLogs.filter(l => l.level === 'info').length}</div>
            <p className="text-xs text-muted-foreground">
              Normal activity
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Logs List */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Logs</CardTitle>
          <CardDescription>
            Latest system activity and events
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {displayLogs.map((log) => (
              <div key={log._id} className="flex items-start gap-4 p-4 border rounded-lg hover:bg-muted/20 transition-colors">
                <div className="flex items-center gap-2 mt-1">
                  {getLogIcon(log.level)}
                  {getLogBadge(log.level)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-medium">{log.message}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{new Date(log.timestamp).toLocaleString()}</span>
                      <span>•</span>
                      <span className="capitalize">{log.source}</span>
                      {log.userId && (
                        <>
                          <span>•</span>
                          <span>User: {log.userId}</span>
                        </>
                      )}
                    </div>
                  </div>
                  {log.metadata && (
                    <div className="mt-2 p-2 bg-muted/50 rounded text-xs">
                      <details>
                        <summary className="cursor-pointer font-medium">Metadata</summary>
                        <pre className="mt-1 overflow-x-auto">
                          {JSON.stringify(log.metadata, null, 2)}
                        </pre>
                      </details>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Note about logging system */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            Logging System
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Note:</strong> This page shows mock log data. To implement a full logging system, you'll need to:
            </p>
            <ul className="text-sm text-blue-700 dark:text-blue-300 mt-2 ml-4 list-disc">
              <li>Set up a logging service (Winston, Pino, etc.)</li>
              <li>Create log collection endpoints</li>
              <li>Implement log storage (MongoDB, files, etc.)</li>
              <li>Add log rotation and retention policies</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
