import { createFileRoute } from "@tanstack/react-router";
import { AdminPage } from "@/pages/AdminPage";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin · CorePay" },
      { name: "description", content: "Painel administrativo CorePay." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminPage,
});
