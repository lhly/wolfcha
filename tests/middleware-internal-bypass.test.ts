import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { middleware } from "@/middleware";

const INTERNAL_HEADER = "x-wolfcha-internal";

function makeRequest(headers?: Record<string, string>) {
  return new NextRequest("http://localhost:3001/api/chat", {
    headers: headers ? new Headers(headers) : undefined,
  });
}

test("middleware allows internal api requests without totp", () => {
  const req = makeRequest({ [INTERNAL_HEADER]: "1" });
  const res = middleware(req);
  assert.equal(res?.status, 200);
});

test("middleware still blocks api requests without totp", () => {
  const req = makeRequest();
  const res = middleware(req);
  assert.equal(res?.status, 401);
});
