import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowLeft, Key, Lock, Code, RefreshCw, AlertTriangle, Copy, Check, Cpu, Search } from 'lucide-react';
import Logo from '../components/Logo';
import NewFooter from '../components/NewFooter';

// Tab interface
interface TabProps {
  label: string;
  icon: React.ReactNode;
  content: React.ReactNode;
}

const ApiDocumentation: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'authentication' | 'endpoints' | 'examples' | 'errors'>('overview');
  const [copied, setCopied] = useState<string | null>(null);

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Copy text to clipboard
  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  // Code block component with copy button
  const CodeBlock = ({ code, language = 'javascript', id }: { code: string; language?: string; id: string }) => {
    return (
      <div className="relative rounded-lg overflow-hidden">
        <div className="absolute top-2 right-2 z-10">
          <button
            onClick={() => copyToClipboard(code, id)}
            className="p-1.5 rounded-md bg-white/10 hover:bg-white/20 transition-colors"
            aria-label="Copy code"
          >
            {copied === id ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-white/70" />}
          </button>
        </div>
        <pre className={`language-${language} bg-navy-600 text-white/90 p-4 text-sm overflow-x-auto`}>
          <code>{code}</code>
        </pre>
      </div>
    );
  };

  const tabs: TabProps[] = [
    {
      label: 'Overview',
      icon: <Cpu className="w-4 h-4" />,
      content: (
        <div>
          <h2 className="text-xl font-bold mb-4">Getting Started with the Uhuru API</h2>
          
          <p className="mb-4">
            The Uhuru API gives you access to African-context optimized AI capabilities through a simple REST API. 
            Whether you're building a chatbot, implementing content generation, or creating custom AI workflows,
            our API provides the tools to bring African intelligence to your applications.
          </p>

          <div className="bg-navy-600 border border-white/10 rounded-lg p-4 mb-6">
            <h3 className="text-lg font-medium mb-2 text-white">Key Features</h3>
            <ul className="space-y-2 text-white/80">
              <li className="flex items-start">
                <div className="w-5 h-5 rounded-full bg-teal flex items-center justify-center mt-0.5 mr-2 flex-shrink-0">
                  <Check className="w-3 h-3 text-white" />
                </div>
                <span>African context awareness with regionally optimized responses</span>
              </li>
              <li className="flex items-start">
                <div className="w-5 h-5 rounded-full bg-teal flex items-center justify-center mt-0.5 mr-2 flex-shrink-0">
                  <Check className="w-3 h-3 text-white" />
                </div>
                <span>Support for multiple African languages including Setswana, Swahili, and more</span>
              </li>
              <li className="flex items-start">
                <div className="w-5 h-5 rounded-full bg-teal flex items-center justify-center mt-0.5 mr-2 flex-shrink-0">
                  <Check className="w-3 h-3 text-white" />
                </div>
                <span>Completions and chat completions endpoints similar to industry-standard AI APIs</span>
              </li>
              <li className="flex items-start">
                <div className="w-5 h-5 rounded-full bg-teal flex items-center justify-center mt-0.5 mr-2 flex-shrink-0">
                  <Check className="w-3 h-3 text-white" />
                </div>
                <span>Simple authentication with API keys</span>
              </li>
            </ul>
          </div>

          <h3 className="text-lg font-bold mb-2">Base URL</h3>
          <p className="mb-4">
            All API requests should be made to:
          </p>
          <CodeBlock
            code={`${import.meta.env.VITE_SUPABASE_URL || 'https://your-supabase-url'}/functions/v1/uhuru-llm-api`}
            id="base-url"
          />
          
          <div className="mt-4 p-4 bg-navy-700 border border-white/20 rounded-lg">
            <h4 className="text-sm font-medium text-white mb-2">Important URL Information</h4>
            <p className="text-white/80 text-sm mb-2">
              You must replace <code className="bg-navy-600 px-1 rounded">your-supabase-url</code> with your actual Supabase project URL (e.g., <code className="bg-navy-600 px-1 rounded">https://abcdefghijklm.supabase.co</code>).
            </p>
            <p className="text-white/80 text-sm">
              <strong className="text-red-400">Common Error:</strong> Using <code className="bg-navy-600 px-1 rounded">https://api.uhuru.ai</code> will not work. The Uhuru API is hosted on Supabase Edge Functions and must be accessed through your Supabase project URL.
            </p>
          </div>

          <div className="bg-orange-900/20 border border-orange-900/30 rounded-lg p-4 mt-6">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-lg font-medium mb-1 text-orange-300">Pro Subscription Required</h3>
                <p className="text-orange-200/90">
                  The Uhuru API is available exclusively to Pro subscribers. Upgrade your account to access API capabilities 
                  and receive your API keys.
                </p>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      label: 'Authentication',
      icon: <Lock className="w-4 h-4" />,
      content: (
        <div>
          <h2 className="text-xl font-bold mb-4">Authentication</h2>
          
          <p className="mb-4">
            All API requests require authentication with an API key. Include your API key in the headers.
          </p>

          <div className="bg-navy-700 border border-white/20 rounded-lg p-4 mb-4">
            <h4 className="text-sm font-medium text-white mb-2">API Endpoint Structure</h4>
            <p className="text-white/80 text-sm">
              The complete endpoint URL follows this pattern:
            </p>
            <pre className="bg-navy-600 p-2 rounded mt-2 text-white/90 text-xs overflow-x-auto">
              {`${import.meta.env.VITE_SUPABASE_URL || 'https://your-supabase-url'}/functions/v1/uhuru-llm-api`}
            </pre>
            <p className="text-white/80 text-sm mt-2">
              Note the <code className="bg-navy-600 px-1 rounded">/functions/v1/uhuru-llm-api</code> path which is required to access the Supabase Edge Function.
            </p>
          </div>

          <h3 className="text-lg font-bold mb-2">API Key Format</h3>
          <p className="mb-4">
            Uhuru API keys follow this format: <code className="bg-navy-600 text-white/90 px-2 py-1 rounded text-sm">uhuru_abcdefg123456789...</code>
          </p>

          <h3 className="text-lg font-bold mb-2">Including Your API Key</h3>
          <p className="mb-2">
            Add your API key to all requests as an <code className="bg-navy-600 text-white/90 px-2 py-1 rounded text-sm">Authorization</code> header:
          </p>
          
          <CodeBlock 
            code={`Authorization: Bearer uhuru_your_api_key_here`} 
            language="http" 
            id="auth-header" 
          />
          
          <div className="mt-6 mb-6">
            <h3 className="text-lg font-bold mb-2">Key Management</h3>
            <p className="mb-4">
              You can generate and manage your API keys in the <strong>Settings → API Keys</strong> section of your Uhuru account.
              For security reasons:
            </p>
            <ul className="space-y-2">
              <li className="flex items-start">
                <div className="w-5 h-5 rounded-full bg-teal flex items-center justify-center mt-0.5 mr-2 flex-shrink-0">
                  <Check className="w-3 h-3 text-white" />
                </div>
                <span>Never share your API keys publicly or commit them to version control</span>
              </li>
              <li className="flex items-start">
                <div className="w-5 h-5 rounded-full bg-teal flex items-center justify-center mt-0.5 mr-2 flex-shrink-0">
                  <Check className="w-3 h-3 text-white" />
                </div>
                <span>Use environment variables to store API keys in your applications</span>
              </li>
              <li className="flex items-start">
                <div className="w-5 h-5 rounded-full bg-teal flex items-center justify-center mt-0.5 mr-2 flex-shrink-0">
                  <Check className="w-3 h-3 text-white" />
                </div>
                <span>Rotate API keys periodically for enhanced security</span>
              </li>
              <li className="flex items-start">
                <div className="w-5 h-5 rounded-full bg-teal flex items-center justify-center mt-0.5 mr-2 flex-shrink-0">
                  <Check className="w-3 h-3 text-white" />
                </div>
                <span>Use separate API keys for different environments (development, production)</span>
              </li>
            </ul>
          </div>

          <div className="bg-navy-600 border border-white/10 rounded-lg p-4">
            <h3 className="text-lg font-medium mb-2 text-white">Example Request with Authentication</h3>
            <CodeBlock 
              code={`fetch('${import.meta.env.VITE_SUPABASE_URL || 'https://your-supabase-url'}/functions/v1/uhuru-llm-api', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer uhuru_your_api_key_here'
  },
  body: JSON.stringify({
    prompt: 'Tell me about the history of Botswana',
    max_tokens: 500
  })
})`} 
              id="auth-example" 
            />
            
            <div className="mt-4 p-3 bg-orange-900/20 border border-orange-900/30 rounded-lg">
              <div className="flex items-start">
                <AlertTriangle className="w-4 h-4 text-orange-400 flex-shrink-0 mt-1 mr-2" />
                <p className="text-xs text-orange-300">
                  Make sure to use your complete Supabase URL including <code className="bg-navy-600 px-1 rounded">/functions/v1/uhuru-llm-api</code> path. 
                  Using <code className="bg-navy-600 px-1 rounded">https://api.uhuru.ai</code> directly will result in connection errors.
                </p>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      label: 'Endpoints',
      icon: <Code className="w-4 h-4" />,
      content: (
        <div>
          <h2 className="text-xl font-bold mb-4">API Endpoints</h2>
          
          <p className="mb-6">
            The Uhuru API provides several endpoints for different types of AI interactions.
            All endpoints accept and return JSON.
          </p>

          <div className="space-y-8">
            {/* Models endpoint */}
            <div>
              <h3 className="text-lg font-bold mb-3 flex items-center">
                <span className="px-2 py-1 bg-navy-600 text-white rounded text-xs font-mono mr-2">GET</span>
                <span>/v1/models</span>
              </h3>
              <p className="mb-3">
                Lists all available models.
              </p>
              
              <div className="mb-4">
                <h4 className="font-bold mb-2">Example Request:</h4>
                <CodeBlock 
                  code={`curl -X GET \\
  "${import.meta.env.VITE_SUPABASE_URL || 'https://your-supabase-url'}/functions/v1/uhuru-llm-api" \\
  -H "Authorization: Bearer uhuru_your_api_key_here" \\
  -H "Content-Type: application/json"`} 
                  language="bash" 
                  id="models-request" 
                />
              </div>

              <div>
                <h4 className="font-bold mb-2">Example Response:</h4>
                <CodeBlock 
                  code={`{
  "object": "list",
  "data": [
    {
      "id": "uhuru-1",
      "object": "model",
      "created": 1677610602,
      "owned_by": "orionx"
    },
    {
      "id": "uhuru-1-dev",
      "object": "model",
      "created": 1677610602,
      "owned_by": "orionx"
    }
  ]
}`} 
                  language="json" 
                  id="models-response" 
                />
              </div>
            </div>

            {/* Completions endpoint */}
            <div>
              <h3 className="text-lg font-bold mb-3 flex items-center">
                <span className="px-2 py-1 bg-navy-600 text-white rounded text-xs font-mono mr-2">POST</span>
                <span>/v1/completions</span>
              </h3>
              <p className="mb-3">
                Creates a completion for the provided prompt.
              </p>
              
              <div className="mb-4">
                <h4 className="font-bold mb-2">Request Parameters:</h4>
                <table className="w-full border-collapse">
                  <thead className="bg-navy-600 text-white">
                    <tr>
                      <th className="p-2 text-left">Parameter</th>
                      <th className="p-2 text-left">Type</th>
                      <th className="p-2 text-left">Required</th>
                      <th className="p-2 text-left">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    <tr className="bg-navy-700/50">
                      <td className="p-2 font-mono">model</td>
                      <td className="p-2">string</td>
                      <td className="p-2">Optional</td>
                      <td className="p-2">ID of the model to use. Default: "uhuru-1"</td>
                    </tr>
                    <tr className="bg-navy-700/30">
                      <td className="p-2 font-mono">prompt</td>
                      <td className="p-2">string</td>
                      <td className="p-2">Required</td>
                      <td className="p-2">The prompt to generate completions for</td>
                    </tr>
                    <tr className="bg-navy-700/50">
                      <td className="p-2 font-mono">max_tokens</td>
                      <td className="p-2">integer</td>
                      <td className="p-2">Optional</td>
                      <td className="p-2">Maximum tokens to generate. Default: 1000</td>
                    </tr>
                    <tr className="bg-navy-700/30">
                      <td className="p-2 font-mono">temperature</td>
                      <td className="p-2">number</td>
                      <td className="p-2">Optional</td>
                      <td className="p-2">Sampling temperature (0-1). Default: 0.7</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="mb-4">
                <h4 className="font-bold mb-2">Example Request:</h4>
                <CodeBlock 
                  code={`curl -X POST \\
  "${import.meta.env.VITE_SUPABASE_URL || 'https://your-supabase-url'}/functions/v1/uhuru-llm-api" \\
  -H "Authorization: Bearer uhuru_your_api_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "uhuru-1",
    "prompt": "Write a summary of Botswana's economic development",
    "max_tokens": 500,
    "temperature": 0.7
  }'`} 
                  language="bash" 
                  id="completions-request" 
                />
              </div>

              <div>
                <h4 className="font-bold mb-2">Example Response:</h4>
                <CodeBlock 
                  code={`{
  "id": "cmpl-uqkvlQyYK7bGYrRHQ0eXlWi7",
  "object": "completion",
  "created": 1689753432,
  "model": "uhuru-1",
  "choices": [
    {
      "text": "Botswana has experienced one of Africa's most remarkable economic success stories since gaining independence in 1966. Starting as one of the world's poorest countries, it transformed into an upper-middle-income economy through prudent management of its diamond resources...",
      "index": 0,
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 8,
    "completion_tokens": 125,
    "total_tokens": 133
  }
}`} 
                  language="json" 
                  id="completions-response" 
                />
              </div>
            </div>

            {/* Chat completions endpoint */}
            <div>
              <h3 className="text-lg font-bold mb-3 flex items-center">
                <span className="px-2 py-1 bg-navy-600 text-white rounded text-xs font-mono mr-2">POST</span>
                <span>/v1/chat/completions</span>
              </h3>
              <p className="mb-3">
                Creates a model response for the given chat conversation.
              </p>
              
              <div className="mb-4">
                <h4 className="font-bold mb-2">Request Parameters:</h4>
                <table className="w-full border-collapse">
                  <thead className="bg-navy-600 text-white">
                    <tr>
                      <th className="p-2 text-left">Parameter</th>
                      <th className="p-2 text-left">Type</th>
                      <th className="p-2 text-left">Required</th>
                      <th className="p-2 text-left">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    <tr className="bg-navy-700/50">
                      <td className="p-2 font-mono">model</td>
                      <td className="p-2">string</td>
                      <td className="p-2">Optional</td>
                      <td className="p-2">ID of the model to use. Default: "uhuru-1"</td>
                    </tr>
                    <tr className="bg-navy-700/30">
                      <td className="p-2 font-mono">messages</td>
                      <td className="p-2">array</td>
                      <td className="p-2">Required</td>
                      <td className="p-2">Array of message objects with role and content</td>
                    </tr>
                    <tr className="bg-navy-700/50">
                      <td className="p-2 font-mono">max_tokens</td>
                      <td className="p-2">integer</td>
                      <td className="p-2">Optional</td>
                      <td className="p-2">Maximum tokens to generate. Default: 1000</td>
                    </tr>
                    <tr className="bg-navy-700/30">
                      <td className="p-2 font-mono">temperature</td>
                      <td className="p-2">number</td>
                      <td className="p-2">Optional</td>
                      <td className="p-2">Sampling temperature (0-1). Default: 0.7</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="mb-4">
                <h4 className="font-bold mb-2">Example Request:</h4>
                <CodeBlock 
                  code={`curl -X POST \\
  "${import.meta.env.VITE_SUPABASE_URL || 'https://your-supabase-url'}/functions/v1/uhuru-llm-api" \\
  -H "Authorization: Bearer uhuru_your_api_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "uhuru-1",
    "messages": [
      {"role": "user", "content": "What are the key economic sectors in Botswana?"}
    ],
    "max_tokens": 500,
    "temperature": 0.7
  }'`} 
                  language="bash" 
                  id="chat-completions-request" 
                />
              </div>

              <div>
                <h4 className="font-bold mb-2">Example Response:</h4>
                <CodeBlock 
                  code={`{
  "id": "chatcmpl-abc123",
  "object": "chat.completion",
  "created": 1689753432,
  "model": "uhuru-1",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Botswana's economy is primarily driven by the following key sectors:\\n\\n1. Mining: Diamond mining is the backbone of Botswana's economy, contributing significantly to GDP, government revenue, and foreign exchange earnings. Botswana is one of the world's largest diamond producers through its partnership with De Beers..."
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 13,
    "completion_tokens": 152,
    "total_tokens": 165
  }
}`} 
                  language="json" 
                  id="chat-completions-response" 
                />
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      label: 'Examples',
      icon: <Search className="w-4 h-4" />,
      content: (
        <div>
          <h2 className="text-xl font-bold mb-4">Code Examples</h2>
          
          <p className="mb-6">
            Below are examples of how to integrate the Uhuru API in different programming languages.
          </p>

          <div className="space-y-8">
            {/* JavaScript/Node.js example */}
            <div>
              <h3 className="text-lg font-bold mb-3">JavaScript (Node.js)</h3>
              <CodeBlock 
                code={`const fetch = require('node-fetch'); // or use native fetch in newer Node.js versions

// Configuration
const UHURU_API_KEY = 'uhuru_your_api_key_here';
const SUPABASE_URL = '${import.meta.env.VITE_SUPABASE_URL || 'https://your-supabase-url'}';

async function getUhuruChatResponse(messages) {
  try {
    const response = await fetch(\`\${SUPABASE_URL}/functions/v1/uhuru-llm-api\`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': \`Bearer \${UHURU_API_KEY}\`
      },
      body: JSON.stringify({
        model: 'uhuru-1',
        messages: messages,
        temperature: 0.7,
        max_tokens: 500
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || \`HTTP error! status: \${response.status}\`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content;
  } catch (error) {
    console.error('Error calling Uhuru API:', error);
    throw error;
  }
}

// Example usage
async function main() {
  try {
    const messages = [
      { role: 'user', content: 'What are the major challenges facing small businesses in Botswana?' }
    ];
    
    const response = await getUhuruChatResponse(messages);
    console.log('Uhuru response:', response);
  } catch (error) {
    console.error('Failed to get response:', error);
  }
}

main();`} 
                id="js-example" 
              />
            </div>

            {/* Python example */}
            <div>
              <h3 className="text-lg font-bold mb-3">Python</h3>
              <CodeBlock 
                code={`import requests
import json

# Configuration
UHURU_API_KEY = "uhuru_your_api_key_here"
SUPABASE_URL = "${import.meta.env.VITE_SUPABASE_URL || 'https://your-supabase-url'}"

def get_uhuru_completion(prompt):
    """
    Get a text completion from the Uhuru API
    """
    url = f"{SUPABASE_URL}/functions/v1/uhuru-llm-api"
    
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {UHURU_API_KEY}"
    }
    
    data = {
        "model": "uhuru-1",
        "prompt": prompt,
        "max_tokens": 500,
        "temperature": 0.7
    }
    
    try:
        response = requests.post(url, headers=headers, json=data)
        response.raise_for_status()  # Raise exception for HTTP errors
        
        result = response.json()
        return result["choices"][0]["text"]
    except requests.exceptions.RequestException as e:
        print(f"Error calling Uhuru API: {e}")
        if response.status_code != 200:
            print(f"API Error: {response.text}")
        return None
    
# Example usage
if __name__ == "__main__":
    prompt = "Explain the traditional governance systems in Botswana"
    completion = get_uhuru_completion(prompt)
    print(completion)`} 
                language="python" 
                id="python-example" 
              />
            </div>

            {/* React example */}
            <div>
              <h3 className="text-lg font-bold mb-3">React (TypeScript)</h3>
              <CodeBlock 
                code={`import { useState } from 'react';

// Configuration
const UHURU_API_KEY = 'uhuru_your_api_key_here';
const SUPABASE_URL = '${import.meta.env.VITE_SUPABASE_URL || 'https://your-supabase-url'}';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

const UhuruChatComponent: React.FC = () => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = async () => {
    if (!input.trim()) return;
    
    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(\`\${SUPABASE_URL}/functions/v1/uhuru-llm-api\`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': \`Bearer \${UHURU_API_KEY}\`
        },
        body: JSON.stringify({
          model: 'uhuru-1',
          messages: [...messages, userMessage],
          temperature: 0.7,
          max_tokens: 500
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to get response');
      }

      const data = await response.json();
      const assistantMessage: Message = { 
        role: 'assistant', 
        content: data.choices[0]?.message?.content || 'No response received' 
      };
      
      setMessages(prev => [...prev, assistantMessage]);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
      console.error('Error calling Uhuru API:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-4">
      <h2 className="text-xl font-bold mb-4">Uhuru Chat</h2>
      
      <div className="bg-gray-100 rounded-lg p-4 h-80 overflow-y-auto mb-4">
        {messages.map((msg, index) => (
          <div 
            key={index} 
            className={\`mb-2 p-2 rounded-lg \${
              msg.role === 'user' 
                ? 'bg-teal text-white ml-auto' 
                : 'bg-white text-gray-800'
            } max-w-[80%] \${msg.role === 'user' ? 'ml-auto' : 'mr-auto'}\`}
          >
            {msg.content}
          </div>
        ))}
        {isLoading && (
          <div className="text-center text-gray-500">
            <div className="animate-pulse">Thinking...</div>
          </div>
        )}
        {error && (
          <div className="bg-red-100 border border-red-300 text-red-700 p-2 rounded-lg">
            Error: {error}
          </div>
        )}
      </div>
      
      <div className="flex">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message..."
          className="flex-1 p-2 border border-gray-300 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-teal"
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
        />
        <button
          onClick={sendMessage}
          disabled={isLoading || !input.trim()}
          className="bg-teal text-white px-4 py-2 rounded-r-lg disabled:bg-gray-300"
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default UhuruChatComponent;`} 
                language="typescript" 
                id="react-example" 
              />
            </div>
          </div>
        </div>
      ),
    },
    {
      label: 'Errors',
      icon: <AlertTriangle className="w-4 h-4" />,
      content: (
        <div>
          <h2 className="text-xl font-bold mb-4">Error Handling</h2>
          
          <p className="mb-6">
            The Uhuru API returns standard HTTP status codes to indicate the success or failure of requests, 
            along with detailed error messages in the response body.
          </p>

          <h3 className="text-lg font-bold mb-3">HTTP Status Codes</h3>
          <table className="w-full border-collapse mb-6">
            <thead className="bg-navy-600 text-white">
              <tr>
                <th className="p-2 text-left">Status Code</th>
                <th className="p-2 text-left">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              <tr className="bg-navy-700/50">
                <td className="p-2">200 - OK</td>
                <td className="p-2">Request succeeded</td>
              </tr>
              <tr className="bg-navy-700/30">
                <td className="p-2">400 - Bad Request</td>
                <td className="p-2">Invalid request, e.g., missing required parameters</td>
              </tr>
              <tr className="bg-navy-700/50">
                <td className="p-2">401 - Unauthorized</td>
                <td className="p-2">Invalid or missing API key</td>
              </tr>
              <tr className="bg-navy-700/30">
                <td className="p-2">403 - Forbidden</td>
                <td className="p-2">Valid API key but insufficient permissions</td>
              </tr>
              <tr className="bg-navy-700/50">
                <td className="p-2">404 - Not Found</td>
                <td className="p-2">The requested resource does not exist</td>
              </tr>
              <tr className="bg-navy-700/30">
                <td className="p-2">429 - Too Many Requests</td>
                <td className="p-2">Rate limit exceeded</td>
              </tr>
              <tr className="bg-navy-700/50">
                <td className="p-2">500 - Internal Server Error</td>
                <td className="p-2">Server error</td>
              </tr>
            </tbody>
          </table>

          <h3 className="text-lg font-bold mb-3">Error Response Format</h3>
          <p className="mb-3">
            Error responses include a JSON object with an error message:
          </p>
          
          <CodeBlock 
            code={`{
  "error": {
    "message": "Invalid API key provided",
    "type": "authentication_error",
    "code": "invalid_api_key"
  }
}`} 
            language="json" 
            id="error-format" 
          />
          
          <h3 className="text-lg font-bold mb-3 mt-6">Common Error Codes</h3>
          <table className="w-full border-collapse">
            <thead className="bg-navy-600 text-white">
              <tr>
                <th className="p-2 text-left">Error Code</th>
                <th className="p-2 text-left">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              <tr className="bg-navy-700/50">
                <td className="p-2 font-mono whitespace-nowrap">invalid_api_key</td>
                <td className="p-2">The API key provided is invalid or not found</td>
              </tr>
              <tr className="bg-navy-700/30">
                <td className="p-2 font-mono whitespace-nowrap">permission_denied</td>
                <td className="p-2">API key doesn't have permission to access this resource</td>
              </tr>
              <tr className="bg-navy-700/50">
                <td className="p-2 font-mono whitespace-nowrap">api_key_expired</td>
                <td className="p-2">The API key has expired</td>
              </tr>
              <tr className="bg-navy-700/30">
                <td className="p-2 font-mono whitespace-nowrap">missing_parameter</td>
                <td className="p-2">A required parameter is missing</td>
              </tr>
              <tr className="bg-navy-700/50">
                <td className="p-2 font-mono whitespace-nowrap">invalid_parameter</td>
                <td className="p-2">A parameter has an invalid value</td>
              </tr>
              <tr className="bg-navy-700/30">
                <td className="p-2 font-mono whitespace-nowrap">rate_limit_exceeded</td>
                <td className="p-2">You have exceeded your rate limit</td>
              </tr>
              <tr className="bg-navy-700/50">
                <td className="p-2 font-mono whitespace-nowrap">quota_exceeded</td>
                <td className="p-2">You have exceeded your monthly quota</td>
              </tr>
              <tr className="bg-navy-700/30">
                <td className="p-2 font-mono whitespace-nowrap">server_error</td>
                <td className="p-2">Internal server error</td>
              </tr>
            </tbody>
          </table>

          <div className="bg-navy-600 border border-white/10 rounded-lg p-4 mt-6">
            <h3 className="text-lg font-medium mb-2 text-white">Error Handling Best Practices</h3>
            <ul className="space-y-2 text-white/80">
              <li className="flex items-start">
                <div className="w-5 h-5 rounded-full bg-teal flex items-center justify-center mt-0.5 mr-2 flex-shrink-0">
                  <Check className="w-3 h-3 text-white" />
                </div>
                <span>Always check for error responses in your API calls</span>
              </li>
              <li className="flex items-start">
                <div className="w-5 h-5 rounded-full bg-teal flex items-center justify-center mt-0.5 mr-2 flex-shrink-0">
                  <Check className="w-3 h-3 text-white" />
                </div>
                <span>Implement exponential backoff for retrying rate-limited requests</span>
              </li>
              <li className="flex items-start">
                <div className="w-5 h-5 rounded-full bg-teal flex items-center justify-center mt-0.5 mr-2 flex-shrink-0">
                  <Check className="w-3 h-3 text-white" />
                </div>
                <span>Log detailed error information for debugging</span>
              </li>
              <li className="flex items-start">
                <div className="w-5 h-5 rounded-full bg-teal flex items-center justify-center mt-0.5 mr-2 flex-shrink-0">
                  <Check className="w-3 h-3 text-white" />
                </div>
                <span>Provide user-friendly error messages in your application</span>
              </li>
            </ul>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-navy text-white flex flex-col">
      {/* Header */}
      <header className="w-full bg-navy/80 backdrop-blur-sm z-50 border-b border-white/10 py-3 sm:py-4">
        <div className="container mx-auto px-4 sm:px-6 flex justify-between items-center">
          <Logo />
          <Link 
            to="/" 
            className="flex items-center gap-1 text-white hover:text-teal transition-colors duration-200 text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to home</span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        {/* Hero banner */}
        <div className="bg-gradient-to-r from-navy-500 to-teal/30 py-10 sm:py-16 border-b border-white/10">
          <div className="container mx-auto px-4 sm:px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="max-w-4xl mx-auto text-center"
            >
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-navy-400 rounded-full flex items-center justify-center">
                  <Key className="w-8 h-8 text-teal" />
                </div>
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">Uhuru API Documentation</h1>
              <p className="text-xl text-white/80 max-w-2xl mx-auto">
                Build Africa-optimized AI capabilities into your applications with our simple and powerful API.
              </p>
            </motion.div>
          </div>
        </div>

        {/* Tab navigation */}
        <div className="container mx-auto px-4 sm:px-6 py-8">
          <div className="mb-6 overflow-x-auto scrollbar-hide">
            <div className="flex border border-white/10 rounded-lg p-1 bg-navy-700 inline-flex">
              {tabs.map((tab, index) => (
                <button
                  key={index}
                  onClick={() => setActiveTab(tab.label.toLowerCase() as any)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    activeTab === tab.label.toLowerCase() 
                      ? 'bg-teal text-white' 
                      : 'text-white/70 hover:text-white/90 hover:bg-white/5'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Tab content */}
          <motion.div 
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-navy-800 border border-white/10 rounded-lg p-6 mb-8"
          >
            {tabs.find(tab => tab.label.toLowerCase() === activeTab)?.content}
          </motion.div>
        </div>

        {/* FAQ Section */}
        <div className="container mx-auto px-4 sm:px-6 py-8 border-t border-white/10">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold mb-6">Frequently Asked Questions</h2>
            
            <div className="space-y-4">
              <div className="bg-navy-700 rounded-lg p-4">
                <h3 className="font-bold mb-2">What is the Uhuru API rate limit?</h3>
                <p className="text-white/80">
                  All users can make up to 50 API requests per day, with a maximum of 10 requests per minute.
                  The API is available to all users, not just Pro subscribers.
                </p>
              </div>
              
              <div className="bg-navy-700 rounded-lg p-4">
                <h3 className="font-bold mb-2">How is API usage billed?</h3>
                <p className="text-white/80">
                  API usage is available to all users at no extra charge. There are no additional costs or daily limits - use the API as much as you need.
                </p>
              </div>
              
              <div className="bg-navy-700 rounded-lg p-4">
                <h3 className="font-bold mb-2">Can I specify the language for responses?</h3>
                <p className="text-white/80">
                  Yes, you can specify the preferred response language by including a <code className="bg-navy-600 px-1 rounded">language</code> parameter in your request body. Supported languages include English, Setswana, Swahili, and more.
                </p>
              </div>
              
              <div className="bg-navy-700 rounded-lg p-4">
                <h3 className="font-bold mb-2">Is the API available for free tier users?</h3>
                <p className="text-white/80">
                  Yes, the Uhuru API is available for all users with no daily limits or restrictions.
                </p>
              </div>
              
              <div className="bg-navy-700 rounded-lg p-4">
                <h3 className="font-bold mb-2">How do I report issues with the API?</h3>
                <p className="text-white/80">
                  For technical issues or questions about the API, please contact our support team at <a href="mailto:support@orionx.xyz" className="text-teal hover:underline">support@orionx.xyz</a>.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <NewFooter />
    </div>
  );
};

export default ApiDocumentation;