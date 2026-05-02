import express from "express";
import { applyForJob, getJobApplications, getUserApplications, deleteApplication } from "../controllers/applicationController";
import { protect, authorize } from "../middleware/auth";
import upload from "../middleware/upload";

const router = express.Router();

router.post("/:jobId/apply", protect, authorize("Job Seeker"), upload.single("resume"), applyForJob);
router.get("/job/:jobId", protect, authorize("Recruiter"), getJobApplications);
router.get("/user", protect, authorize("Job Seeker"), getUserApplications);
router.delete("/:appId", protect, authorize("Job Seeker"), deleteApplication);

export default router;
