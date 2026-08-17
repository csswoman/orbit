export type CrudFieldType =
  | "checkbox"
  | "date"
  | "datetime-local"
  | "number"
  | "select"
  | "tags"
  | "text"
  | "textarea"
  | "url";

export type CrudOption = {
  label: string;
  value: string;
};

export type CrudField = {
  defaultValue?: boolean | string;
  emptyLabel?: string;
  key: string;
  label: string;
  options?: readonly CrudOption[];
  optionsFrom?: {
    labelField: string;
    resource: string;
  };
  placeholder?: string;
  required?: boolean;
  step?: string;
  type: CrudFieldType;
};

export type CrudResource = {
  description: string;
  emptyMessage: string;
  fields: readonly CrudField[];
  key: string;
  orderBy: string;
  orderDirection?: "asc" | "desc";
  singular: string;
  table: string;
  title: string;
  titleField: string;
};

export type SpaceCrudConfig = {
  description: string;
  resources: readonly CrudResource[];
};

const statusOptions = {
  project: [
    { label: "Idea", value: "idea" },
    { label: "Activo", value: "active" },
    { label: "En pausa", value: "paused" },
    { label: "Terminado", value: "done" },
  ],
  wishlist: [
    { label: "Quiero ver", value: "quiero_ver" },
    { label: "Viendo", value: "viendo" },
    { label: "Completado", value: "completado" },
    { label: "Quiero comprar", value: "quiero_comprar" },
    { label: "Comprado", value: "comprado" },
  ],
} as const;

export const spaceCrudConfigs: Record<string, SpaceCrudConfig> = {
  gacha: {
    description:
      "Organiza tus juegos y, dentro de cada uno, sus eventos y personajes. Los eventos aparecen automáticamente en Upcoming.",
    resources: [
      {
        description: "Crea primero los juegos a los que pertenecen tus eventos.",
        emptyMessage: "Todavía no agregaste ningún juego.",
        fields: [
          { key: "name", label: "Nombre", required: true, type: "text" },
          { key: "icon_url", label: "URL del icono", type: "url" },
          { key: "color", label: "Color hexadecimal", placeholder: "#7C3AED", type: "text" },
        ],
        key: "games",
        orderBy: "name",
        singular: "juego",
        table: "gacha_games",
        title: "Juegos",
        titleField: "name",
      },
      {
        description: "Banners, abismos y otros eventos con fecha de cierre.",
        emptyMessage: "Agrega un evento para verlo también en el dashboard.",
        fields: [
          {
            key: "game_id",
            label: "Juego",
            optionsFrom: { labelField: "name", resource: "games" },
            required: true,
            type: "select",
          },
          { key: "title", label: "Título", required: true, type: "text" },
          { key: "starts_at", label: "Comienza", type: "datetime-local" },
          { key: "ends_at", label: "Termina", required: true, type: "datetime-local" },
          {
            key: "type",
            label: "Tipo",
            options: [
              { label: "Banner", value: "banner" },
              { label: "Abismo", value: "abyss" },
              { label: "Otro", value: "other" },
            ],
            required: true,
            type: "select",
          },
          { key: "is_recurring", label: "Se repite", type: "checkbox" },
          { key: "recurrence_rule", label: "Cómo se repite", placeholder: "Cada mes", type: "text" },
          { key: "image_url", label: "URL de imagen", type: "url" },
          { key: "color", label: "Color hexadecimal", placeholder: "#7C3AED", type: "text" },
        ],
        key: "events",
        orderBy: "ends_at",
        singular: "evento",
        table: "gacha_events",
        title: "Eventos",
        titleField: "title",
      },
      {
        description: "Personajes que estás construyendo o quieres completar.",
        emptyMessage: "Todavía no agregaste personajes a este juego.",
        fields: [
          {
            key: "game_id",
            label: "Juego",
            optionsFrom: { labelField: "name", resource: "games" },
            required: true,
            type: "select",
          },
          {
            emptyLabel: "Sin evento",
            key: "event_id",
            label: "Evento relacionado",
            optionsFrom: { labelField: "title", resource: "events" },
            type: "select",
          },
          { key: "name", label: "Personaje", required: true, type: "text" },
          {
            key: "status",
            label: "Estado",
            options: [
              { label: "Construyendo", value: "farming" },
              { label: "Listo", value: "done" },
              { label: "En pausa", value: "paused" },
            ],
            required: true,
            type: "select",
          },
          { key: "notes", label: "Notas", type: "textarea" },
          { key: "image_url", label: "URL de imagen", type: "url" },
          { key: "color", label: "Color hexadecimal", placeholder: "#7C3AED", type: "text" },
        ],
        key: "targets",
        orderBy: "created_at",
        orderDirection: "desc",
        singular: "personaje",
        table: "farming_targets",
        title: "Personajes",
        titleField: "name",
      },
    ],
  },
  food: {
    description: "Registra lo que compraste y cuándo vence. Las fechas activas alimentan Upcoming.",
    resources: [
      {
        description: "Alimentos y productos con fecha de vencimiento.",
        emptyMessage: "Tu despensa todavía está vacía.",
        fields: [
          { key: "name", label: "Nombre", required: true, type: "text" },
          { key: "quantity", label: "Cantidad", placeholder: "2 paquetes", type: "text" },
          { key: "expires_at", label: "Vence", required: true, type: "date" },
          { key: "purchased_at", label: "Comprado", type: "date" },
          {
            key: "status",
            label: "Estado",
            options: [
              { label: "Activo", value: "active" },
              { label: "Consumido", value: "consumed" },
              { label: "Vencido", value: "expired" },
            ],
            required: true,
            type: "select",
          },
          { key: "restock_flag", label: "Volver a comprar", type: "checkbox" },
          { key: "image_url", label: "URL de imagen", type: "url" },
        ],
        key: "items",
        orderBy: "expires_at",
        singular: "producto",
        table: "food_items",
        title: "Comida",
        titleField: "name",
      },
    ],
  },
  subscriptions: {
    description: "Controla renovaciones, costos y servicios cancelados.",
    resources: [
      {
        description: "Las renovaciones activas con fecha aparecen en Upcoming.",
        emptyMessage: "Todavía no registraste suscripciones.",
        fields: [
          { key: "name", label: "Nombre", required: true, type: "text" },
          {
            emptyLabel: "Sin categoría",
            key: "type",
            label: "Tipo",
            options: [
              { label: "Curso", value: "course" },
              { label: "Streaming", value: "streaming" },
              { label: "Herramienta", value: "tool" },
              { label: "Otro", value: "other" },
            ],
            type: "select",
          },
          { key: "renews_at", label: "Próxima renovación", type: "date" },
          { key: "cost", label: "Costo", step: "0.01", type: "number" },
          { defaultValue: true, key: "is_recurring", label: "Renovación recurrente", type: "checkbox" },
          { key: "recurrence_rule", label: "Frecuencia", placeholder: "Mensual", type: "text" },
          {
            key: "status",
            label: "Estado",
            options: [
              { label: "Activa", value: "active" },
              { label: "Cancelada", value: "cancelled" },
            ],
            required: true,
            type: "select",
          },
        ],
        key: "items",
        orderBy: "renews_at",
        singular: "suscripción",
        table: "subscriptions",
        title: "Suscripciones",
        titleField: "name",
      },
    ],
  },
  wishlist: {
    description: "Guarda cursos, documentos y compras para encontrarlos después.",
    resources: [
      {
        description: "Todo lo que quieres ver, completar o comprar.",
        emptyMessage: "Tu lista de deseos está vacía.",
        fields: [
          { key: "title", label: "Título", required: true, type: "text" },
          {
            emptyLabel: "Sin categoría",
            key: "type",
            label: "Tipo",
            options: [
              { label: "Curso", value: "course" },
              { label: "PDF", value: "pdf" },
              { label: "Otro", value: "other" },
            ],
            type: "select",
          },
          { key: "status", label: "Estado", options: statusOptions.wishlist, required: true, type: "select" },
          { key: "url", label: "Enlace", type: "url" },
          { key: "image_url", label: "URL de imagen", type: "url" },
          { key: "notes", label: "Notas", type: "textarea" },
        ],
        key: "items",
        orderBy: "created_at",
        orderDirection: "desc",
        singular: "elemento",
        table: "wishlist",
        title: "Lista de deseos",
        titleField: "title",
      },
    ],
  },
  clothing: {
    description: "Lleva un inventario simple de ropa y reemplazos pendientes.",
    resources: [
      {
        description: "Prendas organizadas por categoría.",
        emptyMessage: "Todavía no agregaste prendas.",
        fields: [
          { key: "category", label: "Categoría", required: true, type: "text" },
          { key: "name", label: "Nombre", type: "text" },
          { key: "needs_replacement", label: "Necesita reemplazo", type: "checkbox" },
          { key: "image_url", label: "URL de imagen", type: "url" },
          { key: "notes", label: "Notas", type: "textarea" },
        ],
        key: "items",
        orderBy: "category",
        singular: "prenda",
        table: "clothing_items",
        title: "Ropa",
        titleField: "name",
      },
    ],
  },
  travel: {
    description: "Prepara maletas reutilizables y marca lo que ya empacaste.",
    resources: [
      {
        description: "Crea una maleta por viaje o por tipo de salida.",
        emptyMessage: "Todavía no tienes maletas.",
        fields: [
          { key: "name", label: "Nombre", required: true, type: "text" },
          { key: "trip_name", label: "Viaje", type: "text" },
          { key: "image_url", label: "URL de imagen", type: "url" },
        ],
        key: "bags",
        orderBy: "created_at",
        orderDirection: "desc",
        singular: "maleta",
        table: "travel_bags",
        title: "Maletas",
        titleField: "name",
      },
      {
        description: "Contenido de cada maleta y estado de empaque.",
        emptyMessage: "Agrega artículos a una maleta.",
        fields: [
          {
            key: "bag_id",
            label: "Maleta",
            optionsFrom: { labelField: "name", resource: "bags" },
            required: true,
            type: "select",
          },
          { key: "name", label: "Artículo", required: true, type: "text" },
          { key: "packed", label: "Empacado", type: "checkbox" },
        ],
        key: "items",
        orderBy: "created_at",
        orderDirection: "desc",
        singular: "artículo",
        table: "bag_items",
        title: "Artículos",
        titleField: "name",
      },
    ],
  },
  sales: {
    description: "Registra lo que quieres vender y lo que ya salió.",
    resources: [
      {
        description: "Artículos disponibles o vendidos.",
        emptyMessage: "Todavía no agregaste artículos para vender.",
        fields: [
          { key: "name", label: "Nombre", required: true, type: "text" },
          { key: "price", label: "Precio", step: "0.01", type: "number" },
          {
            key: "status",
            label: "Estado",
            options: [
              { label: "Disponible", value: "available" },
              { label: "Vendido", value: "sold" },
            ],
            required: true,
            type: "select",
          },
          { key: "image_url", label: "URL de imagen", type: "url" },
          { key: "notes", label: "Notas", type: "textarea" },
        ],
        key: "items",
        orderBy: "created_at",
        orderDirection: "desc",
        singular: "artículo",
        table: "sale_items",
        title: "Ventas",
        titleField: "name",
      },
    ],
  },
  projects: {
    description: "Captura ideas, dales estado y deja que Orbit las vuelva a mostrar.",
    resources: [
      {
        description: "Los proyectos sin terminar participan en Resurface.",
        emptyMessage: "Crea tu primer proyecto para activar Resurface.",
        fields: [
          { key: "title", label: "Título", required: true, type: "text" },
          { key: "description", label: "Descripción", type: "textarea" },
          { key: "status", label: "Estado", options: statusOptions.project, required: true, type: "select" },
          { key: "color", label: "Color hexadecimal", placeholder: "#4F46E5", type: "text" },
          { key: "image_url", label: "URL de imagen", type: "url" },
        ],
        key: "items",
        orderBy: "updated_at",
        orderDirection: "desc",
        singular: "proyecto",
        table: "projects",
        title: "Proyectos",
        titleField: "title",
      },
    ],
  },
  inspiration: {
    description: "Guarda referencias, enlaces y notas que quieras redescubrir.",
    resources: [
      {
        description: "Cada inspiración participa en Resurface y puede vincularse a un proyecto.",
        emptyMessage: "Guarda una referencia para activar Resurface.",
        fields: [
          { key: "title", label: "Título", type: "text" },
          {
            emptyLabel: "Sin proyecto",
            key: "project_id",
            label: "Proyecto relacionado",
            optionsFrom: { labelField: "title", resource: "projects" },
            type: "select",
          },
          {
            key: "source_type",
            label: "Origen",
            options: [
              { label: "Archivo o imagen", value: "upload" },
              { label: "Boceto", value: "sketch" },
              { label: "Enlace", value: "url" },
            ],
            required: true,
            type: "select",
          },
          { key: "source_url", label: "Enlace de origen", type: "url" },
          { key: "image_url", label: "URL de imagen", type: "url" },
          { key: "note", label: "Nota", type: "textarea" },
          { key: "tags", label: "Etiquetas", placeholder: "arte, interfaz, color", type: "tags" },
        ],
        key: "items",
        orderBy: "updated_at",
        orderDirection: "desc",
        singular: "inspiración",
        table: "inspiration",
        title: "Inspiración",
        titleField: "title",
      },
    ],
  },
};

export function getCrudConfig(slug: string) {
  return spaceCrudConfigs[slug];
}

export function getCrudResource(space: string, resourceKey: string) {
  return getCrudConfig(space)?.resources.find(
    (resource) => resource.key === resourceKey,
  );
}
