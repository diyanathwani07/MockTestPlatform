const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Schedule = require("../models/Schedule");
const Call = require("../models/Call");

let io = null;

/**
 * Initializes Socket.IO with the existing HTTP server and configures authentication and room routing.
 */
function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: true, // Accepts client origin dynamically (matching Express cors config)
      credentials: true,
      methods: ["GET", "POST"]
    },
    pingTimeout: 60000,
    pingInterval: 25000
  });

  // Socket Authentication Middleware via JWT
  io.use(async (socket, next) => {
    try {
      let token = socket.handshake.auth?.token || socket.handshake.headers?.authorization;

      if (!token) {
        return next(new Error("Authentication error: No token provided."));
      }

      if (token.startsWith("Bearer ")) {
        token = token.slice(7).trim();
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (!decoded || !decoded.id) {
        return next(new Error("Authentication error: Invalid token payload."));
      }

      const user = await User.findById(decoded.id).select("-password");
      if (!user) {
        return next(new Error("Authentication error: User not found."));
      }

      if (user.status === "Suspended" || user.isDeleted) {
        return next(new Error("Authentication error: User account is inactive."));
      }

      // Attach verified user object to socket instance
      socket.user = user;
      next();
    } catch (err) {
      console.error("[SocketAuth Error] Handshake auth failed:", err.message);
      return next(new Error("Authentication error: Invalid or expired token."));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.user._id.toString();
    const role = socket.user.role || "user";
    const department = socket.user.department;

    // 1. Join private individual user room
    const userRoom = `user:${userId}`;
    socket.join(userRoom);

    // 2. Join role-specific rooms (admin/superadmin/manager/employee)
    const isStaff = ["admin", "superadmin", "manager", "employee"].includes(role);
    if (isStaff) {
      socket.join("admin");
    }

    // 3. Join department room if assigned
    if (department) {
      socket.join(`department:${department}`);
    }

    console.log(`[Socket] Connected: ${socket.user.fullName} (${userId}) | Role: ${role}${department ? ` | Dept: ${department}` : ""}`);

    // Socket Signaling: Accept Call (Phase 5)
    socket.on("accept-call", async (payload = {}) => {
      try {
        const { scheduleId } = payload;
        if (!scheduleId) return;

        const schedule = await Schedule.findOne({ _id: scheduleId, user: socket.user._id });
        if (!schedule || schedule.status === "CANCELLED") return;

        let call = await Call.findOne({ scheduleId: schedule._id, user: socket.user._id });
        if (!call) {
          call = await Call.create({
            user: socket.user._id,
            scheduleId: schedule._id,
            callType: schedule.callType || "TASK_REMINDER",
            status: "ONGOING",
            startTime: new Date()
          });
        } else if (["INITIATED", "RINGING"].includes(call.status)) {
          call.status = "ONGOING";
          call.startTime = call.startTime || new Date();
          await call.save();
        }

        if (!schedule.metadata) schedule.metadata = new Map();
        schedule.metadata.set("acceptedAt", new Date().toISOString());
        schedule.metadata.set("activeCallId", call._id.toString());
        schedule.status = "COMPLETED";
        await schedule.save();

        emitToUser(socket.user._id, "call-accepted", {
          callId: call._id,
          scheduleId: schedule._id,
          taskTitle: schedule.taskTitle,
          taskDescription: schedule.taskDescription,
          reminderAudioText: schedule.reminderAudioText,
          durationSeconds: schedule.audioDurationSeconds || 0
        });
      } catch (err) {
        console.error("[Socket] accept-call error:", err.message);
      }
    });

    // Socket Signaling: End Call (Phase 5)
    socket.on("end-call", async (payload = {}) => {
      try {
        const { callId, terminationReason } = payload;
        if (!callId) return;

        const call = await Call.findOne({ _id: callId, user: socket.user._id });
        if (!call || ["COMPLETED", "REJECTED", "MISSED", "FAILED"].includes(call.status)) return;

        call.status = "COMPLETED";
        call.endTime = new Date();
        call.terminationReason = terminationReason || "USER_HANGUP";
        if (call.startTime) {
          call.durationSeconds = Math.max(0, Math.round((call.endTime.getTime() - call.startTime.getTime()) / 1000));
        }
        await call.save();

        emitToUser(socket.user._id, "call-ended", {
          callId: call._id,
          scheduleId: call.scheduleId,
          durationSeconds: call.durationSeconds,
          terminationReason: call.terminationReason
        });
      } catch (err) {
        console.error("[Socket] end-call error:", err.message);
      }
    });

    socket.on("disconnect", (reason) => {
      console.log(`[Socket] Disconnected: ${socket.user.fullName} (${userId}) | Reason: ${reason}`);
    });
  });

  return io;
}

/**
 * Returns the active Socket.IO server instance.
 */
function getIO() {
  if (!io) {
    console.warn("[SocketService] getIO() called before Socket.IO was initialized.");
  }
  return io;
}

/**
 * Emits a real-time event to a specific user's private room.
 */
function emitToUser(userId, event, data) {
  if (!io) return;
  const targetRoom = `user:${userId.toString()}`;
  io.to(targetRoom).emit(event, data);
}

/**
 * Emits a real-time event to all staff/admin members.
 */
function emitToAdmin(event, data) {
  if (!io) return;
  io.to("admin").emit(event, data);
}

/**
 * Emits a real-time event to members of a specific department.
 */
function emitToDepartment(department, event, data) {
  if (!io || !department) return;
  io.to(`department:${department}`).emit(event, data);
}

/**
 * Broadcasts an event to all connected users.
 */
function emitToAll(event, data) {
  if (!io) return;
  io.emit(event, data);
}

module.exports = {
  initSocket,
  getIO,
  emitToUser,
  emitToAdmin,
  emitToDepartment,
  emitToAll
};
