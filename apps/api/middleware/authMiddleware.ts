import jwt, { JwtPayload } from "jsonwebtoken";
import asyncHandler from "express-async-handler";
import User from "../models/userModel.js";
import { Request, Response, NextFunction } from "express";
import { HttpError } from "../utils/httpError.js";

interface DecodedToken extends JwtPayload {
  id: string;
}

// Protect routes
const protect = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      try {
        // Get token from header
        token = req.headers.authorization.split(" ")[1];

        // Check if token exists and is not empty
        if (!token || token === "undefined" || token === "null") {
          res.status(401);
          throw new Error("Not authorized, invalid token");
        }

        // Verify token
        const decoded = jwt.verify(
          token,
          process.env.JWT_SECRET!,
        ) as DecodedToken;

        // Get user from the token
        req.user = (await User.findById(decoded.id).select("-password")) as any;

        if (!req.user) {
          res.status(401);
          throw new Error("Not authorized, user not found");
        }

        // GLOBAL PREVIEW BLOCK: Block non-GET requests for preview role universally
        if (
          req.user.role === "preview" &&
          !["GET", "HEAD", "OPTIONS"].includes(req.method)
        ) {
          res.status(403);
          throw new Error(
            "You are unauthorized to perform this action in preview mode",
          );
        }

        next();
      } catch (error: any) {
        // The preview-mode block above is a 403, not an authentication failure
        if (res.statusCode === 403) throw error;

        // Better error logging for JWT issues
        if (error.name === "JsonWebTokenError") {
          console.error("JWT Error: Token is malformed or invalid");
          res.status(401);
          throw new Error("Not authorized, invalid token format", {
            cause: error,
          });
        } else if (error.name === "TokenExpiredError") {
          console.error("JWT Error: Token has expired");
          res.status(401);
          throw new Error("Not authorized, token expired", { cause: error });
        } else if (res.statusCode === 401 || error.name === "CastError") {
          // Our own token/user checks above, or a token whose id isn't valid
          res.status(401);
          throw error.name === "CastError"
            ? new Error("Not authorized, authentication failed", { cause: error })
            : error;
        } else {
          // Not a token problem (e.g. the database lookup failed). Answer 503
          // so clients retry instead of treating it as a logout-worthy 401.
          console.error("Auth error:", error.message);
          res.status(503);
          throw new HttpError(
            503,
            "Authentication is temporarily unavailable. Please try again.",
            { cause: error },
          );
        }
      }
    } else {
      res.status(401);
      throw new Error("Not authorized, no token provided");
    }
  },
);

// Helper to check if a user has admin-level access (actual admin or preview)
const hasAdminRights = (user: any) =>
  user && (user.role === "admin" || user.role === "preview");

// Admin middleware - only admin role
const admin = (req: Request, res: Response, next: NextFunction) => {
  if (hasAdminRights(req.user)) {
    next();
  } else {
    res.status(403);
    throw new Error("Not authorized as an admin");
  }
};

// Employee middleware - admin or employee role
const employee = (req: Request, res: Response, next: NextFunction) => {
  if (
    req.user &&
    (hasAdminRights(req.user) || (req.user as any).role === "employee")
  ) {
    next();
  } else {
    res.status(403);
    throw new Error("Not authorized as an employee");
  }
};

// Incharge middleware - admin or employee with incharge role
const incharge = (req: Request, res: Response, next: NextFunction) => {
  if (
    req.user &&
    (hasAdminRights(req.user) ||
      ((req.user as any).role === "employee" &&
        (req.user as any).employee_role === "incharge"))
  ) {
    next();
  } else {
    res.status(403);
    throw new Error("Not authorized as an incharge");
  }
};

// Specific employee role middleware
const requireEmployeeRole = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401);
      throw new Error("Not authenticated");
    }

    // Admin can access everything
    if (hasAdminRights(req.user)) {
      next();
      return;
    }

    // Check if user is employee with required role
    if (
      (req.user as any).role === "employee" &&
      allowedRoles.includes((req.user as any).employee_role)
    ) {
      next();
      return;
    }

    res.status(403);
    throw new Error(
      `Access denied. Required roles: ${allowedRoles.join(", ")}`,
    );
  };
};

// Specific role middleware functions
const packer = requireEmployeeRole(["packer", "incharge"]);
const deliveryman = requireEmployeeRole(["deliveryman", "incharge"]);
const accounts = requireEmployeeRole(["accounts", "incharge"]);
const callCenter = requireEmployeeRole(["call_center", "incharge"]);

// Check if user can manage roles (admin only)
const canManageRoles = (req: Request, res: Response, next: NextFunction) => {
  if (hasAdminRights(req.user)) {
    next();
  } else {
    res.status(403);
    throw new Error("Only administrators can manage user roles");
  }
};

// Check if user can assign employee roles (admin or incharge)
const canAssignEmployeeRoles = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (
    req.user &&
    (hasAdminRights(req.user) ||
      ((req.user as any).role === "employee" &&
        (req.user as any).employee_role === "incharge"))
  ) {
    next();
  } else {
    res.status(403);
    throw new Error("Only administrators or incharge can assign employee roles");
  }
};

// Middleware for cash collection - admin or deliveryman
const canCollectCash = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      console.error("❌ No user found in request");
      res.status(401);
      throw new Error("Not authenticated");
    }

    // Admin can collect cash
    if (hasAdminRights(req.user)) {
      next();
      return;
    }

    // Deliveryman can collect cash
    if (
      (req.user as any).role === "employee" &&
      ((req.user as any).employee_role === "deliveryman" ||
        (req.user as any).employee_role === "incharge")
    ) {
      next();
      return;
    }

    console.error("❌ Access denied - not admin or deliveryman", {
      role: req.user?.role,
      employee_role: (req.user as any)?.employee_role,
    });
    res.status(403);
    throw new Error("Only admin or deliveryman can collect cash payments");
  },
);

// Middleware for admin or accounts access
const adminOrAccounts = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    res.status(401);
    throw new Error("Not authenticated");
  }

  // Admin can access
  if (hasAdminRights(req.user)) {
    next();
    return;
  }

  // Accounts employee can access
  if (
    (req.user as any).role === "employee" &&
    ((req.user as any).employee_role === "accounts" ||
      (req.user as any).employee_role === "incharge")
  ) {
    next();
    return;
  }

  res.status(403);
  throw new Error("Access denied. Admin or accounts access required");
};

// Vendor middleware - admin or vendor role
const vendor = (req: Request, res: Response, next: NextFunction) => {
  if (req.user && (req.user as any).role === "vendor") {
    next();
  } else {
    res.status(403);
    throw new Error("Not authorized as a vendor");
  }
};

// Admin or Vendor middleware - admin or vendor role
const adminOrVendor = (req: Request, res: Response, next: NextFunction) => {
  if (
    req.user &&
    (hasAdminRights(req.user) || (req.user as any).role === "vendor")
  ) {
    next();
  } else {
    res.status(403);
    throw new Error("Not authorized. Admin or vendor access required");
  }
};

export {
  protect,
  admin,
  employee,
  incharge,
  packer,
  deliveryman,
  accounts,
  callCenter,
  requireEmployeeRole,
  canManageRoles,
  canAssignEmployeeRoles,
  canCollectCash,
  adminOrAccounts,
  vendor,
  adminOrVendor,
};
