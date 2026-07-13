import { createFileRoute } from "@tanstack/react-router";
import { ContaPage } from "@/pages/ContaPage";

export const Route = createFileRoute("/conta")({
  head: () => ({
    meta: [
      { title: "Conta · CorePay" },
      { name: "description", content: "Perfil, segurança e configurações." },
    ],
  }),
  component: ContaPage,
});
