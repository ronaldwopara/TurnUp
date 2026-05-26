import { NextResponse } from "next/server";

export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ data }, { status });
}

export function badRequest(message: string, details?: unknown) {
  return NextResponse.json(
    {
      error: {
        code: "BAD_REQUEST",
        message,
        details,
      },
    },
    { status: 400 }
  );
}

export function serverError(message: string, details?: unknown, status = 500) {
  return NextResponse.json(
    {
      error: {
        code: "INTERNAL_ERROR",
        message,
        details,
      },
    },
    { status }
  );
}
