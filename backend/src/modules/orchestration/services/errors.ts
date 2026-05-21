export function httpError(statusCode: number, code: string) {
  const error = new Error(code) as Error & { statusCode: number; code: string };
  error.statusCode = statusCode;
  error.code = code;
  return error;
}
