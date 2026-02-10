
import { APP_CONFIG } from '../config';
import { ApiStudentLog, StudentLogRequest, ApiResponse } from '../types';

const API_URL = APP_CONFIG.API_ENDPOINTS.STUDENT_LOG;

export const studentLogService = {
    /**
     * Fetch all student logs for a given Session ID
     */
    async fetchBySessionId(sessionId: string): Promise<ApiStudentLog[]> {
        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'text/plain;charset=utf-8',
                },
                body: JSON.stringify({
                    action: 'readBySessionId',
                    sessionId: sessionId
                })
            });

            const result: ApiResponse<ApiStudentLog[]> = await response.json();

            if (result.success && result.data) {
                return result.data;
            }
            return [];
        } catch (error) {
            console.error('Error fetching student logs:', error);
            return [];
        }
    },

    /**
     * Bulk add student logs
     */
    async bulkAdd(logs: StudentLogRequest[]): Promise<boolean> {
        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'text/plain;charset=utf-8',
                },
                body: JSON.stringify({
                    action: 'bulkAdd',
                    logs: logs
                })
            });

            const result: ApiResponse<any> = await response.json();
            return result.success;
        } catch (error) {
            console.error('Error adding student logs:', error);
            return false;
        }
    }
};
