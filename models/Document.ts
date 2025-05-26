import mongoose, { Schema, Model, Types } from 'mongoose'
import type { Document as MongoDocument } from 'mongoose'

export interface IDocument extends MongoDocument {
  projectId: Types.ObjectId
  title: string
  content: string
  type: 'text' | 'pdf' | 'url'
  metadata: {
    fileName?: string
    fileSize?: number
    mimeType?: string
    url?: string
  }
  embedding?: number[]
  chunks?: {
    text: string
    embedding: number[]
    startIndex: number
    endIndex: number
  }[]
  createdBy: Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const documentSchema = new Schema<IDocument>(
  {
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true
    },
    title: {
      type: String,
      required: [true, 'Document title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters']
    },
    content: {
      type: String,
      required: [true, 'Document content is required']
    },
    type: {
      type: String,
      enum: ['text', 'pdf', 'url'],
      default: 'text'
    },
    metadata: {
      fileName: String,
      fileSize: Number,
      mimeType: String,
      url: String
    },
    embedding: {
      type: [Number],
      select: false // Don't include by default in queries
    },
    chunks: [{
      text: String,
      embedding: {
        type: [Number],
        select: false
      },
      startIndex: Number,
      endIndex: Number
    }],
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  {
    timestamps: true
  }
)

// Indexes
documentSchema.index({ projectId: 1, createdAt: -1 })
documentSchema.index({ title: 'text', content: 'text' })

// Method to get relevant chunks based on similarity
documentSchema.methods.getRelevantChunks = function(queryEmbedding: number[], topK: number = 5) {
  if (!this.chunks || this.chunks.length === 0) {
    return []
  }

  // Calculate cosine similarity for each chunk
  const similarities = this.chunks.map((chunk: any, index: number) => {
    const similarity = cosineSimilarity(queryEmbedding, chunk.embedding)
    return { index, similarity, text: chunk.text }
  })

  // Sort by similarity and return top K
  return similarities
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK)
    .filter(item => item.similarity > 0.7) // Threshold for relevance
}

// Helper function for cosine similarity
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0
  
  let dotProduct = 0
  let normA = 0
  let normB = 0
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
}

const Document: Model<IDocument> = mongoose.models.Document || mongoose.model<IDocument>('Document', documentSchema)

export default Document
