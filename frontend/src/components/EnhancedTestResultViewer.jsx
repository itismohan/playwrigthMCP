import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible'
import { ChevronDown, ChevronRight, Clock, CheckCircle, XCircle, AlertCircle, Image, Code } from 'lucide-react'
import ScriptViewer from './ScriptViewer'

const EnhancedTestResultViewer = ({ result }) => {
  const [expandedSteps, setExpandedSteps] = useState(new Set())
  const [showScript, setShowScript] = useState(false)
  const [imageErrors, setImageErrors] = useState(new Set())

  const toggleStep = (stepIndex) => {
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
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-600" />
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200'
      default:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    }
  }

  const handleImageError = (stepIndex) => {
    setImageErrors(prev => new Set([...prev, stepIndex]))
  }

  const renderScreenshot = (screenshot, stepIndex, action) => {
    if (!screenshot) return null
    
    if (imageErrors.has(stepIndex)) {
      return (
        <div className="mt-3 p-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <div className="flex items-center gap-2 text-gray-500">
            <Image className="h-4 w-4" />
            <span className="text-sm">Screenshot not available</span>
          </div>
        </div>
      )
    }

    return (
      <div className="mt-3">
        <div className="flex items-center gap-2 mb-2">
          <Image className="h-4 w-4 text-gray-600" />
          <span className="text-sm font-medium text-gray-700">Screenshot</span>
        </div>
        <div className="border rounded-lg overflow-hidden bg-white">
          <img
            src={`data:image/png;base64,${screenshot}`}
            alt={`Screenshot for ${action}`}
            className="w-full h-auto max-h-96 object-contain"
            onError={() => handleImageError(stepIndex)}
            loading="lazy"
          />
        </div>
      </div>
    )
  }

  if (!result) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="text-center text-gray-500">
            No test results to display
          </div>
        </CardContent>
      </Card>
    )
  }

  const { status, execution_time, results, generated_script, error } = result
  const steps = results?.steps || []

  return (
    <div className="space-y-4">
      {/* Test Results Card */}
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              {getStatusIcon(status)}
              Test Results
              <Badge className={getStatusColor(status)}>
                {status === 'completed' ? (results?.success ? 'Passed' : 'Failed') : status}
              </Badge>
            </CardTitle>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Clock className="h-4 w-4" />
              Duration: {execution_time?.toFixed(2) || '0.00'}s
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 text-sm font-medium">Error:</p>
              <p className="text-red-700 text-sm mt-1">{error}</p>
            </div>
          )}

          {steps.length > 0 && (
            <div className="space-y-2">
              <Collapsible>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-start p-0 h-auto">
                    <div className="flex items-center gap-2">
                      <ChevronRight className="h-4 w-4" />
                      <span className="font-medium">Test Steps ({steps.length})</span>
                    </div>
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-3 space-y-2">
                  {steps.map((step, index) => (
                    <Card key={index} className="border-l-4 border-l-blue-200">
                      <Collapsible 
                        open={expandedSteps.has(index)}
                        onOpenChange={() => toggleStep(index)}
                      >
                        <CollapsibleTrigger asChild>
                          <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                {expandedSteps.has(index) ? 
                                  <ChevronDown className="h-4 w-4" /> : 
                                  <ChevronRight className="h-4 w-4" />
                                }
                                {getStatusIcon(step.status)}
                                <span className="font-medium">{step.action}</span>
                              </div>
                              <Badge className={getStatusColor(step.status)}>
                                {step.status}
                              </Badge>
                            </div>
                          </CardHeader>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <CardContent className="pt-0">
                            {step.logs && step.logs.length > 0 && (
                              <div className="mb-3">
                                <h4 className="text-sm font-medium text-gray-700 mb-2">Logs</h4>
                                <div className="bg-gray-50 rounded-lg p-3">
                                  {step.logs.map((log, logIndex) => (
                                    <div key={logIndex} className="text-sm text-gray-600 font-mono">
                                      {log}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            {renderScreenshot(step.screenshot, index, step.action)}
                          </CardContent>
                        </CollapsibleContent>
                      </Collapsible>
                    </Card>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            </div>
          )}

          <div className="mt-6 pt-4 border-t">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Test Summary</h3>
              <div className="flex items-center gap-4">
                <Badge className={getStatusColor(status)}>
                  {status === 'completed' ? (results?.success ? 'Passed' : 'Failed') : status}
                </Badge>
                <span className="text-sm text-gray-600">
                  Duration: {execution_time?.toFixed(2) || '0.00'}s
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Generated Script Card */}
      {generated_script && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Code className="h-5 w-5" />
              Generated Playwright Script
            </h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowScript(!showScript)}
            >
              {showScript ? 'Hide Script' : 'Show Script'}
            </Button>
          </div>
          
          {showScript && (
            <ScriptViewer 
              script={generated_script} 
              testType={result.test_type || 'ui'}
              onCopy={() => {
                console.log('Script copied to clipboard')
              }}
            />
          )}
        </div>
      )}
    </div>
  )
}

export default EnhancedTestResultViewer

