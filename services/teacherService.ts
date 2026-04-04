
export interface TeacherAPIData {
    "Teacher ID": string;
    "Name": string;
    "Contact": string;
    "Password"?: string;
    "Subjects ID(s)": string; // comma separated
    "Onboarded Date"?: string;
    "Documents Submitted"?: string;
    "Available ID(s)"?: string;
    "Address"?: string;
    "Teacher wage / session"?: string | number;
    "Rating"?: string | number;
    "Teach Lang"?: string;
    "Status"?: string;
    "Edit Access"?: boolean | string;
    "Mail"?: string;
}

interface ApiResponse<T> {
    success: boolean;
    message: string;
    data: T | null;
}

import { APP_CONFIG } from '../config';

const API_URL = APP_CONFIG.API_ENDPOINTS.TEACHER;

export const teacherService = {
    async getTeacherByContact(contact: string): Promise<TeacherAPIData | null> {
        try {
            const payload = {
                action: 'readByContact',
                contact: contact
            };
            const payloadStr = JSON.stringify(payload);

            const response = await fetch(`${API_URL}?data=${encodeURIComponent(payloadStr)}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'text/plain;charset=utf-8',
                },
                body: payloadStr,
                cache: 'no-store',
                redirect: 'follow'
            });

            if (!response.ok) {
                throw new Error(`HTTP Error ${response.status}: Failed to reach server.`);
            }

            const result: ApiResponse<TeacherAPIData> = await response.json();

            if (!result.success) {
                // Return null ONLY if it specifically says it couldn't find the contact
                if (result.message === "No record found") {
                    return null;
                }
                // Otherwise throw the error so it displays in the UI (like "Cannot read properties of undefined")
                throw new Error(`API Error: ${result.message}`);
            }

            if (result.success && result.data) {
                return result.data;
            }
            return null;
        } catch (error: any) {
            console.error('Error fetching teacher profile:', error);
            throw new Error(error.message || 'Network error occurred');
        }
    },

    async updateTeacher(contact: string, updateData: Partial<TeacherAPIData>): Promise<boolean> {
        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'text/plain;charset=utf-8',
                },
                body: JSON.stringify({
                    action: 'updateByContact',
                    contact: contact,
                    updateData: updateData
                })
            });

            const result: ApiResponse<null> = await response.json();
            return result.success;
        } catch (error) {
            console.error('Error updating teacher profile:', error);
            return false;
        }
    }
};
