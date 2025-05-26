import mongoose, { Schema, Document, Model, Types } from 'mongoose'

export interface IMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
}

export interface IChat extends Document {
  userId: Types.ObjectId
  projectId?: Types.ObjectId
  title: string
  messages: IMessage[]
  metadata: {
    model?: string
    totalTokens?: number
    temperature?: number
  }
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

const messageSchema = new Schema<IMessage>(
  {
    role: {
      type: String,
      enum: ['user', 'assistant', 'system'],
      required: true
    },
    content: {
      type: String,
      required: [true, 'Message content is required']
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  },
  { _id: false }
)

const chatSchema = new Schema<IChat>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      index: true
    },
    title: {
      type: String,
      required: [true, 'Chat title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters']
    },
    messages: [messageSchema],
    metadata: {
      model: String,
      totalTokens: {
        type: Number,
        default: 0
      },
      temperature: Number
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
)

// Indexes
chatSchema.index({ userId: 1, createdAt: -1 })
chatSchema.index({ projectId: 1, isActive: 1 })
chatSchema.index({ title: 'text' })

// Virtual for message count
chatSchema.virtual('messageCount').get(function() {
  return this.messages.length
})

// Method to add a message
chatSchema.methods.addMessage = function(role: 'user' | 'assistant' | 'system', content: string) {
  this.messages.push({
    role,
    content,
    timestamp: new Date()
  })
  return this.save()
}

// Method to get last N messages
chatSchema.methods.getRecentMessages = function(count: number = 10) {
  return this.messages.slice(-count)
}

const Chat: Model<IChat> = mongoose.models.Chat || mongoose.model<IChat>('Chat', chatSchema)

export default Chat
