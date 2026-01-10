/**
 * MESSAGE BUBBLE COMPONENT
 * 
 * Individual message display with:
 * - Sender info
 * - Timestamp
 * - File attachments
 * - Role badges
 */

import { formatDistanceToNow } from 'date-fns';
import { File, Image as ImageIcon, Download } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  content: string;
  messageType: 'TEXT' | 'IMAGE' | 'FILE';
  createdAt: string;
  sender: {
    id: string;
    fullName: string;
    role: string;
  };
  attachments?: Array<{
    id: string;
    fileName: string;
    fileSize: number;
    fileType: string;
    fileUrl: string;
  }>;
}

interface Props {
  message: Message;
  isOwn: boolean;
  showSender: boolean;
}

export function MessageBubble({ message, isOwn, showSender }: Props) {
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role.toUpperCase()) {
      case 'PRINCIPAL': return 'bg-purple-500';
      case 'ADMIN': return 'bg-red-500';
      case 'HOD': return 'bg-blue-500';
      case 'TEACHER': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className={cn('flex gap-3', isOwn && 'flex-row-reverse')}>
      {/* Avatar */}
      {!isOwn && showSender && (
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-sm">
          {message.sender.fullName.charAt(0)}
        </div>
      )}
      {!isOwn && !showSender && <div className="w-8" />}

      {/* Message */}
      <div className={cn('max-w-[70%] space-y-1', isOwn && 'items-end')}>
        {/* Sender name & role */}
        {!isOwn && showSender && (
          <div className="flex items-center gap-2 px-3">
            <span className="text-sm font-medium">{message.sender.fullName}</span>
            <span className={cn(
              'text-xs px-2 py-0.5 rounded-full text-white',
              getRoleBadgeColor(message.sender.role)
            )}>
              {message.sender.role}
            </span>
          </div>
        )}

        {/* Content bubble */}
        <div className={cn(
          'rounded-lg px-4 py-2',
          isOwn 
            ? 'bg-primary text-primary-foreground' 
            : 'bg-card border border-border'
        )}>
          {/* Attachments */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="space-y-2 mb-2">
              {message.attachments.map(attachment => (
                <a
                  key={attachment.id}
                  href={`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${attachment.fileUrl}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    'flex items-center gap-3 p-3 rounded border',
                    isOwn 
                      ? 'bg-primary-foreground/10 border-primary-foreground/20' 
                      : 'bg-muted border-border'
                  )}
                >
                  {attachment.fileType.startsWith('image/') ? (
                    <ImageIcon className="w-5 h-5" />
                  ) : (
                    <File className="w-5 h-5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{attachment.fileName}</p>
                    <p className="text-xs opacity-70">{formatFileSize(attachment.fileSize)}</p>
                  </div>
                  <Download className="w-4 h-4" />
                </a>
              ))}
            </div>
          )}

          {/* Text content */}
          <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
        </div>

        {/* Timestamp */}
        <div className={cn(
          'text-xs text-muted-foreground px-3',
          isOwn && 'text-right'
        )}>
          {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
        </div>
      </div>
    </div>
  );
}
