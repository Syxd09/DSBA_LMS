/**
 * MESSAGES PAGE - WhatsApp-like Interface
 * 
 * Professional messaging UI with:
 * - Conversation list sidebar
 * - Active chat window
 * - Real-time updates
 * - Mobile responsive
 */

import { useState, useEffect } from 'react';
import { useMessaging } from '@/contexts/MessagingContext';
import { ConversationList } from '@/components/messaging/ConversationList';
import { ChatWindow } from '@/components/messaging/ChatWindow';
import { GroupCreationModal } from '@/components/messaging/GroupCreationModal';
import { Button } from '@/components/ui/button';
import { Plus, MessageSquare } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';

export default function Messages() {
  const { user } = useAuth();
  const { conversations, activeConversation, setActiveConversation, refreshConversations } = useMessaging();
  const [isCreating, setIsCreating] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);

  // Check if user can create groups
  const canCreateGroup = user && ['PRINCIPAL', 'ADMIN', 'HOD'].includes(user.role.toUpperCase());

  // Responsive handling
  useEffect(() => {
    const handleResize = () => {
      setIsMobileView(window.innerWidth < 768);
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <AuthenticatedLayout>
      <div className="container mx-auto py-4 h-[calc(100vh-8rem)]">
        <div className="flex h-full bg-card border border-border rounded-xl overflow-hidden shadow-lg">
          {/* Conversation List Sidebar */}
          <div className={`
            ${isMobileView && activeConversation ? 'hidden' : 'flex flex-col'}
            w-full md:w-80 lg:w-96 border-r border-border bg-card
          `}>
            {/* Header */}
            <div className="p-4 border-b border-border bg-muted/20">
              <div className="flex items-center justify-between">
                <h1 className="text-xl font-bold flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-primary" />
                  Messages
                </h1>
                {canCreateGroup && (
                  <Button
                    onClick={() => setIsCreating(true)}
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 rounded-full"
                  >
                    <Plus className="w-5 h-5" />
                  </Button>
                )}
              </div>
            </div>

            {/* Conversations */}
            <div className="flex-1 overflow-hidden">
              <ConversationList
                conversations={conversations}
                activeConversation={activeConversation}
                onSelect={setActiveConversation}
              />
            </div>
          </div>

        {/* Chat Window */}
        <div className={`
          ${isMobileView && !activeConversation ? 'hidden' : 'flex-1 flex flex-col'}
          bg-muted/5
        `}>
          {activeConversation ? (
            <ChatWindow
              conversation={activeConversation}
              onBack={() => setActiveConversation(null)}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <MessageSquare className="w-8 h-8 opacity-20" />
                </div>
                <p className="text-lg font-medium">Select a chat to begin</p>
                <p className="text-sm">Communicate with your team in real-time</p>
              </div>
            </div>
          )}
        </div>

        {/* Group Creation Modal */}
        {isCreating && (
          <GroupCreationModal
            onClose={() => setIsCreating(false)}
            onCreated={(conversation) => {
              setIsCreating(false);
              setActiveConversation(conversation);
              refreshConversations();
            }}
          />
        )}
      </div>
    </div>
  </AuthenticatedLayout>
);
}
