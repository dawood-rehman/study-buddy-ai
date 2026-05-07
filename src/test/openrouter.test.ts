import { describe, expect, it } from "vitest";
import { OPENROUTER_MODEL_FALLBACKS, selectOpenRouterModel } from "@/lib/openrouter";

describe("selectOpenRouterModel", () => {
  it("returns an ordered fallback list for manual model preferences", () => {
    const selection = selectOpenRouterModel({
      modelPreference: "computer",
      task: "study",
      text: "Explain CSS grid with code examples.",
    });

    expect(selection.key).toBe("computer");
    expect(selection.model).toBe(OPENROUTER_MODEL_FALLBACKS.computer[0]);
    expect(selection.models.length).toBeGreaterThan(1);
    expect(selection.models.length).toBeLessThanOrEqual(2);
    expect(new Set(selection.models).size).toBe(selection.models.length);
  });

  it("uses computer fallbacks for programming prompts in auto mode", () => {
    const selection = selectOpenRouterModel({
      modelPreference: "auto",
      task: "summary",
      text: "Summarize this React and TypeScript component.",
    });

    expect(selection.key).toBe("computer");
    expect(selection.reason).toBe("computer-topic");
  });

  it("uses deep fallbacks for resume and past-paper tasks", () => {
    const selection = selectOpenRouterModel({
      modelPreference: "auto",
      task: "resume",
      text: "Improve this resume.",
    });

    expect(selection.key).toBe("deep");
    expect(selection.models).toEqual([...OPENROUTER_MODEL_FALLBACKS.deep].slice(0, 2));
  });
});
