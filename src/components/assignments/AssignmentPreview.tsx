
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Users, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Loader2 } from 'lucide-react';

interface PreviewProps {
    subjectId: string;
    cohortId: string;
    subjects: any[];
    academicYear: string;
}

export function AssignmentPreview({ subjectId, cohortId, subjects, academicYear }: PreviewProps) {
    const [preview, setPreview] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchPreview = async () => {
            const subject = subjects.find(s => s.id === subjectId);
            if (!subject || !cohortId) return;

            setLoading(true);
            setError('');
            try {
                // Get department from subject -> curriculum -> program
                // Assuming the subject object has this nested data as per the `useQuery` in parent
                const departmentId = subject.curriculum?.program?.departmentId;
                const semester = subject.semester || 1;

                if (!departmentId) {
                    setError('Could not determine Department context from Subject');
                    setLoading(false);
                    return;
                }

                const { data } = await api.get('/assignments/preview', {
                    params: { cohortId, departmentId, semester }
                });
                setPreview(data);
            } catch (err) {
                console.error(err);
                setError('Failed to load preview');
            } finally {
                setLoading(false);
            }
        };

        fetchPreview();
    }, [subjectId, cohortId, subjects]);

    if (loading) return <div className="text-xs text-muted-foreground flex items-center gap-2"><Loader2 className="w-3 h-3 animate-spin"/> Checking student availability...</div>;
    if (error) return <div className="text-xs text-destructive flex items-center gap-2"><AlertTriangle className="w-3 h-3"/> {error}</div>;
    if (!preview) return null;

    const isValid = preview.count > 0;

    return (
        <Card className={`border ${isValid ? 'border-green-200 bg-green-50/50' : 'border-red-200 bg-red-50/50'}`}>
            <CardContent className="p-3">
                <div className="flex items-start gap-3">
                    {isValid ? (
                        <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                    ) : (
                        <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                    )}
                    <div className="space-y-1">
                        <p className={`text-sm font-medium ${isValid ? 'text-green-900' : 'text-red-900'}`}>
                            {isValid ? 'Ready to Assign' : 'No Students Available'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            This assignment will grant access to <strong className={isValid ? 'text-green-700' : 'text-red-700'}>{preview.count} students</strong> in {preview.cohortName}, Semester {preview.semester}.
                        </p>
                        {!isValid && (
                            <p className="text-xs text-red-600 font-medium mt-1">
                                You cannot assign a teacher to an empty class. Enroll students first.
                            </p>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
