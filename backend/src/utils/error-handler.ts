import type { Request, Response, NextFunction } from "express";
import ApiError from "./api-error";

/**
 * Global error handler middleware for Express.
 * Formats all errors into a standard JSON response structure.
 */
export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let error = err;

  // If the error is not an instance of ApiError, convert it
  if (!(error instanceof ApiError)) {
    const statusCode = error.statusCode || error.status || 500;
    const message = error.message || "Internal Server Error";

    // Handle Mongoose validation errors
    if (error.name === "ValidationError") {
      const details = Object.values(error.errors || {}).map((el: any) => ({
        field: el.path,
        message: el.message,
      }));
      const formattedMessage = Object.values(error.errors || {})
        .map((el: any) => el.message)
        .join(", ");
      error = new ApiError(400, `Validation Error: ${formattedMessage}`, details, error.stack);
    }
    // Handle Mongoose CastError (e.g. invalid ObjectId)
    else if (error.name === "CastError") {
      error = new ApiError(400, `Invalid ${error.path}: ${error.value}`, [], error.stack);
    }
    // Handle Mongoose Duplicate Key Error (code 11000)
    else if (error.code === 11000) {
      const match = error.errmsg ? error.errmsg.match(/(["'])(\\?.)*?\1/) : null;
      const value = match ? match[0] : "unknown";
      error = new ApiError(400, `Duplicate field value: ${value}`, [], error.stack);
    }
    // Generic fallback
    else {
      error = new ApiError(statusCode, message, error.errors || [], error.stack);
    }
  }

  // Define standard JSON error response body
  const response: any = {
    statusCode: error.statusCode,
    success: false,
    message: error.message,
    errors: error.errors || [],
  };

  // Only include stack trace in development
  if (process.env.NODE_ENV === "development") {
    response.stack = error.stack;
  }

  // Log the error to the server console
  console.error(
    `[Error] ${req.method} ${req.originalUrl} - Status: ${error.statusCode} - Message: ${error.message}`
  );
  if (error.stack) {
    console.error(error.stack);
  }

  res.status(error.statusCode).json(response);
};
