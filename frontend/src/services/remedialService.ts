import { apiClient } from '@/lib/client';

export interface RemedialAction {
    id: string;
    student_id: string;
    offering_id: string;
    action_type: 'ASSIGNMENT' | 'EXTRA_CLASS' | 'COUNSELING' | 'RETEST' | 'OTHER';
    description: string;
    deadline: string;
    status: 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'VERIFIED';
    remarks?: string;
    proof_url?: string;
    impact_score?: number;
    created_at: string;
    updated_at: string;
    assigned_by?: any; // Profile
}

export interface RemedialBulkAssign {
    student_ids: string[];
    offering_id: string;
    action_type: string;
    description: string;
    deadline: string; // YYYY-MM-DD
    remarks?: string;
}

export const remedialApi = {
    // Bulk assign actions
    assignBulk: (data: RemedialBulkAssign) =>
        apiClient.post('/remedial/assign', data).then(r => r.data),

    // Get actions for a student
    getByStudent: (usn: string) =>
        apiClient.get(`/remedial/student/${usn}`).then(r => r.data),

    // Get actions for an offering (Faculty view)
    getByOffering: (offeringId: string) =>
        apiClient.get(`/remedial/offering/${offeringId}`).then(r => r.data),

    // Update action status/details
    update: (id: string, data: Partial<RemedialAction>) =>
        apiClient.patch(`/remedial/${id}`, data).then(r => r.data),
};
