// =============================================================================
// ConstrutorPro - AI Assistant Page
// =============================================================================

'use client';

import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bot, Send, User, Plus, Trash2, Loader2, HardHat, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  messages?: Message[];
}

async function fetchConversations(): Promise<{ success: boolean; data: Conversation[] }> {
  const response = await fetch('/api/ia/conversas');
  return response.json();
}

async function fetchConversation(id: string): Promise<{ success: boolean; data: Conversation }> {
  const response = await fetch(`/api/ia/conversas/${id}`);
  return response.json();
}

async function sendMessage(data: { conversationId?: string; message: string }): Promise<{ success: boolean; data: { conversationId: string; message: Message } }> {
  const response = await fetch('/api/ia/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return response.json();
}

async function createConversation(title: string): Promise<{ success: boolean; data: Conversation }> {
  const response = await fetch('/api/ia/conversas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  });
  return response.json();
}

async function deleteConversation(id: string): Promise<void> {
  await fetch(`/api/ia/conversas/${id}`, { method: 'DELETE' });
}

export default function AIPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  const { data: conversationsData, isLoading: conversationsLoading } = useQuery({
    queryKey: ['conversations'],
    queryFn: fetchConversations,
  });

  const { data: conversationData } = useQuery({
    queryKey: ['conversation', selectedConversationId],
    queryFn: () => fetchConversation(selectedConversationId!),
    enabled: !!selectedConversationId,
  });

  const sendMessageMutation = useMutation({
    mutationFn: sendMessage,
    onSuccess: (data) => {
      setSelectedConversationId(data.data.conversationId);
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['conversation', data.data.conversationId] });
      setMessage('');
    },
    onError: () => {
      toast({
        title: 'Erro',
        description: 'Não foi possível enviar a mensagem.',
        variant: 'destructive',
      });
    },
  });

  const createConversationMutation = useMutation({
    mutationFn: createConversation,
    onSuccess: (data) => {
      setSelectedConversationId(data.data.id);
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });

  const deleteConversationMutation = useMutation({
    mutationFn: deleteConversation,
    onSuccess: () => {
      setSelectedConversationId(null);
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      toast({
        title: 'Sucesso',
        description: 'Conversa excluída.',
      });
    },
  });

  const conversations = conversationsData?.data || [];
  const currentConversation = conversationData?.data;
  const messages = currentConversation?.messages || [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || sendMessageMutation.isPending) return;

    sendMessageMutation.mutate({
      conversationId: selectedConversationId || undefined,
      message: message.trim(),
    });
  };

  const handleNewConversation = () => {
    createConversationMutation.mutate('Nova Conversa');
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4">
      {/* Conversations Sidebar */}
      <Card className="w-72 flex-shrink-0">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Conversas</CardTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleNewConversation}
              disabled={createConversationMutation.isPending}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[calc(100vh-14rem)]">
            {conversationsLoading ? (
              <div className="p-4 space-y-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-12 bg-muted animate-pulse rounded-lg" />
                ))}
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                <Bot className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Nenhuma conversa ainda</p>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {conversations.map((conv) => (
                  <div
                    key={conv.id}
                    className={cn(
                      'group flex items-center justify-between p-2 rounded-lg cursor-pointer hover:bg-muted transition-colors',
                      selectedConversationId === conv.id && 'bg-muted'
                    )}
                    onClick={() => setSelectedConversationId(conv.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{conv.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(conv.createdAt).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteConversationMutation.mutate(conv.id);
                      }}
                    >
                      <Trash2 className="h-3 w-3 text-muted-foreground" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Chat Area */}
      <Card className="flex-1 flex flex-col">
        {/* Header */}
        <CardHeader className="border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Assistente IA</CardTitle>
              <p className="text-sm text-muted-foreground">
                Especialista em construção civil
              </p>
            </div>
          </div>
        </CardHeader>

        {/* Messages */}
        <CardContent className="flex-1 overflow-hidden p-0">
          {!selectedConversationId ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8">
              <div className="p-4 rounded-full bg-primary/10 mb-4">
                <HardHat className="h-12 w-12 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">
                Como posso ajudar você hoje?
              </h3>
              <p className="text-muted-foreground max-w-md mb-6">
                Sou um assistente especializado em construção civil. Posso ajudar com
                orçamentos, composições de preços, planejamento, normas técnicas e muito mais.
              </p>
              <div className="grid grid-cols-2 gap-3 w-full max-w-md">
                {[
                  'Criar uma composição de preço',
                  'Analisar um orçamento',
                  'Resumir diário de obra',
                  'Sugestões de planejamento',
                ].map((suggestion) => (
                  <Button
                    key={suggestion}
                    variant="outline"
                    className="h-auto py-3 text-left"
                    onClick={() => setMessage(suggestion)}
                  >
                    {suggestion}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <ScrollArea className="h-full p-4">
              <div className="space-y-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      'flex gap-3',
                      msg.role === 'user' ? 'flex-row-reverse' : ''
                    )}
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarFallback
                        className={cn(
                          msg.role === 'assistant'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        )}
                      >
                        {msg.role === 'assistant' ? (
                          <Bot className="h-4 w-4" />
                        ) : (
                          <User className="h-4 w-4" />
                        )}
                      </AvatarFallback>
                    </Avatar>
                    <div
                      className={cn(
                        'max-w-[80%] rounded-lg p-3',
                        msg.role === 'assistant'
                          ? 'bg-muted'
                          : 'bg-primary text-primary-foreground'
                      )}
                    >
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                ))}
                {sendMessageMutation.isPending && (
                  <div className="flex gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        <Bot className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="bg-muted rounded-lg p-3">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>
          )}
        </CardContent>

        {/* Input */}
        <div className="p-4 border-t">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <Input
              placeholder="Digite sua mensagem..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={sendMessageMutation.isPending}
              className="flex-1"
            />
            <Button type="submit" disabled={!message.trim() || sendMessageMutation.isPending}>
              {sendMessageMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
}
