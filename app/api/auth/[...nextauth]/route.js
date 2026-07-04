import { NextResponse } from "next/server"
import { handlers } from "@/auth"

function handleCORS(response) {
  if (!response) return response
  const res = new Response(response.body, response)
  const origin = process.env.CORS_ORIGINS || process.env.NEXTAUTH_URL || process.env.AUTH_URL || "*"
  res.headers.set("Access-Control-Allow-Origin", origin)
  res.headers.set("Access-Control-Allow-Credentials", "true")
  res.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
  res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, Cookie, X-Auth-Return-Redirect")
  return res
}

export async function GET(req) {
  const res = await handlers.GET(req)
  return handleCORS(res)
}

export async function POST(req) {
  const res = await handlers.POST(req)
  return handleCORS(res)
}

export async function OPTIONS() {
  return handleCORS(new NextResponse(null, { status: 200 }))
}
