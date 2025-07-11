import { useState } from 'react'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Copy, Check, Code, Download } from 'lucide-react'

const ScriptViewer = ({ script, testType = 'ui', onCopy }) => {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(script)
      setCopied(true)
      if (onCopy) onCopy()
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy script:', err)
    }
  }

  const handleDownload = () => {
    const blob = new Blob([script], { type: 'text/javascript' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `playwright-test-${testType}-${Date.now()}.spec.js`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const getTestTypeColor = (type) => {
    switch (type) {
      case 'ui':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'api':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'mixed':
        return 'bg-purple-100 text-purple-800 border-purple-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const formatScript = (script) => {
    // Basic syntax highlighting for Playwright scripts
    return script
      .split('\n')
      .map((line, index) => {
        let formattedLine = line
        
        // Highlight keywords
        formattedLine = formattedLine.replace(
          /(import|from|test|expect|async|await|const|let|var)/g,
          '<span class="text-blue-600 font-semibold">$1</span>'
        )
        
        // Highlight strings
        formattedLine = formattedLine.replace(
          /(['"`])((?:(?!\1)[^\\]|\\.)*)(\1)/g,
          '<span class="text-green-600">$1$2$3</span>'
        )
        
        // Highlight comments
        formattedLine = formattedLine.replace(
          /(\/\/.*$)/g,
          '<span class="text-gray-500 italic">$1</span>'
        )
        
        // Highlight Playwright methods
        formattedLine = formattedLine.replace(
          /(page\.|request\.|expect\()/g,
          '<span class="text-purple-600 font-medium">$1</span>'
        )

        return (
          <div key={index} className="flex">
            <span className="text-gray-400 text-sm mr-4 select-none w-8 text-right">
              {index + 1}
            </span>
            <span 
              className="flex-1"
              dangerouslySetInnerHTML={{ __html: formattedLine || '&nbsp;' }}
            />
          </div>
        )
      })
  }

  if (!script) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="h-5 w-5" />
            Generated Playwright Script
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-gray-500 text-center py-8">
            No script generated for this test
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Code className="h-5 w-5" />
            Generated Playwright Script
            <Badge className={getTestTypeColor(testType)}>
              {testType.toUpperCase()}
            </Badge>
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Download
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="flex items-center gap-2"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="bg-gray-50 rounded-lg p-4 overflow-x-auto">
          <pre className="text-sm font-mono leading-relaxed">
            <code>
              {formatScript(script)}
            </code>
          </pre>
        </div>
        <div className="mt-4 text-sm text-gray-600">
          <p className="mb-2">
            <strong>Usage:</strong> Save this script as a <code>.spec.js</code> file in your Playwright tests directory.
          </p>
          <p>
            <strong>Run:</strong> <code>npx playwright test your-test-file.spec.js</code>
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

export default ScriptViewer

