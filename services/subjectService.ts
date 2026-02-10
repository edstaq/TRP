
export interface SubjectAPIData {
    "Subject ID": string;
    "Category": string;
    "Board": string;
    "Level": string;
    "Subject Name": string;
    "Structure"?: string;
    "Department"?: string;
    "Status"?: string;
    "Label"?: string;
    "Subject Description"?: string;
    "Stage"?: string;
    "Tags"?: string;
    "Subject Code"?: string;
}

interface ApiResponse<T> {
    success: boolean;
    message: string;
    data: T | null;
}

import { APP_CONFIG } from '../config';

const SUBJECT_API_URL = APP_CONFIG.API_ENDPOINTS.SUBJECT;

export const subjectService = {
    async getAllSubjects(): Promise<SubjectAPIData[]> {
        try {
            const response = await fetch(SUBJECT_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({ action: 'readAllSubjects' })
            });
            const result: ApiResponse<SubjectAPIData[]> = await response.json();
            return result.success && Array.isArray(result.data) ? result.data : [];
        } catch (error) {
            console.error('Error fetching all subjects:', error);
            return [];
        }
    },

    async getSubjectsByIds(ids: string[]): Promise<SubjectAPIData[]> {
        if (!ids.length) return [];
        try {
            const response = await fetch(SUBJECT_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({ action: 'readSubjectsByIds', subjectIds: ids })
            });
            const result: ApiResponse<SubjectAPIData[]> = await response.json();
            return result.success && Array.isArray(result.data) ? result.data : [];
        } catch (error) {
            console.error('Error fetching subjects by IDs:', error);
            return [];
        }
    }
};
