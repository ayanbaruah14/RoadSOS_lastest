import { EventEmitter } from "events";

const globalForEvents = globalThis as unknown as { alertEmitter: EventEmitter };

if (!globalForEvents.alertEmitter) {
  globalForEvents.alertEmitter = new EventEmitter();
  globalForEvents.alertEmitter.setMaxListeners(50);
}

export const alertEmitter = globalForEvents.alertEmitter;

export const ALERT_EVENTS = {
  NEW_ALERT: "new_alert",
  ALERT_UPDATED: "alert_updated",
  ALERT_ESCALATED: "alert_escalated",
  ALERT_RESOLVED: "alert_resolved",
  SURVEY_SUBMITTED: "survey_submitted",
} as const;
