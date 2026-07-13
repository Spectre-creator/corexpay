import { createFileRoute } from "@tanstack/react-router";
import { ExtratoPage } from "@/pages/ExtratoPage";

export const Route = createFileRoute("/extrato")({
  head: () => ({
    meta: [
      { title: "Extrato · CorePay" },
      { name: "description", content: "Histórico completo de movimentações da sua carteira." },
    ],
  }),
  component: ExtratoPage,
});
