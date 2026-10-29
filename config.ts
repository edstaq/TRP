
/**
 * Application Configuration
 * You can easily edit API endpoints and other settings here.
 */
const UNIFIED_API_URL = 'https://script.google.com/macros/s/AKfycbwYjHfqxcj_IEITt_PNUgQHaFiCzmVWie5mGXBnCZKr3IJAVvc9PLClPhrhqzumr5OMSQ/exec';

export const APP_CONFIG = {
    // Unified Google Apps Script API endpoint
    API_ENDPOINTS: {
        UNIFIED: UNIFIED_API_URL,
        TEACHER: UNIFIED_API_URL,
        SUBJECT: UNIFIED_API_URL,
        AVAILABILITY: UNIFIED_API_URL,
        ALLOCATION: UNIFIED_API_URL,
        SESSION: UNIFIED_API_URL,
        STUDENT_LOG: UNIFIED_API_URL,
        STUDENT: UNIFIED_API_URL,
        CHECKLIST: UNIFIED_API_URL,
    },

    // Google Form URLs for various requests
    GOOGLE_FORMS: {
        REFER_FRIEND: 'https://api.whatsapp.com/send/?text=%F0%9F%93%A2%20Teaching%20Opportunity%20%E2%80%93%20Edstaq%0D%0A%0D%0AEdstaq%20%E2%80%93%20The%20Learning%20Network%20is%20inviting%20passionate%20teachers%20to%20join%20our%20growing%20academic%20platform.%0D%0A%0D%0AWe%20are%20onboarding%20teachers%20for%3A%0D%0A%F0%9F%93%98%20Classes%201%E2%80%9310%20%20%0D%0A%F0%9F%93%9A%20CBSE%20%26%20Kerala%20State%20Syllabus%20%20%0D%0A%F0%9F%8C%90%20English%20%26%20Malayalam%20Medium%20%20%0D%0A%0D%0AIf%20you%20are%20interested%20in%20flexible%20teaching%20opportunities%20and%20earning%20through%20online%2Flive%20tuition%2C%20apply%20here%3A%0D%0A%0D%0A%F0%9F%94%97%20https%3A%2F%2Fforms.gle%2FfGHJjL9c1KHraaJY9%0D%0A%0D%0AFeel%20free%20to%20share%20this%20with%20eligible%20teachers.%0D',
        COMPLAINT: 'https://docs.google.com/forms/d/e/1FAIpQLSd4BvP77gljW3J6AFpLz8q3INz1DTIqKrUMmDyFVmoEFLv58w/viewform?usp=header',
        FEEDBACK: 'https://docs.google.com/forms/d/e/1FAIpQLSfzWBEVM4K_lISOLqHTnzHs-v1yGESyj5Hqvz88699VkssJvA/viewform?usp=header',
        // UPLOAD_FILES & RESCHEDULE_REQUEST - Removed: These are now handled dynamically with pre-filled parameters in the Session Dashboard.
        SUPPORT_LINK: 'https://wa.me/917510204021'
    },



    // Portal Branding & Display Settings
    PORTAL_INFO: {
        NAME: 'TRP',
        FULL_NAME: 'Teacher Reporting Portal',
        TAGLINE: 'Teacher Suite'
    }
};
