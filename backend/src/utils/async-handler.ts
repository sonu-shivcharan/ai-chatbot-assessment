import type { Request, Response, NextFunction } from "express";

type AsyncRequestHandler = (
  req: Request,

  res: Response,

  next: NextFunction,
) => Promise<any>;

function asyncHandler(requestFn: AsyncRequestHandler) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(requestFn(req, res, next)).catch((err) => next(err));
  };
}

export { asyncHandler };
