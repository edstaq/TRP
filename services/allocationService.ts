
import { APP_CONFIG } from '../config';
import { Allocation } from '../types';

export interface AllocationAPIData {
    "Teacher Assign ID": string;
    "Class Room ID": string;
    "Meet Link": string;
    "Subject ID": string;
    "Subject Label"?: string;
    "Student ID": string;
    "Teacher ID": string;
    "Start Date": string;
    "Sessions per day": number | string;
    "Start Time": string;
    "End Time": string;
    "Days": string;
    "Status": string;
    "Week Cycle": number | string;
    "End Date Req"?: any;
    "Class Count Req"?: any;
    "Interactive Session"?: any;
    "Student IDs": string[];
    "Student Names": string[];
}

interface ApiResponse<T> {
    success: boolean;
    message: string;
    data: T | null;
}

const API_URL = APP_CONFIG.API_ENDPOINTS.ALLOCATION;

const formatApiDate = (dateStr: string) => {
    if (!dateStr || dateStr === "-") return "-";
    try {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return dateStr;
        // Format as YYYY-MM-DD for consistency
        return date.toISOString().split('T')[0];
    } catch (e) {
        return dateStr;
    }
};

const formatApiTime = (timeStr: string) => {
    if (!timeStr || timeStr === "-") return "-";
    try {
        const date = new Date(timeStr);
        if (isNaN(date.getTime())) return timeStr;
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        }).toLowerCase().replace(' ', '');
    } catch (e) {
        return timeStr;
    }
};

export const allocationService = {
    async fetchByTeacherId(teacherId: string): Promise<Allocation[]> {
        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'text/plain;charset=utf-8',
                },
                body: JSON.stringify({
                    action: 'readByTeacherId',
                    teacher_id: teacherId
                })
            });

            const result: ApiResponse<AllocationAPIData[]> = await response.json();

            if (result.success && result.data) {
                return result.data.map(item => ({
                    assignId: item["Teacher Assign ID"],
                    classRoomId: item["Class Room ID"],
                    meetLink: item["Meet Link"] || '#',
                    subjectId: item["Subject ID"],
                    subjectLabel: item["Subject Label"],
                    studentIds: Array.isArray(item["Student IDs"]) ? item["Student IDs"] : [],
                    studentNames: Array.isArray(item["Student Names"]) ? item["Student Names"] : [],
                    teacherId: item["Teacher ID"],
                    startDate: formatApiDate(item["Start Date"]),
                    sessionsPerDay: Number(item["Sessions per day"]) || 0,
                    startTime: formatApiTime(item["Start Time"]),
                    endTime: formatApiTime(item["End Time"]),
                    days: item["Days"],
                    status: item["Status"] || 'Active',
                    weekCycle: Number(item["Week Cycle"]) || 1,
                    isInteractive: item["Interactive Session"] === true || item["Interactive Session"] === 'true' || item["Interactive Session"] === 'TRUE',
                    endDateReq: item["End Date Req"] ? String(item["End Date Req"]) : undefined,
                    classCountReq: item["Class Count Req"]
                }));
            }
            return [];
        } catch (error) {
            console.error('Error fetching allocations:', error);
            return [];
        }
    }
};
