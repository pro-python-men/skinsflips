
const errorHandler = (err, _req, res, _next) => {
  const status = Number(err?.status) || 500;
  const isProduction = process.env.NODE_ENV === "production";

  if (status >= 500) {
    console.error(err);
  }

  const payload = {
    message:
      isProduction && status >= 500
        ? "Internal Server Error"
        : err?.message || "Internal Server Error"
  };

  if (!isProduction && err?.details) payload.details = err.details;

  res.status(status).json(payload);
};

export default errorHandler;
