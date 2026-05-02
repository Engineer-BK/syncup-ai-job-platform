import express from "express";
import { createJob, getJobs, getJobById } from "../controllers/jobController";
import { protect, authorize } from "../middleware/auth";

const router = express.Router();

router.route("/")
  .get(getJobs)
  .post(protect, authorize("Recruiter"), createJob);

router.get("/:id", getJobById);

export default router;
