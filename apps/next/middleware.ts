import { NextResponse } from 'next/server.js';

export function middleware() {
  NextResponse.next();
}
