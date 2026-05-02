"use client";
import { useEffect } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { socket } from "@/lib/socket";

import Swal from "sweetalert2";

export function AppInitializer({ children }: { children: React.ReactNode }) {
  const { loadUser, user } = useAuthStore();

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  useEffect(() => {
    if (user) {
      socket.connect();
      socket.emit("join-user-room", user._id);

      socket.on("match-completed", (data) => {
        Swal.fire({
          icon: 'success',
          title: `Match Completed! Score: ${data.matchScore}`,
          text: data.message,
          confirmButtonColor: '#3085d6'
        });
      });
    }

    return () => {
      socket.off("match-completed");
      socket.disconnect();
    };
  }, [user]);

  return <>{children}</>;
}
