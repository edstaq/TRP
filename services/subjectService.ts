
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
import { SUBJECT_CATALOG } from '../data/subjects';

const SUBJECT_API_URL = APP_CONFIG.API_ENDPOINTS.SUBJECT;

let cachedSubjectsMap: Map<string, SubjectAPIData> | null = null;
let subjectsFetchPromise: Promise<Map<string, SubjectAPIData>> | null = null;

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
    },

    /**
     * Get subject map keyed by Subject ID (cached in memory)
     */
    async getSubjectsMap(): Promise<Map<string, SubjectAPIData>> {
        if (cachedSubjectsMap) return cachedSubjectsMap;
        if (!subjectsFetchPromise) {
            subjectsFetchPromise = (async () => {
                const list = await this.getAllSubjects();
                const map = new Map<string, SubjectAPIData>();
                list.forEach(s => {
                    const id = (s["Subject ID"] || (s as any).id || '').trim();
                    if (id) map.set(id, s);
                });
                cachedSubjectsMap = map;
                return map;
            })();
        }
        return subjectsFetchPromise;
    },

    /**
     * Look up Subject Name from the subject database based on Subject ID
     */
    async getSubjectNameById(subjectId: string): Promise<string> {
        if (!subjectId) return '';
        const idTrimmed = subjectId.trim();

        // 1. Check memory cache or fetch from database API
        try {
            const map = await this.getSubjectsMap();
            const found = map.get(idTrimmed);
            if (found && found["Subject Name"]) {
                return String(found["Subject Name"]).trim();
            }
        } catch (e) {
            console.warn('Error fetching subject from subject database:', e);
        }

        // 2. Fallback to local catalog
        const local = SUBJECT_CATALOG.find(s => s.id === idTrimmed);
        if (local && local.name) {
            return local.name.trim();
        }

        return '';
    }
};
