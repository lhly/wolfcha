import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import { useMediaQuery } from "@/hooks/useMediaQuery";

function Probe() {
  const matches = useMediaQuery("(min-width: 1024px)");
  return <div>{String(matches)}</div>;
}

test("useMediaQuery returns false during SSR", () => {
  const html = renderToString(<Probe />);
  assert.match(html, /false/);
});
