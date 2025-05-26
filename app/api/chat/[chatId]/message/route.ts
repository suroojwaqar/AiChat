import { NextRequest } from 'next/server'
import connectDB from '@/lib/mongodb'
import Chat from '@/models/Chat'
import { requireAuth } from '@/lib/auth-utils'
import { sendMessageSchema } from '@/lib/validations/chat'
import { openAIService } from '@/lib/services/openai'
import {
  errorResponse,
  validationErrorResponse,
  notFoundResponse,
  forbiddenResponse,
} from '@/lib/api-response'

// POST /api/chat/[chatId]/message - Send a message and get AI response
export async function POST(
  request: NextRequest,
  { params }: { params: { chatId: string } }
) {
  try {
    const user = await requireAuth()
    const { chatId } = params
    const body = await request.json()

    // Validate input
    const validationResult = sendMessageSchema.safeParse({ ...body, chatId })
    if (!validationResult.success) {
      return validationErrorResponse(validationResult.error)
    }

    const { message } = validationResult.data

    await connectDB()

    const chat = await Chat.findById(chatId).populate('projectId')
    if (!chat) {
      return notFoundResponse('Chat not found')
    }

    // Verify ownership
    if (chat.userId.toString() !== user.id) {
      return forbiddenResponse('You do not have access to this chat')
    }

    // Add user message to chat
    await chat.addMessage('user', message)

    // Try to use OpenAI first, fallback to demo response
    let aiResponse = ''
    let useOpenAI = false

    try {
      await openAIService.initialize()
      useOpenAI = true
    } catch (error) {
      console.log('OpenAI not configured, using demo response')
      useOpenAI = false
    }

    if (useOpenAI) {
      // Use real OpenAI
      const messages = []

      // Add system message if project context exists
      if (chat.projectId) {
        const project = chat.projectId as any
        const systemMessage = `You are an AI assistant helping with the project: "${project.title}". ${project.description || ''}`
        messages.push({
          role: 'system' as const,
          content: systemMessage
        })
      }

      // Add chat history (last 10 messages for context)
      const recentMessages = chat.getRecentMessages(10)
      messages.push(...recentMessages.map(msg => ({
        role: msg.role,
        content: msg.content
      })))

      try {
        // Create streaming response
        const encoder = new TextEncoder()
        const stream = new ReadableStream({
          async start(controller) {
            try {
              const response = await openAIService.chatCompletion(messages, {
                model: 'gpt-3.5-turbo',
                temperature: 0.7,
                maxTokens: 2000,
                stream: true
              })

              let fullResponse = ''

              // Handle streaming response
              if (response && typeof response[Symbol.asyncIterator] === 'function') {
                for await (const chunk of response as any) {
                  if (chunk.choices?.[0]?.delta?.content) {
                    const content = chunk.choices[0].delta.content
                    fullResponse += content
                    
                    // Send chunk to frontend
                    const data = JSON.stringify({
                      choices: [{
                        delta: { content }
                      }]
                    })
                    controller.enqueue(encoder.encode(`data: ${data}\n\n`))
                  }
                }
              } else {
                // Handle non-streaming response (fallback)
                if (response?.choices?.[0]?.message?.content) {
                  fullResponse = response.choices[0].message.content
                  const data = JSON.stringify({
                    choices: [{
                      delta: { content: fullResponse }
                    }]
                  })
                  controller.enqueue(encoder.encode(`data: ${data}\n\n`))
                }
              }

              // Save the complete AI response to chat
              if (fullResponse) {
                await chat.addMessage('assistant', fullResponse)
                await chat.save()
              }

              // End stream
              controller.enqueue(encoder.encode('data: [DONE]\n\n'))
              controller.close()

            } catch (error: any) {
              console.error('OpenAI streaming error:', error)
              
              // Send error message as AI response
              const errorMessage = 'I apologize, but I encountered an error. Please try again.'
              await chat.addMessage('assistant', errorMessage)
              await chat.save()
              
              const data = JSON.stringify({
                choices: [{
                  delta: { content: errorMessage }
                }]
              })
              controller.enqueue(encoder.encode(`data: ${data}\n\n`))
              controller.enqueue(encoder.encode('data: [DONE]\n\n'))
              controller.close()
            }
          }
        })

        return new Response(stream, {
          headers: {
            'Content-Type': 'text/plain',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          },
        })
      } catch (aiError: any) {
        console.error('OpenAI API error:', aiError)
        useOpenAI = false // Fallback to demo response
      }
    }

    if (!useOpenAI) {
      // Demo response system (no OpenAI needed)
      const demoResponses = [
        "Hello! I'm a demo AI assistant. OpenAI is not configured yet, but I can still chat with you!",
        "I understand you're testing the chat system. Everything seems to be working well!",
        "This is a demonstration response. To get real AI responses, please configure OpenAI in the admin panel.",
        "I'm responding with a demo message since OpenAI isn't set up yet. The chat functionality is working correctly!",
        "Thank you for testing! To enable real AI responses, you'll need to add your OpenAI API key in the admin settings.",
        `You said: "${message}". I'm a demo bot, but once OpenAI is configured, you'll get much better responses!`,
      ]
      
      const randomResponse = demoResponses[Math.floor(Math.random() * demoResponses.length)]
      
      // Create streaming response for demo
      const encoder = new TextEncoder()
      const stream = new ReadableStream({
        async start(controller) {
          try {
            // Simulate typing effect
            for (let i = 0; i < randomResponse.length; i += 5) {
              const chunk = randomResponse.slice(i, i + 5)
              const data = JSON.stringify({
                choices: [{
                  delta: { content: chunk }
                }]
              })
              controller.enqueue(encoder.encode(`data: ${data}\n\n`))
              
              // Small delay for typing effect
              await new Promise(resolve => setTimeout(resolve, 50))
            }

            // Save the complete response to chat
            await chat.addMessage('assistant', randomResponse)
            await chat.save()

            // End stream
            controller.enqueue(encoder.encode('data: [DONE]\n\n'))
            controller.close()

          } catch (error: any) {
            console.error('Demo response error:', error)
            controller.close()
          }
        }
      })

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/plain',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      })
    }
    
  } catch (error: any) {
    console.error('Chat message API error:', error)
    return errorResponse(error.message || 'Failed to send message', 500)
  }
}
