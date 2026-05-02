import { getChannel } from "../services/queue";
import { matchResumeWithJob } from "../services/openai";
import { pool } from "../config/db";
import { getIo } from "../sockets";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
const pdfParse = require("pdf-parse"); // v1.1.1

// Configure AWS S3 Client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || "eu-north-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

const streamToBuffer = (stream: any): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on("data", (chunk: Buffer) => chunks.push(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve(Buffer.concat(chunks)));
  });

export const startWorker = async () => {
  const channel = getChannel();
  if (!channel) {
    console.error("Cannot start worker: Channel not found");
    return;
  }

  console.log("Worker waiting for messages in job_matching_queue_v2");

  channel.consume("job_matching_queue_v2", async (msg: any) => {
    if (msg) {
      try {
        const data = JSON.parse(msg.content.toString());
        console.log("-------------------------------");
        console.log(`Received message in job_matching_queue:`, { applicationId: data.applicationId, resumeUrl: data.resumeUrl });
        const { applicationId, resumeUrl, jobDescription, jobSkills, userId } = data;

        // 1. Download PDF from S3 URL securely using AWS SDK
        console.log("1. Downloading PDF from S3 securely...");
        const key = resumeUrl.split('.com/')[1];
        if (!key) throw new Error("Invalid S3 URL");

        const command = new GetObjectCommand({
          Bucket: process.env.AWS_BUCKET_NAME || "mys3bucket-bk",
          Key: key,
        });

        const response = await s3Client.send(command);
        const pdfBuffer = await streamToBuffer(response.Body);
        console.log("PDF downloaded, buffer size:", pdfBuffer.length);

        // 2. Parse PDF to text
        console.log("2. Parsing PDF to text...");
        const pdfData = await pdfParse(pdfBuffer);
        const resumeText = pdfData.text;
        console.log("PDF parsed successfully. Text length:", resumeText.length);

        // 3. Match using OpenAI
        console.log("3. Calling OpenAI for matching...");
        const matchResult = await matchResumeWithJob(resumeText, jobDescription, jobSkills);
        console.log("OpenAI match result:", matchResult);

        // 4. Update Application in DB
        console.log("4. Updating application in DB...");
        const updateResult = await pool.query(
          "UPDATE applications SET match_score = $1, skill_summary = $2, status = $3 WHERE id = $4 RETURNING *",
          [matchResult.matchScore, matchResult.skillSummary, "Reviewed", applicationId]
        );
        console.log("DB update result success for ID:", applicationId);

        // 5. Emit Socket Event
        console.log("5. Emitting socket event to user:", userId);
        const io = getIo();
        io.to(`user_${userId}`).emit("match-completed", {
          applicationId,
          matchScore: matchResult.matchScore,
          message: "Your resume has been matched!"
        });

        console.log(`Successfully processed application ${applicationId}`);
        console.log("-------------------------------");
        channel.ack(msg);
      } catch (error) {
        console.error("Worker Processing Error:", error);
        channel.ack(msg);
      }
    }
  });
};
