import pkg from "pg";
const { Pool } = pkg;
import crypto from "crypto";

export const pool = new Pool({
  connectionString: process.env.POSTGRESQL_URI,
});

// Prevent unhandled errors on idle clients from crashing the server
pool.on("error", (err) => {
  console.error("Unexpected error on idle client", err);
});

export const initDB = async () => {
  try {
    const client = await pool.connect();
    
    // Create Users Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'Job Seeker',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create Jobs Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS jobs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        skills TEXT[] NOT NULL,
        company VARCHAR(255) NOT NULL,
        created_by UUID REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create Applications Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS applications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
        resume_url TEXT NOT NULL,
        match_score FLOAT,
        skill_summary TEXT,
        status VARCHAR(50) DEFAULT 'Pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, job_id)
      );
    `);

    console.log("PostgreSQL Connected & Tables verified");
    client.release();
  } catch (err) {
    console.error("Database connection/init error", err);
    process.exit(1);
  }
};
