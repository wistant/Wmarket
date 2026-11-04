import asyncHandler from "express-async-handler";
import { Request, Response } from "express";
import User, { IUserDocument } from "../models/userModel.js";
import generateToken from "../utils/generateToken.js";
import crypto from "node:crypto";
import { sendPasswordResetOtpEmail } from "../utils/emailService.js";
import { firebaseAuth } from "../config/firebase.js";

interface IAuthRequest extends Request {
  user?: IUserDocument;
}

const MAX_RESET_ATTEMPTS = 5;

const hashResetToken = (token: string) =>
  crypto.createHash("sha256").update(String(token)).digest("hex");

// Looks up the user by email and checks the OTP against their stored hash.
// Counts failed attempts so a 6-digit code can't be brute-forced.
const findUserWithValidResetToken = async (email: string, token: string) => {
  const user = await User.findOne({
    email: String(email).trim(),
    resetPasswordExpire: { $gt: new Date() },
  });
  if (!user || !user.resetPasswordToken) return null;

  if ((user.resetPasswordAttempts || 0) >= MAX_RESET_ATTEMPTS) {
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    user.resetPasswordAttempts = 0;
    await user.save({ validateBeforeSave: false });
    return null;
  }

  const expected = Buffer.from(user.resetPasswordToken, "hex");
  const actual = Buffer.from(hashResetToken(token), "hex");
  if (
    expected.length !== actual.length ||
    !crypto.timingSafeEqual(expected, actual)
  ) {
    user.resetPasswordAttempts = (user.resetPasswordAttempts || 0) + 1;
    await user.save({ validateBeforeSave: false });
    return null;
  }

  return user;
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
export const loginUser = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (
    !email ||
    !password ||
    typeof email !== "string" ||
    typeof password !== "string"
  ) {
    res.status(400);
    throw new Error("Please provide email and password");
  }

  const user = await User.findOne({ email });

  // Check if user exists
  if (!user) {
    res.status(401);
    throw new Error("Invalid email or password");
  }

  // Check if OAuth user without password is trying to login with password
  if (user.isOAuthUser && !user.hasSetPassword) {
    res.status(401);
    const providerName = user.authProvider
      ? user.authProvider.charAt(0).toUpperCase() + user.authProvider.slice(1)
      : "OAuth";
    throw new Error(
      `This account uses ${providerName} sign-in. Please use ${providerName} to login, or set a password first from your profile.`,
    );
  }

  // Verify password
  if (await user.matchPassword(password)) {
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      role: user.role,
      employee_role: user.employee_role,
      addresses: user.addresses || [],
      isOAuthUser: user.isOAuthUser || false,
      authProvider: user.authProvider || "local",
      hasSetPassword: user.hasSetPassword || true,
      token: generateToken(user._id.toString()),
    });
  } else {
    res.status(401);
    throw new Error("Invalid email or password");
  }
});

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
export const registerUser = asyncHandler(
  async (req: Request, res: Response) => {
    const { name, email, password } = req.body;

    if (!email || typeof email !== "string") {
      res.status(400);
      throw new Error("Please provide a valid email");
    }

    const userExists = await User.findOne({ email });

    if (userExists) {
      if (userExists.isOAuthUser && !userExists.hasSetPassword) {
        const providerName = userExists.authProvider
          ? userExists.authProvider.charAt(0).toUpperCase() +
            userExists.authProvider.slice(1)
          : "OAuth";
        res.status(400).json({
          success: false,
          message: `This email is already registered with ${providerName}. Please sign in with ${providerName}, or set a password from your profile to use email/password login.`,
        });
        return;
      }
      res.status(400).json({ message: "User already exists" });
      return;
    }

    const user = await User.create({
      name,
      email,
      password,
      role: "user",
      employee_role: null,
      addresses: [],
    });

    if (user) {
      res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
        employee_role: user.employee_role,
        addresses: user.addresses,
        isOAuthUser: user.isOAuthUser || false,
        authProvider: user.authProvider || "local",
        hasSetPassword: user.hasSetPassword || true,
        token: generateToken(user._id.toString()),
      });
    } else {
      res.status(400);
      throw new Error("Invalid user data");
    }
  },
);

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
export const getUserProfile = asyncHandler(
  async (req: IAuthRequest, res: Response) => {
    if (!req.user) {
      res.status(401);
      throw new Error("Not authorized");
    }
    const user = await User.findById(req.user._id);

    if (user) {
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
        employee_role: user.employee_role,
        addresses: user.addresses || [],
        isOAuthUser: user.isOAuthUser || false,
        authProvider: user.authProvider || "local",
        hasSetPassword: user.hasSetPassword || true,
      });
    } else {
      res.status(404);
      throw new Error("User not found");
    }
  },
);

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
export const logoutUser = asyncHandler(async (req: Request, res: Response) => {
  res.json({
    success: true,
    message: "Logged out successfully",
  });
});

// @desc    OAuth authentication (Google/GitHub)
// @route   POST /api/auth/oauth
// @access  Public
export const oauthAuthentication = asyncHandler(
  async (req: Request, res: Response) => {
    const { authProvider, idToken } = req.body ?? {};
    const avatar: string | undefined =
      typeof req.body?.avatar === "string" ? req.body.avatar : undefined;

    if (!idToken || !authProvider) {
      return res.status(400).json({
        success: false,
        message: "ID Token and auth provider are required",
      });
    }

    if (!["google", "github", "facebook"].includes(authProvider)) {
      return res.status(400).json({
        success: false,
        message: "Unsupported authentication provider",
      });
    }

    try {
      if (!firebaseAuth) {
        console.error("Firebase Admin is not initialized.");
        return res.status(503).json({
          success: false,
          message: "Internal server error: auth provider not configured",
        });
      }

      let decodedToken;
      try {
        decodedToken = await firebaseAuth.verifyIdToken(idToken);
      } catch (error) {
        console.error("Firebase token verification failed:", error);
        return res.status(401).json({
          success: false,
          message: "Invalid or expired authentication token",
        });
      }

      const email = decodedToken.email;
      const authUid = decodedToken.uid;
      const name = String(
        decodedToken.name || req.body.name || email?.split("@")[0] || "User",
      );

      if (!email) {
        return res.status(400).json({
          success: false,
          message: "Email is required from OAuth provider",
        });
      }

      if (!decodedToken.email_verified) {
        return res.status(403).json({
          success: false,
          message: "Your email address must be verified with your sign-in provider",
        });
      }

      const signInProvider = decodedToken.firebase?.sign_in_provider || "";
      if (!signInProvider.startsWith(authProvider)) {
        return res.status(400).json({
          success: false,
          message: "Auth provider does not match the authentication token",
        });
      }

      console.log("OAuth authentication request:", {
        email,
        authProvider,
        hasAvatar: !!avatar,
        avatarLength: avatar ? avatar.length : 0,
      });

      let user = await User.findOne({ email });

      if (user) {
        if (
          user.isOAuthUser &&
          user.authProvider === authProvider &&
          user.authUid === authUid
        ) {
          user.name = name || user.name;
          if (avatar && avatar.trim() !== "") {
            user.avatar = avatar;
          }
          await user.save();

          res.json({
            success: true,
            data: {
              _id: user._id,
              name: user.name,
              email: user.email,
              avatar: user.avatar,
              role: user.role,
              addresses: user.addresses || [],
              isOAuthUser: user.isOAuthUser,
              authProvider: user.authProvider,
              hasSetPassword: user.hasSetPassword,
              token: generateToken(user._id.toString()),
            },
          });
          return;
        } else if (user.isOAuthUser && user.authProvider !== authProvider) {
          const existingProvider = user.authProvider
            ? user.authProvider.charAt(0).toUpperCase() +
              user.authProvider.slice(1)
            : "another provider";
          return res.status(409).json({
            success: false,
            message: `This email is already registered using ${existingProvider}. Please sign in with ${existingProvider} instead.`,
          });
        } else if (!user.isOAuthUser) {
          console.log(
            `Linking ${authProvider} OAuth to existing password-based account:`,
            email,
          );
          user.isOAuthUser = true;
          user.authProvider = authProvider;
          user.authUid = authUid;
          user.hasSetPassword = true;

          if (name && name.trim() !== "") {
            user.name = name;
          }
          if (avatar && avatar.trim() !== "") {
            user.avatar = avatar;
          }

          await user.save();

          res.json({
            success: true,
            message: `Your ${
              authProvider.charAt(0).toUpperCase() + authProvider.slice(1)
            } account has been linked to your existing account. You can now sign in using either your password or ${
              authProvider.charAt(0).toUpperCase() + authProvider.slice(1)
            }.`,
            data: {
              _id: user._id,
              name: user.name,
              email: user.email,
              avatar: user.avatar,
              role: user.role,
              addresses: user.addresses || [],
              isOAuthUser: user.isOAuthUser,
              authProvider: user.authProvider,
              hasSetPassword: user.hasSetPassword,
              token: generateToken(user._id.toString()),
            },
          });
          return;
        } else {
          if (user.authProvider === authProvider && authProvider === "google") {
            console.log(
              `Updating Google OAuth UID for ${email}: ${user.authUid} → ${authUid}`,
            );
            user.authUid = authUid;
            if (name && name.trim() !== "") {
              user.name = name;
            }
            if (avatar && avatar.trim() !== "") {
              user.avatar = avatar;
            }
            await user.save();

            return res.json({
              success: true,
              message: "Google account UID updated successfully.",
              data: {
                _id: user._id,
                name: user.name,
                email: user.email,
                avatar: user.avatar,
                role: user.role,
                addresses: user.addresses || [],
                isOAuthUser: user.isOAuthUser,
                authProvider: user.authProvider,
                hasSetPassword: user.hasSetPassword,
                token: generateToken(user._id.toString()),
              },
            });
          }
          return res.status(409).json({
            success: false,
            message: "Authentication mismatch. Please contact support",
          });
        }
      } else {
        const defaultAvatar =
          process.env.DEFAULT_USER_IMAGE ||
          "https://res.cloudinary.com/dcs9nphcp/image/upload/v1759859570/defaultUserImage_dzrcwx.png";

        const userAvatar =
          avatar && avatar.trim() !== "" ? avatar : defaultAvatar;

        user = await User.create({
          name: name || email.split("@")[0],
          email,
          avatar: userAvatar,
          role: "user",
          isOAuthUser: true,
          authProvider,
          authUid,
          hasSetPassword: false,
          addresses: [],
        });

        res.status(201).json({
          success: true,
          data: {
            _id: user._id,
            name: user.name,
            email: user.email,
            avatar: user.avatar,
            role: user.role,
            addresses: user.addresses,
            isOAuthUser: user.isOAuthUser,
            authProvider: user.authProvider,
            hasSetPassword: user.hasSetPassword,
            token: generateToken(user._id.toString()),
          },
        });
      }
    } catch (error: any) {
      console.error("OAuth authentication error:", error);
      console.error("Error details:", {
        message: error.message,
        stack: error.stack,
        name: error.name,
      });
      return res.status(500).json({
        success: false,
        message: "OAuth authentication failed",
      });
    }
  },
);

// @desc    Set password for OAuth user
// @route   POST /api/auth/set-password
// @access  Private
export const setPasswordForOAuthUser = asyncHandler(
  async (req: IAuthRequest, res: Response) => {
    const { password } = req.body;

    if (!password || typeof password !== "string" || password.length < 6) {
      res.status(400);
      throw new Error("Password must be at least 6 characters long");
    }

    if (!req.user) {
      res.status(401);
      throw new Error("Not authorized");
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      res.status(404);
      throw new Error("User not found");
    }

    user.password = password;
    user.hasSetPassword = true;
    await user.save();

    res.json({
      success: true,
      message: "Password set successfully",
      data: {
        hasSetPassword: user.hasSetPassword,
      },
    });
  },
);

// @desc    Forgot password - send reset email
// @route   POST /api/auth/forgot-password
// @access  Public
export const forgotPassword = asyncHandler(
  async (req: Request, res: Response) => {
    const { email } = req.body;

    if (!email || typeof email !== "string") {
      res.status(400);
      throw new Error("Please provide an email address");
    }

    const user = await User.findOne({ email });

    if (!user) {
      res.status(404).json({ message: "You are not registered yet." });
      return;
    }

    if (user.isOAuthUser) {
      const providerName = user.authProvider
        ? user.authProvider.charAt(0).toUpperCase() + user.authProvider.slice(1)
        : "an OAuth Provider";
      res.status(400).json({
        message: `You are registered with ${providerName}. Please log in using ${providerName}.`,
      });
      return;
    }

    const resetToken = crypto.randomInt(100000, 1000000).toString();

    user.resetPasswordToken = hashResetToken(resetToken);
    user.resetPasswordAttempts = 0;
    user.resetPasswordExpire = new Date(Date.now() + 15 * 60 * 1000);

    await user.save({ validateBeforeSave: false });

    try {
      await sendPasswordResetOtpEmail(user.email, user.name, resetToken);

      res.status(200).json({
        success: true,
        message: "Password reset email sent",
        data: {
          message: `Email sent to ${user.email}`,
        },
      });
    } catch (error: any) {
      console.error("Error sending password reset email:", error);
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save({ validateBeforeSave: false });

      res.status(500);
      throw new Error("Email could not be sent", { cause: error });
    }
  },
);

// @desc    Reset password
// @route   POST /api/auth/reset-password
// @access  Public
export const resetPassword = asyncHandler(
  async (req: Request, res: Response) => {
    const { email, token, password } = req.body;

    if (!email || !token || !password) {
      res.status(400);
      throw new Error("Please provide email, token and password");
    }

    if (typeof password !== "string" || password.length < 6) {
      res.status(400);
      throw new Error("Password must be at least 6 characters");
    }

    const user = await findUserWithValidResetToken(email, token);

    if (!user) {
      res.status(400);
      throw new Error("Invalid or expired reset token");
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    user.resetPasswordAttempts = 0;
    user.hasSetPassword = true;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Password reset successful",
      data: {
        message: "Password has been reset successfully",
      },
    });
  },
);

// @desc    Verify OTP
// @route   POST /api/auth/verify-otp
// @access  Public
export const verifyOtp = asyncHandler(async (req: Request, res: Response) => {
  const { email, token } = req.body;

  if (!email || !token) {
    res.status(400);
    throw new Error("Please provide email and token");
  }

  const user = await findUserWithValidResetToken(email, token);

  if (!user) {
    res.status(400);
    throw new Error("Invalid or expired reset token");
  }

  res.status(200).json({
    success: true,
    message: "Token is valid",
  });
});
