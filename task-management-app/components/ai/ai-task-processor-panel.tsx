'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Mail, 
  FileText, 
  Sparkles, 
  Send,
  CheckCircle,
  Clock,
  AlertCircle,
  Users,
  Calendar,
  BrainCircuit,
  Zap,
  ArrowRight
} from 'lucide-react'
import { createBrowserClient } from '@supabase/ssr'

interface ProcessedTask {
  id: string
  title: string
  description: string
  priority: string
  status: string
  assignedTo?: string
  dueDate?: string
  estimatedHours?: number
}

export function AITaskProcessorPanel() {
  const [emailContent, setEmailContent] = useState('')
  const [documentContent, setDocumentContent] = useState('')
  const [processing, setProcessing] = useState(false)
  const [results, setResults] = useState<ProcessedTask[]>([])
  const [activeTab, setActiveTab] = useState('email')
  
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const processContent = async (type: 'email' | 'document') => {
    setProcessing(true)
    setResults([])

    const content = type === 'email' ? emailContent : documentContent
    
    try {
      // Get the project URL and anon key
      const { data: { publicUrl } } = await supabase.storage.from('public').getPublicUrl('dummy')
      const baseUrl = publicUrl.replace('/storage/v1/object/public/public/dummy', '')
      
      const response = await fetch(`${baseUrl}/functions/v1/ai-task-processor`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'x-agent-key': 'default-secret-key'
        },
        body: JSON.stringify({
          action: type === 'email' ? 'process_email' : 'process_document',
          data: type === 'email' 
            ? {
                from: 'demo@example.com',
                subject: content.split('\\n')[0].substring(0, 100),
                body: content,
                date: new Date().toISOString()
              }
            : {
                content: content,
                metadata: {
                  fileName: 'demo-document.txt',
                  fileType: 'text/plain',
                  createdDate: new Date().toISOString(),
                  lastUpdated: new Date().toISOString(),
                  url: 'https://example.com/doc',
                  size: content.length
                },
                documentType: 'general',
                source: 'manual_input'
              }
        })
      })

      if (!response.ok) {
        throw new Error(`Failed to process: ${response.statusText}`)
      }

      const result = await response.json()
      
      if (result.tasks && result.tasks.length > 0) {
        setResults(result.tasks)
      } else {
        alert('No tasks were extracted from the content')
      }
    } catch (error) {
      console.error('Error processing content:', error)
      alert('Failed to process content. Please check the console for details.')
    } finally {
      setProcessing(false)
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'destructive'
      case 'high': return 'default' 
      case 'medium': return 'secondary'
      case 'low': return 'outline'
      default: return 'outline'
    }
  }

  const exampleEmail = `Subject: Website Redesign Project - Action Items

Hi Team,

Following our meeting today, here are the action items we discussed:

1. Sarah needs to create mockups for the new landing page by Friday
2. John should review and update the API documentation by next Monday
3. The QA team needs to test the payment integration before end of week
4. We need someone to set up monitoring for the production servers ASAP

Also, can someone look into the slow database queries? This is becoming critical.

Thanks,
Project Manager`

  const exampleDocument = `Meeting Notes - Q1 Planning Session
Date: January 8, 2025

Attendees: Kiyasha, Fanyana, Johannes, Lynne

Action Items:
- Implement new authentication system with 2FA support (High priority, 2 weeks)
- Migrate database to PostgreSQL 15 (Johannes to lead, by end of month)
- Create mobile app wireframes (Lynne, 1 week)
- Set up CI/CD pipeline for automated testing (DevOps team, urgent)
- Review and update security policies (Due by Friday)

Budget approved for cloud infrastructure upgrade.
Need to hire 2 more developers by end of quarter.`

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BrainCircuit className="h-6 w-6 text-purple-500" />
            AI Task Processor
          </CardTitle>
          <CardDescription>
            Automatically extract tasks from emails and documents, then assign them to the right team members
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Mail className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <div className="font-medium">Email Processing</div>
                <div className="text-sm text-gray-500">Extract tasks from emails</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Users className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <div className="font-medium">Smart Assignment</div>
                <div className="text-sm text-gray-500">Match skills to team</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Calendar className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <div className="font-medium">Date Detection</div>
                <div className="text-sm text-gray-500">Parse deadlines</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Input Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>Process Content</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="email">
                <Mail className="h-4 w-4 mr-2" />
                Email
              </TabsTrigger>
              <TabsTrigger value="document">
                <FileText className="h-4 w-4 mr-2" />
                Document
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="email" className="space-y-4">
              <div>
                <Textarea
                  placeholder="Paste email content here..."
                  value={emailContent}
                  onChange={(e) => setEmailContent(e.target.value)}
                  className="min-h-[200px] font-mono text-sm"
                />
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => setEmailContent(exampleEmail)}
                  className="mt-2"
                >
                  Use Example Email
                </Button>
              </div>
              <Button 
                onClick={() => processContent('email')}
                disabled={!emailContent || processing}
                className="w-full"
              >
                {processing ? (
                  <>
                    <Clock className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Extract Tasks from Email
                  </>
                )}
              </Button>
            </TabsContent>
            
            <TabsContent value="document" className="space-y-4">
              <div>
                <Textarea
                  placeholder="Paste document content here..."
                  value={documentContent}
                  onChange={(e) => setDocumentContent(e.target.value)}
                  className="min-h-[200px] font-mono text-sm"
                />
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => setDocumentContent(exampleDocument)}
                  className="mt-2"
                >
                  Use Example Document
                </Button>
              </div>
              <Button 
                onClick={() => processContent('document')}
                disabled={!documentContent || processing}
                className="w-full"
              >
                {processing ? (
                  <>
                    <Clock className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Extract Tasks from Document
                  </>
                )}
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Results */}
      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Extracted Tasks
            </CardTitle>
            <CardDescription>
              {results.length} task{results.length > 1 ? 's' : ''} created and assigned
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {results.map((task, index) => (
                <div key={task.id || index} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-semibold text-lg">{task.title}</h4>
                    <Badge variant={getPriorityColor(task.priority)}>
                      {task.priority}
                    </Badge>
                  </div>
                  <p className="text-gray-600 mb-3">{task.description}</p>
                  <div className="flex flex-wrap gap-4 text-sm">
                    {task.assignedTo && (
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4 text-gray-400" />
                        <span>Assigned to: {task.assignedTo}</span>
                      </div>
                    )}
                    {task.dueDate && (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>
                      </div>
                    )}
                    {task.estimatedHours && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4 text-gray-400" />
                        <span>{task.estimatedHours} hours</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* How It Works */}
      <Card>
        <CardHeader>
          <CardTitle>How It Works</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-semibold">
                1
              </div>
              <div>
                <div className="font-medium">Content Analysis</div>
                <div className="text-sm text-gray-600">
                  AI analyzes emails or documents to identify actionable tasks
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-semibold">
                2
              </div>
              <div>
                <div className="font-medium">Information Extraction</div>
                <div className="text-sm text-gray-600">
                  Extracts task details, deadlines, priorities, and required skills
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-semibold">
                3
              </div>
              <div>
                <div className="font-medium">Smart Assignment</div>
                <div className="text-sm text-gray-600">
                  Matches tasks to team members based on skills and availability
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-semibold">
                4
              </div>
              <div>
                <div className="font-medium">Task Creation</div>
                <div className="text-sm text-gray-600">
                  Creates tasks in your project with all details and assignments
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-yellow-800 mb-1">Setup Required</p>
                <p className="text-yellow-700">
                  To enable automatic email processing:
                </p>
                <ol className="list-decimal list-inside mt-2 space-y-1 text-yellow-700">
                  <li>Set up the Google Apps Script in your Gmail account</li>
                  <li>Configure your OpenAI API key in Supabase secrets</li>
                  <li>Update the agent secret key for security</li>
                </ol>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}