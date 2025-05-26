'use client'

import { useState, useRef } from 'react'
import { Upload, FileText, File, Trash2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'

interface Document {
  _id: string
  title: string
  content: string
  type: 'text' | 'pdf' | 'url'
  metadata: {
    fileName?: string
    fileSize?: number
    mimeType?: string
    url?: string
  }
  createdBy: {
    name: string
    email: string
  }
  createdAt: string
}

interface DocumentsTabProps {
  projectId: string
  documents: Document[]
  onDocumentAdded: () => void
  onDocumentDeleted: () => void
}

export function DocumentsTab({ projectId, documents, onDocumentAdded, onDocumentDeleted }: DocumentsTabProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadType, setUploadType] = useState<'text' | 'file'>('text')
  const [showUploadDialog, setShowUploadDialog] = useState(false)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleUpload() {
    if (!title.trim()) {
      setError('Title is required')
      return
    }

    if (uploadType === 'text' && !content.trim()) {
      setError('Content is required')
      return
    }

    if (uploadType === 'file' && !fileInputRef.current?.files?.length) {
      setError('Please select a file')
      return
    }

    setIsUploading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('title', title)
      formData.append('type', uploadType)

      if (uploadType === 'text') {
        formData.append('content', content)
      } else if (fileInputRef.current?.files?.[0]) {
        formData.append('file', fileInputRef.current.files[0])
      }

      const response = await fetch(`/api/projects/${projectId}/documents`, {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (!response.ok) {
        setError(result.error || 'Failed to upload document')
        return
      }

      // Reset form
      setTitle('')
      setContent('')
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      setShowUploadDialog(false)
      onDocumentAdded()
    } catch (error) {
      console.error('Upload error:', error)
      setError('An unexpected error occurred')
    } finally {
      setIsUploading(false)
    }
  }

  async function handleDelete(documentId: string) {
    if (!confirm('Are you sure you want to delete this document?')) {
      return
    }

    try {
      const response = await fetch(`/api/projects/${projectId}/documents/${documentId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        onDocumentDeleted()
      } else {
        alert('Failed to delete document')
      }
    } catch (error) {
      console.error('Delete error:', error)
      alert('Failed to delete document')
    }
  }

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  function formatDate(dateString: string): string {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } else if (diffInHours < 48) {
      return 'Yesterday'
    } else {
      return date.toLocaleDateString()
    }
  }

  if (documents.length === 0 && !showUploadDialog) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No documents yet</h3>
          <p className="text-muted-foreground mb-4">
            Upload documents to provide context for AI conversations in this project
          </p>
          <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
            <DialogTrigger asChild>
              <Button>
                <Upload className="mr-2 h-4 w-4" />
                Upload Document
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[525px]">
              <DialogHeader>
                <DialogTitle>Upload Document</DialogTitle>
                <DialogDescription>
                  Add a document to provide context for AI conversations
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>Upload Type</Label>
                  <Select value={uploadType} onValueChange={(value: 'text' | 'file') => setUploadType(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">Text Content</SelectItem>
                      <SelectItem value="file">File Upload</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Document title"
                  />
                </div>

                {uploadType === 'text' ? (
                  <div className="grid gap-2">
                    <Label htmlFor="content">Content</Label>
                    <Textarea
                      id="content"
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder="Enter your document content..."
                      className="min-h-[200px]"
                    />
                  </div>
                ) : (
                  <div className="grid gap-2">
                    <Label htmlFor="file">File</Label>
                    <Input
                      id="file"
                      type="file"
                      ref={fileInputRef}
                      accept=".txt,.md,.pdf"
                    />
                    <p className="text-xs text-muted-foreground">
                      Supported: .txt, .md, .pdf (max 5MB)
                    </p>
                  </div>
                )}

                {error && (
                  <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                    {error}
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowUploadDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleUpload} disabled={isUploading}>
                  {isUploading ? 'Uploading...' : 'Upload'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Documents ({documents.length})</h3>
        <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Add Document
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[525px]">
            <DialogHeader>
              <DialogTitle>Upload Document</DialogTitle>
              <DialogDescription>
                Add a document to provide context for AI conversations
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Upload Type</Label>
                <Select value={uploadType} onValueChange={(value: 'text' | 'file') => setUploadType(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Text Content</SelectItem>
                    <SelectItem value="file">File Upload</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Document title"
                />
              </div>

              {uploadType === 'text' ? (
                <div className="grid gap-2">
                  <Label htmlFor="content">Content</Label>
                  <Textarea
                    id="content"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Enter your document content..."
                    className="min-h-[200px]"
                  />
                </div>
              ) : (
                <div className="grid gap-2">
                  <Label htmlFor="file">File</Label>
                  <Input
                    id="file"
                    type="file"
                    ref={fileInputRef}
                    accept=".txt,.md,.pdf"
                  />
                  <p className="text-xs text-muted-foreground">
                    Supported: .txt, .md, .pdf (max 5MB)
                  </p>
                </div>
              )}

              {error && (
                <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowUploadDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpload} disabled={isUploading}>
                {isUploading ? 'Uploading...' : 'Upload'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {documents.map((doc) => (
          <Card key={doc._id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-base flex items-center gap-2">
                    {doc.type === 'text' ? (
                      <FileText className="h-4 w-4" />
                    ) : (
                      <File className="h-4 w-4" />
                    )}
                    {doc.title}
                  </CardTitle>
                  <CardDescription>
                    {doc.type === 'text' && `Text document • ${doc.content.length} characters`}
                    {doc.type === 'pdf' && doc.metadata.fileName && `PDF • ${doc.metadata.fileName}`}
                    {doc.metadata.fileSize && ` • ${formatFileSize(doc.metadata.fileSize)}`}
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(doc._id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground line-clamp-2">
                {doc.content.substring(0, 200)}...
              </p>
            </CardContent>
            <CardFooter className="text-xs text-muted-foreground">
              <span>Uploaded by {doc.createdBy.name || doc.createdBy.email}</span>
              <span className="mx-2">•</span>
              <span>{formatDate(doc.createdAt)}</span>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  )
}
