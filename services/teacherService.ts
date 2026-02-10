
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
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'text/plain;charset=utf-8', // Google Apps Script often needs text/plain to avoid CORS preflight issues or redirect issues
                },
                body: JSON.stringify({
                    action: 'readByContact',
                    contact: contact
                })
            });

            const result: ApiResponse<TeacherAPIData> = await response.json();

            if (result.success && result.data) {
                return result.data;
            }
            return null;
        } catch (error) {
            console.error('Error fetching teacher profile:', error);
            return null;
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
