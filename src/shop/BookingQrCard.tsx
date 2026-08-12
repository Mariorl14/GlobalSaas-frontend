import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import "./BookingQrCard.css";

type Props = {
  slug: string;
  businessName?: string;
  /** Compact layout for cards / side panels */
  compact?: boolean;
};

export function bookingPageUrl(slug: string): string {
  const clean = (slug || "").trim();
  if (typeof window === "undefined") return `/book/${clean}`;
  return `${window.location.origin}/book/${clean}`;
}

/**
 * QR that opens the public booking page for a business slug.
 * Printable / downloadable for shop walls.
 */
export function BookingQrCard({ slug, businessName, compact = false }: Props) {
  const url = useMemo(() => bookingPageUrl(slug), [slug]);
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!slug.trim()) {
      setDataUrl(null);
      return;
    }
    let cancelled = false;
    setErr(null);
    void QRCode.toDataURL(url, {
      width: compact ? 220 : 420,
      margin: 2,
      errorCorrectionLevel: "M",
      color: { dark: "#0f172a", light: "#ffffff" },
    })
      .then((png) => {
        if (!cancelled) setDataUrl(png);
      })
      .catch(() => {
        if (!cancelled) setErr("No se pudo generar el código QR.");
      });
    return () => {
      cancelled = true;
    };
  }, [url, slug, compact]);

  const download = () => {
    if (!dataUrl) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `qr-reservas-${slug.trim() || "negocio"}.png`;
    a.click();
  };

  const printPoster = () => {
    if (!dataUrl) return;
    const title = businessName?.trim() || "Reservar cita";
    const win = window.open("", "_blank", "noopener,noreferrer");
    if (!win) return;
    win.document.write(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>QR — ${title}</title>
  <style>
    @page { margin: 16mm; }
    body {
      font-family: system-ui, -apple-system, Segoe UI, sans-serif;
      text-align: center;
      color: #0f172a;
      padding: 24px;
    }
    h1 { font-size: 28px; margin: 0 0 8px; }
    p { color: #475569; margin: 0 0 20px; font-size: 15px; }
    img { width: 320px; height: 320px; }
    .url { margin-top: 16px; font-size: 13px; word-break: break-all; color: #64748b; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <p>Escanea para agendar tu cita</p>
  <img src="${dataUrl}" alt="Código QR de reservas" />
  <div class="url">${url}</div>
  <script>window.onload = function () { window.print(); }</script>
</body>
</html>`);
    win.document.close();
  };

  if (!slug.trim()) {
    return (
      <div className="bp-qr">
        <p className="bp-hint">Este negocio aún no tiene slug público.</p>
      </div>
    );
  }

  return (
    <div className={`bp-qr${compact ? " bp-qr--compact" : ""}`}>
      <div className="bp-qr__frame">
        {dataUrl ? (
          <img src={dataUrl} alt={`QR para reservar en ${businessName || slug}`} />
        ) : (
          <div className="bp-qr__skeleton" aria-hidden />
        )}
      </div>
      <div className="bp-qr__meta">
        <p className="bp-qr__title">Código QR de reservas</p>
        <p className="bp-qr__hint">
          Imprímelo y colócalo en el local para que los clientes agenden al instante.
        </p>
        <code className="bp-qr__url">{url}</code>
        {err ? <p className="bp-hint" style={{ color: "var(--bp-danger)" }}>{err}</p> : null}
        <div className="bp-qr__actions">
          <button
            type="button"
            className="bp-btn bp-btn--secondary bp-btn--sm"
            disabled={!dataUrl}
            onClick={download}
          >
            Descargar PNG
          </button>
          <button
            type="button"
            className="bp-btn bp-btn--primary bp-btn--sm"
            disabled={!dataUrl}
            onClick={printPoster}
          >
            Imprimir
          </button>
          <button
            type="button"
            className="bp-btn bp-btn--ghost bp-btn--sm"
            onClick={() => window.open(url, "_blank", "noopener,noreferrer")}
          >
            Abrir enlace
          </button>
        </div>
      </div>
    </div>
  );
}
