
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Plus, Send, MoreVertical, Search, User, Users } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';

export default function Messages() {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
    const [messageInput, setMessageInput] = useState('');
    const [isNewGroupOpen, setIsNewGroupOpen] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    
    // New Group State
    const [newGroupName, setNewGroupName] = useState('');

    const { data: groups, isLoading: groupsLoading } = useQuery({
        queryKey: ['message-groups'],
        queryFn: async () => {
            const { data } = await api.get('/messaging/groups');
            return data;
        },
        refetchInterval: 5000 // Poll for new groups/messages summary
    });

    const { data: messages, isLoading: messagesLoading } = useQuery({
        queryKey: ['messages', selectedGroupId],
        queryFn: async () => {
            if (!selectedGroupId) return [];
            const { data } = await api.get(`/messaging/groups/${selectedGroupId}/messages`);
            return data;
        },
        enabled: !!selectedGroupId,
        refetchInterval: 3000 // Poll active chat
    });

    const sendMessageMutation = useMutation({
        mutationFn: async (content: string) => {
            if (!selectedGroupId) return;
            await api.post(`/messaging/groups/${selectedGroupId}/messages`, { content });
        },
        onSuccess: () => {
            setMessageInput('');
            queryClient.invalidateQueries({ queryKey: ['messages', selectedGroupId] });
        }
    });

    const createGroupMutation = useMutation({
        mutationFn: async () => {
             await api.post('/messaging/groups', {
                 name: newGroupName,
                 type: 'CUSTOM',
                 memberIds: [] // Simple group for now, or just self + logic later
             });
        },
        onSuccess: () => {
            setNewGroupName('');
            setIsNewGroupOpen(false);
            queryClient.invalidateQueries({ queryKey: ['message-groups'] });
            toast({ title: 'Group created' });
        }
    });

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = (e: React.FormEvent) => {
        e.preventDefault();
        if (!messageInput.trim()) return;
        sendMessageMutation.mutate(messageInput);
    };

    return (
        <AuthenticatedLayout allowedRoles={['teacher', 'hod', 'principal', 'student']}>
            <div className="h-[calc(100vh-8rem)] flex gap-4">
                {/* Sidebar */}
                <Card className="w-1/3 flex flex-col">
                    <div className="p-4 border-b flex justify-between items-center bg-muted/30">
                        <h2 className="font-semibold text-lg">Messages</h2>
                         <Dialog open={isNewGroupOpen} onOpenChange={setIsNewGroupOpen}>
                            <DialogTrigger asChild>
                                <Button size="icon" variant="ghost"><Plus className="w-5 h-5" /></Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader><DialogTitle>New Group</DialogTitle></DialogHeader>
                                <div className="space-y-4 py-4">
                                    <div className="space-y-2">
                                        <Label>Group Name</Label>
                                        <Input value={newGroupName} onChange={e => setNewGroupName(e.target.value)} placeholder="e.g. Project Discussion" />
                                    </div>
                                    <Button className="w-full" onClick={() => createGroupMutation.mutate()}>Create Group</Button>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </div>
                    <ScrollArea className="flex-1">
                        {groupsLoading ? <p className="p-4 text-muted-foreground">Loading...</p> : 
                            groups?.map((group: any) => (
                                <div 
                                    key={group.id} 
                                    onClick={() => setSelectedGroupId(group.id)}
                                    className={`p-4 border-b cursor-pointer hover:bg-muted/50 transition-colors ${selectedGroupId === group.id ? 'bg-muted' : ''}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <Avatar>
                                            <AvatarFallback><Users className="w-4 h-4" /></AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 overflow-hidden">
                                            <div className="flex justify-between items-center">
                                                <h3 className="font-medium truncate">{group.name}</h3>
                                                {group.messages?.[0] && (
                                                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                                                        {new Date(group.messages[0].createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm text-muted-foreground truncate">
                                                {group.messages?.[0] ? 
                                                    `${group.messages[0].senderId === user?.id ? 'You' : 'User'}: ${group.messages[0].content}` 
                                                    : 'No messages yet'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))
                        }
                         {groups?.length === 0 && <p className="p-4 text-center text-muted-foreground">No conversations</p>}
                    </ScrollArea>
                </Card>

                {/* Chat Area */}
                <Card className="flex-1 flex flex-col">
                    {selectedGroupId ? (
                        <>
                            <div className="p-4 border-b flex items-center justify-between bg-muted/30">
                                <div className="flex items-center gap-3">
                                    <Avatar>
                                        <AvatarFallback><Users className="w-4 h-4" /></AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <h3 className="font-medium">{groups?.find((g: any) => g.id === selectedGroupId)?.name}</h3>
                                        <p className="text-xs text-muted-foreground">
                                           {/* {groups?.find(g => g.id === selectedGroupId)?.type} */}
                                           Online
                                        </p>
                                    </div>
                                </div>
                                <Button variant="ghost" size="icon"><MoreVertical className="w-5 h-5" /></Button>
                            </div>

                            <ScrollArea className="flex-1 p-4" ref={scrollRef}>
                                <div className="space-y-4">
                                    {messages?.map((msg: any) => {
                                        const isMe = msg.senderId === user?.id; // user.id in hook might be 'sub' or 'id', adjust based on useAuth
                                        // useAuth returns { user: { id: ... } } usually.
                                        return (
                                            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                                <div className={`flex gap-2 max-w-[70%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                                                    {!isMe && (
                                                        <Avatar className="w-8 h-8 mt-1">
                                                            <AvatarFallback className="text-xs">
                                                                {msg.sender?.fullName?.substring(0,2).toUpperCase() || 'U'}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                    )}
                                                    <div className={`p-3 rounded-lg ${isMe ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                                                        {!isMe && <p className="text-xs font-semibold mb-1 opacity-70">{msg.sender?.fullName}</p>}
                                                        <p className="text-sm">{msg.content}</p>
                                                        <span className="text-[10px] opacity-70 block text-right mt-1">
                                                            {new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </ScrollArea>

                            <div className="p-4 border-t">
                                <form onSubmit={handleSend} className="flex gap-2">
                                    <Input 
                                        placeholder="Type a message..." 
                                        value={messageInput}
                                        onChange={e => setMessageInput(e.target.value)}
                                        className="flex-1"
                                    />
                                    <Button type="submit" size="icon" disabled={sendMessageMutation.isPending}>
                                        <Send className="w-5 h-5" />
                                    </Button>
                                </form>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center flex-col text-muted-foreground">
                            <MessageSquare className="w-16 h-16 mb-4 opacity-20" />
                            <p>Select a group to start messaging</p>
                        </div>
                    )}
                </Card>
            </div>
        </AuthenticatedLayout>
    );
}

// Helper icon
function MessageSquare({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
    );
}
