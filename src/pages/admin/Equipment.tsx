import { SimpleCollectionAdmin, type FieldConfig } from "@/components/admin/SimpleCollectionAdmin";
import {
  adminListEquipment,
  createEquipmentItem,
  updateEquipmentItem,
  deleteEquipmentItem,
  reorderEquipment,
} from "@/lib/content";
import { EQUIPMENT_CATEGORY_LABELS, type EquipmentItem } from "@/types";

const CATEGORY_OPTIONS = Object.entries(EQUIPMENT_CATEGORY_LABELS).map(([value, label]) => ({
  value,
  label,
}));

const FIELDS: FieldConfig<EquipmentItem>[] = [
  { key: "name", label: "Nome", type: "text" },
  { key: "category", label: "Categoria", type: "select", options: CATEGORY_OPTIONS },
  { key: "description", label: "Descrição", type: "textarea" },
  { key: "imageUrl", label: "Foto", type: "image" },
];

export function AdminEquipment() {
  return (
    <SimpleCollectionAdmin<EquipmentItem>
      title="Equipamentos"
      description="Itens da seção 'O equipamento por trás da imagem' na home."
      storageFolder="equipment"
      itemLabel={(item) => item.name}
      itemSubtitle={(item) => EQUIPMENT_CATEGORY_LABELS[item.category]}
      fields={FIELDS}
      defaults={{ name: "", category: "cameras", description: "", imageUrl: "" }}
      api={{
        adminList: adminListEquipment,
        create: createEquipmentItem,
        update: updateEquipmentItem,
        remove: deleteEquipmentItem,
        reorder: reorderEquipment,
      }}
    />
  );
}
