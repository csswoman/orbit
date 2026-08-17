"use client";
/* eslint-disable @next/next/no-img-element -- user-uploaded identity images use signed URLs. */

import { ImagePlus, Settings, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, useTransition, type CSSProperties } from "react";

import { archiveOrbitSpace, updateOrbitSpace } from "@/app/(app)/space-management-actions";
import { GradientBg } from "@/components/spaces/gradient-bg";
import { spaceIcon } from "@/components/navigation/space-icons";
import { createClient } from "@/lib/supabase/client";
import type { OrbitSpace } from "@/lib/orbit-spaces";
import {
  SPACE_COLOR_SWATCHES,
  SPACE_FONTS,
  SPACE_ICON_IDS,
  SPACE_ICON_LABELS,
  fileExtension,
  type SpaceFontId,
} from "@/lib/space-identity";
import {
  isAllowedIdentityImage,
  SPACE_IDENTITY_BUCKET,
  spaceBackgroundStoragePath,
  spaceIconStoragePath,
} from "@/lib/space-media";

export function SpaceSettings({
  font,
  onAccentChange,
  onBackgroundChange,
  onFontChange,
  onIconImageChange,
  space,
}: {
  font: SpaceFontId;
  onAccentChange: (color: string) => void;
  onBackgroundChange: (url: string | null, overlay: number) => void;
  onFontChange: (font: SpaceFontId) => void;
  onIconImageChange?: (url: string | null) => void;
  space: OrbitSpace;
}) {
  const router = useRouter();
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const iconInputRef = useRef<HTMLInputElement>(null);
  const backgroundInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(space.name);
  const [icon, setIcon] = useState(space.icon);
  const [accentColor, setAccentColor] = useState(space.accentColor);
  const [iconImageUrl, setIconImageUrl] = useState(space.iconImageUrl);
  const [backgroundImageUrl, setBackgroundImageUrl] = useState(space.backgroundImageUrl);
  const [backgroundOverlay, setBackgroundOverlay] = useState(space.backgroundOverlay);
  const [uploading, setUploading] = useState<"background" | "icon" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setName(space.name);
    setIcon(space.icon);
    setAccentColor(space.accentColor);
    setIconImageUrl(space.iconImageUrl);
    setBackgroundImageUrl(space.backgroundImageUrl);
    setBackgroundOverlay(space.backgroundOverlay);
  }, [space]);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function persist(
    next: {
      accentColor?: string;
      backgroundImagePath?: string | null;
      backgroundOverlay?: number;
      clearBackground?: boolean;
      clearIcon?: boolean;
      icon?: string;
      iconImagePath?: string | null;
      name?: string;
    },
    preview?: { backgroundImageUrl?: string | null; iconImageUrl?: string | null },
  ) {
    const payload = {
      accentColor: next.accentColor ?? accentColor,
      backgroundOverlay: next.backgroundOverlay ?? backgroundOverlay,
      icon: next.icon ?? icon,
      name: (next.name ?? name).trim().slice(0, 80),
    };
    if (!payload.name) return;

    const data = new FormData();
    data.set("id", space.id);
    data.set("name", payload.name);
    data.set("icon", payload.icon);
    data.set("accent_color", payload.accentColor);
    data.set("background_overlay", String(payload.backgroundOverlay));

    if (next.clearIcon) data.set("clear_icon", "true");
    if (next.clearBackground) data.set("clear_background", "true");
    if (next.iconImagePath) data.set("icon_image_path", next.iconImagePath);
    if (next.backgroundImagePath) data.set("background_image_path", next.backgroundImagePath);

    startTransition(async () => {
      const result = await updateOrbitSpace(data);
      if (result?.error) {
        setMessage(result.error);
        return;
      }

      if (next.clearIcon) {
        setIconImageUrl(null);
        onIconImageChange?.(null);
      } else if (preview?.iconImageUrl ?? result?.iconImageUrl) {
        const url = preview?.iconImageUrl ?? result?.iconImageUrl ?? null;
        setIconImageUrl(url);
        onIconImageChange?.(url);
      }

      if (next.clearBackground) {
        setBackgroundImageUrl(null);
        onBackgroundChange(null, payload.backgroundOverlay);
      } else if (preview?.backgroundImageUrl ?? result?.backgroundImageUrl) {
        const url = preview?.backgroundImageUrl ?? result?.backgroundImageUrl ?? null;
        setBackgroundImageUrl(url);
        onBackgroundChange(url, payload.backgroundOverlay);
      } else if (next.backgroundOverlay !== undefined) {
        onBackgroundChange(backgroundImageUrl, payload.backgroundOverlay);
      }

      setMessage(null);
      router.refresh();
    });
  }

  async function uploadIdentityImage(kind: "background" | "icon", file?: File) {
    if (!file || !isAllowedIdentityImage(file)) {
      setMessage("Usa una imagen JPG, PNG, WebP o AVIF de hasta 10 MB.");
      return;
    }

    setUploading(kind);
    setMessage(null);

    const supabase = createClient();
    const { data: claims } = await supabase.auth.getClaims();
    const userId = claims?.claims?.sub;
    if (!userId) {
      setUploading(null);
      setMessage("Tu sesión expiró. Vuelve a iniciar sesión.");
      return;
    }

    const extension = fileExtension(file);
    const path =
      kind === "icon"
        ? spaceIconStoragePath(userId, space.id, extension)
        : spaceBackgroundStoragePath(userId, space.id, extension);

    const previewUrl = URL.createObjectURL(file);
    const { error } = await supabase.storage
      .from(SPACE_IDENTITY_BUCKET)
      .upload(path, file, { contentType: file.type, upsert: true });

    setUploading(null);

    if (error) {
      URL.revokeObjectURL(previewUrl);
      setMessage("No se pudo subir la imagen. Inténtalo otra vez.");
      return;
    }

    if (kind === "icon") {
      setIconImageUrl(previewUrl);
      onIconImageChange?.(previewUrl);
      persist({ iconImagePath: path }, { iconImageUrl: previewUrl });
      return;
    }

    setBackgroundImageUrl(previewUrl);
    onBackgroundChange(previewUrl, backgroundOverlay);
    persist({ backgroundImagePath: path }, { backgroundImageUrl: previewUrl });
  }

  return (
    <div className="space-identity" data-no-dnd ref={rootRef}>
      <button
        aria-controls={panelId}
        aria-expanded={open}
        aria-label="Configurar este space"
        className="space-identity__trigger canvas-tooltip"
        data-tooltip="Configurar space"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <Settings aria-hidden="true" className="size-4" />
      </button>

      {open ? (
        <div className="space-identity__panel" id={panelId}>
          <header className="space-identity__intro">
            <p className="space-identity__title">Este space</p>
            <p className="space-identity__hint">
              Personaliza cómo se ve en el sidebar y en el lienzo.
            </p>
          </header>

          <div className="space-identity__body">
            <label className="space-identity__field">
              Nombre
              <input
                maxLength={80}
                name="name"
                onBlur={() => {
                  if (name.trim() && name.trim() !== space.name) persist({ name });
                }}
                onChange={(event) => setName(event.target.value)}
                required
                type="text"
                value={name}
              />
            </label>

            <section aria-labelledby={`${panelId}-icon-heading`} className="space-identity__section">
              <h3 className="space-identity__section-title" id={`${panelId}-icon-heading`}>
                Icono
              </h3>
              <div className="space-identity__icon-grid" role="group" aria-label="Elegir icono">
                {SPACE_ICON_IDS.map((id) => {
                  const Icon = spaceIcon(id);
                  const selected = !iconImageUrl && icon === id;
                  return (
                    <button
                      aria-label={SPACE_ICON_LABELS[id]}
                      aria-pressed={selected}
                      className="space-identity__icon-option"
                      key={id}
                      onClick={() => {
                        setIcon(id);
                        persist({ icon: id });
                      }}
                      type="button"
                    >
                      <span className="space-identity__icon-option-mark">
                        <Icon aria-hidden="true" className="size-4" />
                      </span>
                      <span className="space-identity__icon-option-label">{SPACE_ICON_LABELS[id]}</span>
                    </button>
                  );
                })}
                <button
                  aria-pressed={Boolean(iconImageUrl)}
                  className={`space-identity__icon-option space-identity__icon-option--upload${iconImageUrl ? " space-identity__icon-option--upload-filled" : ""}`}
                  disabled={uploading === "icon" || pending}
                  onClick={() => iconInputRef.current?.click()}
                  type="button"
                >
                  <span className="space-identity__icon-option-mark">
                    {iconImageUrl ? (
                      <img alt="" className="space-identity__icon-option-image" src={iconImageUrl} />
                    ) : (
                      <ImagePlus aria-hidden="true" className="size-4" />
                    )}
                  </span>
                  <span className="space-identity__icon-option-label">
                    {uploading === "icon" ? "Subiendo…" : iconImageUrl ? "Tu imagen" : "Subir imagen"}
                  </span>
                </button>
                <input
                  accept="image/avif,image/jpeg,image/png,image/webp"
                  className="sr-only"
                  onChange={(event) => {
                    void uploadIdentityImage("icon", event.target.files?.[0]);
                    event.target.value = "";
                  }}
                  ref={iconInputRef}
                  type="file"
                />
              </div>
              {iconImageUrl ? (
                <button
                  className="space-identity__text-action"
                  disabled={pending}
                  onClick={() => persist({ clearIcon: true })}
                  type="button"
                >
                  Volver a iconos del sistema
                </button>
              ) : null}
            </section>

            <section aria-labelledby={`${panelId}-background-heading`} className="space-identity__section">
              <h3 className="space-identity__section-title" id={`${panelId}-background-heading`}>
                Fondo del space
              </h3>
              <div className="space-identity__background">
                <button
                  aria-label={backgroundImageUrl ? "Cambiar imagen de fondo" : "Subir imagen de fondo"}
                  className={`space-identity__background-preview${backgroundImageUrl ? " space-identity__background-preview--filled" : " space-identity__background-preview--empty"}`}
                  disabled={uploading === "background" || pending}
                  onClick={() => backgroundInputRef.current?.click()}
                  style={
                    backgroundImageUrl
                      ? ({
                          backgroundImage: `url("${backgroundImageUrl}")`,
                          "--space-background-overlay": backgroundOverlay,
                        } as unknown as CSSProperties)
                      : undefined
                  }
                  type="button"
                >
                  {!backgroundImageUrl ? <GradientBg /> : null}
                  {!backgroundImageUrl ? (
                    <>
                      <span className="space-identity__background-empty-icon">
                        <ImagePlus aria-hidden="true" className="size-5" />
                      </span>
                      <span className="space-identity__background-empty-title">
                        {uploading === "background" ? "Subiendo fondo…" : "Añadir imagen de fondo"}
                      </span>
                      <span className="space-identity__background-empty-hint">JPG, PNG, WebP o AVIF</span>
                    </>
                  ) : null}
                </button>
                {backgroundImageUrl ? (
                  <div className="space-identity__icon-actions">
                    <button
                      className="space-identity__secondary"
                      disabled={uploading === "background" || pending}
                      onClick={() => backgroundInputRef.current?.click()}
                      type="button"
                    >
                      <ImagePlus aria-hidden="true" className="size-3.5" />
                      Cambiar fondo
                    </button>
                    <button
                      className="space-identity__secondary"
                      disabled={pending}
                      onClick={() => persist({ clearBackground: true })}
                      type="button"
                    >
                      <X aria-hidden="true" className="size-3.5" />
                      Quitar
                    </button>
                  </div>
                ) : null}
                <input
                  accept="image/avif,image/jpeg,image/png,image/webp"
                  className="sr-only"
                  onChange={(event) => {
                    void uploadIdentityImage("background", event.target.files?.[0]);
                    event.target.value = "";
                  }}
                  ref={backgroundInputRef}
                  type="file"
                />
                {backgroundImageUrl ? (
                  <label className="space-identity__overlay">
                    Oscurecer fondo
                    <div className="space-identity__overlay-row">
                      <input
                        max={1}
                        min={0}
                        onChange={(event) => {
                          const value = Number(event.target.value);
                          setBackgroundOverlay(value);
                          onBackgroundChange(backgroundImageUrl, value);
                        }}
                        onPointerUp={(event) => {
                          persist({ backgroundOverlay: Number(event.currentTarget.value) });
                        }}
                        step={0.05}
                        type="range"
                        value={backgroundOverlay}
                      />
                      <span>{Math.round(backgroundOverlay * 100)}%</span>
                    </div>
                  </label>
                ) : null}
              </div>
            </section>

            <div className="space-identity__duo">
              <section aria-labelledby={`${panelId}-color-heading`} className="space-identity__section">
                <h3 className="space-identity__section-title" id={`${panelId}-color-heading`}>
                  Color
                </h3>
                <div className="space-identity__swatches">
                  {SPACE_COLOR_SWATCHES.map((color) => (
                    <button
                      aria-label={`Color ${color}`}
                      aria-pressed={accentColor === color}
                      key={color}
                      onClick={() => {
                        setAccentColor(color);
                        onAccentChange(color);
                        persist({ accentColor: color });
                      }}
                      style={{ background: color }}
                      type="button"
                    />
                  ))}
                  <label className="space-identity__custom-color">
                    <span className="sr-only">Color personalizado</span>
                    <input
                      onBlur={(event) => persist({ accentColor: event.target.value })}
                      onChange={(event) => {
                        const color = event.target.value;
                        setAccentColor(color);
                        onAccentChange(color);
                      }}
                      type="color"
                      value={accentColor}
                    />
                  </label>
                </div>
              </section>

              <section aria-labelledby={`${panelId}-font-heading`} className="space-identity__section">
                <h3 className="space-identity__section-title" id={`${panelId}-font-heading`}>
                  Fuente
                </h3>
                <div className="space-identity__fonts">
                  {SPACE_FONTS.map((option) => (
                    <button
                      aria-pressed={font === option.id}
                      className={`space-identity__font space-identity__font--${option.id}`}
                      key={option.id}
                      onClick={() => onFontChange(option.id)}
                      type="button"
                    >
                      <span aria-hidden="true">{option.sample}</span>
                      {option.label}
                    </button>
                  ))}
                </div>
              </section>
            </div>
          </div>

          <footer className="space-identity__footer">
            <p className="space-identity__status" aria-live="polite">
              {message ?? (pending ? "Guardando…" : "Los cambios se guardan al instante.")}
            </p>

            <form action={archiveOrbitSpace}>
              <input name="id" type="hidden" value={space.id} />
              <button className="space-identity__archive" type="submit">
                <Trash2 aria-hidden="true" className="size-3.5" />
                Ocultar este space
              </button>
            </form>
          </footer>
        </div>
      ) : null}
    </div>
  );
}
