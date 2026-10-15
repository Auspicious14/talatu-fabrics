import type { AvailabilityStatus } from "./types";

export const AVAILABILITY_LABEL: Record<AvailabilityStatus, string> = {
  available: "Available",
  made_to_order: "Made to order",
  sold_out: "Sold out",
  unconfirmed: "Availability on request",
};

export const AVAILABILITY_TONE: Record<AvailabilityStatus, "ok" | "warn" | "muted"> = {
  available: "ok",
  made_to_order: "ok",
  sold_out: "muted",
  unconfirmed: "warn",
};
