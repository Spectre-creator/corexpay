import type { GatewayConfig } from "@/types";

export const GATEWAYS: GatewayConfig[] = [
  {
    id: "fyhub",
    name: "FyHub PIX",
    description: "Gateway padrão do CorePay para PIX (cash-in e cash-out).",
    docsUrl: "https://docs.fyhub.com.br",
    fields: [
      { key: "clientId", label: "Client ID", placeholder: "fh_client_..." },
      { key: "clientSecret", label: "Client Secret", placeholder: "fh_secret_...", secret: true },
      { key: "webhookSecret", label: "Webhook Secret (HMAC)", placeholder: "whsec_...", secret: true },
    ],
  },
  {
    id: "mercadopago",
    name: "Mercado Pago",
    description: "PIX via Mercado Pago Checkout API.",
    docsUrl: "https://www.mercadopago.com.br/developers",
    fields: [
      { key: "accessToken", label: "Access Token", placeholder: "APP_USR-...", secret: true },
      { key: "publicKey", label: "Public Key", placeholder: "APP_USR-pub-..." },
      { key: "webhookSecret", label: "Webhook Secret", placeholder: "whsec_...", secret: true },
    ],
  },
  {
    id: "pagarme",
    name: "Pagar.me",
    description: "PIX + antifraude Pagar.me v5.",
    docsUrl: "https://docs.pagar.me",
    fields: [
      { key: "apiKey", label: "Secret API Key", placeholder: "sk_live_...", secret: true },
      { key: "webhookSecret", label: "Webhook Signature", placeholder: "whsec_...", secret: true },
    ],
  },
  {
    id: "efi",
    name: "Efí (Gerencianet)",
    description: "PIX oficial homologado com certificado mTLS.",
    docsUrl: "https://dev.efipay.com.br",
    fields: [
      { key: "clientId", label: "Client ID", placeholder: "Client_Id_..." },
      { key: "clientSecret", label: "Client Secret", placeholder: "Client_Secret_...", secret: true },
      { key: "certificate", label: "Certificado (.p12 base64)", placeholder: "MIIK...", secret: true },
      { key: "pixKey", label: "Chave PIX recebedora", placeholder: "chave@corepay.io" },
    ],
  },
  {
    id: "asaas",
    name: "Asaas",
    description: "PIX + boleto Asaas.",
    docsUrl: "https://docs.asaas.com",
    fields: [
      { key: "apiKey", label: "API Key", placeholder: "$aact_...", secret: true },
      { key: "webhookToken", label: "Webhook Token", placeholder: "wh_...", secret: true },
    ],
  },
];
