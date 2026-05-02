import { Request, Response } from "express";
import { pool } from "../config/db";
import { AuthRequest } from "../middleware/auth";
import { redis } from "../services/redis";

export const createJob = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { title, description, skills, company } = req.body;

    const result = await pool.query(
      "INSERT INTO jobs (title, description, skills, company, created_by) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [title, description, skills, company, req.user!.id]
    );

    const job = result.rows[0];

    // Invalidate jobs cache
    await redis.del("syncup:jobs:all");

    // Map id to _id for frontend compatibility
    res.status(201).json({ ...job, _id: job.id, createdBy: job.created_by });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error });
  }
};

export const getJobs = async (req: Request, res: Response): Promise<void> => {
  try {
    // Check cache
    const cacheKey = "syncup:jobs:all";
    const cachedJobs = await redis.get(cacheKey);

    if (cachedJobs) {
      res.json(cachedJobs);
      return;
    }

    const result = await pool.query("SELECT * FROM jobs ORDER BY created_at DESC");
    
    // Format to match old Mongoose output
    const jobs = result.rows.map(job => ({
      ...job,
      _id: job.id,
      createdBy: job.created_by
    }));

    // Store in cache for 1 hour
    await redis.setex(cacheKey, 3600, JSON.stringify(jobs));

    res.json(jobs);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error });
  }
};

export const getJobById = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query("SELECT * FROM jobs WHERE id = $1", [req.params.id]);
    
    if (result.rows.length === 0) {
      res.status(404).json({ message: "Job not found" });
      return;
    }

    const job = result.rows[0];
    res.json({ ...job, _id: job.id, createdBy: job.created_by });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error });
  }
};
