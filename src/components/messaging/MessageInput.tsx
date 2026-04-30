/**
 * MESSAGE INPUT COMPONENT
 * 
 * Professional message input with:
 * - Text input
 * - File upload
 * - Typing indicators
 * - Send button
 */

import { useState, useRef, KeyboardEvent } from 'react';
import { useMessaging } from '@/contexts/MessagingContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Paperclip, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  conversationId: string;
  onSend?: () => void;
}

export function MessageInput({ conversationId, onSend }: Props) {
  const { sendMessage, sendFile, setTyping } = useMessaging();
  const [content, setContent] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSending, setIsSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Typing indicator debounce
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleTyping = () => {
    setTyping(conversationId, true);
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    typingTimeoutRef.current = setTimeout(() => {
      setTyping(conversationId, false);
    }, 2000);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleSend = async () => {
    if ((!content.trim() && !selectedFile) || isSending) return;

    setIsSending(true);

    try {
      if (selectedFile) {
        await sendFile(conversationId, selectedFile, content.trim() || undefined);
        setSelectedFile(null);
      } else {
        await sendMessage(conversationId, content.trim());
      }
      
      setContent('');
      setTyping(conversationId, false);
      onSend?.();
      
      // Focus back on textarea
      textareaRef.current?.focus();
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="space-y-2">
      {/* File preview */}
      {selectedFile && (
        <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{selectedFile.name}</p>
            <p className="text-xs text-muted-foreground">
              {(selectedFile.size / 1024).toFixed(1)} KB
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedFile(null)}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Input area */}
      <div className="flex items-end gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf,.docx,.csv"
          className="hidden"
          onChange={handleFileSelect}
        />

        <Button
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={isSending}
        >
          <Paperclip className="w-4 h-4" />
        </Button>

        <Textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => {
            setContent(e.target.value);
            handleTyping();
          }}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          className="min-h-[40px] max-h-[120px] resize-none"
          disabled={isSending}
        />

        <Button
          onClick={handleSend}
          disabled={(!content.trim() && !selectedFile) || isSending}
          size="sm"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Press Enter to send, Shift+Enter for new line
      </p>
    </div>
  );
}
