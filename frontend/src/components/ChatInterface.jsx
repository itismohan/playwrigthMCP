import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Send, Bot, User, Play, CheckCircle, XCircle, Clock, Image } from 'lucide-react'
import EnhancedTestResultViewer from './EnhancedTestResultViewer'

const ChatInterface = () => {
  const [messages, setMessages] = useState([
    {
      id: '1',
      type: 'assistant',
      content: "Hello! I'm your Playwright-MCP Testing Assistant. I can help you test websites, APIs, and user interfaces using natural language. Just describe what you'd like to test!",
      timestamp: new Date().toISOString()
    }
  ])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return

    const userMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue,
      timestamp: new Date().toISOString()
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsLoading(true)

    try {
      // Send message to backend
      const response = await fetch('/api/chat/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: inputValue
        })
      })

      if (response.ok) {
        const assistantMessage = await response.json()
        setMessages(prev => [...prev, assistantMessage])
      } else {
        throw new Error('Failed to send message')
      }
    } catch (error) {
      const errorMessage = {
        id: Date.now().toString(),
        type: 'assistant',
        content: `Sorry, I encountered an error: ${error.message}. Please try again.`,
        timestamp: new Date().toISOString(),
        isError: true
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const getMessageIcon = (type, metadata) => {
    if (type === 'user') return <User className="w-5 h-5" />
    if (metadata?.status === 'running') return <Play className="w-5 h-5 text-blue-500" />
    if (metadata?.status === 'completed') return <CheckCircle className="w-5 h-5 text-green-500" />
    if (metadata?.status === 'failed') return <XCircle className="w-5 h-5 text-red-500" />
    if (metadata?.status === 'pending') return <Clock className="w-5 h-5 text-yellow-500" />
    return <Bot className="w-5 h-5" />
  }

  const getStatusBadge = (metadata) => {
    if (!metadata?.status) return null
    
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800', text: 'Pending' },
      running: { color: 'bg-blue-100 text-blue-800', text: 'Running' },
      completed: { color: 'bg-green-100 text-green-800', text: 'Completed' },
      failed: { color: 'bg-red-100 text-red-800', text: 'Failed' }
    }

    const config = statusConfig[metadata.status]
    if (!config) return null

    return (
      <Badge className={`${config.color} ml-2`}>
        {config.text}
      </Badge>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Playwright-MCP Testing Assistant</h1>
            <p className="text-sm text-slate-600">Natural language UI and API testing</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 px-4 py-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex items-start space-x-3 ${
                message.type === 'user' ? 'flex-row-reverse space-x-reverse' : ''
              }`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                message.type === 'user' 
                  ? 'bg-blue-500 text-white' 
                  : message.isError
                  ? 'bg-red-500 text-white'
                  : 'bg-slate-200 text-slate-700'
              }`}>
                {getMessageIcon(message.type, message.metadata)}
              </div>
              
              <Card className={`max-w-3xl ${
                message.type === 'user' 
                  ? 'bg-blue-50 border-blue-200' 
                  : message.isError
                  ? 'bg-red-50 border-red-200'
                  : 'bg-white'
              }`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-900">
                      {message.type === 'user' ? 'You' : 'Assistant'}
                    </span>
                    <div className="flex items-center">
                      {getStatusBadge(message.metadata)}
                      <span className="text-xs text-slate-500 ml-2">
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                  
                  <div className="text-slate-800 whitespace-pre-wrap">
                    {message.content}
                  </div>

                  {/* Test Results */}
                  {message.metadata?.test_id && (
                    <div className="mt-4">
                      <EnhancedTestResultViewer result={message.testResult} />
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center">
                <Bot className="w-5 h-5 text-slate-700 animate-pulse" />
              </div>
              <Card className="bg-white">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                    <span className="text-sm text-slate-600">Thinking...</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="bg-white border-t border-slate-200 px-4 py-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex space-x-3">
            <Input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Describe what you'd like to test... (e.g., 'Test the login form on example.com')"
              className="flex-1 text-base"
              disabled={isLoading}
            />
            <Button 
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isLoading}
              className="px-6"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setInputValue("Test the login form on example.com")}
              disabled={isLoading}
            >
              Test login form
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setInputValue("Check if the API endpoint /users returns valid JSON")}
              disabled={isLoading}
            >
              Test API endpoint
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setInputValue("Take a screenshot of google.com homepage")}
              disabled={isLoading}
            >
              Take screenshot
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ChatInterface

