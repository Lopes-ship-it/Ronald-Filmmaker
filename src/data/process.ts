import type { ProcessStep } from "@/types";

export const processSteps: ProcessStep[] = [
  {
    id: "pr1",
    order: 1,
    title: "Briefing",
    description:
      "Conversa aberta sobre objetivo, público e orçamento. Saímos daqui com um escopo escrito, não uma promessa vaga.",
  },
  {
    id: "pr2",
    order: 2,
    title: "Planejamento",
    description:
      "Roteiro, decupagem, locações e cronograma de captação. Você aprova cada etapa antes de qualquer câmera ligar.",
  },
  {
    id: "pr3",
    order: 3,
    title: "Captação",
    description:
      "Equipe reduzida e equipamento cinema para não atrapalhar o ambiente real do seu evento ou produto.",
  },
  {
    id: "pr4",
    order: 4,
    title: "Edição",
    description:
      "Montagem, color grading e desenho de som em suíte própria, com entregas parciais para acompanhamento.",
  },
  {
    id: "pr5",
    order: 5,
    title: "Revisão",
    description:
      "Duas rodadas de ajuste incluídas no orçamento, com prazo de resposta combinado por escrito.",
  },
  {
    id: "pr6",
    order: 6,
    title: "Entrega",
    description:
      "Arquivos finais nos formatos combinados, hospedados por doze meses para download a qualquer momento.",
  },
];
