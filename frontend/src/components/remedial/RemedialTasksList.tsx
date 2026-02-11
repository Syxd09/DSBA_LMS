import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { remedialApi } from '@/services/remedialService';
import { CheckCircle, FileText } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';

export function RemedialTasksList({ usn }: { usn: string }) {
    const queryClient = useQueryClient();
    const { data: tasks = [] } = useQuery({
        queryKey: ['remedial-tasks', usn],
        queryFn: () => remedialApi.getByStudent(usn),
        enabled: !!usn
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string, data: any }) => remedialApi.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['remedial-tasks'] });
            toast({ title: 'Task updated' });
        }
    });
    
    // Simple inline proof update for implementation simplicity
    const handleComplete = (id: string, proofUrl: string) => {
        updateMutation.mutate({ 
            id, 
            data: { status: 'COMPLETED', proof_url: proofUrl } 
        });
    }

    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="w-5 h-5"/>
                    Remedial Actions
                </CardTitle>
            </CardHeader>
            <CardContent>
                {tasks.length === 0 ? (
                     <p className="text-muted-foreground text-sm text-center py-4">
                        No pending remedial actions. Great job!
                     </p>
                ) : (
                    <div className="space-y-4">
                        {tasks.map((task: any) => (
                            <div key={task.id} className="border rounded-lg p-3 space-y-2">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <Badge variant={task.status === 'COMPLETED' || task.status === 'VERIFIED' ? 'secondary' : 'default'}>
                                                {task.action_type}
                                            </Badge>
                                            <span className="text-xs font-medium text-muted-foreground uppercase">{task.status.replace('_', ' ')}</span>
                                        </div>
                                        <p className="text-sm font-medium">{task.description}</p>
                                        <p className="text-xs text-muted-foreground mt-1">Deadline: {task.deadline}</p>
                                    </div>
                                </div>
                                
                                {task.status === 'ASSIGNED' || task.status === 'IN_PROGRESS' ? (
                                    <div className="flex gap-2 items-center mt-2">
                                        <Input 
                                            placeholder="Proof URL (Drive/Doc link)" 
                                            className="h-8 text-xs bg-background"
                                            id={`proof-${task.id}`}
                                            defaultValue={task.proof_url || ''}
                                        />
                                        <Button 
                                            size="sm" 
                                            onClick={() => {
                                                const el = document.getElementById(`proof-${task.id}`) as HTMLInputElement;
                                                handleComplete(task.id, el.value);
                                            }}
                                            disabled={updateMutation.isPending}
                                        >
                                            Submit
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="pt-2 border-t mt-2">
                                         <div className="text-xs text-green-600 flex items-center gap-1">
                                            <CheckCircle className="w-3 h-3"/> Submitted
                                            {task.status === 'VERIFIED' && <span className="font-bold ml-1">• Verified by Faculty</span>}
                                        </div>
                                        {task.remarks && (
                                            <p className="text-xs text-muted-foreground mt-1">
                                                Feedback: {task.remarks}
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
