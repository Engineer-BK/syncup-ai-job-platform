import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

/**
 * EXTENDING EXPRESS REQUEST TYPE
 * We extend standard Express Request to attach the authenticated `user` payload.
 * This allows downstream route controllers (like applicationController) to access `req.user.id`.
 */
export interface AuthRequest extends Request {
  user?: {
    id: string;
    role: string;
  };
}

/**
 * AUTHENTICATION MIDDLEWARE: protect
 * 
 * HOW IT WORKS:
 * 1. Inspects incoming HTTP headers for `Authorization: Bearer <jwt_token>`.
 * 2. Decodes and verifies the signature of the JWT using our secret key.
 * 3. Attaches decoded user info (`id` and `role`) to `req.user`.
 * 4. Calls `next()` to let the request proceed to the route controller.
 */
export const protect = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  let token: string | undefined;

  // Check if Authorization header exists and starts with "Bearer "
  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    try {
      // Split header string: "Bearer <token>" -> token is at index 1
      token = req.headers.authorization.split(" ")[1];

      // Decode and verify token signature
      const decoded = jwt.verify(
        token as string,
        (process.env.JWT_SECRET || "default_secret") as string
      ) as unknown as { id: string; role: string };

      // Attach user payload to request object
      req.user = {
        id: decoded.id,
        role: decoded.role,
      };

      // Proceed to the next middleware or route handler
      next();
      return;
    } catch (error) {
      console.error("JWT Verification Failed:", error);
      res.status(401).json({ message: "Not authorized, invalid token" });
      return;
    }
  }

  // If no token was provided in header
  if (!token) {
    res.status(401).json({ message: "Not authorized, token missing" });
    return;
  }
};

/**
 * AUTHORIZATION MIDDLEWARE: authorize(...roles)
 * 
 * HIGHER-ORDER FUNCTION:
 * Accepts allowed user roles (e.g. authorize('Employer')) and returns a middleware function.
 * Ensures the logged-in user has permission to access role-restricted API endpoints.
 */
export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ message: `User role '${req.user?.role}' is not authorized to perform this action` });
      return;
    }
    next();
  };
};
