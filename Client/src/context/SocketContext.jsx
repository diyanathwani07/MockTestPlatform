import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    // Determine target socket server URL
    const rawUrl = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL || "http://localhost:5000";
    // Clean trailing slashes if present
    const socketUrl = rawUrl.replace(/\/+$/, "");

    console.log("[Socket] Connecting to real-time notification server at:", socketUrl);

    const newSocket = io(socketUrl, {
      auth: { token },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    newSocket.on("connect", () => {
      console.log("[Socket] Connected to real-time notification service 🟢 (ID:", newSocket.id, ")");
      setIsConnected(true);
    });

    newSocket.on("connect_error", (err) => {
      console.warn("[Socket] Real-time connection error:", err.message);
      setIsConnected(false);
    });

    newSocket.on("disconnect", (reason) => {
      console.log("[Socket] Disconnected from real-time service 🔴 (Reason:", reason, ")");
      setIsConnected(false);
    });

    // Handle token changes (e.g. login/logout in other tabs or storage event)
    const handleStorageChange = (e) => {
      if (e.key === "token") {
        const freshToken = e.newValue;
        if (!freshToken && socketRef.current) {
          socketRef.current.disconnect();
          socketRef.current = null;
          setSocket(null);
          setIsConnected(false);
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      if (newSocket) {
        newSocket.disconnect();
      }
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  return useContext(SocketContext) || { socket: null, isConnected: false };
};

export default SocketContext;
