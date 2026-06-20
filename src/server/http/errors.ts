/** Application error with an HTTP status, stable code, and optional field errors. */
export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number = 400,
    public fieldErrors?: Record<string, string[]>,
  ) {
    super(message);
    this.name = "AppError";
  }

  static notFound(message = "Not found") {
    return new AppError("not_found", message, 404);
  }
  static badRequest(message = "Bad request") {
    return new AppError("bad_request", message, 400);
  }
  static conflict(message = "Conflict") {
    return new AppError("conflict", message, 409);
  }
  static unprocessable(message = "Unprocessable", fieldErrors?: Record<string, string[]>) {
    return new AppError("unprocessable", message, 422, fieldErrors);
  }
}
