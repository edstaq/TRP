
import { APP_CONFIG } from '../config';
import { ApiStudent, ApiResponse } from '../types';

const API_URL = APP_CONFIG.API_ENDPOINTS.STUDENT;

export const studentService = {
    /**
     * Fetch student details by ID
     */
    async getStudentById(studentId: string): Promise<ApiStudent | null> {
        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'text/plain;charset=utf-8',
                },
                body: JSON.stringify({
                    action: 'getStudentById',
                    studentId: studentId
                })
            });

            const result: ApiResponse<ApiStudent> = await response.json();

            if (result.success && result.data) {
                return result.data;
            }
            return null;
        } catch (error) {
            console.error('Error fetching student details:', error);
            return null;
        }
    },

    /**
     * Batch fetch student names (optimistic approach as the API doesn't support bulk yet)
     * We'll use this to resolve names during session loading
     */
    async getStudentNames(studentIds: string[]): Promise<Record<string, string>> {
        const names: Record<string, string> = {};

        // Remove duplicates
        const uniqueIds = [...new Set(studentIds)];

        // Fetch each name (ideally the API would support bulk)
        // For performance, we run them in parallel
        await Promise.all(uniqueIds.map(async (id) => {
            const student = await this.getStudentById(id);
            if (student) {
                names[id] = student["Student Name"];
            } else {
                names[id] = `Student ${id}`;
            }
        }));

        return names;
    }
};
