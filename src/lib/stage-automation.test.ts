import { describe, it, expect, vi } from "vitest";
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
vi.mock("@/contexts/tenant-context", () => ({ requireTenantId: () => "t" }));
import { STAGE_NEXT_TASK, nextTaskDue } from "./stage-automation";

describe("stage automation", () => {
  it("schedules proposal follow-up in 3 days, high priority", () => {
    expect(STAGE_NEXT_TASK.proposta).toMatchObject({ days: 3, prioridade: "alta" });
  });
  it("creates no task when closed or lost", () => {
    expect(STAGE_NEXT_TASK.fechado).toBeUndefined();
    expect(STAGE_NEXT_TASK.perdido).toBeUndefined();
  });
  it("due date lands N days later", () => {
    const d = new Date(nextTaskDue(2, new Date(2026, 0, 10, 15)));
    expect(d.getDate()).toBe(12);
  });
});
