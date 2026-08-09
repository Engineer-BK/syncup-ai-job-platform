import { getChannel } from "../services/queue";
import { matchResumeWithJob } from "../services/openai";
import { pool } from "../config/db";
import { getIo } from "../sockets";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
const pdfParse = require("pdf-parse"); // v1.1.1

/**
 * AWS S3 Client Setup
 * We use the AWS SDK v3 to download candidate resumes stored securely in our Amazon S3 bucket.
 */
const s3Client = new S3Client({
  region: process.env.AWS_REGION || "eu-north-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

/**
 * HELPER: Extract the S3 Object Key from a full S3 URL
 * Example URL: https://mys3bucket-bk.s3.eu-north-1.amazonaws.com/resumes/123-resume.pdf
 * Extracted Key: resumes/123-resume.pdf
 */
function getS3KeyFromUrl(rawUrl: string): string {
  if (!rawUrl) return "";
  const parts = rawUrl.split(".com/");
  const key = parts[1];
  if (!key) {
    throw new Error(`Invalid S3 URL format: ${rawUrl}`);
  }
  return decodeURIComponent(key);
}

/**
 * RABBITMQ WORKER PROCESS
 * 
 * WHY USE A WORKER?
 * Reading a PDF resume, calling an AI model, and updating database records takes time (3-10 seconds).
 * If we did this directly inside the web server route, the job seeker's browser would freeze waiting for a response!
 * 
 * SOLUTION:
 * 1. The HTTP controller quickly saves the application as "Pending" and pushes a job message into RabbitMQ.
 * 2. This background worker listens for messages in "job_matching_queue_v2".
 * 3. The worker processes the job asynchronously in the background without blocking users.
 */
export const startWorker = async () => {
  // Get the active RabbitMQ communication channel
  const channel = getChannel();
  if (!channel) {
    console.error("❌ Cannot start worker: RabbitMQ channel not found!");
    return;
  }

  console.log("🚀 Worker started: Waiting for resume matching tasks in 'job_matching_queue_v2'...");

  // Start consuming messages from the queue
  channel.consume("job_matching_queue_v2", async (msg: any) => {
    // If a valid message was received from RabbitMQ
    if (msg) {
      try {
        // Parse the JSON payload sent by applicationController.ts
        const data = JSON.parse(msg.content.toString());
        const { applicationId, resumeUrl, jobDescription, jobSkills, userId } = data;

        console.log("--------------------------------------------------");
        console.log(`📥 Received Job Application for Processing: ID [${applicationId}]`);

        // STEP 1: Download the PDF resume from AWS S3
        console.log("1️⃣  Downloading PDF resume from AWS S3 storage...");
        const s3Key = getS3KeyFromUrl(resumeUrl as string);

        const s3Response = await s3Client.send(
          new GetObjectCommand({
            Bucket: process.env.AWS_BUCKET_NAME || "mys3bucket-bk",
            Key: s3Key,
          })
        );

        if (!s3Response.Body) {
          throw new Error("S3 object response body is empty");
        }

        // Convert the S3 response stream into a Node.js Buffer cleanly using AWS SDK v3 built-in method
        const byteArray = await s3Response.Body.transformToByteArray();
        const pdfBuffer = Buffer.from(byteArray);
        console.log(`✅ PDF downloaded successfully (${pdfBuffer.length} bytes)`);

        // STEP 2: Extract text from the PDF file
        console.log("2️⃣  Extracting plain text from PDF resume...");
        const pdfData = await pdfParse(pdfBuffer);
        const resumeText = pdfData.text;
        console.log(`✅ PDF parsed successfully (${resumeText.length} characters extracted)`);

        // STEP 3: Analyze & Match Resume using AI (Groq / OpenAI)
        console.log("3️⃣  Analyzing resume against Job Description using AI...");
        const matchResult = await matchResumeWithJob(resumeText, jobDescription, jobSkills);
        console.log(`✅ AI Analysis Complete: Match Score = ${matchResult.matchScore}%`);

        // STEP 4: Update the application status and score in PostgreSQL Database
        console.log("4️⃣  Updating application record in database...");
        await pool.query(
          `UPDATE applications 
           SET match_score = $1, skill_summary = $2, status = $3 
           WHERE id = $4`,
          [matchResult.matchScore, matchResult.skillSummary, "Reviewed", applicationId]
        );
        console.log(`✅ Application status updated to 'Reviewed' in DB`);

        // STEP 5: Send real-time notification to the Candidate's browser via Socket.io
        console.log(`5️⃣  Sending real-time WebSockets notification to user room: user_${userId}`);
        const io = getIo();
        io.to(`user_${userId}`).emit("match-completed", {
          applicationId,
          matchScore: matchResult.matchScore,
          message: "Your resume has been matched by AI!",
        });
        console.log(`✅ Real-time socket notification sent!`);
        console.log("--------------------------------------------------");

        // ACKNOWLEDGE MESSAGE: Tells RabbitMQ that the task finished successfully, so it can delete the message from the queue.
        channel.ack(msg);
      } catch (error) {
        console.error("❌ Worker Processing Error:", error);
        
        // Even if an error occurs, acknowledge the message so it doesn't get stuck in an infinite retry loop
        channel.ack(msg);
      }
    }
  });
};
