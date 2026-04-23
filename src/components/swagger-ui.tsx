'use client';

/**
 * Swagger UI Component for ConstrutorPro
 * 
 * Interactive API documentation with:
 * - Endpoint explorer
 * - Try it out functionality
 * - Schema viewer
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Code,
  Play,
  Copy,
  Check,
  ChevronDown,
  ExternalLink,
  Lock,
  Unlock,
  Book,
  Terminal,
} from 'lucide-react';

interface OpenAPISpec {
  openapi: string;
  info: {
    title: string;
    description: string;
    version: string;
  };
  servers: Array<{ url: string; description: string }>;
  paths: Record<string, Record<string, any>>;
  components: {
    schemas: Record<string, any>;
    securitySchemes: Record<string, any>;
  };
  tags: Array<{ name: string; description: string }>;
}

const HTTP_METHOD_COLORS: Record<string, string> = {
  get: 'bg-green-500',
  post: 'bg-blue-500',
  put: 'bg-orange-500',
  patch: 'bg-yellow-500',
  delete: 'bg-red-500',
};

export function SwaggerUI() {
  const [spec, setSpec] = useState<OpenAPISpec | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [selectedServer, setSelectedServer] = useState('');
  const [expandedEndpoints, setExpandedEndpoints] = useState<Set<string>>(new Set());
  const [testResults, setTestResults] = useState<Record<string, any>>({});
  const [copiedEndpoint, setCopiedEndpoint] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/docs')
      .then(res => res.json())
      .then(data => {
        setSpec(data);
        if (data.servers?.length > 0) {
          setSelectedServer(data.servers[0].url);
        }
      });
  }, []);

  const toggleEndpoint = (path: string, method: string) => {
    const key = `${method}-${path}`;
    setExpandedEndpoints(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const copyEndpoint = (path: string, method: string) => {
    const curl = generateCurl(path, method);
    navigator.clipboard.writeText(curl);
    setCopiedEndpoint(`${method}-${path}`);
    setTimeout(() => setCopiedEndpoint(null), 2000);
  };

  const generateCurl = (path: string, method: string) => {
    const endpoint = spec?.paths[path][method];
    let curl = `curl -X ${method.toUpperCase()} "${selectedServer}${path}" \\\n`;
    curl += `  -H "Authorization: Bearer YOUR_API_KEY" \\\n`;
    curl += `  -H "Content-Type: application/json"`;
    
    if (endpoint.requestBody) {
      curl += ` \\\n  -d '{}'`;
    }
    
    return curl;
  };

  const testEndpoint = async (path: string, method: string, body?: string) => {
    const key = `${method}-${path}`;
    try {
      const options: RequestInit = {
        method: method.toUpperCase(),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
      };
      
      if (body && ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
        options.body = body;
      }
      
      const response = await fetch(`${selectedServer}${path}`, options);
      const data = await response.json();
      
      setTestResults(prev => ({
        ...prev,
        [key]: {
          status: response.status,
          statusText: response.statusText,
          data,
        },
      }));
    } catch (error: any) {
      setTestResults(prev => ({
        ...prev,
        [key]: {
          error: error.message,
        },
      }));
    }
  };

  if (!spec) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">{spec.info.title}</CardTitle>
              <CardDescription className="mt-2">
                Versão {spec.info.version}
              </CardDescription>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-muted-foreground" />
                <Input
                  type="password"
                  placeholder="API Key"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-48"
                />
              </div>
              <Select value={selectedServer} onValueChange={setSelectedServer}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Select server" />
                </SelectTrigger>
                <SelectContent>
                  {spec.servers.map((server, i) => (
                    <SelectItem key={i} value={server.url}>
                      {server.description} ({server.url})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <p className="text-muted-foreground whitespace-pre-line">
              {spec.info.description}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Endpoints by Tag */}
      <Tabs defaultValue={spec.tags?.[0]?.name || 'all'}>
        <TabsList className="flex-wrap">
          {spec.tags?.map(tag => (
            <TabsTrigger key={tag.name} value={tag.name}>
              {tag.name}
            </TabsTrigger>
          ))}
        </TabsList>

        {spec.tags?.map(tag => (
          <TabsContent key={tag.name} value={tag.name}>
            <Accordion type="multiple" className="space-y-2">
              {Object.entries(spec.paths).map(([path, methods]) => {
                const methodsForTag = Object.entries(methods).filter(
                  ([, config]) => config.tags?.includes(tag.name)
                );
                
                if (methodsForTag.length === 0) return null;
                
                return methodsForTag.map(([method, config]) => (
                  <AccordionItem
                    key={`${method}-${path}`}
                    value={`${method}-${path}`}
                    className="border rounded-lg"
                  >
                    <AccordionTrigger className="px-4 hover:no-underline">
                      <div className="flex items-center gap-3">
                        <Badge className={`${HTTP_METHOD_COLORS[method]} text-white font-mono text-xs`}>
                          {method.toUpperCase()}
                        </Badge>
                        <code className="text-sm">{path}</code>
                        <span className="text-muted-foreground text-sm ml-2">
                          {config.summary}
                        </span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4">
                      <EndpointDetails
                        path={path}
                        method={method}
                        config={config}
                        spec={spec}
                        apiKey={apiKey}
                        server={selectedServer}
                        testResult={testResults[`${method}-${path}`]}
                        onTest={(body) => testEndpoint(path, method, body)}
                        onCopy={() => copyEndpoint(path, method)}
                        isCopied={copiedEndpoint === `${method}-${path}`}
                      />
                    </AccordionContent>
                  </AccordionItem>
                ));
              })}
            </Accordion>
          </TabsContent>
        ))}
      </Tabs>

      {/* Schemas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Book className="h-5 w-5" />
            Esquemas de Dados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="multiple" className="space-y-2">
            {Object.entries(spec.components?.schemas || {}).map(([name, schema]) => (
              <AccordionItem key={name} value={name} className="border rounded-lg">
                <AccordionTrigger className="px-4 hover:no-underline">
                  <code className="text-sm">{name}</code>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <SchemaViewer schema={schema} name={name} />
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}

// Endpoint Details Component
function EndpointDetails({
  path,
  method,
  config,
  spec,
  apiKey,
  server,
  testResult,
  onTest,
  onCopy,
  isCopied,
}: {
  path: string;
  method: string;
  config: any;
  spec: OpenAPISpec;
  apiKey: string;
  server: string;
  testResult?: any;
  onTest: (body?: string) => void;
  onCopy: () => void;
  isCopied: boolean;
}) {
  const [requestBody, setRequestBody] = useState('{}');
  
  return (
    <div className="space-y-4">
      {/* Description */}
      {config.description && (
        <div className="text-sm text-muted-foreground whitespace-pre-line">
          {config.description}
        </div>
      )}

      {/* Parameters */}
      {config.parameters?.length > 0 && (
        <div>
          <h4 className="font-medium mb-2">Parâmetros</h4>
          <div className="bg-muted rounded-lg p-3 space-y-2">
            {config.parameters.map((param: any, i: number) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <Badge variant={param.required ? 'default' : 'outline'}>
                  {param.required ? 'obrigatório' : 'opcional'}
                </Badge>
                <code>{param.name}</code>
                <span className="text-muted-foreground">({param.in})</span>
                {param.schema && (
                  <span className="text-xs text-muted-foreground">
                    {param.schema.type}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Request Body */}
      {config.requestBody && (
        <div>
          <h4 className="font-medium mb-2">Corpo da Requisição</h4>
          <Textarea
            value={requestBody}
            onChange={(e) => setRequestBody(e.target.value)}
            className="font-mono text-sm min-h-32"
            placeholder="JSON request body"
          />
        </div>
      )}

      {/* Responses */}
      <div>
        <h4 className="font-medium mb-2">Respostas</h4>
        <div className="space-y-2">
          {Object.entries(config.responses || {}).map(([code, response]: [string, any]) => (
            <div key={code} className="flex items-start gap-2 text-sm">
              <Badge variant={code.startsWith('2') ? 'default' : 'destructive'}>
                {code}
              </Badge>
              <span className="text-muted-foreground">{response.description}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-2">
        <Button
          onClick={() => onTest(['POST', 'PUT', 'PATCH'].includes(method.toUpperCase()) ? requestBody : undefined)}
          disabled={!apiKey}
          size="sm"
        >
          <Play className="h-4 w-4 mr-2" />
          Testar
        </Button>
        <Button variant="outline" size="sm" onClick={onCopy}>
          {isCopied ? (
            <Check className="h-4 w-4 mr-2" />
          ) : (
            <Copy className="h-4 w-4 mr-2" />
          )}
          Copiar cURL
        </Button>
      </div>

      {/* Test Result */}
      {testResult && (
        <div className="mt-4">
          <h4 className="font-medium mb-2 flex items-center gap-2">
            <Terminal className="h-4 w-4" />
            Resultado
          </h4>
          <div className="bg-muted rounded-lg p-3">
            {testResult.error ? (
              <div className="text-destructive">{testResult.error}</div>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant={testResult.status < 400 ? 'default' : 'destructive'}>
                    {testResult.status} {testResult.statusText}
                  </Badge>
                </div>
                <pre className="text-xs overflow-auto max-h-64">
                  {JSON.stringify(testResult.data, null, 2)}
                </pre>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Schema Viewer Component
function SchemaViewer({ schema, name }: { schema: any; name: string }) {
  return (
    <div className="bg-muted rounded-lg p-3">
      <pre className="text-xs overflow-auto">
        {JSON.stringify(schema, null, 2)}
      </pre>
    </div>
  );
}
