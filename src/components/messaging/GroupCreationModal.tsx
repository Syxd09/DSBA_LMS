/**
 * NEW CHAT / GROUP MODAL
 * 
 * Modal for starting new direct or group chats.
 * Mimics WhatsApp/Telegram contact selection.
 */

import { useState, useEffect, useMemo } from 'react';
import { useMessaging } from '@/contexts/MessagingContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { X, Users, Search, User as UserIcon, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import api from '@/lib/api';

interface User {
  id: string;
  fullName: string;
  email: string;
  role: string;
  registrationNumber?: string;
  avatarUrl?: string;
  studentEnrollments?: Array<{
    semester: number;
    cohort: { name: string };
  }>;
}

interface Props {
  onClose: () => void;
  onCreated: (conversation: any) => void;
}

export function GroupCreationModal({ onClose, onCreated }: Props) {
  const { createConversation } = useMessaging();
  const [mode, setMode] = useState<'CHAT' | 'GROUP'>('CHAT');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [semesterFilter, setSemesterFilter] = useState<number | 'ALL'>('ALL');
  const [roleFilter, setRoleFilter] = useState<string | 'ALL'>('ALL');
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load contacts
  useEffect(() => {
    const loadContacts = async () => {
      try {
        setIsLoading(true);
        const { data } = await api.get('/messaging/contacts');
        setUsers(data);
      } catch (error) {
        console.error('Error loading contacts:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadContacts();
  }, []);

  const filteredUsers = useMemo(() => {
    const search = searchTerm.toLowerCase().trim();
    return users.filter(user => {
      const matchesSearch = !search || 
        (user.fullName?.toLowerCase() || '').includes(search) ||
        (user.email?.toLowerCase() || '').includes(search) ||
        (user.registrationNumber?.toLowerCase() || '').includes(search) ||
        (user.role?.toLowerCase() || '').includes(search);
      
      const matchesRole = roleFilter === 'ALL' || user.role === roleFilter;
      
      if (semesterFilter === 'ALL') return matchesSearch && matchesRole;
      
      const userSemester = user.studentEnrollments?.[0]?.semester;
      return matchesSearch && matchesRole && userSemester === semesterFilter;
    });
  }, [users, searchTerm, roleFilter, semesterFilter]);

  const handleSelectAllFiltered = () => {
    const newSet = new Set(selectedUsers);
    filteredUsers.forEach(user => {
      if (user.role === 'STUDENT') {
        newSet.add(user.id);
      }
    });
    setSelectedUsers(newSet);
  };

  const toggleUser = (userId: string) => {
    if (mode === 'CHAT') {
      // In CHAT mode, selecting a user immediately starts the chat
      handleStartDirectChat(userId);
      return;
    }

    const newSet = new Set(selectedUsers);
    if (newSet.has(userId)) {
      newSet.delete(userId);
    } else {
      newSet.add(userId);
    }
    setSelectedUsers(newSet);
  };

  const handleStartDirectChat = async (userId: string) => {
    setIsCreating(true);
    try {
      const conversation = await createConversation({
        type: 'DIRECT',
        participantIds: [userId]
      });
      onCreated(conversation);
    } catch (error) {
      console.error('Error starting chat:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleCreateGroup = async () => {
    if (!name.trim() || selectedUsers.size === 0 || isCreating) return;

    setIsCreating(true);
    try {
      const conversation = await createConversation({
        type: 'GROUP',
        name: name.trim(),
        description: description.trim() || undefined,
        participantIds: Array.from(selectedUsers)
      });
      onCreated(conversation);
    } catch (error) {
      console.error('Error creating group:', error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between bg-muted/30">
          <div>
            <h2 className="text-lg font-bold">{mode === 'CHAT' ? 'New Message' : 'New Group'}</h2>
            <p className="text-xs text-muted-foreground">Select contacts to begin</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border">
          <button
            onClick={() => { setMode('CHAT'); setSelectedUsers(new Set()); }}
            className={cn(
              "flex-1 py-3 text-sm font-medium transition-colors border-b-2",
              mode === 'CHAT' ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            Direct Message
          </button>
          <button
            onClick={() => setMode('GROUP')}
            className={cn(
              "flex-1 py-3 text-sm font-medium transition-colors border-b-2",
              mode === 'GROUP' ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            Group Chat
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Role Filters */}
          <div className="flex bg-muted rounded-lg p-1 w-full overflow-x-auto">
            {['ALL', 'STUDENT', 'TEACHER', 'HOD'].map((role) => (
              <button
                key={role}
                onClick={() => {
                  setRoleFilter(role);
                  if (role !== 'STUDENT') setSemesterFilter('ALL');
                }}
                className={cn(
                  "flex-1 px-3 py-1.5 text-xs rounded-md font-medium transition-all capitalize",
                  roleFilter === role ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {role.toLowerCase()}s
              </button>
            ))}
          </div>

          {mode === 'GROUP' && (
            <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Group Name *"
                className="h-10"
              />
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description (Optional)"
                className="resize-none h-20"
              />
              <div className="text-xs font-semibold uppercase text-muted-foreground tracking-wider pt-2">
                Select Participants ({selectedUsers.size})
              </div>
            </div>
          )}

          {/* Semester Filter and Select All */}
          {mode === 'GROUP' && roleFilter === 'STUDENT' && (
            <div className="flex flex-wrap gap-2 items-center animate-in fade-in slide-in-from-top-1 duration-300">
              <div className="flex bg-muted rounded-lg p-1 overflow-x-auto">
                <button
                  onClick={() => setSemesterFilter('ALL')}
                  className={cn(
                    "px-3 py-1 text-xs rounded-md font-medium transition-all",
                    semesterFilter === 'ALL' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  All
                </button>
                {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => (
                  <button
                    key={sem}
                    onClick={() => setSemesterFilter(sem)}
                    className={cn(
                      "px-3 py-1 text-xs rounded-md font-medium transition-all whitespace-nowrap",
                      semesterFilter === sem ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Sem {sem}
                  </button>
                ))}
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="h-8 text-xs ml-auto"
                onClick={handleSelectAllFiltered}
              >
                Select All Students
              </Button>
            </div>
          )}

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search contacts..."
              className="pl-9 h-10 border-muted-foreground/20"
            />
          </div>

          {/* User List */}
          <div className="space-y-1">
            {isLoading ? (
              <div className="py-20 text-center text-muted-foreground">
                <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2" />
                <p>Loading contacts...</p>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="py-20 text-center text-muted-foreground">
                <Search className="w-12 h-12 mx-auto mb-2 opacity-10" />
                <p>No contacts found</p>
              </div>
            ) : (
              filteredUsers.map(user => (
                <div
                  key={user.id}
                  onClick={() => toggleUser(user.id)}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all",
                    selectedUsers.has(user.id) ? "bg-primary/10 border-primary/20" : "hover:bg-muted"
                  )}
                >
                  <div className="relative">
                    <div className="w-11 h-11 rounded-full bg-secondary flex items-center justify-center text-secondary-foreground font-semibold">
                      {user.avatarUrl ? (
                        <img src={user.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
                      ) : (
                        user.fullName?.charAt(0) || '?'
                      )}
                    </div>
                    {mode === 'GROUP' && selectedUsers.has(user.id) && (
                      <div className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground rounded-full p-0.5 border-2 border-card">
                        <X className="w-3 h-3 rotate-45" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold truncate">{user.fullName}</p>
                      <span className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase",
                        user.role === 'PRINCIPAL' && "bg-purple-100 text-purple-700",
                        user.role === 'ADMIN' && "bg-red-100 text-red-700",
                        user.role === 'HOD' && "bg-blue-100 text-blue-700",
                        user.role === 'TEACHER' && "bg-green-100 text-green-700"
                      )}>
                        {user.role}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {user.role === 'STUDENT' && user.studentEnrollments?.[0] ? (
                        <span className="text-primary font-medium">
                          Sem {user.studentEnrollments[0].semester} • {user.studentEnrollments[0].cohort.name}
                        </span>
                      ) : (
                        user.email
                      )}
                    </p>
                  </div>
                  {mode === 'CHAT' && <MessageCircle className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100" />}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer for Group Mode */}
        {mode === 'GROUP' && (
          <div className="p-4 border-t border-border bg-muted/30 flex items-center justify-between">
            <div className="text-xs text-muted-foreground italic">
              * Required fields
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={onClose} disabled={isCreating}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleCreateGroup}
                disabled={!name.trim() || selectedUsers.size === 0 || isCreating}
                className="gap-2"
              >
                {isCreating ? 'Creating...' : 'Create Group'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
