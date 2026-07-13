import { createFileRoute } from "@tanstack/react-router";
import { HomePage } from "@/pages/HomePage";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Início · CorePay" },
      { name: "description", content: "Saldo, movimentações e desempenho da sua carteira CorePay." },
    ],
  }),
  component: HomePage,
});
