import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Users, User, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMessaging } from '@/contexts/MessagingContext';
import { Input } from '@/components/ui/input';

interface Conversation {
  id: string;
  type: 'DIRECT' | 'GROUP';
  name?: string;
  updatedAt: string;
  participants: Array<{
    user: {
      id: string;
      fullName: string;
      role: string;
    };
  }>;
  messages?: Array<{
    content: string;
    sender: { fullName: string };
  }>;
  unreadCount?: number;
}

interface Props {
  conversations: Conversation[];
  activeConversation: Conversation | null;
  onSelect: (conversation: Conversation) => void;
}

export function ConversationList({ conversations, activeConversation, onSelect }: Props) {
  const { onlineUsers, typingUsers } = useMessaging();
  const [searchQuery, setSearchQuery] = useState('');

  const getConversationName = (conv: Conversation) => {
    if (conv.type === 'GROUP') {
      return conv.name || 'Group Chat';
    }
    
    // Direct chat
    const otherParticipant = conv.participants.find(p => p.user.id !== activeConversation?.participants[0]?.user.id); // This is context-dependent
    return conv.name || 'Chat';
  };

  const filteredConversations = conversations.filter(conv => {
    const name = conv.name || conv.participants.map(p => p.user.fullName).join(', ');
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="flex flex-col h-full">
      {/* Search Bar */}
      <div className="p-3 bg-muted/20">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search chats..."
            className="pl-9 h-9 bg-background border-none shadow-none focus-visible:ring-1"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-border/50">
        {filteredConversations.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <p className="text-sm">No conversations found</p>
          </div>
        ) : (
          filteredConversations.map(conv => {
            const isActive = activeConversation?.id === conv.id;
            const lastMessage = conv.messages?.[0];
            const isOnline = conv.type === 'DIRECT' && 
              conv.participants.some(p => onlineUsers.has(p.user.id));
            const isTyping = typingUsers.get(conv.id)?.size ?? 0 > 0;

            const displayName = conv.type === 'GROUP' 
              ? conv.name 
              : conv.participants.find(p => p.user.id !== activeConversation?.participants[0]?.user.id)?.user.fullName ?? conv.participants[0]?.user.fullName;

            return (
              <button
                key={conv.id}
                onClick={() => onSelect(conv)}
                className={cn(
                  'w-full p-3 text-left transition-all hover:bg-muted/50 group',
                  isActive && 'bg-primary/5 border-l-4 border-l-primary'
                )}
              >
                <div className="flex items-center gap-3">
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    <div className={cn(
                      "w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold",
                      conv.type === 'GROUP' ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                    )}>
                      {conv.type === 'GROUP' ? <Users className="w-6 h-6" /> : (displayName?.charAt(0) ?? '?')}
                    </div>
                    {isOnline && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-card" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className={cn(
                        "font-semibold truncate text-[15px]",
                        conv.unreadCount ?? 0 > 0 ? "text-foreground" : "text-foreground/90"
                      )}>
                        {displayName}
                      </span>
                      {conv.updatedAt && (
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap ml-2">
                          {formatDistanceToNow(new Date(conv.updatedAt), { addSuffix: false })}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <p className={cn(
                        "text-sm truncate flex-1",
                        isTyping ? "text-primary font-medium italic animate-pulse" : "text-muted-foreground"
                      )}>
                        {isTyping ? "typing..." : (lastMessage ? lastMessage.content : "Start a new conversation")}
                      </p>
                      
                      {conv.unreadCount ? conv.unreadCount > 0 && (
                        <span className="flex-shrink-0 min-w-[18px] h-[18px] flex items-center justify-center bg-primary text-primary-foreground text-[10px] font-bold rounded-full px-1">
                          {conv.unreadCount}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
