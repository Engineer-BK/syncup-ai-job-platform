import { Request, Response } from "express";
import { pool } from "../config/db";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

/**
 * HELPER: Generate a JSON Web Token (JWT)
 * Stores user ID and role inside an encrypted token payload that expires in 30 days.
 */
const generateToken = (id: string, role: string): string => {
  return jwt.sign(
    { id, role }, 
    process.env.JWT_SECRET || "default_secret", 
    { expiresIn: "30d" }
  );
};

/**
 * API ENDPOINT: Register a new user account
 * ROUTE: POST /api/auth/register
 */
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password, role } = req.body;

    // 1. Basic validation
    if (!name || !email || !password) {
      res.status(400).json({ message: "Name, email, and password are required" });
      return;
    }

    // 2. Check if email already exists in database
    const userCheck = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
    if (userCheck.rows.length > 0) {
      res.status(400).json({ message: "An account with this email already exists" });
      return;
    }

    // 3. Hash password using bcrypt for security (never store plain-text passwords!)
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 4. Save new user record in PostgreSQL database
    const result = await pool.query(
      `INSERT INTO users (name, email, password, role) 
       VALUES ($1, $2, $3, $4) 
       RETURNING id, name, email, role`,
      [name, email, hashedPassword, role || "Job Seeker"]
    );

    const user = result.rows[0];

    // 5. Send user data back with JWT authentication token
    res.status(201).json({
      _id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken(user.id, user.role),
    });
  } catch (error) {
    console.error("Registration Error:", error);
    res.status(500).json({ message: "Server Error", error });
  }
};

/**
 * API ENDPOINT: Authenticate existing user & obtain JWT token
 * ROUTE: POST /api/auth/login
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    // 1. Find user by email
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    if (result.rows.length === 0) {
      res.status(401).json({ message: "Invalid email or password" });
      return;
    }

    const user = result.rows[0];

    // 2. Verify entered password against hashed password stored in DB
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      res.status(401).json({ message: "Invalid email or password" });
      return;
    }

    // 3. Login successful: return user details & new JWT token
    res.json({
      _id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken(user.id, user.role),
    });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ message: "Server Error", error });
  }
};
