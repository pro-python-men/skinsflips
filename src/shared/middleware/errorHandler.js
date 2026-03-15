
const errorHandler = (err, _req, res, _next) => {
  const status = Number(err?.status) || 500;

  if (status >= 500) {
    console.error(err);
  }

  const payload = {
    message: err?.message || "Internal Server Error"
  };

  if (err?.details) payload.details = err.details;

  res.status(status).json(payload);
};

export default errorHandler;
