/**
 * MESSAGING CONTEXT
 * 
 * Professional state management for enterprise messaging
 * Handles WebSocket connection, conversations, and real-time updates
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';

interface Conversation {
  id: string;
  type: 'DIRECT' | 'GROUP';
  name?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  participants: Array<{
    id: string;
    userId: string;
    role: 'OWNER' | 'ADMIN' | 'MEMBER';
    user: {
      id: string;
      fullName: string;
      email: string;
      role: string;
      avatarUrl?: string;
    };
  }>;
  messages?: Message[];
  unreadCount?: number;
}

interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  messageType: 'TEXT' | 'IMAGE' | 'FILE';
  createdAt: string;
  sender: {
    id: string;
    fullName: string;
    role: string;
    avatarUrl?: string;
  };
  attachments?: Array<{
    id: string;
    fileName: string;
    fileSize: number;
    fileType: string;
    fileUrl: string;
  }>;
}

interface MessagingContextType {
  socket: Socket | null;
  conversations: Conversation[];
  activeConversation: Conversation | null;
  messages: Message[];
  onlineUsers: Set<string>;
  typingUsers: Map<string, Set<string>>;
  totalUnreadCount: number;
  
  // Actions
  setActiveConversation: (conversation: Conversation | null) => void;
  createConversation: (data: { 
    type: 'DIRECT' | 'GROUP'; 
    name?: string; 
    description?: string;
    participantIds: string[] 
  }) => Promise<Conversation>;
  sendMessage: (conversationId: string, content: string) => Promise<void>;
  sendFile: (conversationId: string, file: File, content?: string) => Promise<void>;
  markAsRead: (conversationId: string) => void;
  setTyping: (conversationId: string, isTyping: boolean) => void;
  refreshConversations: () => Promise<void>;
  loadMessages: (conversationId: string) => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
  clearChat: (id: string) => Promise<void>;
}

const MessagingContext = createContext<MessagingContextType | undefined>(undefined);

export function MessagingProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [typingUsers, setTypingUsers] = useState<Map<string, Set<string>>>(new Map());

  // Initialize WebSocket connection
  useEffect(() => {
    if (!user) return;

    const token = localStorage.getItem('token');
    if (!token) return;

    const newSocket = io(import.meta.env.VITE_API_URL || 'http://localhost:3000', {
      auth: { token },
      path: '/socket.io'
    });

    newSocket.on('connect', () => {
      console.log('[Messaging] WebSocket connected');
    });

    newSocket.on('disconnect', () => {
      console.log('[Messaging] WebSocket disconnected');
    });

    // Real-time message received
    newSocket.on('message-received', (message: Message) => {
      console.log('[Messaging] WebSocket message:', {
        senderId: message.senderId,
        senderName: message.sender?.fullName,
        senderRole: message.sender?.role,
        content: message.content?.substring(0, 30)
      });

      if (activeConversation?.id === message.conversationId) {
        // Use WebSocket message directly - backend includes complete sender data
        setMessages(prev => [...prev, message]);
      }
      
      // Update conversation list and unread count
      setConversations(prev => 
        prev.map(conv => {
          if (conv.id === message.conversationId) {
            const isInactive = activeConversation?.id !== message.conversationId;
            return { 
              ...conv, 
              updatedAt: new Date().toISOString(),
              unreadCount: isInactive ? (conv.unreadCount || 0) + 1 : 0
            };
          }
          return conv;
        }).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      );
    });

    // Typing indicator
    newSocket.on('user-typing', (data: { userId: string; conversationId: string; isTyping: boolean }) => {
      setTypingUsers(prev => {
        const newMap = new Map(prev);
        const convTyping = newMap.get(data.conversationId) || new Set();
        
        if (data.isTyping) {
          convTyping.add(data.userId);
        } else {
          convTyping.delete(data.userId);
        }
        
        newMap.set(data.conversationId, convTyping);
        return newMap;
      });
    });

    // User status changed
    newSocket.on('user-status-changed', (data: { userId: string; isOnline: boolean }) => {
      setOnlineUsers(prev => {
        const newSet = new Set(prev);
        if (data.isOnline) {
          newSet.add(data.userId);
        } else {
          newSet.delete(data.userId);
        }
        return newSet;
      });
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [user, activeConversation?.id]);

  // Load conversations on mount
  useEffect(() => {
    if (user) {
      refreshConversations();
    }
  }, [user]);

  // Join active conversation room
  useEffect(() => {
    if (socket && activeConversation) {
      socket.emit('join-conversation', { conversationId: activeConversation.id });
      markAsRead(activeConversation.id);
      
      return () => {
        socket.emit('leave-conversation', { conversationId: activeConversation.id });
      };
    }
  }, [socket, activeConversation]);

  const refreshConversations = useCallback(async () => {
    try {
      const { data } = await api.get('/messaging/conversations');
      setConversations(data);
    } catch (error) {
      console.error('[Messaging] Error loading conversations:', error);
    }
  }, []);

  const loadMessages = useCallback(async (conversationId: string) => {
    try {
      const { data } = await api.get(`/messaging/conversations/${conversationId}`);
      setMessages(data.messages || []);
      setActiveConversation(data);
    } catch (error) {
      console.error('[Messaging] Error loading messages:', error);
    }
  }, []);

  const createConversation = useCallback(async (data: { 
    type: string; 
    name?: string; 
    description?: string;
    participantIds: string[] 
  }): Promise<Conversation> => {
    const response = await api.post('/messaging/conversations', data);
    await refreshConversations();
    return response.data;
  }, [refreshConversations]);

  const deleteConversation = useCallback(async (id: string) => {
    await api.delete(`/messaging/conversations/${id}`);
    if (activeConversation?.id === id) {
      setActiveConversation(null);
    }
    await refreshConversations();
  }, [activeConversation?.id, refreshConversations]);

  const clearChat = useCallback(async (id: string) => {
    await api.delete(`/messaging/conversations/${id}/messages`);
    if (activeConversation?.id === id) {
      setMessages([]);
    }
  }, [activeConversation?.id]);

  const sendMessage = useCallback(async (conversationId: string, content: string) => {
    if (!socket) return;

    socket.emit('send-message', {
      conversationId,
      content,
      messageType: 'TEXT'
    });
  }, [socket]);

  const sendFile = useCallback(async (conversationId: string, file: File, content?: string) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (content) formData.append('content', content);

      const { data } = await api.post(`/messaging/conversations/${conversationId}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      // Message will be broadcast via WebSocket
      setMessages(prev => [...prev, data]);
    } catch (error) {
      console.error('[Messaging] Error uploading file:', error);
      throw error;
    }
  }, []);

  const markAsRead = useCallback((conversationId: string) => {
    if (!socket) return;
    socket.emit('mark-read', { conversationId });
  }, [socket]);

  const setTyping = useCallback((conversationId: string, isTyping: boolean) => {
    if (!socket) return;
    socket.emit('typing', { conversationId, isTyping });
  }, [socket]);

  const totalUnreadCount = conversations.reduce((sum, conv) => sum + (conv.unreadCount || 0), 0);

  const value: MessagingContextType = {
    socket,
    conversations,
    activeConversation,
    messages,
    onlineUsers,
    typingUsers,
    totalUnreadCount,
    setActiveConversation,
    createConversation,
    sendMessage,
    sendFile,
    markAsRead,
    setTyping,
    refreshConversations,
    loadMessages,
    deleteConversation,
    clearChat
  };

  return (
    <MessagingContext.Provider value={value}>
      {children}
    </MessagingContext.Provider>
  );
}

export function useMessaging() {
  const context = useContext(MessagingContext);
  if (!context) {
    throw new Error('useMessaging must be used within MessagingProvider');
  }
  return context;
}
