import { NextRequest } from "next/server";

const getUpstreamBase = () => {
  return (
    process.env.BACKEND_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    "http://localhost:5000"
  );
};

async function proxy(req: NextRequest, params: Promise<{ path: string[] }>) {
  const { path } = await params;
  const upstreamBase = getUpstreamBase().replace(/\/+$/, "");
  const upstreamUrl = new URL(`${upstreamBase}/auth/${path.join("/")}`);
  upstreamUrl.search = new URL(req.url).search;

  const headers = new Headers(req.headers);
  headers.delete("host");

  const init: RequestInit = {
    method: req.method,
    headers,
    body:
      req.method === "GET" || req.method === "HEAD"
        ? undefined
        : await req.arrayBuffer(),
    redirect: "manual",
  };

  try {
    const res = await fetch(upstreamUrl, init);
    const resHeaders = new Headers(res.headers);
    return new Response(res.body, { status: res.status, headers: resHeaders });
  } catch (e) {
    const message =
      e && typeof e === "object" && "message" in e
        ? String((e as { message?: unknown }).message)
        : "Upstream unavailable";
    return Response.json(
      {
        error: "AUTH_UPSTREAM_UNAVAILABLE",
        message,
        hint:
          "Set BACKEND_URL (or NEXT_PUBLIC_BACKEND_URL) in your Vercel env to your deployed backend, e.g. https://your-backend.com",
      },
      { status: 502 }
    );
  }
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return proxy(req, ctx.params);
}
export async function POST(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return proxy(req, ctx.params);
}
export async function PUT(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return proxy(req, ctx.params);
}
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return proxy(req, ctx.params);
}
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return proxy(req, ctx.params);
}

