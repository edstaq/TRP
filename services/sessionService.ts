
import { APP_CONFIG } from '../config';
import { Session, SessionStatus, ApiSession, ApiResponse } from '../types';
import { studentService } from './studentService';

const API_URL = APP_CONFIG.API_ENDPOINTS.SESSION;

// Keep a local cache of student names to avoid redundant fetches
const studentNameCache: Record<string, string> = {};

/**
 * Parses a time string in format "07:00pm" or ISO string
 */
const parseTime = (timeStr: string): { hours: number; minutes: number } | null => {
    if (!timeStr) return null;

    // Handle ISO string format
    if (timeStr.includes('T')) {
        const date = new Date(timeStr);
        if (!isNaN(date.getTime())) {
            return { hours: date.getHours(), minutes: date.getMinutes() };
        }
    }

    // Handle "07:00pm" or "7:00 PM" format
    const match = timeStr.match(/(\d+):(\d+)\s*(am|pm|AM|PM)/i);
    if (match) {
        let hours = parseInt(match[1], 10);
        const minutes = parseInt(match[2], 10);
        const ampm = match[3].toLowerCase();

        if (ampm === 'pm' && hours < 12) hours += 12;
        else if (ampm === 'am' && hours === 12) hours = 0;

        return { hours, minutes };
    }

    return null;
};

/**
 * Parses a date string in format "19/02/2026" or ISO string
 */
const parseDate = (dateStr: string): Date | null => {
    if (!dateStr) return null;

    // Handle "DD/MM/YYYY" format
    if (dateStr.includes('/')) {
        const parts = dateStr.split('/');
        if (parts.length === 3) {
            const day = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1; // 0-indexed
            const year = parseInt(parts[2], 10);
            const date = new Date(year, month, day);
            if (!isNaN(date.getTime())) return date;
        }
    }

    // Fallback to standard parser
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? null : date;
};

/**
 * Combines date and time from API into a proper ISO string
 */
const combineDateTime = (dateStr: string, timeStr: string): string => {
    try {
        const date = parseDate(dateStr);
        if (!date) return dateStr;

        const timeInfo = parseTime(timeStr);
        if (timeInfo) {
            date.setHours(timeInfo.hours, timeInfo.minutes, 0, 0);
        }

        return date.toISOString();
    } catch (e) {
        return dateStr;
    }
};

/**
 * Calculates duration in minutes between start and end time
 */
const calculateDuration = (startTimeStr: string, endTimeStr: string): number => {
    try {
        const start = parseTime(startTimeStr);
        const end = parseTime(endTimeStr);

        if (!start || !end) return 60;

        const startMins = start.hours * 60 + start.minutes;
        const endMins = end.hours * 60 + end.minutes;

        let diff = endMins - startMins;
        // Handle midnight wrap if necessary (though unlikely for 1-day sessions)
        if (diff < 0) diff += 24 * 60;

        return diff;
    } catch (e) {
        return 60;
    }
};

/**
 * Maps API Status to internal SessionStatus enum
 */
const mapStatus = (status: string): SessionStatus => {
    const s = status?.toUpperCase();
    if (s === 'COMPLETED') return SessionStatus.COMPLETED;
    if (s === 'SCHEDULED' || s === 'UPCOMING' || !s) return SessionStatus.UPCOMING;
    return SessionStatus.IN_PROGRESS;
};

export const sessionService = {
    /**
     * Fetch all sessions for a teacher
     */
    async fetchByTeacherId(teacherId: string): Promise<Session[]> {
        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'text/plain;charset=utf-8',
                },
                body: JSON.stringify({
                    action: 'readByTeacherId',
                    teacherId: teacherId
                })
            });

            const result: ApiResponse<ApiSession[]> = await response.json();

            if (result.success && result.data) {
                // Collect all student IDs that need name resolution
                const allStudentIds = new Set<string>();
                result.data.forEach(item => {
                    const ids = (item["Student ID"] || "").split(',').map(id => id.trim()).filter(id => id !== "");
                    ids.forEach(id => {
                        if (!studentNameCache[id]) {
                            allStudentIds.add(id);
                        }
                    });
                });

                // Fetch missing names in parallel
                if (allStudentIds.size > 0) {
                    const namesMap = await studentService.getStudentNames(Array.from(allStudentIds));
                    Object.assign(studentNameCache, namesMap);
                }

                return result.data.map(item => {
                    const startTime = combineDateTime(item["Date"], item["Start Time"]);
                    const duration = calculateDuration(item["Start Time"], item["End Time"]);

                    // Parse comma-separated student IDs
                    const studentIdsStr = item["Student ID"] || "";
                    const studentIds = studentIdsStr.split(',').map(id => id.trim()).filter(id => id !== "");

                    return {
                        id: item["Session ID"],
                        sessionId: item["Session ID"],
                        allocationId: item["Teacher Assign ID"],
                        subject: item["Subject label"] || item["Subject name"],
                        className: item["Class Room ID"],
                        startTime: startTime,
                        durationMinutes: duration > 0 ? duration : 60,
                        status: mapStatus(item["Status"]),
                        students: studentIds.map(id => ({
                            id,
                            name: studentNameCache[id] || `Student ${id}`,
                            attended: false,
                            listeningRate: 0,
                            review: ''
                        })),
                        files: (item["Files"] || []).map(file => ({
                            timestamp: file["Timestamp"],
                            email: file["Email address"],
                            sessionId: file["Session ID"],
                            fileName: file["File Name"],
                            uploadFile: file["Upload File"],
                            type: file["Type"]
                        })),
                        topicCovered: item["Topic covered"] || "",
                        startedTime: item["Started Time"] || "",
                        endedTime: item["Ended Time"] || ""
                    };
                });
            }
            return [];
        } catch (error) {
            console.error('Error fetching sessions:', error);
            return [];
        }
    },

    /**
     * Update session details
     */
    async updateSession(sessionId: string, updateData: Partial<ApiSession>): Promise<boolean> {
        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'text/plain;charset=utf-8',
                },
                body: JSON.stringify({
                    action: 'updateBySessionId',
                    sessionId,
                    updateData
                })
            });

            const result: ApiResponse<any> = await response.json();
            return result.success;
        } catch (error) {
            console.error('Error updating session:', error);
            return false;
        }
    }
};
