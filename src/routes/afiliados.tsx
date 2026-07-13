import { createFileRoute } from "@tanstack/react-router";
import { AfiliadosPage } from "@/pages/AfiliadosPage";

export const Route = createFileRoute("/afiliados")({
  head: () => ({
    meta: [
      { title: "Afiliados · CorePay" },
      { name: "description", content: "Convide amigos e ganhe comissão em cada movimentação." },
    ],
  }),
  component: AfiliadosPage,
});
