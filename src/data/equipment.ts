import type { EquipmentItem } from "@/types";

/**
 * imageUrl is absent for every item until real product photos are uploaded —
 * src/sections/Equipment.tsx renders a placeholder photo slot in that case.
 */
export const equipment: EquipmentItem[] = [
  { id: "e1", category: "cameras", name: "Sony FX6", description: "Sensor full-frame para captação principal em baixa luz.", order: 1 },
  { id: "e2", category: "cameras", name: "Canon C300 Mark III", description: "Segunda câmera para múltiplos ângulos e coberturas ao vivo.", order: 2 },
  { id: "e3", category: "cameras", name: "RED Komodo 6K", description: "Reservada para projetos cinematográficos e comerciais de alto padrão.", order: 3 },
  { id: "e4", category: "lentes", name: "Set Sigma Art 24-35mm", description: "Lentes rápidas para retratos e ambientes com pouca luz.", order: 4 },
  { id: "e5", category: "lentes", name: "Sony G Master 70-200mm", description: "Para captação discreta à distância em cerimônias e eventos.", order: 5 },
  { id: "e8", category: "gimbal", name: "DJI RS 3 Pro", description: "Estabilização para planos-sequência longos em terreno irregular.", order: 8 },
  { id: "e9", category: "gimbal", name: "Steadicam Volt", description: "Suporte corporal para movimentos fluidos em cerimônias.", order: 9 },
  { id: "e10", category: "microfones", name: "Sennheiser MKH416", description: "Captação direcional de diálogo em locação externa.", order: 10 },
  { id: "e11", category: "microfones", name: "Rode Wireless Pro", description: "Lapela sem fio para entrevistas e depoimentos institucionais.", order: 11 },
  { id: "e12", category: "iluminacao", name: "Aputure 600d Pro", description: "Luz principal de alta potência, com controle de temperatura de cor.", order: 12 },
  { id: "e13", category: "iluminacao", name: "Nanlite Forza 60", description: "Kit portátil para preenchimento em locações sem energia elétrica.", order: 13 },
];
