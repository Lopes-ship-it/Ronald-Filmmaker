import { SimpleCollectionAdmin, type FieldConfig } from "@/components/admin/SimpleCollectionAdmin";
import {
  adminListServices,
  createService,
  updateService,
  deleteService,
  reorderServices,
} from "@/lib/content";
import type { Service } from "@/types";

// `value` is the icon key looked up in src/sections/Services.tsx's ICONS map
// (and, transitively, the exact string stored in Firestore) — it must stay
// in English to match the Phosphor Icons component names. `label` is only
// what the admin sees in the dropdown, so that's translated.
const ICON_OPTIONS = [
  { value: "Buildings", label: "Prédio" },
  { value: "Megaphone", label: "Megafone" },
  { value: "HandHeart", label: "Mão com coração" },
  { value: "Cheers", label: "Taças brindando" },
  { value: "Confetti", label: "Confete" },
  { value: "MusicNotes", label: "Notas musicais" },
  { value: "DeviceMobileCamera", label: "Celular com câmera" },
  { value: "Handshake", label: "Aperto de mãos" },
  { value: "FilmSlate", label: "Claquete" },
  { value: "Scissors", label: "Tesoura" },
];

const ICON_LABELS = Object.fromEntries(ICON_OPTIONS.map((o) => [o.value, o.label]));

const FIELDS: FieldConfig<Service>[] = [
  { key: "title", label: "Título", type: "text" },
  { key: "icon", label: "Ícone", type: "select", options: ICON_OPTIONS },
  { key: "description", label: "Descrição", type: "textarea" },
];

export function AdminServices() {
  return (
    <SimpleCollectionAdmin<Service>
      title="Serviços"
      description="Cards da seção 'Um serviço para cada formato de história' na home."
      storageFolder="services"
      itemLabel={(item) => item.title}
      itemSubtitle={(item) => ICON_LABELS[item.icon] ?? item.icon}
      fields={FIELDS}
      defaults={{ title: "", icon: "FilmSlate", description: "" }}
      api={{
        adminList: adminListServices,
        create: createService,
        update: updateService,
        remove: deleteService,
        reorder: reorderServices,
      }}
    />
  );
}
