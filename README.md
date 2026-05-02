# SyncUp AI Job Platform

A modern, highly scalable Applicant Tracking System (ATS) and AI-powered job matching platform. This full-stack application connects Job Seekers with Recruiters, providing instant AI evaluation of PDF resumes using Groq LLMs.

## 🌟 Full-Stack Architecture & Requirements Met

This project strictly adheres to the requested architecture and tech stack requirements:

- ✅ **Frontend:** Next.js (App Router, Tailwind CSS, TypeScript, SweetAlert2)
- ✅ **Backend:** Node.js + Express.js (RESTful APIs, JWT Authentication)
- ✅ **Database:** Neon PostgreSQL (Relational data, strictly typed with `pg` driver)
- ✅ **Caching:** Upstash Redis (Sub-millisecond caching for Job Listings)
- ✅ **Queue / Async Processing:** RabbitMQ (Asynchronous background PDF parsing and AI processing)
- ✅ **Realtime Notifications:** WebSockets / Socket.io (Instant "Match Completed" UI alerts)
- ✅ **Storage:** AWS S3 Bucket (Secure file streaming with 1-hour Presigned URLs)
- ✅ **AI Matching Engine:** Groq API `llama-3.3-70b-versatile` (Instant algorithmic semantic matching)

## 🏗 System Data Flow
1. **User Action:** Job seeker uploads a PDF resume.
2. **Secure Upload:** Express intercepts the file and streams it directly to an AWS S3 Bucket.
3. **Task Queueing:** Express pushes an AI processing task to RabbitMQ and returns an instant success response to the frontend.
4. **Worker Processing:** A background Node.js worker pulls the task, fetches the PDF from AWS S3, and parses it.
5. **AI Inference:** The worker sends the parsed text to the Groq LLM to generate a match score against the job description.
6. **Real-time Push:** The worker saves the score to PostgreSQL and uses WebSockets to push a real-time notification to the Job Seeker's dashboard.

---

## 🧪 Comprehensive Testing Guide

### 1. Registration & Authentication
- Register as a **Recruiter**.
- Register as a **Job Seeker**.
- Verify that invalid passwords or duplicate emails return beautiful red error popups.

### 2. Recruiter Workflow
- Log in as a Recruiter.
- Navigate to the Dashboard.
- Fill out the "Post a New Job" form (Title, Company, Skills, Description).
- Verify the success popup and that the job instantly appears in your "Your Posted Jobs" list.

### 3. Job Seeker & AI Workflow
- Log in as a Job Seeker.
- Navigate to `Browse Jobs` and select the job you just created.
- Click "Apply" and upload a PDF Resume.
- **Verification 1:** You should receive an instant "Success" popup (Thanks to RabbitMQ handling the file asynchronously).
- Navigate back to your Dashboard.
- **Verification 2:** Your application should show a yellow **"Pending"** badge.
- Wait a few seconds for the AI to process the file in the background.
- **Verification 3:** A Real-time Socket.io Notification ("Match Completed!") will appear on your screen.
- **Verification 4:** The dashboard will instantly update in real-time (without you refreshing the page) changing the badge to a green **"Score: X"** and providing AI Feedback.

### 4. Recruiter Verification
- Log back in as the Recruiter.
- Check your Dashboard.
- **Verification 1:** The applicant will appear under the specific Job posting with their AI score.
- **Verification 2:** Click "View Resume". Ensure it successfully opens the PDF in a new tab using a temporary, secure AWS S3 Presigned URL.

### 5. Data Deletion
- Log back in as the Job Seeker.
- Click the red Trash icon on your application card.
- Confirm the SweetAlert popup to test the DELETE route and update the UI.
