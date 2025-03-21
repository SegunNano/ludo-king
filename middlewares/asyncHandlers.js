const catchAsync = (func) => {
  return (req, res, next) => {
    func(req, res, next).catch(next);
  };
};
class ExpressError extends Error {
  constructor(message, statusCode) {
    super();
    this.message = message;
    this.statusCode = statusCode;
  }
}

export { catchAsync, ExpressError };
