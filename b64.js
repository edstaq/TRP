const fs = require('fs'); const b64 = process.argv[2]; fs.writeFileSync('components/AttendanceSheet.tsx', Buffer.from(b64, 'base64').toString('utf8'));
