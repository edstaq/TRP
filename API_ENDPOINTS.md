# API Endpoints Documentation

This document provides a comprehensive list of all API endpoints used within the TRP web application, along with their supported HTTP methods and expected payload structures where applicable.

---

## 1. Teacher API
**Endpoint URL:** `https://script.google.com/macros/s/AKfycbx7NxYRzKivFWZG-0eu2LyKF_XqiXIKlBCa6S4y-M8nAXNAM5N7Omr6csYrhHrAguTx/exec`

### Actions:

**A. Read Teacher Contact**
*   **Method:** `POST`
*   **Format (`text/plain;charset=utf-8`):**
    ```json
    {
      "action": "readByContact",
      "contact": "string"
    }
    ```

**B. Update Teacher Contact**
*   **Method:** `POST`
*   **Format (`text/plain;charset=utf-8`):**
    ```json
    {
      "action": "updateByContact",
      "contact": "string",
      "updateData": {
         // Fields to update (e.g. "Name", "Address", etc.)
      }
    }
    ```

---

## 2. Subject API
**Endpoint URL:** `https://script.google.com/macros/s/AKfycby-zYMWd2uxaSvDwHp336uoz2w0r4UfwD69_Gape9FXOzg4B__L8Jc-fXxq59Y9UQdrRQ/exec`

### Actions:

**A. Read All Subjects**
*   **Method:** `POST`
*   **Format (`text/plain;charset=utf-8`):**
    ```json
    {
      "action": "readAllSubjects"
    }
    ```

**B. Read Subjects By IDs**
*   **Method:** `POST`
*   **Format (`text/plain;charset=utf-8`):**
    ```json
    {
      "action": "readSubjectsByIds",
      "subjectIds": ["id1", "id2"]
    }
    ```

---

## 3. Student API
**Endpoint URL:** `https://script.google.com/macros/s/AKfycbwno4xusBgka6B6-8vvqdV79K-xtEG1MUCQ-B-d861SWwkxiWvVuXRIeI33e89e2QoUCQ/exec`

### Actions:

**A. Get Student By ID**
*   **Method:** `POST`
*   **Format (`text/plain;charset=utf-8`):**
    ```json
    {
      "action": "getStudentById",
      "studentId": "string"
    }
    ```

---

## 4. Student Log API
**Endpoint URL:** `https://script.google.com/macros/s/AKfycbw0OBau3M7WsU14zGTiKpsTfbJgajnGVyZRvtb-CcFDU8uJZPPwu3JSPgMVlMgDs2gW/exec`

### Actions:

**A. Read by Session ID**
*   **Method:** `POST`
*   **Format (`text/plain;charset=utf-8`):**
    ```json
    {
      "action": "readBySessionId",
      "sessionId": "string"
    }
    ```

**B. Bulk Add Logs**
*   **Method:** `POST`
*   **Format (`text/plain;charset=utf-8`):**
    ```json
    {
      "action": "bulkAdd",
      "logs": [
        {
          "Student ID": "string",
          "Session ID": "string",
          "Status": "string"
          // other log fields...
        }
      ]
    }
    ```

---

## 5. Availability API
**Endpoint URL:** `https://script.google.com/macros/s/AKfycbxmTzvJIW1GIwwQij9SS6gUr3qpDBt5w0K81TllvfEG569wTSf2DbS07bJRweiHZAAQ/exec`

### Actions:

**A. Read Availability**
*   **Method:** `GET`
*   **URL Format:**
    ```
    ?action=read&teacher_id={teacherId}
    ```

**B. Add Availability**
*   **Method:** `POST`
*   **Format (`text/plain;charset=utf-8`):**
    ```json
    {
      "action": "add",
      "data": {
        "Teacher ID": "string",
        "Weekday": "string",
        "Start Time": "string",
        "End Time": "string"
      }
    }
    ```

**B. Update Availability**
*   **Method:** `POST`
*   **Format (`text/plain;charset=utf-8`):**
    ```json
    {
      "action": "update",
      "available_id": "string",
      "data": {
        "Start Time": "string", // Optional
        "End Time": "string",   // Optional
        "Weekday": "string"     // Optional
      }
    }
    ```

**C. Delete Availability**
*   **Method:** `POST`
*   **Format (`text/plain;charset=utf-8`):**
    ```json
    {
      "action": "delete",
      "available_id": "string"
    }
    ```

---

## 6. Allocation API
**Endpoint URL:** `https://script.google.com/macros/s/AKfycbwuzCTP0cK91jWUqHhvypJQhbw-X1xFvkCQIWmucsVcJaU3GccGIY8VEV-J02-beYx1qw/exec`

### Actions:

**A. Read by Teacher ID**
*   **Method:** `POST`
*   **Format (`text/plain;charset=utf-8`):**
    ```json
    {
      "action": "readByTeacherId",
      "teacher_id": "string"
    }
    ```

---

## 7. Session API
**Endpoint URL:** `https://script.google.com/macros/s/AKfycbxphDk4brk1ngyFl4W6nWDwI3-v870D2iPZ2IKzYWIXPz0noMsFDhKQbnWSs9m4wUHB/exec`

### Actions:

**A. Read by Teacher ID**
*   **Method:** `POST`
*   **Format (`text/plain;charset=utf-8`):**
    ```json
    {
      "action": "readByTeacherId",
      "teacherId": "string"
    }
    ```

**B. Update By Session ID**
*   **Method:** `POST`
*   **Format (`text/plain;charset=utf-8`):**
    ```json
    {
      "action": "updateBySessionId",
      "sessionId": "string",
      "updateData": {
        // Fields to update such as "Status", "Ended Time", etc.
      }
    }
    ```
