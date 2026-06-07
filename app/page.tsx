"use client";

import React, { Fragment, useState } from "react";
import {
  ArrowLeft,
  BadgeDollarSign,
  Calendar,
  Camera,
  Car,
  CheckCircle2,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Clock,
  Columns3,
  Fuel,
  HelpCircle,
  IdCard,
  Info,
  KeyRound,
  LayoutDashboard,
  Lock,
  LogIn,
  Mail,
  Map,
  MapPin,
  Menu,
  Navigation,
  Phone,
  ReceiptText,
  Settings,
  Timer,
  UserPlus,
  Wallet,
  X,
  XCircle
} from "lucide-react";

type Tab = "panel" | "viajes" | "dinero" | "config" | "soporte";
type TripTab = "ofertas" | "aceptados";
type FlowStep =
  | "offerDetail"
  | "summary"
  | "readyToGo"
  | "originMap"
  | "locate"
  | "evidence"
  | "incident"
  | "evidenceCapture"
  | "destinationMap"
  | "destinationLocate"
  | "destinationEvidenceCapture"
  | "destinationArrival"
  | "done";

type EvidencePhase = "inicial" | "durante" | "entrega";
type EvidencePhaseTab = "inicial" | "durante" | "entrega";

const evidenceSteps = [
  {
    title: "Número VIN",
    eyebrow: "Paso 1 de 5",
    body: "Confirma que el VIN coincida antes de iniciar el traslado.",
    fields: ["LSGKB54H5KV225363"]
  },
  {
    title: "Placas y combustible",
    eyebrow: "Paso 2 de 5",
    body: "Registra placas visibles y nivel de combustible.",
    fields: ["NMX-8421", "Combustible: 68%"]
  },
  {
    title: "Fotos del vehículo",
    eyebrow: "Paso 3 de 5",
    body: "Captura frente, lado conductor, trasera, lado copiloto y tablero.",
    fields: ["Frente", "Lado conductor", "Trasera", "Lado copiloto", "Tablero", "Agregar más"]
  },
  {
    title: "Llaves recibidas",
    eyebrow: "Paso 4 de 5",
    body: "Indica cuántas llaves recibiste del vehículo.",
    fields: ["2 llaves"]
  },
  {
    title: "Nota de recogida",
    eyebrow: "Paso 5 de 5",
    body: "Agrega una nota opcional para dejar contexto.",
    fields: ["Sin observaciones"]
  }
];

const offerTrip = {
  id: "3465791",
  route: "KAVAK LERMA 1",
  city: "Ocoyoacac - Méx.",
  requester: "Kavak - Mexico",
  start: "09:00 AM",
  end: "05:00 PM",
  duration: "8hr",
  distance: "189.9Km",
  pay: "$623.28",
  vehicle: "Chevrolet Cavalier 2019",
  vin: "LSGKB54H5KV225363",
  origin: "Tesla WH - Forum Naucalpan",
  originAddress: "120 Av. Primero de Mayo, Naucalpan de Juárez, Méx., 53500",
  destination: "Kavak Lerma 5",
  destinationAddress: "Ciudad Lerma de Villada - Méx.",
  notes: "La tarifa de este viaje es $623.28 e incluye bono de $200.00 por retorno. Para tu traslado durante el viaje se recomienda usar un servicio de transporte incluido — no necesitas cubrir ningún gasto adicional.\n\nEl viaje inicia a las 9:00 AM, aproximadamente 6 horas con 22 minutos desde ahora. Distancia estimada: 189.9 km, duración aproximada: 8 horas. Este viaje está programado para 2 conductores.",
  stops: [
    {
      num: 1,
      name: "Tesla WH - Forum Naucalpan",
      city: "Naucalpan de Juárez - Méx.",
      address: "120 Av. Primero de Mayo, Naucalpan de Juárez, Méx., 53500",
      action: "Recolección Vehículo por confirmar"
    },
    {
      num: 2,
      name: "Kavak Lerma 5",
      city: "Ciudad Lerma de Villada - Méx.",
      address: "Parque Industrial Lerma, Lerma de Villada, Méx.",
      action: "Entrega Vehículo por confirmar"
    }
  ]
};

const acceptedTrips = [
  {
    id: "3543025",
    route: "WH-LERMA 5",
    city: "Lerma de Villada - Méx.",
    requester: "Kavak - Mexico",
    start: "09:00",
    end: "17:04",
    duration: "8hr",
    distance: "175.4Km",
    pay: "$590.52"
  },
  {
    id: "3542968",
    route: "AMAZONDTL1-TOLUCA",
    city: "Toluca - Méx.",
    requester: "Element Mexico - Armada",
    start: "09:30",
    end: "15:41",
    duration: "6hr",
    distance: "115.8Km",
    pay: "$447.72"
  }
];

export default function Home() {
  const [isAuthed, setIsAuthed] = useState(false);
  const [tab, setTab] = useState<Tab>("panel");
  const [tripTab, setTripTab] = useState<TripTab>("ofertas");
  const [flow, setFlow] = useState<FlowStep | null>(null);
  const [acceptedOffer, setAcceptedOffer] = useState(false);
  const [evidenceIndex, setEvidenceIndex] = useState(0);
  const [evidencePhase, setEvidencePhase] = useState<EvidencePhase>("inicial");

  if (!isAuthed) {
    return <Onboarding onEnter={() => setIsAuthed(true)} />;
  }

  const goPanel = () => { setTab("panel"); setFlow(null); };

  const openSummary = () => {
    setFlow("summary");
  };

  const acceptOffer = () => {
    setAcceptedOffer(true);
    setTripTab("aceptados");
    setFlow(null);
  };

  const content = (() => {
    if (flow === "offerDetail") {
      return <OfferDetail onBack={() => setFlow(null)} onAccept={acceptOffer} onReject={() => setFlow(null)} />;
    }
    if (flow === "summary") {
      return <TripSummary onBack={() => setFlow(null)} onGo={() => setFlow("originMap")} />;
    }
    if (flow === "originMap") {
      return <RouteMap kind="origin" onBack={() => setFlow("summary")} onArrive={() => setFlow("locate")} />;
    }
    if (flow === "locate") {
      return (
        <LocateVehicle
          onBack={() => setFlow("originMap")}
          onFound={() => { setEvidencePhase("inicial"); setFlow("evidenceCapture"); }}
          onNotFound={() => setFlow("incident")}
        />
      );
    }
    if (flow === "incident") {
      return <IncidentReport onBack={() => setFlow("locate")} onSent={() => setFlow("locate")} />;
    }
    if (flow === "evidenceCapture") {
      return (
        <EvidenceCapture
          phase={evidencePhase}
          onBack={() => evidencePhase === "inicial" ? setFlow("locate") : setFlow("destinationLocate")}
          onDone={() => evidencePhase === "inicial" ? setFlow("destinationMap") : setFlow("done")}
        />
      );
    }
    if (flow === "evidence") {
      return (
        <EvidenceFlow
          index={evidenceIndex}
          onBack={() => evidenceIndex === 0 ? setFlow("locate") : setEvidenceIndex(evidenceIndex - 1)}
          onNext={() => {
            if (evidenceIndex === evidenceSteps.length - 1) { setEvidenceIndex(0); setFlow("destinationMap"); }
            else { setEvidenceIndex(evidenceIndex + 1); }
          }}
        />
      );
    }
    if (flow === "destinationMap") {
      return <RouteMap kind="destination" onBack={() => setFlow("evidenceCapture")} onArrive={() => setFlow("destinationLocate")} />;
    }
    if (flow === "destinationLocate") {
      return (
        <LocateVehicle
          onBack={() => setFlow("destinationMap")}
          onFound={() => { setEvidencePhase("entrega"); setFlow("evidenceCapture"); }}
          onNotFound={() => setFlow("incident")}
          isDelivery
        />
      );
    }
    if (flow === "destinationArrival") {
      return <DestinationArrival onBack={() => setFlow("destinationMap")} onDone={() => setFlow("done")} />;
    }
    if (flow === "done") {
      return <DoneScreen onPanel={goPanel} />;
    }

    if (tab === "panel") {
      return <Panel onMoney={() => setTab("dinero")} onSettings={() => setTab("config")} hasTrip={acceptedOffer} onTrip={openSummary} onContact={() => setTab("contacto" as Tab)} onSupport={() => setTab("soporte")} />;
    }
    if (tab === "viajes") {
      return (
        <Trips
          active={tripTab}
          setActive={setTripTab}
          acceptedOffer={acceptedOffer}
          setTab={setTab}
          onSettings={() => setTab("config")}
          onOffer={() => setFlow("offerDetail")}
          onAccepted={() => setFlow("summary")}
        />
      );
    }
    if (tab === "dinero") return <Money setTab={setTab} />;
    if (tab === "soporte") return <SupportChat onBack={() => setTab("panel")} />;
    if ((tab as string) === "contacto") return <ContactScreen onBack={() => setTab("panel")} />;
    return <SettingsScreen onBack={() => setTab("panel")} />;
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

/* ── Onboarding ─────────────────────────────────────────── */
function Onboarding({ onEnter }: { onEnter: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("Ingresa con tus datos de conductor.");

  const hasEmail = email.trim().includes("@");
  const hasPassword = password.trim().length >= 6;

  const submit = (mode: "login" | "signup") => {
    if (!hasEmail) { setMessage("Escribe un correo válido para continuar."); return; }
    if (!hasPassword) { setMessage("La contraseña debe tener al menos 6 caracteres."); return; }
    setMessage(mode === "login" ? "Acceso correcto." : "Cuenta creada correctamente.");
    onEnter();
  };

  const recover = () => {
    if (!hasEmail) { setMessage("Escribe tu correo para enviarte la recuperación."); return; }
    setMessage(`Enviamos instrucciones a ${email.trim()}.`);
  };

  return (
    <main className="shell auth-shell">
      <section className="auth-window" aria-label="Inicio de sesión">
        <div className="auth-brand">
          <div className="ruum-logo" aria-label="Ruum Ruum by Moviliax">
            <strong>RUUM</strong>
            <strong>RUUM</strong>
            <small>BY MOVILIAX</small>
          </div>
          <span>CONDUCTOR</span>
          <h1>Acepta viajes. Carga evidencia. Cobra con claridad.</h1>
          <p>Conductores certificados. Viajes documentados. Control total.</p>
          <em>{message}</em>
        </div>
        <form className="auth-form" onSubmit={(e) => { e.preventDefault(); submit("login"); }}>
          <label>
            Correo
            <span>
              <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" inputMode="email" autoComplete="email" placeholder="conductor@correo.com" />
            </span>
          </label>
          <label>
            Contraseña
            <span>
              <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" autoComplete="current-password" placeholder="Mínimo 6 caracteres" />
            </span>
          </label>
          <button className="forgot-link" type="button" onClick={recover}>¿Olvidaste tu contraseña?</button>
          <button className="auth-primary" type="submit"><LogIn size={22} />Entrar</button>
          <button className="auth-secondary" type="button" onClick={() => submit("signup")}><UserPlus size={22} />Crear cuenta</button>
        </form>
      </section>
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
function Panel({ onMoney, onSettings, onTrip, onContact, onSupport }: {
  onMoney: () => void; onSettings: () => void; hasTrip: boolean;
  onTrip: () => void; onContact: () => void; onSupport: () => void;
}) {
  return (
    <section className="screen panel-screen">
      <header className="panel-top">
        <div className="panel-brand">Ruum Ruum</div>
        <button className="panel-settings-btn" aria-label="Configuración" onClick={onSettings}><Settings size={22} /></button>
      </header>
      <div className="panel-greeting">
        <h1>Hola, Luis</h1>
        <p><CheckCircle2 size={15} />Conductor certificado</p>
      </div>
      <button className="panel-trip-card" onClick={onTrip}>
        <div className="panel-trip-head">
          <div><h2>Tu viaje activo</h2><strong>RR-2024-0587</strong></div>
          <span>En camino</span>
        </div>
        <div className="panel-trip-details">
          <div><small>Origen</small><b>Ciudad de México, CDMX</b></div>
          <div className="panel-trip-price"><small>Tu tarifa</small><b>$3,850.00</b></div>
          <div><small>Destino</small><b>Guadalajara, Jalisco</b></div>
        </div>
        <span className="panel-trip-cta">Ver detalle del viaje<ChevronRight size={22} /></span>
      </button>
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
function Trips({ active, setActive, acceptedOffer, setTab, onSettings, onOffer, onAccepted }: {
  active: TripTab; setActive: (tab: TripTab) => void; acceptedOffer: boolean;
  setTab: (tab: Tab) => void; onSettings: () => void; onOffer: () => void; onAccepted: () => void;
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
          <button className="offer-card" onClick={onOffer}>
            <div className="offer-head">
              <strong>Viaje #{offerTrip.id}</strong>
              <span>{offerTrip.pay} <ChevronRight size={18} /></span>
            </div>
            <small>Solicitado por {offerTrip.requester}</small>
            <div className="itinerary">
              <div>
                <h3>{offerTrip.route}</h3>
                <b>{offerTrip.vin}</b>
                <p><span>Ciudad</span> {offerTrip.city}</p>
              </div>
              <strong>{offerTrip.pay}</strong>
              <div className="trip-meta">
                <span><Clock size={12} /> {offerTrip.start} - {offerTrip.end}</span>
                <span><Timer size={12} /> {offerTrip.duration}</span>
                <span><Map size={12} /> {offerTrip.distance}</span>
              </div>
            </div>
          </button>
        </div>
      ) : (
        <div className="trip-day">
          {acceptedOffer && (
            <AcceptedTripCard trip={{ ...offerTrip, start: "09:00", end: "17:00", distance: "189.9Km" }} primary onClick={onAccepted} />
          )}
          {acceptedTrips.map((trip) => (
            <AcceptedTripCard key={trip.id} trip={trip} onClick={onAccepted} />
          ))}
        </div>
      )}
    </section>
  );
}

function AcceptedTripCard({ trip, primary, onClick }: {
  trip: { id: string; route: string; city: string; requester: string; start: string; end: string; duration: string; distance: string; pay: string; };
  primary?: boolean; onClick: () => void;
}) {
  return (
    <button className="accepted-card" onClick={onClick}>
      <span className="tag">ASIGNADO</span>
      <div className="accepted-row"><h3>Viaje #{trip.id}</h3><strong>{trip.pay}</strong></div>
      <b>{trip.route}</b>
      <p><span>Ciudad</span> {trip.city}</p>
      <p><span>Solicitado por</span> {trip.requester}</p>
      <div className="trip-meta">
        <span><Clock size={12} /> {trip.start} - {trip.end}</span>
        <span><Timer size={12} /> {trip.duration}</span>
        <span><Map size={12} /> {trip.distance}</span>
      </div>
      {!primary && <ChevronRight className="card-arrow" />}
    </button>
  );
}

/* ── Offer Detail ───────────────────────────────────────── */
function OfferDetail({ onBack, onAccept, onReject }: {
  onBack: () => void; onAccept: () => void; onReject: () => void;
}) {
  const [notesExpanded, setNotesExpanded] = useState(true);

  return (
    <section className="screen offer-detail-screen">
      <header className="offer-detail-header">
        <button className="icon-button" onClick={onBack} aria-label="Volver"><ArrowLeft size={28} strokeWidth={3} /></button>
        <h1>Viaje #{offerTrip.id}</h1>
        <button className="offer-help-btn" aria-label="Ayuda"><HelpCircle size={24} /></button>
      </header>

      <div className="offer-detail-body">
        {/* Mini mapa */}
        <div className="offer-map-preview">
          <span className="map-label">VER MAPA COMPLETO</span>
          <MapPin style={{ position: "absolute", left: "45%", top: "30%", color: "var(--cyan)", width: 32, height: 32, filter: "drop-shadow(0 4px 8px rgb(0 229 255 / 0.5))" }} />
          <span className="road one" />
          <span className="road two" />
          <span className="road three" />
          <button className="offer-map-expand"><Navigation size={18} /></button>
        </div>

        {/* CTAs principales */}
        <div className="offer-cta-block">
          <button className="offer-accept-btn" onClick={onAccept}>
            <CheckCircle2 size={20} />
            ACEPTAR VIAJE
          </button>
          <button className="offer-reject-btn" onClick={onReject}>
            <XCircle size={18} />
            RECHAZAR VIAJE
          </button>
        </div>

        {/* Notas */}
        <div className="offer-notes-card">
          <button className="offer-notes-toggle" onClick={() => setNotesExpanded(e => !e)}>
            <span className="offer-notes-title">NOTAS</span>
            {notesExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
          {notesExpanded && (
            <div className="offer-notes-body">
              {offerTrip.notes.split("\n\n").map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          )}
        </div>

        {/* Badge viaje compartido */}
        <div className="offer-shared-badge">
          <span>VIAJE COMPARTIDO INCLUIDO.</span>
          <Info size={14} />
        </div>

        {/* Paradas */}
        <div className="offer-stops">
          {offerTrip.stops.map((stop, idx) => (
            <div key={stop.num} className="offer-stop">
              <div className="offer-stop-num">{stop.num}</div>
              <div className="offer-stop-connector">
                {idx < offerTrip.stops.length - 1 && <span className="offer-stop-line" />}
              </div>
              <div className="offer-stop-content">
                <h3>{stop.name}</h3>
                <p className="offer-stop-city">{stop.city}</p>
                <div className="offer-stop-detail">
                  <MapPin size={14} />
                  <span>{stop.address}</span>
                </div>
                <div className="offer-stop-detail">
                  <Car size={14} />
                  <span>{stop.action}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Métricas del viaje */}
        <div className="offer-metrics">
          <div className="offer-metric">
            <Clock size={16} />
            <span>{offerTrip.start} – {offerTrip.end}</span>
          </div>
          <div className="offer-metric">
            <Timer size={16} />
            <span>{offerTrip.duration}</span>
          </div>
          <div className="offer-metric">
            <Map size={16} />
            <span>{offerTrip.distance}</span>
          </div>
          <div className="offer-metric offer-metric-pay">
            <BadgeDollarSign size={16} />
            <span>{offerTrip.pay}</span>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Trip Summary ───────────────────────────────────────── */
function TripSummary({ onBack, onGo }: { onBack: () => void; onGo: () => void }) {
  return (
    <section className="screen flow-screen">
      <FlowHeader title={`Viaje #${offerTrip.id}`} onBack={onBack} />
      <div className="details-strip">
        <h2>Detalles</h2>
        <div className="trip-meta">
          <span><Clock size={12} /> 09:00</span>
          <span><Timer size={12} /> 8hr</span>
          <span><Map size={12} /> {offerTrip.distance}</span>
          <span><Car size={12} /> 03</span>
        </div>
        <p>El tiempo puede variar según el tráfico, el clima u otros factores del camino.</p>
      </div>
      <div className="summary-route">
        <h2>Resumen del viaje</h2>
        <div>
          <MapPin />
          <p><strong>{offerTrip.origin}</strong><span>{offerTrip.originAddress}</span></p>
        </div>
        <div>
          <Navigation />
          <p><strong>{offerTrip.destination}</strong><span>{offerTrip.destinationAddress}</span></p>
        </div>
      </div>
      <div className="notes-card">
        <h3>NOTAS</h3>
        <p>El traslado inicia a las 9:00 AM. Distancia estimada: {offerTrip.distance}. Duración aproximada: 8 horas. Confirma evidencia inicial antes de salir.</p>
      </div>
      <div className="action-row">
        <button className="secondary">VER UBICACIÓN</button>
        <button className="primary" onClick={onGo}>¡ESTOY EN CAMINO!</button>
      </div>
    </section>
  );
}

/* ── Ready To Go ────────────────────────────────────────── */
function ReadyToGo({ onBack, onStart }: { onBack: () => void; onStart: () => void }) {
  return (
    <section className="screen flow-screen">
      <FlowHeader title="Estoy en camino" onBack={onBack} />
      <div className="big-copy">
        <span>Desde tu domicilio</span>
        <h2>Dirígete al punto de inicio</h2>
        <p>Se abrirá la ruta hacia {offerTrip.origin}. Al llegar, confirma para localizar el vehículo.</p>
      </div>
      <MapPreview />
      <button className="primary wide" onClick={onStart}>ABRIR RUTA</button>
    </section>
  );
}

/* ── Route Map ──────────────────────────────────────────── */
function RouteMap({ kind, onBack, onArrive }: { kind: "origin" | "destination"; onBack: () => void; onArrive: () => void }) {
  const isOrigin = kind === "origin";
  return (
    <section className="screen map-screen">
      <FlowHeader title={isOrigin ? "Punto de origen" : "Destino final"} onBack={onBack} />
      <h2>{isOrigin ? offerTrip.origin : offerTrip.destination}</h2>
      <p>{isOrigin ? offerTrip.originAddress : offerTrip.destinationAddress}</p>
      <MapPreview />
      <button className="primary wide" onClick={onArrive}>LLEGUÉ</button>
      <div className="route-footer">
        <button onClick={onBack}><ArrowLeft size={14} /> PANEL</button>
        <span>Resumen</span>
        <span>Gastos</span>
        <span>Estado</span>
      </div>
    </section>
  );
}

/* ── Locate Vehicle ─────────────────────────────────────── */
function LocateVehicle({ onBack, onFound, onNotFound, isDelivery }: {
  onBack: () => void; onFound: () => void; onNotFound: () => void; isDelivery?: boolean;
}) {
  return (
    <section className="screen flow-screen locate-screen">
      <FlowHeader title={isDelivery ? "Confirmar entrega" : "Localizar vehículo"} onBack={onBack} />
      <p className="soft">{isDelivery ? "Estás entregando un" : "Estás buscando un"}</p>
      <h2>{offerTrip.vehicle}</h2>
      <h3>Número de VIN</h3>
      <p className="vin">{offerTrip.vin}</p>
      <div className="vehicle-example">
        <div className="car-sketch">Sin imagen disponible</div>
        <p><strong>Imagen de ejemplo</strong>El vehículo puede tener una apariencia diferente.</p>
      </div>
      <p className="soft">Necesitarás el VIN en el siguiente paso. Asegúrate de que coincida con el vehículo que{isDelivery ? " vas a entregar." : " vas a recoger."}</p>
      <div className="instructions">
        <strong>{isDelivery ? "Ver instrucciones de entrega" : "Ver instrucciones de recogida"}</strong>
        <ChevronUp size={18} />
      </div>
      <div className="action-row fixed-actions">
        <button className="secondary" onClick={onNotFound}>NO LO ENCUENTRO</button>
        <button className="primary" onClick={onFound}>LO ENCONTRÉ</button>
      </div>
    </section>
  );
}

/* ── Evidence Flow ──────────────────────────────────────── */
function EvidenceFlow({ index, onBack, onNext }: { index: number; onBack: () => void; onNext: () => void }) {
  const step = evidenceSteps[index];
  return (
    <section className="screen flow-screen evidence-screen">
      <FlowHeader title="Evidencia de tu auto" onBack={onBack} />
      <span className="step-eyebrow">{step.eyebrow}</span>
      <h2>{step.title}</h2>
      <p>{step.body}</p>
      <div className="evidence-list">
        {step.fields.map((field) => (
          <div key={field} className="evidence-item">
            {index === 2 ? <Camera size={18} /> : index === 3 ? <KeyRound size={18} /> : index === 1 ? <Fuel size={18} /> : <CheckCircle2 size={18} />}
            <span>{field}</span>
          </div>
        ))}
      </div>
      <button className="primary wide" onClick={onNext}>
        {index === evidenceSteps.length - 1 ? "CONTINUAR A DESTINO" : "SIGUIENTE"}
      </button>
    </section>
  );
}

/* ── Destination Arrival ────────────────────────────────── */
function DestinationArrival({ onBack, onDone }: { onBack: () => void; onDone: () => void }) {
  return (
    <section className="screen flow-screen">
      <FlowHeader title="Llegué al destino" onBack={onBack} />
      <div className="big-copy">
        <span>Entrega final</span>
        <h2>Confirma tu llegada</h2>
        <p>Revisa que estás en el punto final antes de cerrar el viaje.</p>
      </div>
      <MapPreview />
      <button className="primary wide" onClick={onDone}>FINALIZAR VIAJE</button>
    </section>
  );
}

/* ── Done ───────────────────────────────────────────────── */
function DoneScreen({ onPanel }: { onPanel: () => void }) {
  return (
    <section className="screen flow-screen done-screen">
      <CheckCircle2 size={72} />
      <h1>Viaje completado</h1>
      <p>El viaje quedó documentado y listo para tu próximo depósito.</p>
      <button className="primary wide" onClick={onPanel}>VOLVER AL PANEL</button>
    </section>
  );
}

/* ── Map Preview ────────────────────────────────────────── */
function MapPreview() {
  return (
    <div className="map-preview">
      <span className="map-label">AGRANDAR MAPA</span>
      <MapPin className="pin" />
      <span className="road one" />
      <span className="road two" />
      <span className="road three" />
      <span className="floating fuel"><Fuel size={18} /></span>
    </div>
  );
}

/* ── Money ──────────────────────────────────────────────── */
function Money({ setTab }: { setTab: (tab: Tab) => void }) {
  return (
    <section className="screen earnings-screen">
      <header className="earnings-header">
        <button className="icon-button" onClick={() => setTab("panel")} aria-label="Volver"><ArrowLeft size={22} /></button>
        <h1>Tu próximo depósito</h1>
      </header>
      <div className="earnings-tabs">
        <button className="selected">Resumen</button>
        <button>Detalle</button>
        <button>Pagos</button>
      </div>
      <button className="earnings-period">Esta semana<ChevronUp size={16} /></button>
      <article className="earnings-card">
        <span>Total ganado</span>
        <strong>$8,750.00</strong>
        <p><CheckCircle2 size={13} />18% vs semana pasada</p>
        <div className="earnings-chart" aria-label="Gráfica de ganancias semanales">
          <svg viewBox="0 0 300 112" role="img" aria-hidden="true">
            <polyline points="0,82 35,70 70,72 105,55 140,66 175,36 210,42 245,34 300,16" fill="none" stroke="#00E5FF" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="210" cy="42" r="5" fill="#00E5FF" />
          </svg>
          <span>Vie</span>
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
      <nav className="earnings-nav" aria-label="Navegación de ganancias">
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

function SettingsScreen({ onBack }: { onBack: () => void }) {
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
        <div className="profile-photo" aria-label="Fotografía del conductor"><span /></div>
        <div>
          <h2>Luis Hernández</h2>
          <p><span>★</span> 4.9 <span>·</span> 256 viajes</p>
          <strong><CheckCircle2 size={13} /> Conductor certificado</strong>
        </div>
      </section>

      <section className="profile-section">
        <h2>Información personal</h2>
        <div className="profile-list">
          <article className="profile-detail">
            <button onClick={() => toggle("personal")}>
              <span className="profile-list-icon"><Phone size={17} /></span>
              <strong>Datos personales</strong>
              <ChevronRight size={18} />
            </button>
            {openSection === "personal" && (
              <div className="pf-group">
                <div className="pf-row-2"><ProfileField label="Nombre(s)" placeholder="—" /><ProfileField label="Apellido paterno" placeholder="—" /></div>
                <ProfileField label="Apellido materno" placeholder="—" />
                <ProfileField label="Teléfono" placeholder="—" />
                <ProfileField label="Correo electrónico" placeholder="—" />
                <ProfileField label="CURP" placeholder="—" />
                <ProfileField label="RFC" placeholder="—" />
              </div>
            )}
          </article>
          <article className="profile-detail">
            <button onClick={() => toggle("domicilio")}>
              <span className="profile-list-icon"><MapPin size={17} /></span>
              <strong>Domicilio</strong>
              <ChevronRight size={18} />
            </button>
            {openSection === "domicilio" && (
              <div className="pf-group">
                <div className="pf-row-3"><ProfileField label="Calle" placeholder="—" /><ProfileField label="Número ext." placeholder="—" /><ProfileField label="Número int." placeholder="—" /></div>
                <ProfileField label="Colonia" placeholder="—" />
                <div className="pf-row-2"><ProfileField label="Municipio / Alcaldía" placeholder="—" /><ProfileField label="Estado" placeholder="—" /></div>
                <ProfileField label="Código postal" placeholder="—" />
              </div>
            )}
          </article>
        </div>
      </section>

      <section className="profile-section">
        <h2>Tus documentos</h2>
        <div className="profile-list">
          <article className="profile-detail">
            <button onClick={() => toggle("licencia")}>
              <span className="profile-list-icon"><IdCard size={17} /></span>
              <strong>Licencia de conducir</strong>
              <ChevronRight size={18} />
            </button>
            {openSection === "licencia" && (
              <div className="pf-group">
                <div className="pf-row-2"><ProfileField label="Tipo" placeholder="—" /><ProfileField label="Número" placeholder="—" /></div>
                <ProfileField label="Vencimiento" placeholder="DD / MM / AAAA" />
                <div className="pf-upload-row">
                  <button className="pf-upload-btn"><Camera size={16} /> Frente</button>
                  <button className="pf-upload-btn"><Camera size={16} /> Reverso</button>
                </div>
              </div>
            )}
          </article>
          <article className="profile-detail">
            <button onClick={() => toggle("ine")}>
              <span className="profile-list-icon"><IdCard size={17} /></span>
              <strong>Identificación oficial</strong>
              <ChevronRight size={18} />
            </button>
            {openSection === "ine" && (
              <div className="pf-group">
                <ProfileField label="Tipo" placeholder="INE / Pasaporte / otro" />
                <div className="pf-row-2"><ProfileField label="Número" placeholder="—" /><ProfileField label="Vencimiento" placeholder="DD / MM / AAAA" /></div>
                <div className="pf-upload-row">
                  <button className="pf-upload-btn"><Camera size={16} /> Frente</button>
                  <button className="pf-upload-btn"><Camera size={16} /> Reverso</button>
                </div>
              </div>
            )}
          </article>
          <article className="profile-detail">
            <button onClick={() => toggle("fiscal")}>
              <span className="profile-list-icon"><ReceiptText size={17} /></span>
              <strong>Constancia fiscal</strong>
              <ChevronRight size={18} />
            </button>
            {openSection === "fiscal" && (
              <div className="pf-group">
                <ProfileField label="RFC" placeholder="—" />
                <button className="pf-upload-btn full"><Camera size={16} /> Adjuntar PDF</button>
              </div>
            )}
          </article>
        </div>
      </section>

      <section className="profile-section">
        <h2>Preferencias</h2>
        <div className="profile-list">
          <article className="profile-detail">
            <button onClick={() => toggle("transmision")}>
              <span className="profile-list-icon"><Settings size={17} /></span>
              <strong>Transmisión</strong>
              <small>Manual / Automática</small>
            </button>
          </article>
          <article className="profile-detail">
            <button onClick={() => toggle("vehiculo")}>
              <span className="profile-list-icon"><Car size={17} /></span>
              <strong>Tipo de vehículo</strong>
              <ChevronRight size={18} />
            </button>
            {openSection === "vehiculo" && (
              <div className="preference-tags">
                {["Sedán", "SUV", "Panel de carga", "Pasajeros", "Motocicleta", "Carga +3.5tn"].map(t => (<span key={t}>{t}</span>))}
              </div>
            )}
          </article>
        </div>
      </section>

      <section className="profile-section">
        <h2>FAQs y documentación</h2>
        <div className="profile-list compact">
          {["Legales", "Administrativos", "Apoyo"].map((item) => (
            <button key={item}>
              <span className="profile-list-icon"><HelpCircle size={17} /></span>
              <strong>{item}</strong>
              <ChevronRight size={18} />
            </button>
          ))}
        </div>
      </section>

      <button className="delete-account"><XCircle size={18} />Eliminar cuenta</button>

      <footer className="profile-version-footer">
        <span>v C2026</span>
        <span className="profile-version-sep">·</span>
        <span>Ruum-Ruum</span>
        <span className="profile-version-sep">·</span>
        <span>Moviliax</span>
        <span className="profile-version-sep">·</span>
        <span>HManuel Administración e Innovación Digital</span>
      </footer>
    </section>
  );
}

/* ── Contact ────────────────────────────────────────────── */
function ContactScreen({ onBack }: { onBack: () => void }) {
  return (
    <section className="screen flow-screen">
      <FlowHeader title="Datos de contacto" onBack={onBack} />
      <div className="contact-body">
        <div className="contact-trip-ref"><span>Viaje</span><strong>RR-2024-0587</strong></div>
        <div className="contact-card">
          <div className="contact-avatar">CR</div>
          <div><p className="contact-role">Solicitante del viaje</p><h2>Carlos Ramírez</h2></div>
        </div>
        <div className="contact-fields">
          <div className="contact-field">
            <Phone size={18} />
            <div><span>Teléfono</span><strong>+52 55 1234 5678</strong></div>
            <a href="tel:+525512345678" className="contact-action-btn">Llamar</a>
          </div>
          <div className="contact-field">
            <Mail size={18} />
            <div><span>Correo</span><strong>c.ramirez@empresa.com</strong></div>
            <a href="mailto:c.ramirez@empresa.com" className="contact-action-btn">Email</a>
          </div>
          <div className="contact-field">
            <ReceiptText size={18} />
            <div><span>Notas del viaje</span><strong>Entregar en recepción principal. Preguntar por José.</strong></div>
          </div>
        </div>
        <a href="https://wa.me/525512345678" target="_blank" rel="noreferrer" className="primary wide contact-whatsapp">
          <Phone size={18} />Contactar por WhatsApp
        </a>
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
  const autoReplies = [
    "Entendido, déjame revisar tu caso.",
    "Un momento, estoy consultando con el equipo.",
    "Gracias por la información. ¿Algo más en lo que te pueda ayudar?",
    "Te ayudo con eso ahora mismo.",
    "Registré tu reporte. El equipo de operaciones te contactará pronto."
  ];
  const send = () => {
    const text = input.trim();
    if (!text || waiting) return;
    setMessages(prev => [...prev, { from: "user", text }]);
    setInput("");
    setWaiting(true);
    setTimeout(() => {
      const reply = autoReplies[Math.floor(Math.random() * autoReplies.length)];
      setMessages(prev => [...prev, { from: "agent", text: reply }]);
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
        {messages.map((m, i) => (<div key={i} className={`support-bubble ${m.from}`}>{m.text}</div>))}
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

function EvidenceCapture({ phase, onBack, onDone }: { phase: EvidencePhaseTab; onBack: () => void; onDone: () => void }) {
  const [activeTab, setActiveTab] = useState<EvidencePhaseTab>(phase);
  const [capturedPhotos, setCapturedPhotos] = useState<Record<string, boolean>>({});
  const sections = evidenceSections[activeTab];
  const togglePhoto = (key: string) => setCapturedPhotos(prev => ({ ...prev, [key]: !prev[key] }));
  const totalPhotos = sections.reduce((acc, s) => acc + s.photos.length, 0);
  const capturedCount = Object.values(capturedPhotos).filter(Boolean).length;
  const allDone = capturedCount >= totalPhotos;
  return (
    <section className="screen evidence-capture-screen">
      <FlowHeader title="Evidencia de tu auto" onBack={onBack} />
      <div className="ev-tabs">
        {(["inicial", "durante", "entrega"] as EvidencePhaseTab[]).map(t => (
          <button key={t} className={activeTab === t ? "selected" : ""} onClick={() => { setActiveTab(t); setCapturedPhotos({}); }}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>
      <div className="ev-body">
        {sections.map((section) => (
          <div key={section.label} className="ev-section">
            <h3>{section.label}</h3>
            <div className="ev-photo-grid">
              {section.photos.map((photo) => {
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
          <div className="ev-km-value"><span>45,230 km</span><button className="ev-edit-btn" aria-label="Editar kilometraje">✏️</button></div>
        </div>
        <button className="primary wide ev-camera-btn"><Camera size={20} />Tomar fotos</button>
        <button className="ev-guidelines-link">Ver lineamientos de evidencia</button>
      </div>
      <div className="ev-footer">
        <button className={`primary wide ${!allDone ? "disabled-btn" : ""}`} onClick={allDone ? onDone : undefined}>
          {activeTab === "entrega" ? "FINALIZAR VIAJE" : "CONTINUAR"}
          {!allDone && <span className="ev-counter"> ({capturedCount}/{totalPhotos})</span>}
        </button>
      </div>
    </section>
  );
}

/* ── Incident Report ────────────────────────────────────── */
const incidentReasons = ["Accidente / Daño", "Problema mecánico", "Tráfico / Bloqueo", "Condiciones del camino", "Otro"];

function IncidentReport({ onBack, onSent }: { onBack: () => void; onSent: () => void }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [sent, setSent] = useState(false);
  const canSend = selected !== null;
  const handleAddPhoto = () => { if (photos.length < 4) setPhotos(prev => [...prev, `foto_${prev.length + 1}`]); };
  const handleSend = () => { if (!canSend) return; setSent(true); setTimeout(onSent, 2000); };
  if (sent) {
    return (
      <section className="screen flow-screen done-screen">
        <CheckCircle2 size={64} />
        <h1>Reporte enviado</h1>
        <p>Torre de control fue notificada. En breve recibirás instrucciones.</p>
      </section>
    );
  }
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
            {incidentReasons.map((reason) => (
              <button key={reason} className={`incident-reason ${selected === reason ? "selected" : ""}`} onClick={() => setSelected(reason)}>
                <span className={`incident-radio ${selected === reason ? "checked" : ""}`} />
                {reason}
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
          <button className="incident-photo-zone" onClick={handleAddPhoto} disabled={photos.length >= 4}>
            {photos.length === 0 ? (<><Camera size={28} /><span>Máx. 4 fotos</span></>) : (
              <div className="incident-photo-thumbs">
                {photos.map((p, i) => (<div key={i} className="incident-thumb"><Camera size={18} /></div>))}
                {photos.length < 4 && <div className="incident-thumb add-more">+</div>}
              </div>
            )}
          </button>
        </div>
      </div>
      <div className="incident-footer">
        <button className={`primary wide ${!canSend ? "disabled-btn" : ""}`} onClick={handleSend}>Enviar reporte</button>
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
      {tabs.map((item) => (
        <button key={item.id} className={active === item.id ? "active" : ""} onClick={() => setActive(item.id)}>
          {item.icon}
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  );
}
