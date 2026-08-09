import pkg from "pg";
const { Pool } = pkg;

/**
 * POSTGRESQL CONNECTION POOL SETUP
 * 
 * WHY USE A CONNECTION POOL?
 * Opening a new database connection for every single HTTP request is slow and memory intensive.
 * A `Pool` maintains a reusable collection of open database connections ready to handle queries instantly!
 */
export const pool = new Pool({
  connectionString: process.env.POSTGRESQL_URI,
});

// Prevent idle connection errors from abruptly crashing the backend server process
pool.on("error", (err) => {
  console.error("Unexpected error on idle PostgreSQL client connection:", err);
});

/**
 * DATABASE INITIALIZATION
 * Automatically creates all relational database tables if they do not exist yet.
 */
export const initDB = async () => {
  try {
    const client = await pool.connect();
    
    // 1. Create USERS Table
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

    // 2. Create JOBS Table (linked to User creator via foreign key)
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

    // 3. Create APPLICATIONS Table (linking User candidate and Job listing)
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
        UNIQUE(user_id, job_id) -- Prevents a user from applying to the same job twice!
      );
    `);

    console.log("✅ PostgreSQL Database connected & tables verified successfully!");
    client.release(); // Release connection client back to pool
  } catch (err) {
    console.error("❌ Database initialization error:", err);
    process.exit(1); // Exit process if database connection fails
  }
};
