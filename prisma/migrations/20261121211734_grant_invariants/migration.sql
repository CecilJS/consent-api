-- At most ONE active (unrevoked) grant per customer per system.
-- Revoked history rows are excluded, so they never block a new grant.
CREATE UNIQUE INDEX "AccessGrant_one_active_per_system"
  ON "AccessGrant" ("customerId", "systemId")
  WHERE "revokedAt" IS NULL;

-- revokedAt and revokedById are set together or not at all.
ALTER TABLE "AccessGrant" ADD CONSTRAINT "AccessGrant_revocation_consistent"
  CHECK (("revokedAt" IS NULL) = ("revokedById" IS NULL));