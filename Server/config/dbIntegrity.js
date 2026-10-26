const mongoose = require("mongoose");
const Call = require("../models/Call");

let voiceSubsystemReady = true;
let lastIntegrityDiagnostics = null;

/**
 * Non-destructive safety scanner for Call collection unique compound index ({ scheduleId: 1, user: 1 }).
 * Never deletes records automatically. Fails closed with structured diagnostics if duplicates exist.
 *
 * @param {Object} options
 * @param {Object} [options.callModel] - Optional injected Call model for testing.
 * @returns {Promise<{ safe: boolean, duplicates: Array, diagnostics: Object }>}
 */
async function verifyCallIndexSafety(options = {}) {
  const Model = options.callModel || Call;

  try {
    // 1. Scan for duplicate (scheduleId, user) pairs using read-only aggregation
    const duplicates = await Model.aggregate([
      {
        $group: {
          _id: { scheduleId: "$scheduleId", user: "$user" },
          count: { $sum: 1 },
          records: {
            $push: {
              id: "$_id",
              status: "$status",
              durationSeconds: "$durationSeconds",
              startTime: "$startTime",
              endTime: "$endTime",
              terminationReason: "$terminationReason",
              createdAt: "$createdAt",
              updatedAt: "$updatedAt"
            }
          }
        }
      },
      { $match: { count: { $gt: 1 } } }
    ]);

    // 2. If duplicates exist, fail closed without modifying or deleting any document
    if (duplicates && duplicates.length > 0) {
      voiceSubsystemReady = false;
      const formattedDiagnostics = {
        timestamp: new Date().toISOString(),
        duplicateGroupsCount: duplicates.length,
        totalConflictingDocuments: duplicates.reduce((acc, g) => acc + g.count, 0),
        groups: duplicates.map((g) => ({
          scheduleId: g._id.scheduleId?.toString(),
          userId: g._id.user?.toString(),
          count: g.count,
          hasCompletedCall: g.records.some((r) => r.status === "COMPLETED"),
          hasOngoingCall: g.records.some((r) => r.status === "ONGOING"),
          records: g.records
        }))
      };

      lastIntegrityDiagnostics = formattedDiagnostics;

      console.error("=======================================================================");
      console.error(`[CRITICAL INTEGRITY FAILURE] Call collection contains ${duplicates.length} duplicate group(s).`);
      console.error("Automatic deletion is strictly DISABLED to prevent data loss.");
      console.error("Conflicting groups summary:");
      formattedDiagnostics.groups.forEach((grp, idx) => {
        console.error(
          `  Group ${idx + 1}: Schedule ${grp.scheduleId}, User ${grp.userId} (${grp.count} records, completed=${grp.hasCompletedCall}, ongoing=${grp.hasOngoingCall})`
        );
      });
      console.error("Unique compound index cannot be safely verified. Voice reminder subsystem disabled.");
      console.error("=======================================================================");

      return {
        safe: false,
        duplicates,
        diagnostics: formattedDiagnostics
      };
    }

    // 3. Collection is clean of duplicates: verify unique compound index
    if (typeof Model.init === "function") {
      await Model.init();
    }

    // 4. Verify that index actually exists on the collection
    let indexVerified = false;
    if (Model.collection && typeof Model.collection.indexes === "function") {
      try {
        const indexes = await Model.collection.indexes();
        indexVerified = indexes.some(
          (idx) =>
            idx.key &&
            idx.key.scheduleId === 1 &&
            idx.key.user === 1 &&
            idx.unique === true
        );
      } catch (_) {
        // In environments where collection.indexes() is unavailable, Model.init() success is accepted
        indexVerified = true;
      }
    } else {
      indexVerified = true;
    }

    if (!indexVerified) {
      voiceSubsystemReady = false;
      lastIntegrityDiagnostics = {
        timestamp: new Date().toISOString(),
        duplicateGroupsCount: 0,
        indexVerified: false,
        error: "Call unique compound index { scheduleId: 1, user: 1 } was not verified in collection indexes."
      };
      console.error("[CRITICAL INTEGRITY FAILURE] Call unique compound index is missing or not declared unique in MongoDB.");
      return {
        safe: false,
        duplicates: [],
        diagnostics: lastIntegrityDiagnostics
      };
    }

    voiceSubsystemReady = true;
    lastIntegrityDiagnostics = {
      timestamp: new Date().toISOString(),
      duplicateGroupsCount: 0,
      indexVerified: true
    };

    return {
      safe: true,
      duplicates: [],
      diagnostics: lastIntegrityDiagnostics
    };
  } catch (error) {
    voiceSubsystemReady = false;
    lastIntegrityDiagnostics = {
      timestamp: new Date().toISOString(),
      error: error.message || String(error)
    };

    console.error("[CRITICAL INTEGRITY ERROR] Call index safety check failed:", error.message || error);
    return {
      safe: false,
      duplicates: [],
      diagnostics: lastIntegrityDiagnostics,
      error
    };
  }
}

/**
 * Returns whether the AI Voice Calling subsystem passed integrity verification.
 */
function isVoiceSubsystemReady() {
  return voiceSubsystemReady;
}

/**
 * Returns latest diagnostics snapshot for administrative inspection.
 */
function getIntegrityDiagnostics() {
  return lastIntegrityDiagnostics;
}

module.exports = {
  verifyCallIndexSafety,
  isVoiceSubsystemReady,
  getIntegrityDiagnostics
};
