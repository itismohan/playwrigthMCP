import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Play, 
  ChevronDown, 
  ChevronRight, 
  Image as ImageIcon,
  Terminal,
  Timer,
  Globe
} from 'lucide-react'

const TestResultViewer = ({ testId }) => {
  const [testResults, setTestResults] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [expandedSteps, setExpandedSteps] = useState(new Set())

  useEffect(() => {
    if (!testId) return

    const fetchResults = async () => {
      try {
        const response = await fetch(`/api/test/results/${testId}`)
        if (response.ok) {
          const results = await response.json()
          setTestResults(results)
        } else {
          throw new Error('Failed to fetch test results')
        }
      } catch (err) {
        setError(err.message)
      } finally {
        setIsLoading(false)
      }
    }

    // Initial fetch
    fetchResults()

    // Poll for updates if test is still running
    const interval = setInterval(async () => {
      try {
        const statusResponse = await fetch(`/api/test/status/${testId}`)
        if (statusResponse.ok) {
          const status = await statusResponse.json()
          if (status.status === 'completed' || status.status === 'failed') {
            fetchResults()
            clearInterval(interval)
          }
        }
      } catch (err) {
        console.error('Error polling test status:', err)
      }
    }, 2000)

    return () => clearInterval(interval)
  }, [testId])

  const toggleStepExpansion = (stepIndex) => {
    const newExpanded = new Set(expandedSteps)
    if (newExpanded.has(stepIndex)) {
      newExpanded.delete(stepIndex)
    } else {
      newExpanded.add(stepIndex)
    }
    setExpandedSteps(newExpanded)
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />
      case 'running':
        return <Play className="w-5 h-5 text-blue-500 animate-pulse" />
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-500" />
      default:
        return <Clock className="w-5 h-5 text-gray-500" />
    }
  }

  const getStatusBadge = (status) => {
    const configs = {
      completed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      running: 'bg-blue-100 text-blue-800',
      pending: 'bg-yellow-100 text-yellow-800'
    }
    
    return (
      <Badge className={configs[status] || 'bg-gray-100 text-gray-800'}>
        {status?.charAt(0).toUpperCase() + status?.slice(1) || 'Unknown'}
      </Badge>
    )
  }

  const getStepStatusIcon = (status) => {
    return status === 'success' 
      ? <CheckCircle className="w-4 h-4 text-green-500" />
      : <XCircle className="w-4 h-4 text-red-500" />
  }

  if (isLoading) {
    return (
      <Card className="mt-4">
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <Play className="w-4 h-4 text-blue-500 animate-pulse" />
            <span className="text-sm text-slate-600">Loading test results...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="mt-4 border-red-200">
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <XCircle className="w-4 h-4 text-red-500" />
            <span className="text-sm text-red-600">Error loading results: {error}</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!testResults) {
    return null
  }

  return (
    <Card className="mt-4">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center space-x-2">
            {getStatusIcon(testResults.status)}
            <span>Test Results</span>
          </CardTitle>
          <div className="flex items-center space-x-2">
            {getStatusBadge(testResults.status)}
            {testResults.execution_time && (
              <Badge variant="outline" className="flex items-center space-x-1">
                <Timer className="w-3 h-3" />
                <span>{testResults.execution_time.toFixed(2)}s</span>
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {testResults.error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-center space-x-2">
              <XCircle className="w-4 h-4 text-red-500" />
              <span className="text-sm font-medium text-red-800">Error</span>
            </div>
            <p className="text-sm text-red-700 mt-1">{testResults.error}</p>
          </div>
        )}

        {testResults.results?.steps && testResults.results.steps.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-slate-900 flex items-center space-x-2">
              <Terminal className="w-4 h-4" />
              <span>Test Steps ({testResults.results.steps.length})</span>
            </h4>

            {testResults.results.steps.map((step, index) => (
              <Card key={index} className="border-l-4 border-l-slate-200">
                <Collapsible>
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      className="w-full justify-start p-3 h-auto"
                      onClick={() => toggleStepExpansion(index)}
                    >
                      <div className="flex items-center space-x-3 w-full">
                        {expandedSteps.has(index) ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                        {getStepStatusIcon(step.status)}
                        <span className="text-sm font-medium flex-1 text-left">
                          {step.action}
                        </span>
                        <Badge 
                          variant={step.status === 'success' ? 'default' : 'destructive'}
                          className="text-xs"
                        >
                          {step.status}
                        </Badge>
                      </div>
                    </Button>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <div className="px-3 pb-3 space-y-3">
                      {/* Logs */}
                      {step.logs && step.logs.length > 0 && (
                        <div>
                          <h5 className="text-xs font-medium text-slate-700 mb-2">Logs</h5>
                          <div className="bg-slate-50 rounded-md p-2 text-xs font-mono">
                            {step.logs.map((log, logIndex) => (
                              <div key={logIndex} className="text-slate-700">
                                {log}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Screenshot */}
                      {step.screenshot && (
                        <div>
                          <h5 className="text-xs font-medium text-slate-700 mb-2 flex items-center space-x-1">
                            <ImageIcon className="w-3 h-3" />
                            <span>Screenshot</span>
                          </h5>
                          <div className="border rounded-md overflow-hidden">
                            <img
                              src={`data:image/png;base64,${step.screenshot}`}
                              alt={`Screenshot for ${step.action}`}
                              className="w-full max-w-md mx-auto block"
                              style={{ maxHeight: '300px', objectFit: 'contain' }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            ))}
          </div>
        )}

        {/* Summary */}
        <div className="mt-4 p-3 bg-slate-50 rounded-md">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600">Test Summary</span>
            <div className="flex items-center space-x-4">
              <span className={`font-medium ${
                testResults.results?.success ? 'text-green-600' : 'text-red-600'
              }`}>
                {testResults.results?.success ? 'Passed' : 'Failed'}
              </span>
              {testResults.execution_time && (
                <span className="text-slate-500">
                  Duration: {testResults.execution_time.toFixed(2)}s
                </span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default TestResultViewer

