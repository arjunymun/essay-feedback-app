import { describe, expect, it } from "vitest";

import { formatCurrency, getCreditPack } from "@/lib/billing";
import { STARTER_PACK_KEY } from "@/lib/constants";

describe("billing configuration", () => {
  it("returns the configured starter pack", () => {
    const pack = getCreditPack(STARTER_PACK_KEY);

    expect(pack).not.toBeNull();
    expect(pack?.credits).toBe(10);
    expect(pack?.unitAmount).toBe(599);
    expect(pack?.currency).toBe("usd");
  });

  it("formats pack pricing for display", () => {
    expect(formatCurrency(599, "usd")).toBe("$5.99");
  });
});
