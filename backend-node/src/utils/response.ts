import { Response } from 'express';

export function sendSuccess<T>(res: Response, data: T, statusCode: number = 200): Response {
  return res.status(statusCode).json({
    data,
    error: null,
  });
}

export function sendSuccessWithMessage<T>(
  res: Response,
  message: string,
  data: T,
  statusCode: number = 200
): Response {
  return res.status(statusCode).json({
    data,
    message,
    error: null,
  });
}

export function sendPaginatedSuccess<T>(
  res: Response,
  data: T[],
  total: number,
  page: number,
  pageSize: number,
  totalPages: number,
  statusCode: number = 200
): Response {
  return res.status(statusCode).json({
    data,
    total,
    page,
    page_size: pageSize,
    total_pages: totalPages,
    error: null,
  });
}

export function sendError(res: Response, message: string, statusCode: number = 400): Response {
  return res.status(statusCode).json({
    data: null,
    error: message,
  });
}
