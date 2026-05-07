export const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  return next(error);
};

export const errorHandler = (error, _req, res, _next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;

  return res.status(statusCode).json({
    message: error.message,
    stack: process.env.NODE_ENV === "production" ? undefined : error.stack
  });
};

