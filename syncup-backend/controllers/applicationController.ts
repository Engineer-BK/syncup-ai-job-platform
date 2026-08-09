import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { pool } from "../config/db";
import { sendToQueue } from "../services/queue";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * Configure AWS S3 Client for generating Presigned Download URLs
 */
const s3Config = new S3Client({
  region: process.env.AWS_REGION || "eu-north-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

/**
 * WHAT IS A PRESIGNED URL & WHY DO WE NEED IT?
 * 
 * In AWS S3, files (like candidate resumes) are kept PRIVATE for security.
 * Browsers cannot open direct S3 URLs without getting an "Access Denied" error.
 * 
 * Instead of making the S3 bucket public (which is unsafe), we generate a temporary "Presigned URL".
 * This URL contains a secure signature that gives temporary read access to the file (expires in 1 hour).
 */
async function generatePresignedUrl(rawUrl: string): Promise<string> {
  if (!rawUrl) return "";

  // Standard S3 bucket base URL prefix
  const bucketName = process.env.AWS_BUCKET_NAME || "mys3bucket-bk";
  const region = process.env.AWS_REGION || "eu-north-1";
  const bucketUrlPrefix = `https://${bucketName}.s3.${region}.amazonaws.com/`;

  // If the raw URL is not an S3 bucket URL, return it unchanged
  if (!rawUrl.startsWith(bucketUrlPrefix)) return rawUrl;

  try {
    // Extract the object key (file path inside S3, e.g., "resumes/filename.pdf")
    const s3Key = rawUrl.replace(bucketUrlPrefix, "");
    
    // Create an S3 GetObject command for this key
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: decodeURIComponent(s3Key),
    });

    // Generate a signed URL valid for 3600 seconds (1 hour)
    return await getSignedUrl(s3Config, command, { expiresIn: 3600 });
  } catch (error) {
    console.error("Error generating presigned URL:", error);
    return rawUrl; // Fallback to raw URL if signing fails
  }
}

/**
 * HELPER: Format database application row for Frontend consumption
 * Maps SQL column names (snake_case like match_score) to Frontend expected names (camelCase like matchScore).
 */
async function formatApplicationRow(app: any) {
  const signedResumeUrl = await generatePresignedUrl(app.resume_url);

  return {
    _id: app.id,               // MongoDB-style ID for frontend compatibility
    id: app.id,                // Standard PostgreSQL UUID
    userId: app.user_name ? { name: app.user_name, email: app.user_email } : app.user_id,
    jobId: app.job_title ? { title: app.job_title, company: app.job_company } : app.job_id,
    matchScore: app.match_score,
    skillSummary: app.skill_summary,
    status: app.status,
    resumeUrl: signedResumeUrl, // Secure temporary presigned URL for downloading PDF
    createdAt: app.created_at,
  };
}

/**
 * API ENDPOINT: Candidate applies for a job
 * ROUTE: POST /api/applications/:jobId
 */
export const applyForJob = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const jobId = req.params.jobId as string;
    const userId = req.user!.id; // Extracted from JWT token by protect middleware

    // 1. Check if resume file was uploaded via Multer middleware
    const file = req.file as any;
    if (!file) {
      res.status(400).json({ message: "Please upload a resume PDF file" });
      return;
    }

    // 2. Check if the targeted job exists in database
    const jobResult = await pool.query("SELECT * FROM jobs WHERE id = $1", [jobId]);
    if (jobResult.rows.length === 0) {
      res.status(404).json({ message: "Job listing not found" });
      return;
    }
    const job = jobResult.rows[0];

    // 3. Prevent candidate from applying to the same job multiple times
    const appExists = await pool.query(
      "SELECT id FROM applications WHERE user_id = $1 AND job_id = $2",
      [userId, jobId]
    );
    if (appExists.rows.length > 0) {
      res.status(400).json({ message: "You have already applied for this job" });
      return;
    }

    // 4. Insert new application record into PostgreSQL database with status 'Pending'
    const appResult = await pool.query(
      `INSERT INTO applications (user_id, job_id, resume_url, status) 
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [userId, jobId, file.location, "Pending"]
    );
    const application = appResult.rows[0];

    // 5. Offload heavy AI matching work to RabbitMQ message queue
    await sendToQueue("job_matching_queue_v2", {
      applicationId: application.id,
      resumeUrl: file.location,
      jobDescription: job.description,
      jobSkills: job.skills,
      userId,
    });

    // 6. Return quick HTTP response to user (AI will process in background!)
    res.status(201).json({
      message: "Application submitted successfully. AI matching is in progress.",
      application: { ...application, _id: application.id },
    });
  } catch (error) {
    console.error("applyForJob Error:", error);
    res.status(500).json({ message: "Server Error", error });
  }
};

/**
 * API ENDPOINT: Employer views all applications for a specific job they posted
 * ROUTE: GET /api/applications/job/:jobId
 */
export const getJobApplications = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const jobId = req.params.jobId as string;

    // 1. Verify job exists and check ownership (only job creator can see candidate applications)
    const jobResult = await pool.query("SELECT created_by FROM jobs WHERE id = $1", [jobId]);
    if (jobResult.rows.length === 0) {
      res.status(404).json({ message: "Job not found" });
      return;
    }

    if (jobResult.rows[0].created_by !== req.user!.id) {
      res.status(403).json({ message: "Unauthorized: You did not post this job" });
      return;
    }

    // 2. Fetch applications JOINED with applicant candidate user details (name & email)
    const appResult = await pool.query(
      `SELECT a.*, u.name as user_name, u.email as user_email
       FROM applications a
       JOIN users u ON a.user_id = u.id
       WHERE a.job_id = $1
       ORDER BY a.created_at DESC`,
      [jobId]
    );

    // 3. Transform database rows & generate presigned S3 URLs concurrently using Promise.all
    const applications = await Promise.all(
      appResult.rows.map((app) => formatApplicationRow(app))
    );

    res.json(applications);
  } catch (error) {
    console.error("getJobApplications Error:", error);
    res.status(500).json({ message: "Server Error", error });
  }
};

/**
 * API ENDPOINT: Job Seeker views all jobs they have applied for
 * ROUTE: GET /api/applications/user
 */
export const getUserApplications = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;

    // 1. Fetch user applications JOINED with job listing details (title & company)
    const appResult = await pool.query(
      `SELECT a.*, j.title as job_title, j.company as job_company
       FROM applications a
       JOIN jobs j ON a.job_id = j.id
       WHERE a.user_id = $1
       ORDER BY a.created_at DESC`,
      [userId]
    );

    // 2. Format applications & attach signed resume download URLs
    const applications = await Promise.all(
      appResult.rows.map((app) => formatApplicationRow(app))
    );

    res.json(applications);
  } catch (error) {
    console.error("getUserApplications Error:", error);
    res.status(500).json({ message: "Server Error", error });
  }
};

/**
 * API ENDPOINT: Job Seeker deletes/withdraws their application
 * ROUTE: DELETE /api/applications/:appId
 */
export const deleteApplication = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const appId = req.params.appId;
    const userId = req.user!.id;

    // 1. Verify application exists and belongs to the logged in user
    const appExists = await pool.query(
      "SELECT id FROM applications WHERE id = $1 AND user_id = $2",
      [appId, userId]
    );

    if (appExists.rows.length === 0) {
      res.status(404).json({ message: "Application not found or unauthorized" });
      return;
    }

    // 2. Delete application row from database
    await pool.query("DELETE FROM applications WHERE id = $1", [appId]);

    res.json({ message: "Application withdrawn successfully" });
  } catch (error) {
    console.error("deleteApplication Error:", error);
    res.status(500).json({ message: "Server Error", error });
  }
};
