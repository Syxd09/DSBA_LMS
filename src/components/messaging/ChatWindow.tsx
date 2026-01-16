/**
 * CHAT WINDOW COMPONENT
 * 
 * Professional chat interface with:
 * - Message history
 * - Input field
 * - File uploads
 * - Typing indicators
 * - Mobile responsive
 */

import { useState, useEffect, useRef } from 'react';
import { useMessaging } from '@/contexts/MessagingContext';
import { MessageBubble } from './MessageBubble';
import { MessageInput } from './MessageInput';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Users, MoreVertical } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

interface Props {
  conversation: any;
  onBack?: () => void;
}

export function ChatWindow({ conversation, onBack }: Props) {
  const { user } = useAuth();
  const { messages, loadMessages, typingUsers, onlineUsers } = useMessaging();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load messages on conversation change
  useEffect(() => {
    if (conversation?.id) {
      setIsLoading(true);
      loadMessages(conversation.id).finally(() => setIsLoading(false));
    }
  }, [conversation?.id, loadMessages]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Get typing users for this conversation
  const typingInConvo = Array.from(typingUsers.get(conversation?.id) || [])
    .map(userId => {
      const participant = conversation.participants.find((p: any) => p.userId === userId);
      return participant?.user.fullName;
    })
    .filter(Boolean);

  // Get online participants
  const onlineParticipants = conversation.participants.filter((p: any) => 
    onlineUsers.has(p.userId)
  );

  const getConversationTitle = () => {
    if (conversation.type === 'GROUP') {
      return conversation.name || 'Group Chat';
    }
    const otherPerson = conversation.participants.find((p: any) => p.userId !== user?.id);
    return otherPerson?.user.fullName || 'Unknown User';
  };

  const getConversationSubtitle = () => {
    if (conversation.type === 'GROUP') {
      return `${conversation.participants.length} participants`;
    }
    const otherPerson = conversation.participants.find((p: any) => p.userId !== user?.id);
    const isOnline = otherPerson && onlineUsers.has(otherPerson.userId);
    return isOnline ? 'Online' : 'Offline';
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border bg-card flex items-center gap-3">
        {onBack && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="md:hidden"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
        )}

        <div className="flex-1 min-w-0">
          <h2 className="font-semibold truncate">{getConversationTitle()}</h2>
          <p className="text-sm text-muted-foreground truncate">
            {getConversationSubtitle()}
          </p>
        </div>

        <Button variant="ghost" size="sm">
          <MoreVertical className="w-4 h-4" />
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/10">
        {isLoading ? (
          <div className="text-center text-muted-foreground">
            Loading messages...
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            No messages yet. Start the conversation!
          </div>
        ) : (
          messages.map((message, index) => {
            const isOwn = message.senderId === user?.id;
            
            // DEBUG LOG
            console.log('[ChatWindow] Message:', {
              content: message.content.substring(0, 20),
              senderId: message.senderId,
              userId: user?.id,
              isOwn,
              comparison: `${message.senderId} === ${user?.id}`
            });

            return (
              <MessageBubble
                key={message.id}
                message={message}
                isOwn={isOwn}
                showSender={
                  index === 0 ||
                  messages[index - 1].senderId !== message.senderId
                }
              />
            );
          })
        )}

        {typingInConvo.length > 0 && (
          <div className="text-sm text-muted-foreground italic">
            {typingInConvo.join(', ')} {typingInConvo.length === 1 ? 'is' : 'are'} typing...
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border bg-card p-4">
        <MessageInput conversationId={conversation.id} />
      </div>
    </div>
  );
}
