import prisma from "../db.js";

// Records who changed what. Pass the transaction as `client` when there is one,
// so the entry is committed or rolled back together with the change. Outside a
// transaction a failed entry is only logged.
export async function audit(client, req, action, entity, entityId = null, details = null) {
  try {
    await (client || prisma).auditLog.create({
      data: {
        actorId: req?.user?.id || null,
        actorName: req?.user?.name || null,
        action,
        entity,
        entityId,
        details: details ?? undefined,
      },
    });
  } catch (err) {
    console.error("[Audit] failed to record", action, err.message);
  }
}
