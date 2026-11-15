/** An error with an HTTP status that is safe to show to the client. */
export class ApiError extends Error {
  /**
   * @param {number} status HTTP status code
   * @param {string} message Message shown to the user
   * @param {Array<{field?: string, message: string}>} [details] Field-level validation errors
   */
  constructor(status, message, details) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}
