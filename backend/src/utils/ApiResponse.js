class ApiResponse {
  constructor(statusCode, message = 'Success', data = null) {
    this.success = statusCode < 400;
    this.message = message;
    if (data !== null) {
      this.data = data;
    }
  }

  static success(res, statusCode = 200, message = 'Success', data = null) {
    return res.status(statusCode).json(new ApiResponse(statusCode, message, data));
  }
}

module.exports = ApiResponse;
