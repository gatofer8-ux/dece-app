import { describe, it, expect } from "vitest";
import { ALERT_NOTIFICATION_CHECKLIST, ALERT_NOTIFICATION_INTERVENTION_QUESTIONS } from "./alertNotificationForm";

describe("alertNotificationForm", () => {
  it("tiene las 12 categorías fijas del formato original", () => {
    expect(ALERT_NOTIFICATION_CHECKLIST).toHaveLength(12);
  });

  it("tiene las 5 preguntas fijas de intervención", () => {
    expect(ALERT_NOTIFICATION_INTERVENTION_QUESTIONS).toHaveLength(5);
  });
});
