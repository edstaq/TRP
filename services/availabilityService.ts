
import { APP_CONFIG } from '../config';

export interface TeacherAvailability {
    "Available ID": string;
    "Teacher ID": string;
    "Weekday": string;
    "Start Time": string;
    "End Time": string;
}

interface ApiResponse<T> {
    status: 'success' | 'error';
    data?: T;
    message?: string;
}

const API_URL = APP_CONFIG.API_ENDPOINTS.AVAILABILITY;

export const availabilityService = {
    async getAvailability(teacherId: string): Promise<TeacherAvailability[]> {
        try {
            const response = await fetch(`${API_URL}?action=read&teacher_id=${teacherId}`);
            const result: ApiResponse<TeacherAvailability[]> = await response.json();
            if (result.status === 'success' && result.data) {
                return result.data;
            }
            return [];
        } catch (error) {
            console.error('Error fetching availability:', error);
            return [];
        }
    },

    async addAvailability(data: {
        "Teacher ID": string;
        "Weekday": string;
        "Start Time": string;
        "End Time": string;
    }): Promise<{ success: boolean; available_id?: string }> {
        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'text/plain;charset=utf-8',
                },
                body: JSON.stringify({
                    action: 'add',
                    data: data
                })
            });
            const result: ApiResponse<{ message: string; available_id: string }> = await response.json();
            return {
                success: result.status === 'success',
                available_id: result.data?.available_id
            };
        } catch (error) {
            console.error('Error adding availability:', error);
            return { success: false };
        }
    },

    async updateAvailability(availableId: string, data: {
        "Start Time"?: string;
        "End Time"?: string;
        "Weekday"?: string;
    }): Promise<boolean> {
        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'text/plain;charset=utf-8',
                },
                body: JSON.stringify({
                    action: 'update',
                    available_id: availableId,
                    data: data
                })
            });
            const result: ApiResponse<{ message: string }> = await response.json();
            return result.status === 'success';
        } catch (error) {
            console.error('Error updating availability:', error);
            return false;
        }
    },

    async deleteAvailability(availableId: string): Promise<boolean> {
        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'text/plain;charset=utf-8',
                },
                body: JSON.stringify({
                    action: 'delete',
                    available_id: availableId
                })
            });
            const result: ApiResponse<{ message: string }> = await response.json();
            return result.status === 'success';
        } catch (error) {
            console.error('Error deleting availability:', error);
            return false;
        }
    }
};
