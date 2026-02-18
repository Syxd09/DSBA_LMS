import { apiClient } from '@/lib/client';

export interface SystemSetting {
    key: string;
    value: string;
    category: string;
    updated_at: string;
}

export const configApi = {
    listSystemSettings: () =>
        apiClient.get<SystemSetting[]>('/config/system').then(r => r.data),

    getSystemSetting: (key: string) =>
        apiClient.get<SystemSetting>(`/config/system/${key}`).then(r => r.data),

    updateSystemSetting: (key: string, value: string) =>
        apiClient.patch<SystemSetting>(`/config/system/${key}`, { value }).then(r => r.data),
};
