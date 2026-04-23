/**
 * MESSAGE BUBBLE COMPONENT - BULLETPROOF VERSION
 * 
 * RULES (CANNOT BE VIOLATED):
 * - isOwn = true  → Message on RIGHT (you sent it)
 * - isOwn = false → Message on LEFT (someone else sent it)
 */

import { formatDistanceToNow } from 'date-fns';
import { File, Image as ImageIcon, Download } from 'lucide-react';

interface Message {
  id: string;
  content: string;
  messageType: 'TEXT' | 'IMAGE' | 'FILE';
  createdAt: string;
  senderId: string;
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

  // SIMPLE APPROACH: Two completely different renders
  if (isOwn) {
    // YOUR MESSAGE - RIGHT SIDE
    return (
      <div className="flex justify-end mb-3 w-full">
        <div className="flex flex-col items-end max-w-[70%] md:max-w-[55%]">
          {/* Message Bubble - RIGHT */}
          <div className="rounded-2xl px-4 py-2.5 shadow-sm bg-primary text-primary-foreground rounded-br-none">
            {/* Attachments */}
            {message.attachments && message.attachments.length > 0 && (
              <div className="space-y-1.5 mb-2">
                {message.attachments.map((attachment) => (
                  <a
                    key={attachment.id}
                    href={`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${attachment.fileUrl}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-2 rounded text-sm bg-white/20 hover:bg-white/30"
                  >
                    {attachment.fileType.startsWith('image/') ? (
                      <ImageIcon className="w-4 h-4 flex-shrink-0" />
                    ) : (
                      <File className="w-4 h-4 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{attachment.fileName}</p>
                      <p className="text-[10px] opacity-70">{formatFileSize(attachment.fileSize)}</p>
                    </div>
                    <Download className="w-3.5 h-3.5 flex-shrink-0" />
                  </a>
                ))}
              </div>
            )}

            {/* Content */}
            {message.content && (
              <p className="text-[15px] leading-relaxed whitespace-pre-wrap break-words">
                {message.content}
              </p>
            )}

            {/* Timestamp */}
            <div className="text-[11px] mt-1 opacity-70 text-primary-foreground">
              {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
            </div>
          </div>
        </div>
      </div>
    );
  } else {
    // THEIR MESSAGE - LEFT SIDE
    return (
      <div className="flex justify-start mb-4 w-full pr-8">
        <div className="flex items-end gap-2 max-w-[85%] md:max-w-[70%]">
          {/* Avatar */}
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-xs font-semibold mb-1 border border-primary/20">
            {message.sender.fullName.charAt(0).toUpperCase()}
          </div>

          {/* Message Container */}
          <div className="flex flex-col items-start">
            {/* Sender Header */}
            {showSender && (
              <div className="flex items-center gap-2 mb-1 px-1">
                <span className="text-[13px] font-semibold text-foreground/80">
                  {message.sender.fullName}
                </span>
                <span
                  className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold text-white uppercase ${getRoleBadgeColor(message.sender.role)}`}
                >
                  {message.sender.role}
                </span>
              </div>
            )}

            {/* Message Bubble - LEFT */}
            <div className="rounded-2xl px-4 py-2.5 shadow-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-bl-none">
              {/* Attachments */}
              {message.attachments && message.attachments.length > 0 && (
                <div className="space-y-1.5 mb-2">
                  {message.attachments.map((attachment) => (
                    <a
                      key={attachment.id}
                      href={`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${attachment.fileUrl}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-2 rounded text-sm bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-850 transition-colors"
                    >
                      {attachment.fileType.startsWith('image/') ? (
                        <ImageIcon className="w-4 h-4 flex-shrink-0 text-primary" />
                      ) : (
                        <File className="w-4 h-4 flex-shrink-0 text-blue-500" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{attachment.fileName}</p>
                        <p className="text-[10px] text-slate-500">{formatFileSize(attachment.fileSize)}</p>
                      </div>
                      <Download className="w-3.5 h-3.5 flex-shrink-0 text-slate-400" />
                    </a>
                  ))}
                </div>
              )}

              {/* Content */}
              {message.content && (
                <p className="text-[14px] md:text-[15px] leading-relaxed whitespace-pre-wrap break-words">
                  {message.content}
                </p>
              )}

              {/* Timestamp */}
              <div className="text-[10px] mt-1.5 opacity-60 text-slate-500 flex justify-start">
                {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
