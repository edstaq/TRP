
import { Session, SessionStatus, Allocation } from './types';

import { APP_CONFIG } from './config';
export const GOOGLE_FORMS = APP_CONFIG.GOOGLE_FORMS;

const now = new Date();

export const MOCK_SESSIONS: Session[] = [
  {
    id: '1',
    sessionId: 'SESS-2024-001',
    allocationId: 'TAS102',
    subject: 'Mathematics',
    className: 'Grade 10-A',
    startTime: new Date(now.getTime() + 10 * 60000).toISOString(), // 10 mins from now
    durationMinutes: 60,
    status: SessionStatus.UPCOMING,
    students: [
      { id: 's1', name: 'Alice Johnson', attended: false, listeningRate: 0, review: '' },
      { id: 's2', name: 'Bob Smith', attended: false, listeningRate: 0, review: '' },
      { id: 's3', name: 'Charlie Davis', attended: false, listeningRate: 0, review: '' }
    ],
    files: []
  },
  {
    id: '2',
    sessionId: 'SESS-2024-002',
    allocationId: 'TAS103',
    subject: 'Physics',
    className: 'Grade 11-B',
    startTime: new Date(now.getTime() + 120 * 60000).toISOString(), // 2 hours from now
    durationMinutes: 45,
    status: SessionStatus.UPCOMING,
    students: [
      { id: 's4', name: 'Diana Prince', attended: false, listeningRate: 0, review: '' },
      { id: 's5', name: 'Ethan Hunt', attended: false, listeningRate: 0, review: '' }
    ],
    files: []
  },
  {
    id: '3',
    sessionId: 'SESS-2024-003',
    allocationId: 'TAS101',
    subject: 'Chemistry',
    className: 'Grade 12-C',
    startTime: new Date(now.getTime() - 3600 * 24 * 1000).toISOString(), // Yesterday
    durationMinutes: 90,
    status: SessionStatus.COMPLETED,
    students: [
      { id: 's1', name: 'Alice Johnson', attended: true, listeningRate: 4, review: 'Good participation' },
      { id: 's6', name: 'Frank Castle', attended: true, listeningRate: 3, review: 'Distracted at times' }
    ],
    files: [
      { name: 'OrganicChemistry_Intro.pdf', url: '#' }
    ]
  }
];

export const MOCK_ALLOCATIONS: Allocation[] = [
  { assignId: 'TAS101', classRoomId: 'edstaq c6 safa', meetLink: 'https://meet.google.com/cmj-avnj-rvg', subjectId: 'SUB227', subjectLabel: 'CBSE Mathematics - Grade 6', studentIds: ['STD101'], studentNames: ['Safa Salwa Pk'], teacherId: 'TCH108', startDate: '2025-10-27', sessionsPerDay: 1, startTime: '07:00pm', endTime: '08:15pm', days: 'Sunday, Monday, Tuesday, Wednesday, Thursday, Friday, Saturday', status: 'Closed', weekCycle: 1, isInteractive: false, endDateReq: '', classCountReq: '' },
  { assignId: 'TAS102', classRoomId: 'Edstaq C9 Liya fathima', meetLink: 'https://meet.google.com/ucj-tdrm-mme', subjectId: 'SUB296', subjectLabel: 'IGCSE Physics - AS Level', studentIds: ['STD102'], studentNames: ['Liya Fathima'], teacherId: 'TCH114', startDate: '2025-10-30', sessionsPerDay: 1, startTime: '07:00pm', endTime: '08:15pm', days: 'Sun, Tue, Thu', status: 'Active', weekCycle: 1, isInteractive: true, endDateReq: '', classCountReq: '' },
  { assignId: 'TAS103', classRoomId: 'Edstaq c6 arav', meetLink: 'https://meet.google.com/tdk-rnmp-tcp', subjectId: 'SUB227', subjectLabel: 'CBSE Mathematics - Grade 6', studentIds: ['STD103'], studentNames: ['Arav Krishna K'], teacherId: 'TCH108', startDate: '2025-11-09', sessionsPerDay: 1, startTime: '07:30pm', endTime: '08:45pm', days: 'Sunday', status: 'Hold', weekCycle: 2, isInteractive: false, endDateReq: '', classCountReq: '' },
  { assignId: 'TAS104', classRoomId: 'Edstaq c6 arav', meetLink: 'https://meet.google.com/tdk-rnmp-tcp', subjectId: 'SUB228', subjectLabel: 'CBSE Science - Grade 6', studentIds: ['STD103'], studentNames: ['Arav Krishna K'], teacherId: 'TCH108', startDate: '2025-11-16', sessionsPerDay: 1, startTime: '07:00pm', endTime: '08:15pm', days: 'Sunday', status: 'Active', weekCycle: 2, isInteractive: false, endDateReq: '', classCountReq: '' },
  { assignId: 'TAS105', classRoomId: 'Edstaq badhi c2', meetLink: 'https://meet.google.com/ypd-fggj-epk', subjectId: 'SUB136', subjectLabel: 'Foundation English - Level 2', studentIds: ['STD104'], studentNames: ['Badhi Rahman'], teacherId: 'TCH101', startDate: '2025-11-25', sessionsPerDay: 1, startTime: '07:30pm', endTime: '08:45pm', days: 'Sunday, Monday, Tuesday, Wednesday, Thursday, Friday, Saturday', status: 'Active', weekCycle: 1, isInteractive: false, endDateReq: '', classCountReq: '' },
  { assignId: 'TAS106', classRoomId: 'Edstaq C6 Aysha nasha (Maths)', meetLink: 'https://meet.google.com/vct-ygrk-xqn', subjectId: 'SUB227', subjectLabel: 'CBSE Mathematics - Grade 6', studentIds: ['STD105'], studentNames: ['Aysha Nasha A'], teacherId: 'TCH108', startDate: '2025-12-13', sessionsPerDay: 1, startTime: '07:30pm', endTime: '08:45pm', days: 'Tue, Fri', status: 'Active', weekCycle: 1, isInteractive: true, endDateReq: '', classCountReq: '' },
  { assignId: 'TAS107', classRoomId: 'Edstaq C7 Prarthana', meetLink: 'https://meet.google.com/awt-jmcd-qnm', subjectId: 'SUB251', subjectLabel: 'Malayalam Language - Level 1', studentIds: ['STD106'], studentNames: ['Prarthana P'], teacherId: 'TCH103', startDate: '2025-12-16', sessionsPerDay: 1, startTime: '07:30pm', endTime: '08:45pm', days: 'Tue, Fri', status: 'Active', weekCycle: 1, isInteractive: false, endDateReq: '', classCountReq: '' },
  { assignId: 'TAS108', classRoomId: 'Edstaq c6 Aysha nasha (BS)', meetLink: 'https://meet.google.com/vct-ygrk-xqn', subjectId: 'SUB222', subjectLabel: 'Basic Science - Grade 6', studentIds: ['STD105'], studentNames: ['Aysha Nasha A'], teacherId: 'TCH106', startDate: '2025-12-16', sessionsPerDay: 1, startTime: '07:30pm', endTime: '08:45pm', days: 'Thursday', status: 'Active', weekCycle: 1, isInteractive: false, endDateReq: '', classCountReq: '' },
  { assignId: 'TAS109', classRoomId: 'Edstaq c3 Rayyan', meetLink: 'https://meet.google.com/pyk-ujuq-icz', subjectId: 'SUB162', subjectLabel: 'Arabic - Junior Level', studentIds: ['STD107'], studentNames: ['Rayyan M'], teacherId: 'TCH118', startDate: '2025-12-16', sessionsPerDay: 1, startTime: '08:00pm', endTime: '09:15pm', days: 'Monday', status: 'Active', weekCycle: 1, isInteractive: true, endDateReq: '', classCountReq: '' },
  { assignId: 'TAS110', classRoomId: 'Edstaq C8 Aiza Hindi', meetLink: 'https://meet.google.com/epy-ebgm-cma', subjectId: 'SUB272', subjectLabel: 'Hindi - Grade 8', studentIds: ['STD108'], studentNames: ['Aiza Fathima'], teacherId: 'TCH119', startDate: '2025-12-25', sessionsPerDay: 1, startTime: '07:00pm', endTime: '08:15pm', days: 'Sunday', status: 'Active', weekCycle: 1, isInteractive: false, endDateReq: '', classCountReq: '' },
  { assignId: 'TAS111', classRoomId: 'edstaq amna c2', meetLink: 'https://meet.google.com/hfv-fzdc-tni', subjectId: 'SUB122', subjectLabel: 'English Grammar - Junior', studentIds: ['STD109'], studentNames: ['Amna Jaleel'], teacherId: 'TCH111', startDate: '2026-01-01', sessionsPerDay: 1, startTime: '07:30pm', endTime: '08:00pm', days: 'Sun, Sat', status: 'Active', weekCycle: 1, isInteractive: true, endDateReq: '', classCountReq: '' },
  { assignId: 'TAS112', classRoomId: 'Edstaq amna c2 eng', meetLink: 'https://meet.google.com/hfv-fzdc-tni', subjectId: 'SUB140', subjectLabel: 'Spoken English - Level 1', studentIds: ['STD109'], studentNames: ['Amna Jaleel'], teacherId: 'TCH119', startDate: '2026-01-11', sessionsPerDay: 1, startTime: '08:00pm', endTime: '09:15pm', days: '-', status: 'Active', weekCycle: 1, isInteractive: false, endDateReq: '', classCountReq: '' },
  { assignId: 'TAS113', classRoomId: 'Edstaq c8 amina (maths)', meetLink: 'https://meet.google.com/bsu-dsqu-fub', subjectId: 'SUB275', subjectLabel: 'Mathematics - Grade 8', studentIds: ['STD110'], studentNames: ['Amina Beevi'], teacherId: 'TCH105', startDate: '2026-02-02', sessionsPerDay: 1, startTime: '-', endTime: '-', days: '-', status: 'Active', weekCycle: 1, isInteractive: false, endDateReq: '', classCountReq: '' },
  { assignId: 'TAS114', classRoomId: 'Edstaq c3 aria (maths)', meetLink: 'meet.google.com/jvh-owak-qka', subjectId: 'SUB159', subjectLabel: 'Mathematics - Grade 3', studentIds: ['STD111'], studentNames: ['Ayra Maryam MP'], teacherId: 'TCH103', startDate: '2026-02-03', sessionsPerDay: 1, startTime: '07:30pm', endTime: '08:45pm', days: 'Monday', status: 'Active', weekCycle: 1, isInteractive: false, endDateReq: '2026-05-01', classCountReq: 24 },
];

export const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
