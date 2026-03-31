"use client";

import { useEffect, useState } from "react";
import { TOAST_BG } from "@/lib/constants";

interface ToastProps {
  message: string;
  type?: "error" | "info";
  onClose: () => void;
}

export default function Toast({ message, type = "error", onClose }: ToastProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (type === "info") {
      const timer = setTimeout(() => {
        setVisible(false);
        setTimeout(onClose, 300);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [type, onClose]);

  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        left: "50%",
        transform: "translateX(-50%)",
        background: type === "error" ? TOAST_BG : "#3b82f6",
        color: "white",
        padding: "10px 20px",
        borderRadius: 8,
        fontSize: 14,
        display: "flex",
        alignItems: "center",
        gap: 12,
        zIndex: 1001,
        opacity: visible ? 1 : 0,
        transition: "opacity 300ms",
        boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
      }}
    >
      <span>{message}</span>
      {type === "error" && (
        <button
          onClick={onClose}
          style={{
            background: "transparent",
            border: "none",
            color: "white",
            cursor: "pointer",
            fontSize: 16,
            padding: "0 4px",
          }}
        >
          ✕
        </button>
      )}
    </div>
  );
}
