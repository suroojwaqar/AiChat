'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { 
  Send, 
  Plus, 
  MessageSquare, 
  Trash2, 
  User, 
  Bot, 
  MoreHorizontal,
  AlertCircle,
  Loader2,
  Copy,
  RotateCcw,
  Check,
  ThumbsUp,
  ThumbsDown,
  Share,
  Menu,
  X
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { cn } from '@/lib/utils'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  isStreaming?: boolean
}

interface Chat {
  _id: string
  title: string
  updatedAt: string
  messages: Message[]
}

export default function ModernChatPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [chats, setChats] = useState<Chat[]>([])
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [status, router])

  useEffect(() => {
    if (session) {
      fetchChats()
    }
  }, [session])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    adjustTextareaHeight()
  }, [input])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      const newHeight = Math.min(textareaRef.current.scrollHeight, 200)
      textareaRef.current.style.height = `${newHeight}px`
    }
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    
    if (diffInHours < 1) {
      const minutes = Math.floor(diffInHours * 60)
      return minutes < 1 ? 'Just now' : `${minutes}m ago`
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`
    } else {
      return date.toLocaleDateString()
    }
  }

  const copyToClipboard = async (text: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedMessageId(messageId)
      setTimeout(() => setCopiedMessageId(null), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  async function fetchChats() {
    try {
      setError(null)
      const response = await fetch('/api/chat')
      if (response.ok) {
        const data = await response.json()
        setChats(data.data.chats || [])
      } else {
        throw new Error('Failed to fetch chats')
      }
    } catch (error) {
      console.error('Failed to fetch chats:', error)
      setError('Failed to load chats. Please refresh the page.')
    }
  }

  async function loadChat(chatId: string) {
    try {
      setError(null)
      setSidebarOpen(false) // Close sidebar on mobile after selecting chat
      const response = await fetch(`/api/chat/${chatId}`)
      if (response.ok) {
        const data = await response.json()
        const chatMessages = data.data.chat.messages.map((msg: any) => ({
          id: msg._id || Math.random().toString(),
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp || new Date().toISOString()
        }))
        setMessages(chatMessages)
        setSelectedChatId(chatId)
      } else {
        throw new Error('Failed to load chat')
      }
    } catch (error) {
      console.error('Failed to load chat:', error)
      setError('Failed to load chat messages.')
    }
  }

  async function createNewChat() {
    if (!input.trim()) return

    const message = input.trim()
    setInput('')
    setError(null)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: message.substring(0, 50) + (message.length > 50 ? '...' : ''),
          message: message,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        const newChatId = data.data.chat._id
        await fetchChats()
        await loadChat(newChatId)
        await sendMessage(message, newChatId)
      } else {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to create chat')
      }
    } catch (error: any) {
      console.error('Failed to create chat:', error)
      setError(error.message || 'Failed to create new chat. Please try again.')
      setInput(message)
    }
  }

  async function sendMessage(message: string, chatId: string) {
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: message,
      timestamp: new Date().toISOString()
    }

    setMessages(prev => [...prev, userMessage])
    setIsLoading(true)
    setError(null)

    const assistantMessageId = (Date.now() + 1).toString()
    const streamingMessage: Message = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
      isStreaming: true
    }
    setMessages(prev => [...prev, streamingMessage])

    try {
      const response = await fetch(`/api/chat/${chatId}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || `Failed to send message: ${response.status}`)
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let assistantContent = ''

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value)
          const lines = chunk.split('\n')
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6)
              if (data === '[DONE]') continue
              
              try {
                const parsed = JSON.parse(data)
                if (parsed.choices?.[0]?.delta?.content) {
                  assistantContent += parsed.choices[0].delta.content
                  
                  setMessages(prev => prev.map(msg => 
                    msg.id === assistantMessageId 
                      ? { ...msg, content: assistantContent }
                      : msg
                  ))
                }
              } catch (parseError) {
                if (data.trim()) {
                  assistantContent += data
                  setMessages(prev => prev.map(msg => 
                    msg.id === assistantMessageId 
                      ? { ...msg, content: assistantContent }
                      : msg
                  ))
                }
              }
            }
          }
        }
      }

      setMessages(prev => prev.map(msg => 
        msg.id === assistantMessageId 
          ? { ...msg, isStreaming: false }
          : msg
      ))

    } catch (error: any) {
      console.error('Failed to send message:', error)
      
      setMessages(prev => prev.filter(msg => 
        msg.id !== userMessage.id && msg.id !== assistantMessageId
      ))
      
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `Sorry, I encountered an error: ${error.message || 'Please try again.'}`,
        timestamp: new Date().toISOString()
      }
      setMessages(prev => [...prev, errorMessage])
      setError(error.message || 'Failed to get AI response. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const message = input.trim()
    setInput('')

    if (!selectedChatId) {
      await createNewChat()
    } else {
      await sendMessage(message, selectedChatId)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const deleteChat = async (chatId: string) => {
    if (!confirm('Are you sure you want to delete this chat?')) return
    
    try {
      setError(null)
      const response = await fetch(`/api/chat/${chatId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      })

      if (response.ok) {
        setChats(prev => prev.filter(chat => chat._id !== chatId))
        
        if (selectedChatId === chatId) {
          setSelectedChatId(null)
          setMessages([])
        }
      } else {
        throw new Error('Failed to delete chat')
      }
    } catch (error: any) {
      console.error('Failed to delete chat:', error)
      setError(error.message || 'Failed to delete chat. Please try again.')
    }
  }

  const startNewChat = () => {
    setSelectedChatId(null)
    setMessages([])
    setInput('')
    setError(null)
    setSidebarOpen(false)
    setTimeout(() => {
      textareaRef.current?.focus()
    }, 100)
  }

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-center text-white">
          <AlertCircle className="h-8 w-8 mx-auto mb-2" />
          <p>Redirecting to sign in...</p>
        </div>
      </div>
    )
  }

  const selectedChat = chats.find(chat => chat._id === selectedChatId)

  return (
    <div className="h-screen w-full flex bg-gray-900 text-white overflow-hidden">
      {/* Error Alert */}
      {error && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-md px-4">
          <Alert variant="destructive" className="bg-red-900 border-red-700 text-red-100">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error}
              <Button 
                variant="ghost" 
                size="sm" 
                className="ml-2 h-auto p-0 text-red-100 hover:text-red-200"
                onClick={() => setError(null)}
              >
                ×
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={cn(
        "w-64 h-full bg-gray-800 border-r border-gray-700 flex flex-col transition-transform duration-300 lg:translate-x-0 z-50",
        sidebarOpen ? "translate-x-0" : "-translate-x-full",
        "fixed lg:relative"
      )}>
        {/* Sidebar Header */}
        <div className="p-3 border-b border-gray-700 flex items-center justify-between">
          <Button 
            onClick={startNewChat} 
            className="flex-1 justify-start gap-2 bg-gray-700 hover:bg-gray-600 text-white border-gray-600" 
            disabled={isLoading}
          >
            <Plus className="h-4 w-4" />
            New chat
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden ml-2 text-gray-400 hover:text-white"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-2 space-y-1">
              {/* Today Section */}
              {chats.length > 0 && (
                <div className="mb-2">
                  <h3 className="text-xs font-medium text-gray-400 px-2 py-1">Today</h3>
                  {chats.map((chat) => (
                    <div
                      key={chat._id}
                      className={cn(
                        "group relative flex items-center gap-2 rounded-lg p-2 cursor-pointer hover:bg-gray-700 transition-colors text-sm",
                        selectedChatId === chat._id ? 'bg-gray-700' : ''
                      )}
                      onClick={() => !isLoading && loadChat(chat._id)}
                    >
                      <MessageSquare className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-gray-200">{chat.title}</p>
                      </div>
                      
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-gray-400 hover:text-white">
                              <MoreHorizontal className="h-3 w-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-gray-800 border-gray-700">
                            <DropdownMenuItem 
                              onClick={(e) => {
                                e.stopPropagation()
                                deleteChat(chat._id)
                              }}
                              className="text-red-400 hover:text-red-300 hover:bg-gray-700"
                              disabled={isLoading}
                            >
                              <Trash2 className="h-3 w-3 mr-2" />
                              Delete chat
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* User Profile */}
        <div className="p-3 border-t border-gray-700">
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={session?.user?.image || ''} />
              <AvatarFallback className="bg-gray-600 text-white">
                <User className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate text-gray-200">
                {session?.user?.name || session?.user?.email}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 h-full flex flex-col lg:ml-0 ml-0">
        {/* Mobile Header */}
        <div className="lg:hidden flex items-center justify-between p-4 border-b border-gray-700">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(true)}
            className="text-gray-400 hover:text-white"
          >
            <Menu className="h-5 w-5" />
          </Button>
          {selectedChat && (
            <h1 className="text-lg font-semibold truncate text-white">{selectedChat.title}</h1>
          )}
          <div className="w-8" /> {/* Spacer for balance */}
        </div>

        {selectedChat ? (
          <>
            {/* Desktop Header */}
            <div className="hidden lg:flex items-center justify-between p-4 border-b border-gray-700">
              <div>
                <h1 className="text-xl font-semibold text-white">{selectedChat.title}</h1>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                  <Share className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-hidden">
              <ScrollArea className="h-full">
                <div className="max-w-3xl mx-auto px-4 py-6">
                  <div className="space-y-6">
                    {messages.map((message, index) => (
                      <div
                        key={message.id}
                        className="group"
                      >
                        <div className="flex gap-4">
                          <Avatar className="h-8 w-8 flex-shrink-0">
                            <AvatarFallback className={cn(
                              "text-white",
                              message.role === 'user' ? 'bg-blue-600' : 'bg-green-600'
                            )}>
                              {message.role === 'user' ? (
                                <User className="h-4 w-4" />
                              ) : (
                                <Bot className="h-4 w-4" />
                              )}
                            </AvatarFallback>
                          </Avatar>
                          
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-white">
                                {message.role === 'user' ? 'You' : 'ChatGPT'}
                              </span>
                            </div>
                            
                            <div className="prose prose-invert max-w-none">
                              <div className="text-gray-100 whitespace-pre-wrap break-words">
                                {message.content}
                                {message.isStreaming && (
                                  <span className="inline-block w-2 h-5 bg-gray-400 animate-pulse ml-1" />
                                )}
                              </div>
                            </div>
                            
                            {/* Message Actions */}
                            {message.role === 'assistant' && !message.isStreaming && (
                              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 px-2 text-gray-400 hover:text-white hover:bg-gray-700"
                                  onClick={() => copyToClipboard(message.content, message.id)}
                                >
                                  {copiedMessageId === message.id ? (
                                    <Check className="h-4 w-4" />
                                  ) : (
                                    <Copy className="h-4 w-4" />
                                  )}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 px-2 text-gray-400 hover:text-white hover:bg-gray-700"
                                >
                                  <ThumbsUp className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 px-2 text-gray-400 hover:text-white hover:bg-gray-700"
                                >
                                  <ThumbsDown className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 px-2 text-gray-400 hover:text-white hover:bg-gray-700"
                                  disabled={isLoading}
                                >
                                  <RotateCcw className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    <div ref={messagesEndRef} />
                  </div>
                </div>
              </ScrollArea>
            </div>

            {/* Input Area */}
            <div className="border-t border-gray-700 p-4">
              <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
                <div className="relative">
                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Message ChatGPT..."
                    disabled={isLoading}
                    className="w-full resize-none bg-gray-700 border border-gray-600 rounded-xl px-4 py-3 pr-12 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[52px] max-h-[200px]"
                    rows={1}
                  />
                  
                  <Button
                    type="submit"
                    disabled={!input.trim() || isLoading}
                    size="sm"
                    className="absolute right-2 bottom-2 h-8 w-8 p-0 rounded-lg bg-white text-black hover:bg-gray-200 disabled:bg-gray-600 disabled:text-gray-400"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8">
            <div className="max-w-md text-center space-y-6">
              <div className="w-16 h-16 rounded-full bg-gray-700 flex items-center justify-center mx-auto">
                <Bot className="h-8 w-8 text-white" />
              </div>
              
              <div className="space-y-2">
                <h1 className="text-3xl font-semibold text-white">What can I help with?</h1>
              </div>
            </div>

            {/* Input Area for New Chat */}
            <div className="w-full max-w-3xl mt-8">
              <form onSubmit={handleSubmit}>
                <div className="relative">
                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask anything..."
                    disabled={isLoading}
                    className="w-full resize-none bg-gray-700 border border-gray-600 rounded-xl px-4 py-3 pr-12 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[52px] max-h-[200px]"
                    rows={1}
                  />
                  
                  <Button
                    type="submit"
                    disabled={!input.trim() || isLoading}
                    size="sm"
                    className="absolute right-2 bottom-2 h-8 w-8 p-0 rounded-lg bg-white text-black hover:bg-gray-200 disabled:bg-gray-600 disabled:text-gray-400"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
