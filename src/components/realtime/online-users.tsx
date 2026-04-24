// =============================================================================
// ConstrutorPro - Online Users Indicator
// Componente para mostrar usuários online em tempo real
// =============================================================================

'use client';

import { useState } from 'react';
import { Users, Circle, User } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useWebSocketOptional } from './websocket-provider';

// =============================================================================
// Tipos
// =============================================================================

interface OnlineUsersProps {
  className?: string;
  showNames?: boolean;
  maxAvatars?: number;
  compact?: boolean;
}

// =============================================================================
// Status colors
// =============================================================================

const statusColors = {
  online: 'bg-green-500',
  away: 'bg-yellow-500',
  busy: 'bg-red-500',
};

const statusLabels = {
  online: 'Online',
  away: 'Ausente',
  busy: 'Ocupado',
};

// =============================================================================
// Helper para obter iniciais
// =============================================================================

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// =============================================================================
// Componente Principal
// =============================================================================

export function OnlineUsers({
  className,
  showNames = false,
  maxAvatars = 4,
  compact = false,
}: OnlineUsersProps) {
  const wsContext = useWebSocketOptional();
  const [isOpen, setIsOpen] = useState(false);

  const onlineUsers = wsContext?.onlineUsers || [];
  const activeUsers = onlineUsers.filter(u => u.status === 'online');
  const awayUsers = onlineUsers.filter(u => u.status === 'away');
  const busyUsers = onlineUsers.filter(u => u.status === 'busy');

  const totalOnline = activeUsers.length;

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn('flex items-center gap-1.5', className)}>
              <div className="relative">
                <Users className="h-4 w-4 text-muted-foreground" />
                <Circle className="absolute -top-0.5 -right-0.5 h-2 w-2 fill-green-500 text-green-500" />
              </div>
              <span className="text-sm font-medium">{totalOnline}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>{totalOnline} usuários online</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            'flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted hover:bg-muted/80 transition-colors',
            className
          )}
        >
          <div className="relative">
            <Users className="h-4 w-4 text-muted-foreground" />
            <Circle className="absolute -top-0.5 -right-0.5 h-2 w-2 fill-green-500 text-green-500" />
          </div>
          <span className="text-sm font-medium">{totalOnline} online</span>

          {/* Avatares */}
          <div className="flex -space-x-2">
            {activeUsers.slice(0, maxAvatars).map((user) => (
              <Avatar key={user.userId} className="h-6 w-6 border-2 border-background">
                <AvatarFallback className="text-[10px] bg-primary text-primary-foreground">
                  {getInitials(user.userName || user.userEmail)}
                </AvatarFallback>
              </Avatar>
            ))}
            {activeUsers.length > maxAvatars && (
              <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center border-2 border-background">
                <span className="text-[10px] font-medium">
                  +{activeUsers.length - maxAvatars}
                </span>
              </div>
            )}
          </div>
        </button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-72 p-0">
        <div className="p-3 border-b">
          <h4 className="font-semibold text-sm">Usuários Online</h4>
          <p className="text-xs text-muted-foreground">
            {totalOnline} usuários ativos agora
          </p>
        </div>

        <ScrollArea className="h-[200px]">
          {/* Online */}
          {activeUsers.length > 0 && (
            <div className="p-2">
              <p className="text-xs font-medium text-muted-foreground px-2 mb-1">
                Online ({activeUsers.length})
              </p>
              {activeUsers.map((user) => (
                <div
                  key={user.userId}
                  className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted"
                >
                  <div className="relative">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">
                        {getInitials(user.userName || user.userEmail)}
                      </AvatarFallback>
                    </Avatar>
                    <Circle
                      className={cn(
                        'absolute bottom-0 right-0 h-2.5 w-2.5 fill-green-500 text-green-500 ring-2 ring-background'
                      )}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{user.userName}</p>
                    {user.currentPage && (
                      <p className="text-xs text-muted-foreground truncate">
                        {user.currentPage}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Away */}
          {awayUsers.length > 0 && (
            <div className="p-2 border-t">
              <p className="text-xs font-medium text-muted-foreground px-2 mb-1">
                Ausente ({awayUsers.length})
              </p>
              {awayUsers.map((user) => (
                <div
                  key={user.userId}
                  className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted"
                >
                  <div className="relative">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs opacity-60">
                        {getInitials(user.userName || user.userEmail)}
                      </AvatarFallback>
                    </Avatar>
                    <Circle
                      className={cn(
                        'absolute bottom-0 right-0 h-2.5 w-2.5 fill-yellow-500 text-yellow-500 ring-2 ring-background'
                      )}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate opacity-70">{user.userName}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Busy */}
          {busyUsers.length > 0 && (
            <div className="p-2 border-t">
              <p className="text-xs font-medium text-muted-foreground px-2 mb-1">
                Ocupado ({busyUsers.length})
              </p>
              {busyUsers.map((user) => (
                <div
                  key={user.userId}
                  className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted"
                >
                  <div className="relative">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs opacity-60">
                        {getInitials(user.userName || user.userEmail)}
                      </AvatarFallback>
                    </Avatar>
                    <Circle
                      className={cn(
                        'absolute bottom-0 right-0 h-2.5 w-2.5 fill-red-500 text-red-500 ring-2 ring-background'
                      )}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate opacity-70">{user.userName}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty state */}
          {onlineUsers.length === 0 && (
            <div className="p-6 text-center">
              <User className="h-8 w-8 mx-auto text-muted-foreground opacity-50" />
              <p className="text-sm text-muted-foreground mt-2">
                Nenhum usuário online
              </p>
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

// =============================================================================
// Componente de Status do Próprio Usuário
// =============================================================================

interface UserStatusSelectorProps {
  className?: string;
}

export function UserStatusSelector({ className }: UserStatusSelectorProps) {
  const wsContext = useWebSocketOptional();

  const handleSetStatus = (status: 'online' | 'away' | 'busy') => {
    wsContext?.setMyStatus(status);
  };

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <TooltipProvider>
        {(['online', 'away', 'busy'] as const).map((status) => (
          <Tooltip key={status}>
            <TooltipTrigger asChild>
              <button
                onClick={() => handleSetStatus(status)}
                className={cn(
                  'p-1.5 rounded-full transition-colors hover:bg-muted',
                  'focus:outline-none focus:ring-2 focus:ring-ring'
                )}
              >
                <Circle
                  className={cn(
                    'h-3 w-3',
                    statusColors[status],
                    'fill-current'
                  )}
                />
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{statusLabels[status]}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </TooltipProvider>
    </div>
  );
}
