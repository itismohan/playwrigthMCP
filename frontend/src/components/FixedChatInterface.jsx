import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Send, Bot, User, Play, CheckCircle, XCircle, Clock, Image } from 'lucide-react'
import EnhancedTestResultViewer from './EnhancedTestResultViewer'

const FixedChatInterface = () => {
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
  const [activeTests, setActiveTests] = useState(new Map()) // Track active test IDs
  const scrollAreaRef = useRef(null)

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]')
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight
      }
    }
  }, [messages])

  // Poll for test results
  useEffect(() => {
    const pollInterval = setInterval(async () => {
      for (const [testId, messageId] of activeTests.entries()) {
        try {
          const response = await fetch(`/api/test/results/${testId}`)
          if (response.ok) {
            const testResult = await response.json()
            
            // Update the message with test results
            setMessages(prev => prev.map(msg => {
              if (msg.id === messageId) {
                return {
                  ...msg,
                  testResult: testResult,
                  metadata: {
                    ...msg.metadata,
                    status: testResult.status
                  }
                }
              }
              return msg
            }))

            // Remove from active tests if completed
            if (testResult.status === 'completed' || testResult.status === 'failed') {
              setActiveTests(prev => {
                const newMap = new Map(prev)
                newMap.delete(testId)
                return newMap
              })
            }
          }
        } catch (error) {
          console.error('Error polling test results:', error)
        }
      }
    }, 2000) // Poll every 2 seconds

    return () => clearInterval(pollInterval)
  }, [activeTests])

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

        // If this is a test request, start polling for results
        if (assistantMessage.metadata?.test_id) {
          setActiveTests(prev => new Map(prev).set(
            assistantMessage.metadata.test_id, 
            assistantMessage.id
          ))
        }
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

  const handleQuickAction = (action) => {
    setInputValue(action)
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
      <Badge className={`${config.color} text-xs`}>
        {config.text}
      </Badge>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 p-4 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Playwright-MCP Testing Assistant</h1>
            <p className="text-sm text-slate-600">Natural language UI and API testing</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea ref={scrollAreaRef} className="flex-1 p-4">
        <div className="space-y-4 max-w-4xl mx-auto">
          {messages.map((message) => (
            <div key={message.id} className={`flex items-start space-x-3 ${
              message.type === 'user' ? 'flex-row-reverse space-x-reverse' : ''
            }`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                message.type === 'user' 
                  ? 'bg-blue-500' 
                  : message.isError 
                  ? 'bg-red-500' 
                  : 'bg-slate-200'
              }`}>
                {message.type === 'user' ? (
                  <User className="w-5 h-5 text-white" />
                ) : (
                  getMessageIcon(message.type, message.metadata)
                )}
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
                  {message.metadata?.test_id && message.testResult && (
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
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="bg-white border-t border-slate-200 p-4">
        <div className="max-w-4xl mx-auto">
          {/* Quick Actions */}
          <div className="flex flex-wrap gap-2 mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleQuickAction("Test the login form on example.com")}
              className="text-xs"
            >
              Test login form
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleQuickAction("Check if the API endpoint /users returns valid JSON")}
              className="text-xs"
            >
              Test API endpoint
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleQuickAction("Take a screenshot of google.com homepage")}
              className="text-xs"
            >
              Take screenshot
            </Button>
          </div>

          {/* Input */}
          <div className="flex space-x-2">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Describe what you'd like to test... (e.g., 'Test the login form on example.com')"
              className="flex-1"
              disabled={isLoading}
            />
            <Button 
              onClick={handleSendMessage} 
              disabled={!inputValue.trim() || isLoading}
              className="px-4"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default FixedChatInterface

