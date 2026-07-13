import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { PixPage } from "@/pages/PixPage";

const searchSchema = z.object({ tab: z.enum(["deposit", "withdraw"]).optional() });

export const Route = createFileRoute("/pix")({
  head: () => ({
    meta: [
      { title: "PIX · CorePay" },
      { name: "description", content: "Deposite ou saque via PIX em segundos." },
    ],
  }),
  validateSearch: searchSchema,
  component: PixRoute,
});

function PixRoute() {
  const { tab } = Route.useSearch();
  return <PixPage initialTab={tab ?? "deposit"} />;
}
