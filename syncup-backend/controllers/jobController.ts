import { Request, Response } from "express";
import { pool } from "../config/db";
import { AuthRequest } from "../middleware/auth";
import { redis } from "../services/redis";

/**
 * REDIS CACHE KEY
 * Store all job listings under a single key in Upstash Redis
 */
const JOBS_CACHE_KEY = "syncup:jobs:all";

/**
 * API ENDPOINT: Create a new job listing (Employers only)
 * ROUTE: POST /api/jobs
 */
export const createJob = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { title, description, skills, company } = req.body;

    // 1. Input Validation
    if (!title || !description || !skills || !company) {
      res.status(400).json({ message: "All fields (title, description, skills, company) are required" });
      return;
    }

    // 2. Insert new job record into PostgreSQL database
    const result = await pool.query(
      `INSERT INTO jobs (title, description, skills, company, created_by) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [title, description, skills, company, req.user!.id]
    );
    const job = result.rows[0];

    /**
     * CACHE INVALIDATION:
     * When a new job is created, the cached list of jobs in Redis is now outdated!
     * We delete the cache key so that the next user fetching jobs will retrieve fresh data from the database.
     */
    await redis.del(JOBS_CACHE_KEY);

    // 3. Return created job formatted with _id for frontend compatibility
    res.status(201).json({ ...job, _id: job.id, createdBy: job.created_by });
  } catch (error) {
    console.error("createJob Error:", error);
    res.status(500).json({ message: "Server Error", error });
  }
};

/**
 * API ENDPOINT: Get all job listings (Public route with Redis Caching)
 * ROUTE: GET /api/jobs
 */
export const getJobs = async (req: Request, res: Response): Promise<void> => {
  try {
    /**
     * READ-THROUGH REDIS CACHING:
     * 1. Check if job listings are already stored in Redis memory.
     * 2. If cached (Cache Hit), return cached data instantly without touching PostgreSQL database!
     * 3. If not cached (Cache Miss), query database, save results in Redis for 1 hour (3600 seconds), and return.
     */
    const cachedJobs = await redis.get(JOBS_CACHE_KEY);
    if (cachedJobs) {
      console.log("⚡ Returning jobs from Redis Cache");
      res.json(cachedJobs);
      return;
    }

    console.log("🗄️ Cache miss: Querying jobs from PostgreSQL Database...");
    const result = await pool.query("SELECT * FROM jobs ORDER BY created_at DESC");

    // Format rows to match frontend expectation
    const jobs = result.rows.map((job) => ({
      ...job,
      _id: job.id,
      createdBy: job.created_by,
    }));

    // Cache the query result in Redis for 1 hour (3600 seconds)
    await redis.setex(JOBS_CACHE_KEY, 3600, JSON.stringify(jobs));

    res.json(jobs);
  } catch (error) {
    console.error("getJobs Error:", error);
    res.status(500).json({ message: "Server Error", error });
  }
};

/**
 * API ENDPOINT: Get details of a single job listing by ID
 * ROUTE: GET /api/jobs/:id
 */
export const getJobById = async (req: Request, res: Response): Promise<void> => {
  try {
    const jobId = req.params.id;

    const result = await pool.query("SELECT * FROM jobs WHERE id = $1", [jobId]);

    if (result.rows.length === 0) {
      res.status(404).json({ message: "Job listing not found" });
      return;
    }

    const job = result.rows[0];
    res.json({ ...job, _id: job.id, createdBy: job.created_by });
  } catch (error) {
    console.error("getJobById Error:", error);
    res.status(500).json({ message: "Server Error", error });
  }
};
