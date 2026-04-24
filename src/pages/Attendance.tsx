import React, { useState, useEffect } from 'react';
import { useAcademicContext } from '../contexts/AcademicContext';
import { useAuth } from '../hooks/useAuth';
import { useTeacherAssignments } from '../hooks/useTeacherAssignments';
import { 
    Calendar, 
    CheckCircle2, 
    XCircle, 
    Clock, 
    AlertCircle, 
    Save, 
    Users,
    ChevronLeft,
    ChevronRight,
    Search
} from 'lucide-react';
import api from '../lib/api';
import { format } from 'date-fns';

interface Student {
    studentId: string;
    studentName: string;
    registrationNumber: string;
}

interface AttendanceRecord {
    studentId: string;
    status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';
    remarks?: string;
}

const Attendance: React.FC = () => {
    const { 
        departmentId, 
        cohortId, 
        semester, 
        setAcademicContext,
    } = useAcademicContext();
    const { user } = useAuth();

    const { assignments, isLoading: assignmentsLoading } = useTeacherAssignments();
    const [subjectId, setSubjectId] = useState<string>('');
    const subjects = assignments.map((a: any) => ({
        id: a.subjectId,
        name: a.subject?.name,
        code: a.subject?.code
    }));

    const [date, setDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
    const [students, setStudents] = useState<Student[]>([]);
    const [attendance, setAttendance] = useState<Record<string, 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED'>>({});
    const [remarks, setRemarks] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Fetch students when cohort changes
    useEffect(() => {
        const fetchStudents = async () => {
            if (!cohortId) return;
            setLoading(true);
            try {
                // Reuse existing endpoint or create new one if needed
                const response = await api.get(`/enrollments/students?cohortId=${cohortId}`);
                const studentsData = response.data.map((e: any) => ({
                    studentId: e.student.id,
                    studentName: e.student.fullName,
                    registrationNumber: e.student.registrationNumber
                }));
                setStudents(studentsData);
                
                // Initialize attendance as PRESENT by default
                const initial: Record<string, any> = {};
                studentsData.forEach((s: any) => {
                    initial[s.studentId] = 'PRESENT';
                });
                setAttendance(initial);
            } catch (error) {
                console.error('Error fetching students:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchStudents();
    }, [cohortId]);

    const handleStatusChange = (studentId: string, status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED') => {
        setAttendance(prev => ({ ...prev, [studentId]: status }));
    };

    const handleSave = async () => {
        if (!subjectId) {
            setMessage({ type: 'error', text: 'Please select a subject first' });
            return;
        }

        setSaving(true);
        setMessage(null);
        try {
            const attendanceData = Object.entries(attendance).map(([studentId, status]) => ({
                studentId,
                status,
                remarks: remarks[studentId] || ''
            }));

            await api.post('/attendance', {
                subjectId,
                date,
                attendanceData
            });

            setMessage({ type: 'success', text: 'Attendance recorded successfully!' });
        } catch (error) {
            console.error('Error saving attendance:', error);
            setMessage({ type: 'error', text: 'Failed to save attendance' });
        } finally {
            setSaving(false);
        }
    };

    const markAll = (status: 'PRESENT' | 'ABSENT') => {
        const updated = { ...attendance };
        students.forEach(s => {
            updated[s.studentId] = status;
        });
        setAttendance(updated);
    };

    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                        <Users className="w-8 h-8 text-primary" />
                        Daily Attendance
                    </h1>
                    <p className="text-slate-500 mt-1">Record and manage student attendance for your classes</p>
                </div>

                <div className="flex items-center gap-3 bg-white p-2 rounded-xl shadow-sm border border-slate-200">
                    <Calendar className="w-5 h-5 text-slate-400 ml-2" />
                    <input 
                        type="date" 
                        value={date}
                        max={format(new Date(), 'yyyy-MM-dd')}
                        onChange={(e) => setDate(e.target.value)}
                        className="border-none focus:ring-0 text-slate-600 font-medium"
                    />
                </div>
            </div>

            {/* Filters / Context */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Subject</label>
                    <select 
                        className="w-full rounded-xl border-slate-200 focus:border-primary focus:ring-primary shadow-sm"
                        value={subjectId}
                        onChange={(e) => setSubjectId(e.target.value)}
                    >
                        <option value="">Select Subject</option>
                        {subjects.map(s => (
                            <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                        ))}
                    </select>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Attendance Summary</label>
                    <div className="flex gap-4">
                        <div className="text-center p-2 bg-emerald-50 rounded-lg flex-1">
                            <span className="block text-emerald-600 font-bold text-lg">
                                {Object.values(attendance).filter(v => v === 'PRESENT').length}
                            </span>
                            <span className="text-emerald-500 text-xs uppercase tracking-wider font-semibold">Present</span>
                        </div>
                        <div className="text-center p-2 bg-rose-50 rounded-lg flex-1">
                            <span className="block text-rose-600 font-bold text-lg">
                                {Object.values(attendance).filter(v => v === 'ABSENT').length}
                            </span>
                            <span className="text-rose-500 text-xs uppercase tracking-wider font-semibold">Absent</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-end pb-1">
                    <button 
                        onClick={handleSave}
                        disabled={saving || !subjectId || students.length === 0}
                        className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-4 px-6 rounded-2xl shadow-lg shadow-primary/20 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {saving ? (
                            <Clock className="w-5 h-5 animate-spin" />
                        ) : (
                            <Save className="w-5 h-5" />
                        )}
                        {saving ? 'Saving...' : 'Save Records'}
                    </button>
                </div>
            </div>

            {message && (
                <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'}`}>
                    {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                    <span className="font-medium">{message.text}</span>
                </div>
            )}

            {/* Student List */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <h2 className="font-bold text-slate-800 flex items-center gap-2">
                        Student List
                        <span className="bg-primary/10 text-primary px-2.5 py-0.5 rounded-full text-xs">{students.length}</span>
                    </h2>
                    <div className="flex gap-2">
                        <button 
                            onClick={() => markAll('PRESENT')}
                            className="text-xs font-bold px-3 py-1.5 rounded-lg border border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors"
                        >
                            Mark All Present
                        </button>
                        <button 
                            onClick={() => markAll('ABSENT')}
                            className="text-xs font-bold px-3 py-1.5 rounded-lg border border-rose-200 text-rose-700 bg-rose-50 hover:bg-rose-100 transition-colors"
                        >
                            Mark All Absent
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-100">
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Reg No</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Student Name</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Status</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Remarks</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-3"></div>
                                        <p className="text-slate-400">Loading student list...</p>
                                    </td>
                                </tr>
                            ) : students.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-slate-400 italic">
                                        No students found for this cohort.
                                    </td>
                                </tr>
                            ) : students.map((student) => (
                                <tr key={student.studentId} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-6 py-4 font-mono text-sm text-slate-500">{student.registrationNumber}</td>
                                    <td className="px-6 py-4">
                                        <span className="font-semibold text-slate-700">{student.studentName}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center justify-center gap-1.5 p-1 bg-slate-100 rounded-xl w-fit mx-auto scale-90">
                                            <button 
                                                onClick={() => handleStatusChange(student.studentId, 'PRESENT')}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${attendance[student.studentId] === 'PRESENT' ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                            >
                                                P
                                            </button>
                                            <button 
                                                onClick={() => handleStatusChange(student.studentId, 'ABSENT')}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${attendance[student.studentId] === 'ABSENT' ? 'bg-rose-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                            >
                                                A
                                            </button>
                                            <button 
                                                onClick={() => handleStatusChange(student.studentId, 'LATE')}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${attendance[student.studentId] === 'LATE' ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                            >
                                                L
                                            </button>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <input 
                                            type="text" 
                                            placeholder="Optional note"
                                            className="w-full text-sm border-none bg-slate-50 rounded-lg px-3 py-1.5 focus:ring-1 focus:ring-primary/20 placeholder:text-slate-300"
                                            value={remarks[student.studentId] || ''}
                                            onChange={(e) => setRemarks(prev => ({ ...prev, [student.studentId]: e.target.value }))}
                                        />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Attendance;
