"use client";

import React, { Fragment, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, BadgeDollarSign, Calendar, Camera, Car, CheckCircle2,
  ChevronRight, ChevronUp, ChevronDown, Clock, Columns3, Fuel,
  HelpCircle, IdCard, Info, KeyRound, LayoutDashboard, Lock, LogIn,
  Mail, Map, MapPin, Menu, Navigation, Phone, ReceiptText, Settings,
  Timer, UserPlus, Wallet, X, XCircle
} from "lucide-react";
import { useDriver } from "@/lib/useDriver";
import { useAuthStore } from "@/lib/store";
import { createClient } from "@/lib/supabase";

type Tab = "panel" | "viajes" | "dinero" | "config" | "soporte";
type TripTab = "ofertas" | "aceptados";
type FlowStep =
  | "offerDetail" | "tripDetail" | "summary" | "readyToGo" | "originMap"
  | "locate" | "evidence" | "incident" | "evidenceCapture" | "destinationMap"
  | "destinationLocate" | "destinationEvidenceCapture" | "destinationArrival"
  | "tripIncident" | "expenses" | "done";

type EvidencePhase = "inicial" | "durante" | "entrega";
type EvidencePhaseTab = "inicial" | "durante" | "entrega";

const evidenceSteps = [
  { title: "Número VIN", eyebrow: "Paso 1 de 5", body: "Confirma que el VIN coincida antes de iniciar el traslado.", fields: ["LSGKB54H5KV225363"] },
  { title: "Placas y combustible", eyebrow: "Paso 2 de 5", body: "Registra placas visibles y nivel de combustible.", fields: ["NMX-8421", "Combustible: 68%"] },
  { title: "Fotos del vehículo", eyebrow: "Paso 3 de 5", body: "Captura frente, lado conductor, trasera, lado copiloto y tablero.", fields: ["Frente", "Lado conductor", "Trasera", "Lado copiloto", "Tablero", "Agregar más"] },
  { title: "Llaves recibidas", eyebrow: "Paso 4 de 5", body: "Indica cuántas llaves recibiste del vehículo.", fields: ["2 llaves"] },
  { title: "Nota de recogida", eyebrow: "Paso 5 de 5", body: "Agrega una nota opcional para dejar contexto.", fields: ["Sin observaciones"] }
];

const evidenceSections = {
  inicial: [
    { label: "Exterior del vehículo", photos: ["Frente", "Lado conductor", "Trasera", "Lado copiloto"] },
    { label: "Interior del vehículo", photos: ["Tablero", "Asientos"] },
    { label: "Kilometraje", photos: ["Odómetro"] }
  ],
  durante: [
    { label: "Estado general", photos: ["Frente", "Trasera"] },
    { label: "Kilometraje actual", photos: ["Odómetro"] }
  ],
  entrega: [
    { label: "Exterior del vehículo", photos: ["Frente", "Lado conductor", "Trasera", "Lado copiloto"] },
    { label: "Interior del vehículo", photos: ["Tablero", "Asientos"] },
    { label: "Kilometraje final", photos: ["Odómetro"] }
  ]
};

export default function Home() {
  const { driver, logout, _hasHydrated } = useAuthStore();
  const router = useRouter();
  const {
    loading, activeTrip, offeredTrips,
    acceptTrip, advanceTripStatus, submitEvidence, submitExpense, reportIncident
  } = useDriver();

  const [tab, setTab] = useState<Tab>("panel");
  const [tripTab, setTripTab] = useState<TripTab>("ofertas");
  const [flow, setFlow] = useState<FlowStep | null>(null);
  const [selectedOfferId, setSelectedOfferId] = useState<string | null>(null);
  const [evidenceIndex, setEvidenceIndex] = useState(0);
  const [evidencePhase, setEvidencePhase] = useState<EvidencePhase>("inicial");
  const [actionError, setActionError] = useState<string | null>(null);

  // ── Auth guard ───────────────────────────────────────────
  // Esperar a que Zustand rehidrate desde localStorage antes de decidir
  if (!_hasHydrated) {
    return (
      <main className="shell">
        <div className="phone" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
          <p style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.9rem" }}>Iniciando…</p>
        </div>
      </main>
    );
  }

  if (!driver) {
    return <AuthRedirect />;
  }

  if (loading && !activeTrip && offeredTrips.length === 0) {
    return (
      <main className="shell">
        <div className="phone">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "rgba(255,255,255,0.4)", fontSize: "0.9rem" }}>
            Cargando viajes…
          </div>
        </div>
      </main>
    );
  }

  const selectedOffer = offeredTrips.find((t: typeof offeredTrips[number]) => t.id === selectedOfferId) ?? offeredTrips[0] ?? null;
  const currentTrip = activeTrip;

  const goPanel = () => { setTab("panel"); setFlow(null); setActionError(null); };

  const handleAcceptOffer = async () => {
    if (!selectedOfferId) return;
    const result = await acceptTrip(selectedOfferId);
    if (result.ok) {
      setTripTab("aceptados");
      setFlow(null);
    } else {
      setActionError(result.error ?? "No se pudo aceptar el viaje");
    }
  };

  const handleAdvance = async (next: string, expected?: string) => {
    if (!currentTrip) return;
    const result = await advanceTripStatus(
      currentTrip.id,
      next as Parameters<typeof advanceTripStatus>[1],
      expected as Parameters<typeof advanceTripStatus>[2]
    );
    if (!result.ok) setActionError(result.error ?? "Error al actualizar estado");
  };

  const handleSubmitEvidence = async (phase: EvidencePhase, notes?: string, km?: number, fuel?: number) => {
    if (!currentTrip) return;
    const typeMap: Record<EvidencePhase, "inicial" | "durante" | "final"> = {
      inicial: "inicial", durante: "durante", entrega: "final"
    };
    await submitEvidence({ tripId: currentTrip.id, type: typeMap[phase], notes, kmReading: km, fuelLevel: fuel });
  };

  const handleSubmitExpenses = async (expenses: { type: string; concept: string; amount: number }[]) => {
    if (!currentTrip) return;
    for (const exp of expenses) {
      await submitExpense({ tripId: currentTrip.id, ...exp });
    }
  };

  const handleReportIncident = async (type: string, description: string) => {
    if (!currentTrip) return;
    await reportIncident({ tripId: currentTrip.id, type, description });
  };

  const content = (() => {
    if (flow === "tripDetail") {
      return <TripDetail trip={currentTrip} onBack={goPanel} onRoute={() => setFlow("originMap")} onIncident={() => setFlow("tripIncident")} />;
    }
    if (flow === "offerDetail") {
      return <OfferDetail offer={selectedOffer} onBack={() => setFlow(null)} onAccept={handleAcceptOffer} onReject={() => setFlow(null)} error={actionError} />;
    }
    if (flow === "summary") {
      return <TripSummary trip={currentTrip} onBack={() => setFlow(null)} onGo={() => { handleAdvance("conductor_en_camino"); setFlow("originMap"); }} />;
    }
    if (flow === "originMap") {
      return <RouteMap kind="origin" trip={currentTrip} onBack={() => setFlow("summary")} onArrive={() => { handleAdvance("recoleccion_proceso"); setFlow("locate"); }} />;
    }
    if (flow === "locate") {
      return (
        <LocateVehicle trip={currentTrip}
          onBack={() => setFlow("originMap")}
          onFound={() => { setEvidencePhase("inicial"); setFlow("evidenceCapture"); }}
          onNotFound={() => setFlow("incident")}
        />
      );
    }
    if (flow === "tripIncident") {
      return <IncidentReport onBack={() => setFlow("tripDetail")} onSent={() => setFlow("tripDetail")} onSubmit={handleReportIncident} />;
    }
    if (flow === "incident") {
      return <IncidentReport onBack={() => setFlow("locate")} onSent={() => setFlow("locate")} onSubmit={handleReportIncident} />;
    }
    if (flow === "evidenceCapture") {
      return (
        <EvidenceCapture
          phase={evidencePhase}
          trip={currentTrip}
          onBack={() => evidencePhase === "inicial" ? setFlow("locate") : setFlow("destinationLocate")}
          onDone={async (notes, km, fuel) => {
            await handleSubmitEvidence(evidencePhase, notes, km, fuel);
            if (evidencePhase === "inicial") {
              handleAdvance("traslado_curso");
              setFlow("destinationMap");
            } else {
              handleAdvance("finalizado");
              setFlow("done");
            }
          }}
        />
      );
    }
    if (flow === "destinationMap") {
      return <RouteMap kind="destination" trip={currentTrip} onBack={() => setFlow("evidenceCapture")} onArrive={() => { handleAdvance("entrega_proceso"); setFlow("destinationLocate"); }} />;
    }
    if (flow === "destinationLocate") {
      return (
        <LocateVehicle trip={currentTrip}
          onBack={() => setFlow("destinationMap")}
          onFound={() => { setEvidencePhase("entrega"); setFlow("evidenceCapture"); }}
          onNotFound={() => setFlow("incident")}
          isDelivery
        />
      );
    }
    if (flow === "done") {
      return <DoneScreen driver={driver} onPanel={() => setFlow("expenses")} />;
    }
    if (flow === "expenses") {
      return <ExpensesScreen onDone={handleSubmitExpenses} onFinish={goPanel} />;
    }

    if (tab === "panel") {
      return <Panel driver={driver} activeTrip={currentTrip} onMoney={() => setTab("dinero")} onSettings={() => setTab("config")} onTrip={() => setFlow("tripDetail")} onContact={() => setTab("contacto" as Tab)} onSupport={() => setTab("soporte")} />;
    }
    if (tab === "viajes") {
      return (
        <Trips
          active={tripTab} setActive={setTripTab}
          offeredTrips={offeredTrips} activeTrip={currentTrip}
          setTab={setTab}
          onOffer={(id) => { setSelectedOfferId(id); setFlow("offerDetail"); }}
          onAccepted={() => setFlow("summary")}
        />
      );
    }
    if (tab === "dinero") return <Money driver={driver} setTab={setTab} />;
    if (tab === "soporte") return <SupportChat onBack={() => setTab("panel")} />;
    if ((tab as string) === "contacto") return <ContactScreen trip={currentTrip} onBack={() => setTab("panel")} />;
    return <SettingsScreen driver={driver} onBack={() => setTab("panel")} onLogout={async () => { const s = createClient(); await s.auth.signOut(); logout(); router.push("/login"); }} />;
  })();

  return (
    <main className="shell">
      <div className="phone">
        {content}
        {!flow && tab !== "config" && (tab as string) !== "contacto" && (
          <BottomNav active={tab} setActive={setTab} />
        )}
      </div>
    </main>
  );
}

/* ── Auth redirect ──────────────────────────────────────── */
function AuthRedirect() {
  const router = useRouter();
  React.useEffect(() => { router.push("/login"); }, [router]);
  return (
    <main className="shell">
      <div className="phone" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.9rem" }}>Redirigiendo…</p>
      </div>
    </main>
  );
}

/* ── Shared UI ──────────────────────────────────────────── */
function FlowHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <header className="flow-top">
      <button className="icon-button" onClick={onBack} aria-label="Volver"><ArrowLeft size={34} strokeWidth={3.4} /></button>
      <h1>{title}</h1>
      <HelpCircle size={34} fill="#333" color="#333" />
    </header>
  );
}

/* ── Panel ──────────────────────────────────────────────── */
function Panel({ driver, activeTrip, onMoney, onSettings, onTrip, onContact, onSupport }: {
  driver: { name: string; certified: boolean } | null;
  activeTrip: { id: string; status: string; originAddress: string; destinationAddress: string; driverPayMxn: number | null } | null;
  onMoney: () => void; onSettings: () => void;
  onTrip: () => void; onContact: () => void; onSupport: () => void;
}) {
  const firstName = driver?.name?.split(" ")[0] ?? "Conductor";
  const statusLabel: Record<string, string> = {
    conductor_asignado: "Asignado", conductor_en_camino: "En camino",
    recoleccion_proceso: "Recolección", traslado_curso: "En tránsito",
    entrega_proceso: "Entrega", evidencia_inicial_pendiente: "Evidencia inicial",
    evidencia_final_pendiente: "Evidencia final",
  };
  return (
    <section className="screen panel-screen">
      <header className="panel-top">
        <div className="panel-brand">Ruum Ruum</div>
        <button className="panel-settings-btn" aria-label="Configuración" onClick={onSettings}><Settings size={22} /></button>
      </header>
      <div className="panel-greeting">
        <h1>Hola, {firstName}</h1>
        {driver?.certified && <p><CheckCircle2 size={15} />Conductor certificado</p>}
      </div>
      {activeTrip ? (
        <button className="panel-trip-card" onClick={onTrip}>
          <div className="panel-trip-head">
            <div><h2>Tu viaje activo</h2><strong>{activeTrip.id}</strong></div>
            <span>{statusLabel[activeTrip.status] ?? activeTrip.status}</span>
          </div>
          <div className="panel-trip-details">
            <div><small>Origen</small><b>{activeTrip.originAddress}</b></div>
            {activeTrip.driverPayMxn && (
              <div className="panel-trip-price"><small>Tu tarifa</small><b>${activeTrip.driverPayMxn.toFixed(2)}</b></div>
            )}
            <div><small>Destino</small><b>{activeTrip.destinationAddress}</b></div>
          </div>
          <span className="panel-trip-cta">Ver detalle del viaje<ChevronRight size={22} /></span>
        </button>
      ) : (
        <div className="panel-trip-card" style={{ opacity: 0.5, cursor: "default" }}>
          <div className="panel-trip-head">
            <div><h2>Sin viaje activo</h2><strong>—</strong></div>
          </div>
          <p style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.5)", padding: "8px 0" }}>Revisa la pestaña de Ofertas para aceptar un viaje.</p>
        </div>
      )}
      <div className="quick-actions">
        <h2>Acciones rápidas</h2>
        <div className="quick-grid">
          <button onClick={onContact}><span className="quick-icon cyan"><Phone size={22} /></span><strong>Contacta al solicitante</strong></button>
          <button onClick={onTrip}><span className="quick-icon cyan"><Map size={22} /></span><strong>Tus viajes</strong></button>
          <button onClick={onMoney}><span className="quick-icon lime"><BadgeDollarSign size={22} /></span><strong>Tu próximo depósito</strong></button>
          <button onClick={onSupport}><span className="quick-icon slate"><HelpCircle size={22} /></span><strong>Soporte</strong></button>
        </div>
      </div>
      <div className="panel-availability">
        <span><CheckCircle2 size={14} />Disponibilidad</span>
        <strong>Disponible</strong>
        <i aria-hidden="true" />
      </div>
    </section>
  );
}

/* ── Trips ──────────────────────────────────────────────── */
function Trips({ active, setActive, offeredTrips, activeTrip, setTab, onOffer, onAccepted }: {
  active: TripTab; setActive: (tab: TripTab) => void;
  offeredTrips: ReturnType<typeof useDriver>["offeredTrips"];
  activeTrip: ReturnType<typeof useDriver>["activeTrip"];
  setTab: (tab: Tab) => void; onOffer: (id: string) => void; onAccepted: () => void;
}) {
  return (
    <section className="screen trips-screen">
      <header className="trips-header">
        <button className="icon-button" onClick={() => setTab("panel")} aria-label="Volver"><ArrowLeft size={22} /></button>
        <h1>Tus viajes</h1>
      </header>
      <div className="segmented segmented-full" style={{ display: "flex", width: "100%" }}>
        <button style={{ flex: 1 }} className={active === "ofertas" ? "selected" : ""} onClick={() => setActive("ofertas")}>Ofertas</button>
        <button style={{ flex: 1 }} className={active === "aceptados" ? "selected" : ""} onClick={() => setActive("aceptados")}>Aceptados</button>
      </div>
      {active === "ofertas" ? (
        <div className="trip-day">
          {offeredTrips.length === 0 ? (
            <p style={{ padding: "24px 16px", color: "rgba(255,255,255,0.35)", fontSize: "0.88rem", textAlign: "center" }}>No hay ofertas disponibles en este momento.</p>
          ) : offeredTrips.map((trip: typeof offeredTrips[number]) => (
            <button key={trip.id} className="offer-card" onClick={() => onOffer(trip.id)}>
              <div className="offer-head">
                <strong>Viaje #{trip.id}</strong>
                <span>{trip.driverPayMxn ? `$${trip.driverPayMxn.toFixed(2)}` : "—"} <ChevronRight size={18} /></span>
              </div>
              <div className="itinerary">
                <div>
                  <h3>{trip.originAddress}</h3>
                  {trip.vehicleVin && <b>{trip.vehicleVin}</b>}
                </div>
                <div className="trip-meta">
                  {trip.distanceKm && <span><Map size={12} /> {trip.distanceKm} km</span>}
                  {trip.scheduledAt && <span><Clock size={12} /> {new Date(trip.scheduledAt).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}</span>}
                </div>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="trip-day">
          {activeTrip ? (
            <button className="accepted-card" onClick={onAccepted}>
              <span className="tag">ASIGNADO</span>
              <div className="accepted-row"><h3>Viaje #{activeTrip.id}</h3>{activeTrip.driverPayMxn && <strong>${activeTrip.driverPayMxn.toFixed(2)}</strong>}</div>
              <p><span>Origen</span> {activeTrip.originAddress}</p>
              <p><span>Destino</span> {activeTrip.destinationAddress}</p>
              {activeTrip.distanceKm && <div className="trip-meta"><span><Map size={12} /> {activeTrip.distanceKm} km</span></div>}
            </button>
          ) : (
            <p style={{ padding: "24px 16px", color: "rgba(255,255,255,0.35)", fontSize: "0.88rem", textAlign: "center" }}>No tienes viajes aceptados activos.</p>
          )}
        </div>
      )}
    </section>
  );
}

/* ── Offer Detail ───────────────────────────────────────── */
const offerDetailCSS = `
.offer-detail-screen{display:flex;flex-direction:column;height:100%;background:var(--bg,#0d1117);color:var(--text,#e8eaf6);overflow:hidden}
.offer-detail-header{display:flex;align-items:center;justify-content:space-between;padding:16px 20px 12px;border-bottom:1px solid rgba(255,255,255,0.07);flex-shrink:0}
.offer-detail-header h1{font-size:1rem;font-weight:700;letter-spacing:0.02em}
.offer-help-btn{background:none;border:none;color:rgba(255,255,255,0.6);cursor:pointer;padding:4px}
.offer-detail-body{flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:14px;padding:0 0 24px}
.offer-map-preview{position:relative;height:160px;background:linear-gradient(135deg,#0a1628 0%,#0d2137 50%,#0a1628 100%);overflow:hidden;flex-shrink:0;display:flex;align-items:center;justify-content:center}
.offer-map-preview .map-label{position:absolute;top:10px;left:50%;transform:translateX(-50%);font-size:0.62rem;font-weight:700;letter-spacing:0.12em;color:rgba(255,255,255,0.45);background:rgba(0,0,0,0.4);padding:3px 10px;border-radius:20px;white-space:nowrap;z-index:2}
.offer-map-preview .road{position:absolute;background:rgba(0,229,255,0.15);border-radius:4px}
.offer-map-preview .road.one{width:120%;height:3px;top:42%;left:-10%;transform:rotate(-8deg)}
.offer-map-preview .road.two{width:3px;height:80%;left:38%;top:10%}
.offer-map-preview .road.three{width:120%;height:2px;top:65%;left:-10%;transform:rotate(5deg);background:rgba(201,240,42,0.1)}
.offer-map-expand{position:absolute;bottom:10px;right:12px;background:rgba(0,229,255,0.15);border:1px solid rgba(0,229,255,0.3);color:#00E5FF;border-radius:8px;padding:6px 10px;cursor:pointer;display:flex;align-items:center;gap:4px;font-size:0.72rem;font-weight:600}
.offer-cta-block{display:flex;flex-direction:column;gap:10px;padding:0 16px}
.offer-accept-btn{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;padding:14px;background:#00E5FF;color:#0d1117;border:none;border-radius:12px;font-size:0.95rem;font-weight:800;letter-spacing:0.08em;cursor:pointer}
.offer-reject-btn{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;padding:12px;background:transparent;color:rgba(255,255,255,0.55);border:1px solid rgba(255,255,255,0.15);border-radius:12px;font-size:0.85rem;font-weight:600;letter-spacing:0.06em;cursor:pointer}
.offer-error{margin:0 16px;padding:10px 14px;background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);border-radius:8px;color:#f87171;font-size:0.82rem}
.offer-notes-card{margin:0 16px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:12px;overflow:hidden}
.offer-notes-toggle{display:flex;align-items:center;justify-content:space-between;width:100%;padding:12px 16px;background:none;border:none;color:inherit;cursor:pointer}
.offer-notes-title{font-size:0.75rem;font-weight:700;letter-spacing:0.1em;color:rgba(255,255,255,0.5)}
.offer-notes-body{padding:0 16px 14px;display:flex;flex-direction:column;gap:8px}
.offer-notes-body p{font-size:0.82rem;line-height:1.55;color:rgba(255,255,255,0.7);margin:0}
.offer-shared-badge{margin:0 16px;display:flex;align-items:center;gap:6px;background:rgba(201,240,42,0.08);border:1px solid rgba(201,240,42,0.2);border-radius:8px;padding:8px 12px}
.offer-shared-badge span{font-size:0.72rem;font-weight:700;letter-spacing:0.08em;color:#C9F02A}
.offer-stops{margin:0 16px;display:flex;flex-direction:column;gap:0}
.offer-stop{display:flex;gap:12px;align-items:flex-start}
.offer-stop-num{width:28px;height:28px;border-radius:50%;background:#00E5FF;color:#0d1117;font-size:0.8rem;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:2px}
.offer-stop-connector{display:flex;flex-direction:column;align-items:center;width:28px;flex-shrink:0}
.offer-stop-line{width:2px;height:32px;background:rgba(0,229,255,0.25);margin:4px 0}
.offer-stop-content{flex:1;padding-bottom:16px}
.offer-stop-content h3{font-size:0.92rem;font-weight:700;margin:0 0 2px}
.offer-stop-city{font-size:0.78rem;color:rgba(255,255,255,0.5);margin:0 0 6px}
.offer-stop-detail{display:flex;align-items:flex-start;gap:6px;font-size:0.78rem;color:rgba(255,255,255,0.6);margin-bottom:3px}
.offer-metrics{margin:0 16px;display:grid;grid-template-columns:1fr 1fr;gap:8px}
.offer-metric{display:flex;align-items:center;gap:8px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.07);border-radius:10px;padding:10px 12px;font-size:0.82rem;color:rgba(255,255,255,0.7)}
.offer-metric-pay{background:rgba(0,229,255,0.08);border-color:rgba(0,229,255,0.2);color:#00E5FF;font-weight:700}
`;

function OfferDetail({ offer, onBack, onAccept, onReject, error }: {
  offer: ReturnType<typeof useDriver>["offeredTrips"][0] | null;
  onBack: () => void; onAccept: () => void; onReject: () => void; error: string | null;
}) {
  const [notesExpanded, setNotesExpanded] = useState(true);
  if (!offer) return null;

  return (
    <section className="screen offer-detail-screen">
      <style dangerouslySetInnerHTML={{ __html: offerDetailCSS }} />
      <header className="offer-detail-header">
        <button className="icon-button" onClick={onBack} aria-label="Volver"><ArrowLeft size={28} strokeWidth={3} /></button>
        <h1>Viaje #{offer.id}</h1>
        <button className="offer-help-btn" aria-label="Ayuda"><HelpCircle size={24} /></button>
      </header>
      <div className="offer-detail-body">
        <div className="offer-map-preview">
          <span className="map-label">VER MAPA COMPLETO</span>
          <MapPin style={{ position: "absolute", left: "45%", top: "30%", color: "var(--cyan)", width: 32, height: 32, filter: "drop-shadow(0 4px 8px rgb(0 229 255 / 0.5))" }} />
          <span className="road one" /><span className="road two" /><span className="road three" />
          <button className="offer-map-expand"><Navigation size={18} /></button>
        </div>
        <div className="offer-cta-block">
          <button className="offer-accept-btn" onClick={onAccept}><CheckCircle2 size={20} />ACEPTAR VIAJE</button>
          <button className="offer-reject-btn" onClick={onReject}><XCircle size={18} />RECHAZAR VIAJE</button>
        </div>
        {error && <div className="offer-error">{error}</div>}
        {offer.specialInstructions && (
          <div className="offer-notes-card">
            <button className="offer-notes-toggle" onClick={() => setNotesExpanded(e => !e)}>
              <span className="offer-notes-title">NOTAS</span>
              {notesExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
            {notesExpanded && (
              <div className="offer-notes-body">
                {offer.specialInstructions.split("\n\n").map((p: string, i: number) => <p key={i}>{p}</p>)}
              </div>
            )}
          </div>
        )}
        <div className="offer-shared-badge"><span>VIAJE COMPARTIDO INCLUIDO.</span><Info size={14} /></div>
        <div className="offer-stops">
          {[
            { num: 1, name: offer.originAddress, action: "Recolección" },
            { num: 2, name: offer.destinationAddress, action: "Entrega" }
          ].map((stop, idx, arr) => (
            <div key={stop.num} className="offer-stop">
              <div className="offer-stop-num">{stop.num}</div>
              <div className="offer-stop-connector">
                {idx < arr.length - 1 && <span className="offer-stop-line" />}
              </div>
              <div className="offer-stop-content">
                <h3>{stop.name}</h3>
                <div className="offer-stop-detail"><Car size={14} /><span>{stop.action}</span></div>
              </div>
            </div>
          ))}
        </div>
        <div className="offer-metrics">
          {offer.distanceKm && <div className="offer-metric"><Map size={16} /><span>{offer.distanceKm} km</span></div>}
          {offer.scheduledAt && <div className="offer-metric"><Clock size={16} /><span>{new Date(offer.scheduledAt).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}</span></div>}
          {offer.driverPayMxn && <div className="offer-metric offer-metric-pay"><BadgeDollarSign size={16} /><span>${offer.driverPayMxn.toFixed(2)}</span></div>}
        </div>
      </div>
    </section>
  );
}

/* ── Trip Detail ────────────────────────────────────────── */
const tripDetailCSS = `
.trip-detail-screen{display:flex;flex-direction:column;height:100%;background:var(--bg,#0d1117);color:var(--text,#e8eaf6)}
.trip-detail-header{display:flex;align-items:center;justify-content:space-between;padding:16px 20px 8px;border-bottom:1px solid rgba(255,255,255,0.06)}
.trip-detail-header h1{font-size:1rem;font-weight:700;letter-spacing:0.02em}
.trip-detail-body{flex:1;overflow-y:auto;padding:20px;display:flex;flex-direction:column;gap:20px}
.trip-detail-id-row{display:flex;align-items:center;gap:12px}
.trip-detail-id-row h2{font-size:1.4rem;font-weight:800;letter-spacing:0.04em}
.trip-detail-badge{background:#00E5FF;color:#0d1117;font-size:0.7rem;font-weight:800;padding:4px 10px;border-radius:20px;letter-spacing:0.08em}
.trip-timeline{display:flex;flex-direction:column;gap:0}
.timeline-item{display:flex;gap:12px}
.timeline-dot-col{display:flex;flex-direction:column;align-items:center}
.timeline-dot{width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,0.08);border:2px solid rgba(255,255,255,0.15);flex-shrink:0}
.timeline-item.done .timeline-dot{background:#1a3a2a;border-color:#22c55e;color:#22c55e}
.timeline-item.active .timeline-dot{background:#003344;border-color:#00E5FF;color:#00E5FF;box-shadow:0 0 12px rgba(0,229,255,0.4)}
.timeline-line{width:2px;flex:1;min-height:20px;background:rgba(255,255,255,0.1);margin:2px 0}
.timeline-item.done .timeline-line{background:#22c55e;opacity:0.4}
.timeline-content{padding-bottom:16px}
.timeline-content strong{display:block;font-size:0.9rem;font-weight:600}
.timeline-content span{font-size:0.78rem;color:rgba(255,255,255,0.5)}
.timeline-item.active .timeline-content strong{color:#00E5FF}
.trip-detail-info{background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:16px;display:flex;flex-direction:column;gap:14px}
.trip-detail-info h3{font-size:0.85rem;font-weight:700;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:0.08em;margin:0}
.trip-detail-vehicle-row{display:flex;justify-content:space-between;align-items:center}
.trip-detail-vehicle-row strong{display:block;font-size:0.95rem;font-weight:700}
.trip-detail-plate{font-size:0.8rem;color:rgba(255,255,255,0.5)}
.trip-detail-car-thumb{width:60px;height:40px;background:rgba(255,255,255,0.06);border-radius:8px;display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,0.3)}
.trip-detail-label{display:block;font-size:0.72rem;color:rgba(255,255,255,0.45);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:2px}
.trip-detail-route{display:flex;flex-direction:column;gap:10px}
.trip-detail-route-item{display:flex;gap:10px;align-items:flex-start}
.trip-detail-route-item strong{font-size:0.9rem}
.origin-pin{color:#00E5FF;margin-top:2px;flex-shrink:0}
.dest-pin{color:#C9F02A;margin-top:2px;flex-shrink:0}
.trip-detail-actions{display:flex;gap:10px;padding:16px 20px;border-top:1px solid rgba(255,255,255,0.06)}
.trip-detail-actions .secondary{flex:1}
.trip-detail-actions .primary{flex:1.4}
`;

const STATUS_TIMELINE: { status: string; label: string }[] = [
  { status: "solicitud_recibida", label: "Solicitud recibida" },
  { status: "conductor_asignado", label: "Asignado a ti" },
  { status: "recoleccion_proceso", label: "Vehículo recibido" },
  { status: "traslado_curso", label: "En traslado" },
  { status: "entrega_proceso", label: "Vehículo entregado" },
  { status: "finalizado", label: "Viaje completado" },
];

function TripDetail({ trip, onBack, onRoute, onIncident }: {
  trip: ReturnType<typeof useDriver>["activeTrip"];
  onBack: () => void; onRoute: () => void; onIncident: () => void;
}) {
  const currentIdx = trip ? STATUS_TIMELINE.findIndex(s => s.status === trip.status) : -1;
  return (
    <section className="screen trip-detail-screen">
      <style dangerouslySetInnerHTML={{ __html: tripDetailCSS }} />
      <header className="trip-detail-header">
        <button className="icon-button" onClick={onBack} aria-label="Volver"><ArrowLeft size={24} strokeWidth={2.5} /></button>
        <h1>Detalle del viaje</h1>
        <button className="icon-button" aria-label="Mensajes"><Mail size={22} /></button>
      </header>
      <div className="trip-detail-body">
        <div className="trip-detail-id-row">
          <h2>{trip?.id ?? "—"}</h2>
          <span className="trip-detail-badge">{STATUS_TIMELINE[currentIdx]?.label ?? trip?.status ?? "—"}</span>
        </div>
        <div className="trip-timeline">
          {STATUS_TIMELINE.map((item, idx) => {
            const done = idx < currentIdx;
            const active = idx === currentIdx;
            return (
              <div key={idx} className={`timeline-item ${done ? "done" : ""} ${active ? "active" : ""}`}>
                <div className="timeline-dot-col">
                  <div className="timeline-dot">
                    {done ? <CheckCircle2 size={20} /> : active ? <Navigation size={16} /> : null}
                  </div>
                  {idx < STATUS_TIMELINE.length - 1 && <div className="timeline-line" />}
                </div>
                <div className="timeline-content">
                  <strong>{item.label}</strong>
                  <span>{done ? "Completado" : active ? "En progreso" : "Pendiente"}</span>
                </div>
              </div>
            );
          })}
        </div>
        {trip && (
          <div className="trip-detail-info">
            <h3>Información del traslado</h3>
            <div className="trip-detail-vehicle-row">
              <div>
                <span className="trip-detail-label">Vehículo</span>
                <strong>{[trip.vehicleBrand, trip.vehicleModel, trip.vehicleYear, trip.vehicleColor].filter(Boolean).join(" · ")}</strong>
                {trip.vehiclePlates && <span className="trip-detail-plate">{trip.vehiclePlates}</span>}
              </div>
              <div className="trip-detail-car-thumb"><Car size={32} /></div>
            </div>
            <div className="trip-detail-route">
              <div className="trip-detail-route-item">
                <MapPin size={16} className="origin-pin" />
                <div><span className="trip-detail-label">Origen</span><strong>{trip.originAddress}</strong></div>
              </div>
              <div className="trip-detail-route-item">
                <Navigation size={16} className="dest-pin" />
                <div><span className="trip-detail-label">Destino</span><strong>{trip.destinationAddress}</strong></div>
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="trip-detail-actions">
        <button className="secondary" onClick={onIncident}>Reportar incidencia</button>
        <button className="primary" onClick={onRoute}>En ruta al destino</button>
      </div>
    </section>
  );
}

/* ── Trip Summary ───────────────────────────────────────── */
function TripSummary({ trip, onBack, onGo }: {
  trip: ReturnType<typeof useDriver>["activeTrip"];
  onBack: () => void; onGo: () => void;
}) {
  return (
    <section className="screen flow-screen">
      <FlowHeader title={`Viaje #${trip?.id ?? "—"}`} onBack={onBack} />
      <div className="details-strip">
        <h2>Detalles</h2>
        <div className="trip-meta">
          {trip?.scheduledAt && <span><Clock size={12} /> {new Date(trip.scheduledAt).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}</span>}
          {trip?.distanceKm && <span><Map size={12} /> {trip.distanceKm} km</span>}
        </div>
        <p>El tiempo puede variar según el tráfico, el clima u otros factores del camino.</p>
      </div>
      <div className="summary-route">
        <h2>Resumen del viaje</h2>
        <div><MapPin /><p><strong>{trip?.originAddress ?? "—"}</strong></p></div>
        <div><Navigation /><p><strong>{trip?.destinationAddress ?? "—"}</strong></p></div>
      </div>
      {trip?.specialInstructions && (
        <div className="notes-card"><h3>NOTAS</h3><p>{trip.specialInstructions}</p></div>
      )}
      <div className="action-row">
        <button className="secondary">VER UBICACIÓN</button>
        <button className="primary" onClick={onGo}>¡ESTOY EN CAMINO!</button>
      </div>
    </section>
  );
}

/* ── Route Map ──────────────────────────────────────────── */
function RouteMap({ kind, trip, onBack, onArrive }: {
  kind: "origin" | "destination";
  trip: ReturnType<typeof useDriver>["activeTrip"];
  onBack: () => void; onArrive: () => void;
}) {
  const isOrigin = kind === "origin";
  const address = isOrigin ? trip?.originAddress : trip?.destinationAddress;
  return (
    <section className="screen map-screen">
      <FlowHeader title={isOrigin ? "Punto de origen" : "Conduce a"} onBack={onBack} />
      <h2>{address ?? "—"}</h2>
      <MapPreview />
      <button className="primary wide" onClick={onArrive}>LLEGUÉ</button>
      <div className="route-footer">
        <button onClick={onBack}><ArrowLeft size={14} /> PANEL</button>
        <span>Resumen</span><span>Gastos</span><span>Estado</span>
      </div>
    </section>
  );
}

/* ── Locate Vehicle ─────────────────────────────────────── */
function LocateVehicle({ trip, onBack, onFound, onNotFound, isDelivery }: {
  trip: ReturnType<typeof useDriver>["activeTrip"];
  onBack: () => void; onFound: () => void; onNotFound: () => void; isDelivery?: boolean;
}) {
  return (
    <section className="screen flow-screen locate-screen">
      <FlowHeader title={isDelivery ? "Confirmar entrega" : "Localizar vehículo"} onBack={onBack} />
      <p className="soft">{isDelivery ? "Estás entregando un" : "Estás buscando un"}</p>
      <h2>{[trip?.vehicleBrand, trip?.vehicleModel, trip?.vehicleYear].filter(Boolean).join(" ") || "—"}</h2>
      {trip?.vehicleVin && <><h3>Número de VIN</h3><p className="vin">{trip.vehicleVin}</p></>}
      <p className="soft">Verifica que el VIN coincida con el vehículo que{isDelivery ? " vas a entregar." : " vas a recoger."}</p>
      <div className="action-row fixed-actions">
        <button className="secondary" onClick={onNotFound}>NO LO ENCUENTRO</button>
        <button className="primary" onClick={onFound}>LO ENCONTRÉ</button>
      </div>
    </section>
  );
}

/* ── Done ───────────────────────────────────────────────── */
function DoneScreen({ driver, onPanel }: { driver: { name: string } | null; onPanel: () => void }) {
  const firstName = driver?.name?.split(" ")[0] ?? "Conductor";
  return (
    <section className="screen flow-screen done-screen">
      <style dangerouslySetInnerHTML={{ __html: `.done-thanks{font-size:0.9rem;color:rgba(255,255,255,0.55);line-height:1.6;font-style:italic;max-width:260px;text-align:center;margin-bottom:4px}` }} />
      <CheckCircle2 size={72} />
      <h1>¡Viaje completado!</h1>
      <p className="done-thanks">Gracias por tu trabajo, {firstName}. Cada viaje bien documentado nos ayuda a seguir creciendo juntos.</p>
      <p>El viaje quedó registrado y está listo para tu próximo depósito.</p>
      <button className="primary wide" onClick={onPanel}>VER MIS GASTOS</button>
    </section>
  );
}

/* ── Map Preview ────────────────────────────────────────── */
function MapPreview() {
  return (
    <div className="map-preview">
      <span className="map-label">AGRANDAR MAPA</span>
      <MapPin className="pin" />
      <span className="road one" /><span className="road two" /><span className="road three" />
      <span className="floating fuel"><Fuel size={18} /></span>
    </div>
  );
}

/* ── Money ──────────────────────────────────────────────── */
function Money({ driver, setTab }: { driver: { name: string } | null; setTab: (tab: Tab) => void }) {
  return (
    <section className="screen earnings-screen">
      <header className="earnings-header">
        <button className="icon-button" onClick={() => setTab("panel")} aria-label="Volver"><ArrowLeft size={22} /></button>
        <h1>Tu próximo depósito</h1>
      </header>
      <div className="earnings-tabs">
        <button className="selected">Resumen</button><button>Detalle</button><button>Pagos</button>
      </div>
      <button className="earnings-period">Esta semana<ChevronUp size={16} /></button>
      <article className="earnings-card">
        <span>Total ganado</span>
        <strong>$8,750.00</strong>
        <p><CheckCircle2 size={13} />18% vs semana pasada</p>
        <div className="earnings-chart">
          <svg viewBox="0 0 300 112" role="img" aria-hidden="true">
            <polyline points="0,82 35,70 70,72 105,55 140,66 175,36 210,42 245,34 300,16" fill="none" stroke="#00E5FF" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="210" cy="42" r="5" fill="#00E5FF" />
          </svg>
        </div>
        <div className="earnings-days">
          <span>Lun</span><span>Mar</span><span>Mié</span><span>Jue</span><span>Vie</span><span>Sáb</span><span>Dom</span>
        </div>
        <div className="earnings-summary">
          <div><span>Viajes completados</span><strong>6</strong></div>
          <div><span>Horas en línea</span><strong>28h 15m</strong></div>
        </div>
      </article>
      <section className="earnings-breakdown">
        <h2>Desglose</h2>
        <div><span>Ingresos por viajes</span><strong>$8,400.00</strong></div>
        <div><span>Bonos</span><strong>$350.00</strong></div>
        <div><span>Total</span><strong>$8,750.00</strong></div>
      </section>
      <nav className="earnings-nav">
        <button onClick={() => setTab("panel")}><LayoutDashboard size={18} /><span>Inicio</span></button>
        <button onClick={() => setTab("viajes")}><Map size={18} /><span>Tus viajes</span></button>
        <button className="active"><BadgeDollarSign size={18} /><span>Ganancias</span></button>
        <button onClick={() => setTab("config")}><IdCard size={18} /><span>Perfil</span></button>
      </nav>
    </section>
  );
}

/* ── Settings ───────────────────────────────────────────── */
function ProfileField({ label, value, placeholder }: { label: string; value?: string; placeholder?: string }) {
  return (
    <div className="pf-field">
      <span className="pf-label">{label}</span>
      <div className="pf-value">{value || <span className="pf-placeholder">{placeholder ?? "—"}</span>}</div>
    </div>
  );
}

function SettingsScreen({ driver, onBack, onLogout }: {
  driver: { name: string; email: string; phone: string | null; rating: number | null; tripsCompleted: number; certified: boolean } | null;
  onBack: () => void; onLogout: () => void;
}) {
  const [openSection, setOpenSection] = useState<string | null>(null);
  const toggle = (s: string) => setOpenSection(openSection === s ? null : s);
  return (
    <section className="screen profile-screen">
      <header className="profile-header">
        <button className="icon-button" aria-label="Volver" onClick={onBack}><ArrowLeft size={22} /></button>
        <h1>Mi perfil</h1>
        <div style={{ width: 22 }} />
      </header>
      <section className="profile-card">
        <div className="profile-photo"><span /></div>
        <div>
          <h2>{driver?.name ?? "—"}</h2>
          <p><span>★</span> {driver?.rating?.toFixed(1) ?? "—"} <span>·</span> {driver?.tripsCompleted ?? 0} viajes</p>
          {driver?.certified && <strong><CheckCircle2 size={13} /> Conductor certificado</strong>}
        </div>
      </section>
      <section className="profile-section">
        <h2>Información personal</h2>
        <div className="profile-list">
          <article className="profile-detail">
            <button onClick={() => toggle("personal")}>
              <span className="profile-list-icon"><Phone size={17} /></span>
              <strong>Datos personales</strong><ChevronRight size={18} />
            </button>
            {openSection === "personal" && (
              <div className="pf-group">
                <ProfileField label="Nombre" value={driver?.name} />
                <ProfileField label="Correo electrónico" value={driver?.email} />
                <ProfileField label="Teléfono" value={driver?.phone ?? undefined} />
              </div>
            )}
          </article>
        </div>
      </section>
      <section className="profile-section">
        <h2>Tus documentos</h2>
        <div className="profile-list">
          {["Licencia de conducir", "Identificación oficial", "Constancia fiscal"].map(doc => (
            <article key={doc} className="profile-detail">
              <button onClick={() => toggle(doc)}>
                <span className="profile-list-icon"><IdCard size={17} /></span>
                <strong>{doc}</strong><ChevronRight size={18} />
              </button>
            </article>
          ))}
        </div>
      </section>
      <section className="profile-section">
        <h2>FAQs y documentación</h2>
        <div className="profile-list compact">
          {["Legales", "Administrativos", "Apoyo"].map(item => (
            <button key={item}>
              <span className="profile-list-icon"><HelpCircle size={17} /></span>
              <strong>{item}</strong><ChevronRight size={18} />
            </button>
          ))}
        </div>
      </section>
      <button className="delete-account" onClick={onLogout}><XCircle size={18} />Cerrar sesión</button>
      <footer className="profile-version-footer">
        <span>v C2026</span><span className="profile-version-sep">·</span>
        <span>Ruum-Ruum</span><span className="profile-version-sep">·</span>
        <span>Moviliax</span><span className="profile-version-sep">·</span>
        <span>HManuel Administración e Innovación Digital</span>
      </footer>
    </section>
  );
}

/* ── Contact ────────────────────────────────────────────── */
function ContactScreen({ trip, onBack }: {
  trip: ReturnType<typeof useDriver>["activeTrip"]; onBack: () => void;
}) {
  return (
    <section className="screen flow-screen">
      <FlowHeader title="Datos de contacto" onBack={onBack} />
      <div className="contact-body">
        {trip && <div className="contact-trip-ref"><span>Viaje</span><strong>{trip.id}</strong></div>}
        <div className="contact-fields">
          {trip?.originContactName && (
            <div className="contact-field">
              <Phone size={18} />
              <div><span>Contacto origen</span><strong>{trip.originContactName}</strong></div>
              {trip.originContactPhone && <a href={`tel:${trip.originContactPhone}`} className="contact-action-btn">Llamar</a>}
            </div>
          )}
          {trip?.destContactName && (
            <div className="contact-field">
              <Phone size={18} />
              <div><span>Contacto destino</span><strong>{trip.destContactName}</strong></div>
              {trip.destContactPhone && <a href={`tel:${trip.destContactPhone}`} className="contact-action-btn">Llamar</a>}
            </div>
          )}
          {trip?.specialInstructions && (
            <div className="contact-field">
              <ReceiptText size={18} />
              <div><span>Instrucciones</span><strong>{trip.specialInstructions}</strong></div>
            </div>
          )}
        </div>
        {trip?.destContactPhone && (
          <a href={`https://wa.me/${trip.destContactPhone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="primary wide contact-whatsapp">
            <Phone size={18} />Contactar por WhatsApp
          </a>
        )}
      </div>
    </section>
  );
}

/* ── Support Chat ───────────────────────────────────────── */
const SUPPORT_MESSAGES = [{ from: "agent", text: "¡Hola! Soy parte del equipo de soporte Ruum Ruum. ¿En qué te puedo ayudar hoy?" }];

function SupportChat({ onBack }: { onBack: () => void }) {
  const [messages, setMessages] = useState(SUPPORT_MESSAGES);
  const [input, setInput] = useState("");
  const [waiting, setWaiting] = useState(false);
  const bottomRef = React.useRef<HTMLDivElement>(null);
  const autoReplies = ["Entendido, déjame revisar tu caso.", "Un momento, estoy consultando con el equipo.", "Gracias por la información.", "Te ayudo con eso ahora mismo.", "Registré tu reporte. El equipo te contactará pronto."];
  const send = () => {
    const text = input.trim();
    if (!text || waiting) return;
    setMessages(prev => [...prev, { from: "user", text }]);
    setInput(""); setWaiting(true);
    setTimeout(() => {
      setMessages(prev => [...prev, { from: "agent", text: autoReplies[Math.floor(Math.random() * autoReplies.length)] }]);
      setWaiting(false);
    }, 1200);
  };
  React.useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, waiting]);
  return (
    <section className="screen support-screen">
      <header className="support-header">
        <button className="icon-btn" onClick={onBack}><ArrowLeft size={22} /></button>
        <div className="support-agent-info">
          <div className="support-avatar">RR</div>
          <div><strong>Soporte Ruum Ruum</strong><span className="support-online">● En línea</span></div>
        </div>
        <div style={{ width: 34 }} />
      </header>
      <div className="support-messages">
        {messages.map((m, i) => <div key={i} className={`support-bubble ${m.from}`}>{m.text}</div>)}
        {waiting && <div className="support-bubble agent support-typing"><span /><span /><span /></div>}
        <div ref={bottomRef} />
      </div>
      <div className="support-input-row">
        <input className="support-input" placeholder="Escribe tu mensaje..." value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && send()} />
        <button className="support-send-btn" onClick={send} disabled={!input.trim() || waiting}><Navigation size={18} /></button>
      </div>
    </section>
  );
}

/* ── Evidence Capture ───────────────────────────────────── */
const evCSS = `
.ev-field-group{display:flex;flex-direction:column;gap:10px}
.ev-field{display:flex;flex-direction:column;gap:4px}
.ev-field span{font-size:0.72rem;font-weight:600;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:0.07em}
.ev-field input{background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);border-radius:8px;padding:10px 12px;color:inherit;font-size:0.88rem;outline:none}
.ev-field input:focus{border-color:rgba(0,229,255,0.5);background:rgba(0,229,255,0.05)}
.ev-comments{width:100%;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);border-radius:8px;padding:10px 12px;color:inherit;font-size:0.85rem;resize:none;outline:none;font-family:inherit;box-sizing:border-box}
.ev-comments:focus{border-color:rgba(0,229,255,0.4)}
`;

function EvidenceCapture({ phase, trip, onBack, onDone }: {
  phase: EvidencePhaseTab;
  trip: ReturnType<typeof useDriver>["activeTrip"];
  onBack: () => void;
  onDone: (notes?: string, km?: number, fuel?: number) => void;
}) {
  const [activeTab, setActiveTab] = useState<EvidencePhaseTab>(phase);
  const [capturedPhotos, setCapturedPhotos] = useState<Record<string, boolean>>({});
  const [vin, setVin] = useState(trip?.vehicleVin ?? "");
  const [plates, setPlates] = useState(trip?.vehiclePlates ?? "");
  const [fuel, setFuel] = useState("");
  const [keys, setKeys] = useState("");
  const [km, setKm] = useState("");
  const [pickupComments, setPickupComments] = useState("");
  const [keyLocation, setKeyLocation] = useState("");
  const [vehicleLocation, setVehicleLocation] = useState("");
  const [deliveryComments, setDeliveryComments] = useState("");

  const sections = evidenceSections[activeTab];
  const togglePhoto = (key: string) => setCapturedPhotos(prev => ({ ...prev, [key]: !prev[key] }));
  const totalPhotos = sections.reduce((acc, s) => acc + s.photos.length, 0);
  const capturedCount = Object.values(capturedPhotos).filter(Boolean).length;
  const allDone = capturedCount >= totalPhotos;

  const handleDone = () => {
    const notes = activeTab === "inicial"
      ? [pickupComments, keys ? `Llaves: ${keys}` : "", keyLocation ? `Llaves dejadas en: ${keyLocation}` : ""].filter(Boolean).join(" | ")
      : [deliveryComments, vehicleLocation ? `Vehículo dejado en: ${vehicleLocation}` : "", keyLocation ? `Llaves dejadas en: ${keyLocation}` : ""].filter(Boolean).join(" | ");
    onDone(notes || undefined, km ? parseInt(km) : undefined, fuel ? parseInt(fuel) : undefined);
  };

  return (
    <section className="screen evidence-capture-screen">
      <style dangerouslySetInnerHTML={{ __html: evCSS }} />
      <FlowHeader title="Evidencia del vehículo" onBack={onBack} />
      <div className="ev-tabs">
        {(["inicial", "durante", "entrega"] as EvidencePhaseTab[]).map(t => (
          <button key={t} className={activeTab === t ? "selected" : ""} onClick={() => { setActiveTab(t); setCapturedPhotos({}); }}>
            {t === "inicial" ? "Recolección" : t === "durante" ? "Durante" : "Entrega"}
          </button>
        ))}
      </div>
      <div className="ev-body">
        {activeTab === "inicial" && (
          <div className="ev-section">
            <h3>Datos del vehículo</h3>
            <div className="ev-field-group">
              <label className="ev-field"><span>Número VIN</span><input value={vin} onChange={e => setVin(e.target.value)} placeholder={trip?.vehicleVin ?? "VIN"} /></label>
              <label className="ev-field"><span>Placas</span><input value={plates} onChange={e => setPlates(e.target.value)} placeholder={trip?.vehiclePlates ?? "NMX-0000"} /></label>
              <label className="ev-field"><span>Nivel de combustible (%)</span><input value={fuel} onChange={e => setFuel(e.target.value)} placeholder="75" inputMode="numeric" /></label>
              <label className="ev-field"><span>Llaves recibidas</span><input value={keys} onChange={e => setKeys(e.target.value)} placeholder="Ej. 2 llaves" /></label>
            </div>
          </div>
        )}
        {activeTab === "entrega" && (
          <div className="ev-section">
            <h3>Datos de entrega</h3>
            <div className="ev-field-group">
              <label className="ev-field"><span>¿Dónde dejaste la llave?</span><input value={keyLocation} onChange={e => setKeyLocation(e.target.value)} placeholder="Ej. Recepción, caja de seguridad..." /></label>
              <label className="ev-field"><span>¿Dónde dejaste el vehículo?</span><input value={vehicleLocation} onChange={e => setVehicleLocation(e.target.value)} placeholder="Ej. Cajón 14, área de recepción..." /></label>
            </div>
          </div>
        )}
        {sections.map(section => (
          <div key={section.label} className="ev-section">
            <h3>{section.label}</h3>
            <div className="ev-photo-grid">
              {section.photos.map(photo => {
                const key = `${activeTab}-${section.label}-${photo}`;
                const taken = capturedPhotos[key];
                return (
                  <button key={photo} className={`ev-photo-slot ${taken ? "taken" : ""}`} onClick={() => togglePhoto(key)}>
                    {taken ? <><CheckCircle2 size={22} className="ev-check" /><span className="ev-photo-label">{photo}</span></> : <><Camera size={22} /><span className="ev-photo-label">{photo}</span></>}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        <div className="ev-km-row">
          <span>Kilometraje</span>
          <div className="ev-km-value">
            <input value={km} onChange={e => setKm(e.target.value)} placeholder="45,230" inputMode="numeric" style={{ background: "none", border: "none", color: "inherit", fontSize: "0.9rem", width: "100px", textAlign: "right" }} />
            <span style={{ fontSize: "0.8rem", opacity: 0.5 }}>km</span>
          </div>
        </div>
        {activeTab === "inicial" && (
          <div className="ev-section">
            <h3>Tus comentarios sobre la recolección</h3>
            <textarea className="ev-comments" placeholder="Observaciones opcionales..." value={pickupComments} onChange={e => setPickupComments(e.target.value)} rows={3} />
          </div>
        )}
        {activeTab === "entrega" && (
          <div className="ev-section">
            <h3>Tus comentarios sobre la entrega</h3>
            <textarea className="ev-comments" placeholder="Observaciones opcionales..." value={deliveryComments} onChange={e => setDeliveryComments(e.target.value)} rows={3} />
          </div>
        )}
        <button className="ev-guidelines-link">Ver lineamientos de evidencia</button>
      </div>
      <div className="ev-footer">
        <button className={`primary wide ${!allDone ? "disabled-btn" : ""}`} onClick={allDone ? handleDone : undefined}>
          {activeTab === "entrega" ? "FINALIZAR VIAJE" : "CONTINUAR"}
          {!allDone && <span className="ev-counter"> ({capturedCount}/{totalPhotos})</span>}
        </button>
      </div>
    </section>
  );
}

/* ── Expenses Screen ────────────────────────────────────── */
const expenseCSS = `
.expenses-screen{display:flex;flex-direction:column;height:100%;background:var(--bg,#0d1117);color:var(--text,#e8eaf6)}
.expenses-body{flex:1;overflow-y:auto;padding:16px 20px;display:flex;flex-direction:column;gap:16px}
.expenses-intro{font-size:0.85rem;color:rgba(255,255,255,0.55);line-height:1.5}
.expense-card{background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:16px;display:flex;flex-direction:column;gap:12px}
.expense-card-header{display:flex;justify-content:space-between;align-items:center}
.expense-card-header h3{font-size:0.9rem;font-weight:700}
.expense-remove-btn{background:none;border:none;color:rgba(255,100,100,0.7);cursor:pointer;padding:4px}
.expense-field{display:flex;flex-direction:column;gap:4px}
.expense-field label{font-size:0.7rem;font-weight:600;color:rgba(255,255,255,0.45);text-transform:uppercase;letter-spacing:0.07em}
.expense-field input,.expense-field select{background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);border-radius:8px;padding:9px 12px;color:inherit;font-size:0.85rem;outline:none;font-family:inherit}
.expense-field input:focus,.expense-field select:focus{border-color:rgba(0,229,255,0.4)}
.expense-field select option{background:#1a2030}
.expense-photo-btn{display:flex;align-items:center;gap:8px;background:rgba(255,255,255,0.04);border:1px dashed rgba(255,255,255,0.2);border-radius:8px;padding:10px 14px;color:rgba(255,255,255,0.55);font-size:0.82rem;cursor:pointer;width:100%}
.expense-photo-btn.has-photo{border-color:rgba(0,229,255,0.3);color:#00E5FF}
.add-expense-btn{display:flex;align-items:center;justify-content:center;gap:8px;background:rgba(0,229,255,0.08);border:1px dashed rgba(0,229,255,0.3);border-radius:12px;padding:12px;color:#00E5FF;font-size:0.88rem;font-weight:600;cursor:pointer;width:100%}
.expenses-disclaimer{display:flex;align-items:center;gap:8px;background:rgba(255,200,0,0.07);border:1px solid rgba(255,200,0,0.2);border-radius:10px;padding:10px 14px;font-size:0.78rem;color:rgba(255,200,0,0.9)}
.expenses-footer{padding:16px 20px;border-top:1px solid rgba(255,255,255,0.06);display:flex;flex-direction:column;gap:8px}
`;

const expenseTypes = ["Casetas", "Combustible", "Estacionamiento", "Alimentos", "Transporte", "Otro"];
type Expense = { id: number; type: string; description: string; amount: string; hasPhoto: boolean };

function ExpensesScreen({ onDone, onFinish }: {
  onDone: (expenses: { type: string; concept: string; amount: number }[]) => Promise<void>;
  onFinish: () => void;
}) {
  const [expenses, setExpenses] = useState<Expense[]>([{ id: 1, type: "", description: "", amount: "", hasPhoto: false }]);
  const [submitting, setSubmitting] = useState(false);
  const nextId = React.useRef(2);
  const addExpense = () => setExpenses(prev => [...prev, { id: nextId.current++, type: "", description: "", amount: "", hasPhoto: false }]);
  const removeExpense = (id: number) => setExpenses(prev => prev.filter(e => e.id !== id));
  const updateExpense = (id: number, field: keyof Expense, value: string | boolean) => setExpenses(prev => prev.map(e => e.id === id ? { ...e, [field]: value } : e));

  const handleSend = async () => {
    setSubmitting(true);
    const valid = expenses.filter(e => e.type && e.amount && parseFloat(e.amount) > 0);
    if (valid.length > 0) {
      await onDone(valid.map(e => ({ type: e.type, concept: e.description || e.type, amount: parseFloat(e.amount) })));
    }
    onFinish();
  };

  return (
    <section className="expenses-screen">
      <style dangerouslySetInnerHTML={{ __html: expenseCSS }} />
      <FlowHeader title="Sube tus gastos" onBack={onFinish} />
      <div className="expenses-body">
        <p className="expenses-intro">Registra los gastos del viaje. Adjunta evidencia cuando sea posible.</p>
        {expenses.map((exp, idx) => (
          <div key={exp.id} className="expense-card">
            <div className="expense-card-header">
              <h3>Gasto {idx + 1}</h3>
              {expenses.length > 1 && <button className="expense-remove-btn" onClick={() => removeExpense(exp.id)}><XCircle size={18} /></button>}
            </div>
            <div className="expense-field">
              <label>Tipo de gasto</label>
              <select value={exp.type} onChange={e => updateExpense(exp.id, "type", e.target.value)}>
                <option value="">Selecciona...</option>
                {expenseTypes.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="expense-field">
              <label>Descripción</label>
              <input value={exp.description} onChange={e => updateExpense(exp.id, "description", e.target.value)} placeholder="Ej. Caseta en km 142..." />
            </div>
            <div className="expense-field">
              <label>Monto</label>
              <input value={exp.amount} onChange={e => updateExpense(exp.id, "amount", e.target.value)} placeholder="$0.00" inputMode="decimal" />
            </div>
            <button className={`expense-photo-btn ${exp.hasPhoto ? "has-photo" : ""}`} onClick={() => updateExpense(exp.id, "hasPhoto", !exp.hasPhoto)}>
              <Camera size={18} />{exp.hasPhoto ? "Evidencia adjunta ✓" : "Adjuntar foto / comprobante"}
            </button>
          </div>
        ))}
        <button className="add-expense-btn" onClick={addExpense}>+ Agregar otro gasto</button>
        <div className="expenses-disclaimer"><Info size={16} style={{ flexShrink: 0 }} />Gastos sujetos a aprobación por parte del solicitante.</div>
      </div>
      <div className="expenses-footer">
        <button className="primary wide" onClick={handleSend} disabled={submitting}>{submitting ? "Enviando…" : "ENVIAR GASTOS"}</button>
        <button className="offer-reject-btn" onClick={onFinish}>Omitir por ahora</button>
      </div>
    </section>
  );
}

/* ── Incident Report ────────────────────────────────────── */
const incidentReasons = ["Accidente / Daño", "Problema mecánico", "Tráfico / Bloqueo", "Condiciones del camino", "Otro"];
const incidentTypeMap: Record<string, string> = {
  "Accidente / Daño": "dano_reportado", "Problema mecánico": "otro",
  "Tráfico / Bloqueo": "retraso", "Condiciones del camino": "retraso", "Otro": "otro"
};

function IncidentReport({ onBack, onSent, onSubmit }: {
  onBack: () => void; onSent: () => void;
  onSubmit: (type: string, description: string) => Promise<void>;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSend = async () => {
    if (!selected) return;
    setSubmitting(true);
    await onSubmit(incidentTypeMap[selected] ?? "otro", note || selected);
    setSent(true);
    setTimeout(onSent, 2000);
  };

  if (sent) return (
    <section className="screen flow-screen done-screen">
      <CheckCircle2 size={64} />
      <h1>Reporte enviado</h1>
      <p>Torre de control fue notificada. En breve recibirás instrucciones.</p>
    </section>
  );

  return (
    <section className="screen incident-screen">
      <div className="incident-header">
        <button className="icon-btn" onClick={onBack}><ArrowLeft size={22} /></button>
        <h2>Reportar incidencia</h2>
        <button className="icon-btn" onClick={onBack}><X size={22} /></button>
      </div>
      <div className="incident-body">
        <div className="incident-section">
          <h3>Selecciona el tipo de incidencia</h3>
          <div className="incident-reasons">
            {incidentReasons.map(reason => (
              <button key={reason} className={`incident-reason ${selected === reason ? "selected" : ""}`} onClick={() => setSelected(reason)}>
                <span className={`incident-radio ${selected === reason ? "checked" : ""}`} />{reason}
              </button>
            ))}
          </div>
        </div>
        <div className="incident-section">
          <h3>Descripción <span className="optional">(opcional)</span></h3>
          <textarea className="incident-note" placeholder="Cuéntanos qué sucedió..." value={note} onChange={e => setNote(e.target.value)} rows={3} />
        </div>
        <div className="incident-section">
          <h3>Agrega fotos <span className="optional">(opcional)</span></h3>
          <button className="incident-photo-zone" onClick={() => { if (photos.length < 4) setPhotos(prev => [...prev, `foto_${prev.length + 1}`]); }} disabled={photos.length >= 4}>
            {photos.length === 0 ? <><Camera size={28} /><span>Máx. 4 fotos</span></> : (
              <div className="incident-photo-thumbs">
                {photos.map((_, i) => <div key={i} className="incident-thumb"><Camera size={18} /></div>)}
                {photos.length < 4 && <div className="incident-thumb add-more">+</div>}
              </div>
            )}
          </button>
        </div>
      </div>
      <div className="incident-footer">
        <button className={`primary wide ${!selected ? "disabled-btn" : ""}`} onClick={handleSend} disabled={!selected || submitting}>
          {submitting ? "Enviando…" : "Enviar reporte"}
        </button>
      </div>
    </section>
  );
}

/* ── Bottom Nav ─────────────────────────────────────────── */
function BottomNav({ active, setActive }: { active: Tab; setActive: (tab: Tab) => void }) {
  const tabs = [
    { id: "panel" as const, label: "Inicio", icon: <LayoutDashboard size={18} /> },
    { id: "viajes" as const, label: "Tus viajes", icon: <Map size={18} /> },
    { id: "dinero" as const, label: "Ganancias", icon: <BadgeDollarSign size={18} /> },
    { id: "soporte" as const, label: "Soporte", icon: <HelpCircle size={18} /> },
  ];
  return (
    <nav className="bottom-nav" aria-label="Navegación principal">
      {tabs.map(item => (
        <button key={item.id} className={active === item.id ? "active" : ""} onClick={() => setActive(item.id)}>
          {item.icon}<span>{item.label}</span>
        </button>
      ))}
    </nav>
  );
}