import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { pool } from "../config/db";
import { sendToQueue } from "../services/queue";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3Config = new S3Client({
  region: process.env.AWS_REGION || "eu-north-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

async function generatePresignedUrl(rawUrl: string): Promise<string> {
  if (!rawUrl) return "";
  const bucketUrl = `https://${process.env.AWS_BUCKET_NAME || "mys3bucket-bk"}.s3.${process.env.AWS_REGION || "eu-north-1"}.amazonaws.com/`;
  if (!rawUrl.startsWith(bucketUrl)) return rawUrl;
  
  const s3Key = rawUrl.replace(bucketUrl, "");
  const command = new GetObjectCommand({
    Bucket: process.env.AWS_BUCKET_NAME || "mys3bucket-bk",
    Key: decodeURIComponent(s3Key),
  });
  
  try {
    return await getSignedUrl(s3Config, command, { expiresIn: 3600 });
  } catch (error) {
    return rawUrl;
  }
}


export const applyForJob = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const jobId = req.params.jobId as string;
    const userId = req.user!.id;

    const file = req.file as any;
    if (!file) {
      res.status(400).json({ message: "Please upload a resume PDF" });
      return;
    }

    const jobResult = await pool.query("SELECT * FROM jobs WHERE id = $1", [jobId]);
    if (jobResult.rows.length === 0) {
      res.status(404).json({ message: "Job not found" });
      return;
    }
    const job = jobResult.rows[0];

    const appExists = await pool.query("SELECT id FROM applications WHERE user_id = $1 AND job_id = $2", [userId, jobId]);
    if (appExists.rows.length > 0) {
      res.status(400).json({ message: "You have already applied for this job" });
      return;
    }

    const appResult = await pool.query(
      "INSERT INTO applications (user_id, job_id, resume_url, status) VALUES ($1, $2, $3, $4) RETURNING *",
      [userId, jobId, file.location, "Pending"]
    );
    const application = appResult.rows[0];

    // Send to RabbitMQ
    await sendToQueue("job_matching_queue_v2", {
      applicationId: application.id,
      resumeUrl: file.location,
      jobDescription: job.description,
      jobSkills: job.skills,
      userId
    });

    res.status(201).json({
      message: "Application submitted successfully. AI matching is in progress.",
      application: { ...application, _id: application.id },
    });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error });
  }
};

export const getJobApplications = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const jobId = req.params.jobId as string;

    const jobResult = await pool.query("SELECT created_by FROM jobs WHERE id = $1", [jobId]);
    if (jobResult.rows.length === 0) {
      res.status(404).json({ message: "Job not found" });
      return;
    }

    if (jobResult.rows[0].created_by !== req.user!.id) {
      res.status(403).json({ message: "Not authorized to view these applications" });
      return;
    }

    const appResult = await pool.query(`
      SELECT a.*, u.name as user_name, u.email as user_email
      FROM applications a
      JOIN users u ON a.user_id = u.id
      WHERE a.job_id = $1
    `, [jobId]);

    const applications = await Promise.all(appResult.rows.map(async (app) => ({
      ...app,
      _id: app.id,
      userId: { name: app.user_name, email: app.user_email },
      matchScore: app.match_score,
      resumeUrl: await generatePresignedUrl(app.resume_url),
      skillSummary: app.skill_summary
    })));

    res.json(applications);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error });
  }
};

export const getUserApplications = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    
    const appResult = await pool.query(`
      SELECT a.*, j.title as job_title, j.company as job_company
      FROM applications a
      JOIN jobs j ON a.job_id = j.id
      WHERE a.user_id = $1
    `, [userId]);

    const applications = await Promise.all(appResult.rows.map(async (app) => ({
      ...app,
      _id: app.id,
      jobId: { title: app.job_title, company: app.job_company },
      matchScore: app.match_score,
      resumeUrl: await generatePresignedUrl(app.resume_url),
      skillSummary: app.skill_summary
    })));

    res.json(applications);
  } catch (error) {
    console.error("getUserApplications Error:", error);
    res.status(500).json({ message: "Server Error", error });
  }
};

export const deleteApplication = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const appId = req.params.appId;
    const userId = req.user!.id;

    // Verify ownership
    const appExists = await pool.query("SELECT * FROM applications WHERE id = $1 AND user_id = $2", [appId, userId]);
    
    if (appExists.rows.length === 0) {
      res.status(404).json({ message: "Application not found or unauthorized" });
      return;
    }

    // Delete application
    await pool.query("DELETE FROM applications WHERE id = $1", [appId]);

    res.json({ message: "Application deleted successfully" });
  } catch (error) {
    console.error("deleteApplication Error:", error);
    res.status(500).json({ message: "Server Error", error });
  }
};

