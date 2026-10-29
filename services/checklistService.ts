import { APP_CONFIG } from '../config';
import { ChecklistTemplateItem, ApiChecklistTemplate, ChecklistMasterRecord, ApiResponse } from '../types';

const API_URL = APP_CONFIG.API_ENDPOINTS.CHECKLIST;

let cachedTemplates: ChecklistTemplateItem[] | null = null;

export const checklistService = {
  /**
   * Fetch all checklist templates for Teacher role from sheet "Check List"
   */
  async fetchTemplates(forceRefresh = false): Promise<ChecklistTemplateItem[]> {
    if (!forceRefresh && cachedTemplates && cachedTemplates.length > 0) {
      return cachedTemplates;
    }

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'readChecklistTemplates', role: 'Teacher' })
      });

      const result: ApiResponse<ApiChecklistTemplate[]> = await response.json();

      if (result.success && Array.isArray(result.data)) {
        const parsed: ChecklistTemplateItem[] = result.data.map(item => {
          const rawVal = String(item["Values"] || "").trim();
          const upperVal = rawVal.toUpperCase();
          const isCheckbox = upperVal === 'TRUE' || upperVal === 'FALSE' || upperVal === '';
          const options = !isCheckbox && rawVal.includes(',')
            ? rawVal.split(',').map(s => s.trim()).filter(Boolean)
            : (!isCheckbox && rawVal ? [rawVal] : []);

          return {
            checkId: item["Check id"] || '',
            role: item["Role"] || 'Teacher',
            mode: item["Mode"] || 'Teaching',
            items: item["Items"] || '',
            values: rawVal,
            isCheckbox,
            options
          };
        });

        cachedTemplates = parsed;
        return parsed;
      }
      return [];
    } catch (err) {
      console.error('Failed to fetch checklist templates:', err);
      return [];
    }
  },

  /**
   * Fetch already saved checklist answers for a session from "Checklist Master"
   */
  async fetchBySessionId(sessionId: string): Promise<ChecklistMasterRecord[]> {
    if (!sessionId) return [];
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'readChecklistBySessionId', sessionId })
      });

      const result: ApiResponse<ChecklistMasterRecord[]> = await response.json();
      return result.success && Array.isArray(result.data) ? result.data : [];
    } catch (err) {
      console.error('Failed to fetch session checklist:', err);
      return [];
    }
  },

  /**
   * Save session checklist answers into "Checklist Master"
   */
  async saveSessionChecklist(
    sessionId: string,
    teacherId: string,
    items: Array<{
      checkId: string;
      role: string;
      mode: string;
      items: string;
      values: string;
      itemId?: string;
    }>
  ): Promise<boolean> {
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'saveSessionChecklist',
          sessionId,
          teacherId,
          items
        })
      });

      const result: ApiResponse<any> = await response.json();
      return result.success;
    } catch (err) {
      console.error('Failed to save session checklist:', err);
      return false;
    }
  }
};
