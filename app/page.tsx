"use client";

import { Fragment, useState } from "react";
import {
  ArrowLeft,
  BadgeDollarSign,
  Calendar,
  Camera,
  Car,
  CheckCircle2,
  ChevronRight,
  ChevronUp,
  Clock,
  Columns3,
  Fuel,
  HelpCircle,
  IdCard,
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

type Tab = "panel" | "viajes" | "dinero" | "config";
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

const week = [
  ["Vi", "13"],
  ["Sa", "14"],
  ["Do", "15"],
  ["Lu", "16"],
  ["Ma", "17"],
  ["Mi", "18"],
  ["Ju", "19"]
];

const evidenceSteps = [
  {
    title: "Número VIN",
    eyebrow: "Paso 1 de 5",
    body: "Confirma que el VIN del vehículo coincida antes de iniciar el traslado.",
    fields: ["LSGKB54H5KV225363"]
  },
  {
    title: "Placas y combustible",
    eyebrow: "Paso 2 de 5",
    body: "Registra placas visibles y nivel aproximado de combustible.",
    fields: ["NMX-8421", "Combustible: 68%"]
  },
  {
    title: "Fotos del vehículo",
    eyebrow: "Paso 3 de 5",
    body: "Captura frente, lado conductor, trasera, lado copiloto y tablero.",
    fields: ["Frente", "Lado conductor", "Trasera", "Lado copiloto", "Tablero", "Agregar más"]
  },
  {
    title: "Cantidad de llaves",
    eyebrow: "Paso 4 de 5",
    body: "Indica cuántas llaves recibiste del vehículo.",
    fields: ["2 llaves"]
  },
  {
    title: "Nota de recogida",
    eyebrow: "Paso 5 de 5",
    body: "Agrega una nota opcional para dejar contexto de la recogida.",
    fields: ["Sin observaciones"]
  }
];

const menu = [
  {
    title: "Documentos Personales",
    items: ["Licencia de Conducir", "Seguro", "Comprobante de Domicilio", "Constancia Fiscal"]
  },
  {
    title: "Preferencias",
    items: ["Notificaciones", "Preferencias de viaje", "Preferencias de la app"]
  },
  {
    title: "Conductor",
    items: ["Equipos de pilotos", "Portal del conductor"]
  },
  {
    title: "Soporte",
    items: ["FAQs", "¿Necesitas ayuda?", "Eliminar Cuenta"]
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
  destinationAddress: "Ciudad Lerma de Villada - Méx."
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

  const goPanel = () => {
    setTab("panel");
    setFlow(null);
  };

  const openSummary = () => {
    setTab("viajes");
    setTripTab("aceptados");
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
      return <TripSummary onBack={() => setFlow(null)} onGo={() => setFlow("readyToGo")} />;
    }
    if (flow === "readyToGo") {
      return <ReadyToGo onBack={() => setFlow("summary")} onStart={() => setFlow("originMap")} />;
    }
    if (flow === "originMap") {
      return <RouteMap kind="origin" onBack={() => setFlow("readyToGo")} onArrive={() => setFlow("locate")} />;
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
      return (
        <IncidentReport
          onBack={() => setFlow("locate")}
          onSent={() => setFlow("locate")}
        />
      );
    }
    if (flow === "evidenceCapture") {
      return (
        <EvidenceCapture
          phase={evidencePhase}
          onBack={() => evidencePhase === "inicial" ? setFlow("locate") : setFlow("destinationLocate")}
          onDone={() => {
            if (evidencePhase === "inicial") {
              setFlow("destinationMap");
            } else {
              setFlow("done");
            }
          }}
        />
      );
    }
    if (flow === "evidence") {
      return (
        <EvidenceFlow
          index={evidenceIndex}
          onBack={() => (evidenceIndex === 0 ? setFlow("locate") : setEvidenceIndex(evidenceIndex - 1))}
          onNext={() => {
            if (evidenceIndex === evidenceSteps.length - 1) {
              setEvidenceIndex(0);
              setFlow("destinationMap");
            } else {
              setEvidenceIndex(evidenceIndex + 1);
            }
          }}
        />
      );
    }
    if (flow === "destinationMap") {
      return (
        <RouteMap
          kind="destination"
          onBack={() => setFlow("evidenceCapture")}
          onArrive={() => setFlow("destinationLocate")}
        />
      );
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
      return <Panel onMoney={() => setTab("dinero")} onSettings={() => setTab("config")} hasTrip={acceptedOffer} onTrip={openSummary} />;
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
          onAccepted={openSummary}
        />
      );
    }
    if (tab === "dinero") {
      return <Money setTab={setTab} />;
    }
    return <SettingsScreen />;
  })();

  return (
    <main className="shell">
      <div className="phone">
        {content}
        {tab !== "panel" && tab !== "dinero" && flow !== "offerDetail" && flow !== "done" && (
          <BottomNav active={tab} setActive={setTab} />
        )}
      </div>
    </main>
  );
}

function Onboarding({ onEnter }: { onEnter: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("Ingresa con tus datos de conductor.");

  const hasEmail = email.trim().includes("@");
  const hasPassword = password.trim().length >= 6;

  const submit = (mode: "login" | "signup") => {
    if (!hasEmail) {
      setMessage("Escribe un correo válido para continuar.");
      return;
    }
    if (!hasPassword) {
      setMessage("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    setMessage(mode === "login" ? "Acceso correcto." : "Cuenta creada correctamente.");
    onEnter();
  };

  const recover = () => {
    if (!hasEmail) {
      setMessage("Escribe tu correo para enviarte recuperación.");
      return;
    }
    setMessage(`Enviamos instrucciones a ${email.trim()}.`);
  };

  return (
    <main className="shell auth-shell">
      <section className="auth-window" aria-label="Inicio de sesión">
        <div className="auth-brand">
          <div className="ruum-logo" aria-label="Ruum Ruum by Moviliax">
            <strong>ruum</strong>
            <strong>ruum</strong>
            <small>BY MOVILIAX</small>
          </div>
          <span>CONDUCTOR</span>
          <h1>Tu app para mover vehículos con confianza.</h1>
          <p>Recibe solicitudes, registra evidencia y completa traslados de forma segura y profesional.</p>
          <em>{message}</em>
        </div>

        <form
          className="auth-form"
          onSubmit={(event) => {
            event.preventDefault();
            submit("login");
          }}
        >
          <label>
            Correo
            <span>
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="conductor@correo.com"
              />
            </span>
          </label>

          <label>
            Contraseña
            <span>
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                autoComplete="current-password"
                placeholder="Mínimo 6 caracteres"
              />
            </span>
          </label>

          <button className="forgot-link" type="button" onClick={recover}>
            ¿Olvidaste tu contraseña?
          </button>

          <button className="auth-primary" type="submit">
            <LogIn size={22} />
            Entrar
          </button>

          <button className="auth-secondary" type="button" onClick={() => submit("signup")}>
            <UserPlus size={22} />
            Crear cuenta
          </button>
        </form>
      </section>
    </main>
  );
}

function StatusBar() {
  return (
    <div className="status-bar" aria-hidden="true">
      <span>8:33</span>
      <div className="status-icons">
        <span className="dot" />
        <span className="muted">◢</span>
        <span className="pill-tiny" />
        <span className="muted">MM</span>
      </div>
      <div className="signal">
        <span>⌁</span>
        <span className="volte">4G</span>
        <span className="bars" />
        <span className="battery" />
      </div>
    </div>
  );
}

function Header({ title, onSettings }: { title: string; onSettings?: () => void }) {
  return (
    <header className="top">
      <h1>{title}</h1>
      {onSettings && (
        <button className="icon-button" onClick={onSettings} aria-label="Abrir configuración">
          <Settings size={44} strokeWidth={3.3} />
        </button>
      )}
    </header>
  );
}

function FlowHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <header className="flow-top">
      <button className="icon-button" onClick={onBack} aria-label="Volver">
        <ArrowLeft size={34} strokeWidth={3.4} />
      </button>
      <h1>{title}</h1>
      <HelpCircle size={34} fill="#777" color="#777" />
    </header>
  );
}

function Panel({
  onMoney,
  onTrip
}: {
  onMoney: () => void;
  onSettings: () => void;
  hasTrip: boolean;
  onTrip: () => void;
}) {
  return (
    <section className="screen panel-screen">
      <header className="panel-top">
        <button className="panel-icon-button" aria-label="Abrir menú">
          <Menu size={22} />
        </button>
        <button className="panel-bell" aria-label="Notificaciones">
          <span>3</span>
        </button>
      </header>

      <div className="panel-greeting">
        <h1>Hola, Luis</h1>
        <p>
          <CheckCircle2 size={15} />
          Conductor certificado
        </p>
      </div>

      <button className="panel-trip-card" onClick={onTrip}>
        <div className="panel-trip-head">
          <div>
            <h2>Viaje asignado</h2>
            <strong>RR-2024-0587</strong>
          </div>
          <span>En camino</span>
        </div>

        <div className="panel-trip-details">
          <div>
            <small>Origen</small>
            <b>Ciudad de México, CDMX</b>
          </div>
          <div className="panel-trip-price">
            <small>Tarifa</small>
            <b>$3,850.00</b>
          </div>
          <div>
            <small>Destino</small>
            <b>Guadalajara, Jalisco</b>
          </div>
        </div>

        <span className="panel-trip-cta">
          Ver detalle del viaje
          <ChevronRight size={22} />
        </span>
      </button>

      <div className="quick-actions">
        <h2>Acciones rápidas</h2>
        <div className="quick-grid">
          <button>
            <span className="quick-icon blue">
              <Phone size={22} />
            </span>
            <strong>Datos de contacto</strong>
          </button>
          <button onClick={onTrip}>
            <span className="quick-icon blue">
              <Map size={22} />
            </span>
            <strong>Mis viajes</strong>
          </button>
          <button onClick={onMoney}>
            <span className="quick-icon green">
              <BadgeDollarSign size={22} />
            </span>
            <strong>Ganancias</strong>
          </button>
          <button>
            <span className="quick-icon orange">
              <HelpCircle size={22} />
            </span>
            <strong>Soporte</strong>
          </button>
        </div>
      </div>

      <div className="panel-availability">
        <span>
          <CheckCircle2 size={14} />
          Disponibilidad
        </span>
        <strong>Disponible</strong>
        <i aria-hidden="true" />
      </div>
    </section>
  );
}

function Trips({
  active,
  setActive,
  acceptedOffer,
  setTab,
  onSettings,
  onOffer,
  onAccepted
}: {
  active: TripTab;
  setActive: (tab: TripTab) => void;
  acceptedOffer: boolean;
  setTab: (tab: Tab) => void;
  onSettings: () => void;
  onOffer: () => void;
  onAccepted: () => void;
}) {
  return (
    <section className="screen trips-screen">
      <header className="trips-header">
        <button className="icon-button" onClick={() => setTab("panel")} aria-label="Volver">
          <ArrowLeft size={22} />
        </button>
        <h1>Mis viajes</h1>
      </header>
      <div className="segmented">
        <button className={active === "ofertas" ? "selected" : ""} onClick={() => setActive("ofertas")}>
          Activos
        </button>
        <button className={active === "aceptados" ? "selected" : ""} onClick={() => setActive("aceptados")}>
          Completados
        </button>
        <button>Cancelados</button>
      </div>

      {active === "ofertas" ? (
        <div className="trip-day">
          <button className="offer-card" onClick={onOffer}>
            <div className="offer-head">
              <strong>Viaje #{offerTrip.id}</strong>
              <span>02 <ChevronUp size={22} /></span>
            </div>
            <small>Solicitado por {offerTrip.requester}</small>
            <Itinerary title="Itinerary #1" />
            <Itinerary title="Itinerary #2" distance="204.3Km" end="05:23 PM" />
          </button>
        </div>
      ) : (
        <div className="trip-day">
          {acceptedOffer && (
            <AcceptedTripCard
              trip={{ ...offerTrip, start: "09:00", end: "17:00", distance: "189.9Km" }}
              primary
              onClick={onAccepted}
            />
          )}
          {acceptedTrips.map((trip) => (
            <AcceptedTripCard key={trip.id} trip={trip} onClick={onAccepted} />
          ))}
        </div>
      )}
    </section>
  );
}

function Itinerary({ title, distance = offerTrip.distance, end = offerTrip.end }: { title: string; distance?: string; end?: string }) {
  return (
    <div className="itinerary">
      <div>
        <h3>{title}</h3>
        <b>{offerTrip.route}</b>
        <p>
          <span>Ciudad</span> {offerTrip.city}
        </p>
      </div>
      <strong>{offerTrip.pay}</strong>
      <div className="trip-meta">
        <span><Clock /> {offerTrip.start} - {end}</span>
        <span><Timer /> {offerTrip.duration}</span>
        <span><Map /> {distance}</span>
      </div>
    </div>
  );
}

function AcceptedTripCard({
  trip,
  primary,
  onClick
}: {
  trip: {
    id: string;
    route: string;
    city: string;
    requester: string;
    start: string;
    end: string;
    duration: string;
    distance: string;
    pay: string;
  };
  primary?: boolean;
  onClick: () => void;
}) {
  return (
    <button className="accepted-card" onClick={onClick}>
      <span className="tag">ASIGNADO</span>
      <div className="accepted-row">
        <h3>Viaje #{trip.id}</h3>
        <strong>{trip.pay}</strong>
      </div>
      <b>{trip.route}</b>
      <p>
        <span>Ciudad</span> {trip.city}
      </p>
      <p>
        <span>Solicitado por</span> {trip.requester}
      </p>
      <div className="trip-meta">
        <span><Clock /> {trip.start} - {trip.end}</span>
        <span><Timer /> {trip.duration}</span>
        <span><Map /> {trip.distance}</span>
      </div>
      {!primary && <ChevronRight className="card-arrow" />}
    </button>
  );
}

function OfferDetail({
  onBack,
  onAccept,
  onReject
}: {
  onBack: () => void;
  onAccept: () => void;
  onReject: () => void;
}) {
  return (
    <section className="screen flow-screen">
      <FlowHeader title={`Viaje #${offerTrip.id}`} onBack={onBack} />
      <TripDetails />
      <div className="notice-card">
        <h2>Oferta de viaje</h2>
        <p>Revisa la ruta y las tareas. Al aceptar, este viaje aparecerá en la pestaña de viajes aceptados.</p>
      </div>
      <div className="action-row fixed-actions">
        <button className="secondary" onClick={onReject}>
          <XCircle /> RECHAZAR
        </button>
        <button className="primary" onClick={onAccept}>
          <CheckCircle2 /> ACEPTAR
        </button>
      </div>
    </section>
  );
}

function TripSummary({ onBack, onGo }: { onBack: () => void; onGo: () => void }) {
  return (
    <section className="screen flow-screen">
      <FlowHeader title={`Viaje #${offerTrip.id}`} onBack={onBack} />
      <TripDetails />
      <div className="summary-route">
        <h2>Resumen del viaje</h2>
        <div>
          <MapPin />
          <p>
            <strong>{offerTrip.origin}</strong>
            <span>{offerTrip.originAddress}</span>
          </p>
        </div>
        <div>
          <Navigation />
          <p>
            <strong>{offerTrip.destination}</strong>
            <span>{offerTrip.destinationAddress}</span>
          </p>
        </div>
      </div>
      <div className="notes-card">
        <h3>NOTAS</h3>
        <p>
          The trip starts at 9:00 AM. Estimated mileage is {offerTrip.distance} and should take around 8 hours
          to complete.
        </p>
      </div>
      <div className="action-row">
        <button className="secondary">VER UBICACIÓN</button>
        <button className="primary" onClick={onGo}>
          ¡ESTOY EN CAMINO!
        </button>
      </div>
    </section>
  );
}

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
      <button className="primary wide" onClick={onStart}>
        ABRIR RUTA
      </button>
    </section>
  );
}

function RouteMap({
  kind,
  onBack,
  onArrive
}: {
  kind: "origin" | "destination";
  onBack: () => void;
  onArrive: () => void;
}) {
  const isOrigin = kind === "origin";
  return (
    <section className="screen map-screen">
      <FlowHeader title={isOrigin ? "Punto de origen" : "Destino final"} onBack={onBack} />
      <h2>{isOrigin ? offerTrip.origin : offerTrip.destination}</h2>
      <p>{isOrigin ? offerTrip.originAddress : offerTrip.destinationAddress}</p>
      <MapPreview />
      <button className="primary wide" onClick={onArrive}>
        LLEGUÉ
      </button>
      <div className="route-footer">
        <button onClick={onBack}>
          <ArrowLeft /> PANEL
        </button>
        <span>Resumen</span>
        <span>Gastos</span>
        <span>Estado</span>
      </div>
    </section>
  );
}

function LocateVehicle({ onBack, onFound, onNotFound, isDelivery }: { onBack: () => void; onFound: () => void; onNotFound: () => void; isDelivery?: boolean }) {
  return (
    <section className="screen flow-screen locate-screen">
      <FlowHeader title={isDelivery ? "Confirmar entrega" : "Localizar Vehículo"} onBack={onBack} />
      <p className="soft">{isDelivery ? "Estás entregando un" : "Estas buscando un"}</p>
      <h2>{offerTrip.vehicle}</h2>
      <h3>Número de VIN</h3>
      <p className="vin">{offerTrip.vin}</p>
      <div className="vehicle-example">
        <div className="car-sketch">No Vehicle Image Available</div>
        <p>
          <strong>Imagen de ejemplo</strong>
          El vehículo puede que tenga una apariencia diferente.
        </p>
      </div>
      <p className="soft">
        Necesitarás el número VIN en el próximo paso. Por favor, asegúrate de que coincida con el vehículo que
        {isDelivery ? " vas a entregar." : " vas a recoger."}
      </p>
      <div className="instructions">
        <strong>{isDelivery ? "Ver instrucciones de entrega" : "Ver instrucciones de recogida"}</strong>
        <ChevronUp />
      </div>
      <div className="action-row fixed-actions">
        <button className="secondary" onClick={onNotFound}>NO LO ENCUENTRO</button>
        <button className="primary" onClick={onFound}>LO ENCONTRÉ</button>
      </div>
    </section>
  );
}

function EvidenceFlow({
  index,
  onBack,
  onNext
}: {
  index: number;
  onBack: () => void;
  onNext: () => void;
}) {
  const step = evidenceSteps[index];
  return (
    <section className="screen flow-screen evidence-screen">
      <FlowHeader title="Evidencias" onBack={onBack} />
      <span className="step-eyebrow">{step.eyebrow}</span>
      <h2>{step.title}</h2>
      <p>{step.body}</p>
      <div className="evidence-list">
        {step.fields.map((field) => (
          <div key={field} className="evidence-item">
            {index === 2 ? <Camera /> : index === 3 ? <KeyRound /> : index === 1 ? <Fuel /> : <CheckCircle2 />}
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
      <button className="primary wide" onClick={onDone}>
        FINALIZAR VIAJE
      </button>
    </section>
  );
}

function DoneScreen({ onPanel }: { onPanel: () => void }) {
  return (
    <section className="screen flow-screen done-screen">
      <CheckCircle2 size={72} />
      <h1>Viaje completado</h1>
      <p>El flujo terminó correctamente y el viaje quedó listo para pago.</p>
      <button className="primary wide" onClick={onPanel}>
        VOLVER AL PANEL
      </button>
    </section>
  );
}

function TripDetails() {
  return (
    <div className="details-strip">
      <h2>Detalles</h2>
      <div className="trip-meta">
        <span><Clock /> 09:00</span>
        <span><Timer /> 8hr</span>
        <span><Map /> {offerTrip.distance}</span>
        <span><Car /> 03</span>
      </div>
      <p>El tiempo puede variar según el tráfico, el clima u otros retrasos.</p>
    </div>
  );
}

function MapPreview() {
  return (
    <div className="map-preview">
      <span className="map-label">AGRANDAR MAPA</span>
      <MapPin className="pin" />
      <span className="road one" />
      <span className="road two" />
      <span className="road three" />
      <span className="floating fuel"><Fuel /></span>
    </div>
  );
}

function Money({ setTab }: { setTab: (tab: Tab) => void }) {
  return (
    <section className="screen earnings-screen">
      <header className="earnings-header">
        <button className="icon-button" onClick={() => setTab("panel")} aria-label="Volver">
          <ArrowLeft size={22} />
        </button>
        <h1>Ganancias</h1>
      </header>

      <div className="earnings-tabs">
        <button className="selected">Resumen</button>
        <button>Detalle</button>
        <button>Pagos</button>
      </div>

      <button className="earnings-period">
        Esta semana
        <ChevronUp size={16} />
      </button>

      <article className="earnings-card">
        <span>Total ganado</span>
        <strong>$8,750.00</strong>
        <p>
          <CheckCircle2 size={13} />
          18% vs semana pasada
        </p>

        <div className="earnings-chart" aria-label="Gráfica de ganancias semanales">
          <svg viewBox="0 0 300 112" role="img" aria-hidden="true">
            <polyline
              points="0,82 35,70 70,72 105,55 140,66 175,36 210,42 245,34 300,16"
              fill="none"
              stroke="#1166ff"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="210" cy="42" r="5" fill="#1166ff" />
          </svg>
          <span>Vie</span>
        </div>

        <div className="earnings-days">
          <span>Lun</span>
          <span>Mar</span>
          <span>Mié</span>
          <span>Jue</span>
          <span>Vie</span>
          <span>Sáb</span>
          <span>Dom</span>
        </div>

        <div className="earnings-summary">
          <div>
            <span>Viajes completados</span>
            <strong>6</strong>
          </div>
          <div>
            <span>Horas en línea</span>
            <strong>28h 15m</strong>
          </div>
        </div>
      </article>

      <section className="earnings-breakdown">
        <h2>Desglose</h2>
        <div>
          <span>Ingresos por viajes</span>
          <strong>$8,400.00</strong>
        </div>
        <div>
          <span>Bonos</span>
          <strong>$350.00</strong>
        </div>
        <div>
          <span>Total</span>
          <strong>$8,750.00</strong>
        </div>
      </section>

      <nav className="earnings-nav" aria-label="Navegación de ganancias">
        <button onClick={() => setTab("panel")}>
          <LayoutDashboard />
          <span>Inicio</span>
        </button>
        <button onClick={() => setTab("viajes")}>
          <Map />
          <span>Viajes</span>
        </button>
        <button className="add-button">
          <span>+</span>
        </button>
        <button className="active">
          <BadgeDollarSign />
          <span>Ganancias</span>
        </button>
        <button onClick={() => setTab("config")}>
          <IdCard />
          <span>Perfil</span>
        </button>
      </nav>
    </section>
  );
}

function SettingsScreen() {
  return (
    <section className="screen profile-screen">
      <header className="profile-header">
        <button className="icon-button" aria-label="Volver">
          <ArrowLeft size={22} />
        </button>
        <h1>Mi perfil</h1>
        <button className="icon-button" aria-label="Configuración">
          <Settings size={22} />
        </button>
      </header>

      <section className="profile-card">
        <div className="profile-photo" aria-label="Fotografía del conductor">
          <span />
        </div>
        <div>
          <h2>Luis Hernández</h2>
          <p>
            <span>★</span> 4.9
            <span>★</span> (256 viajes)
          </p>
          <strong>
            <CheckCircle2 size={13} />
            Conductor certificado
          </strong>
        </div>
      </section>

      <section className="profile-section">
        <h2>Mi información</h2>
        <div className="profile-list">
          <article className="profile-detail">
            <button>
              <span className="profile-list-icon">
                <Phone size={17} />
              </span>
              <strong>Datos personales</strong>
              <ChevronRight size={18} />
            </button>
            <div className="profile-fields">
              <span>Teléfono</span>
              <span>CURP</span>
              <span>Nombre</span>
              <span>Apellido</span>
            </div>
          </article>

          <article className="profile-detail">
            <button>
              <span className="profile-list-icon">
                <IdCard size={17} />
              </span>
              <strong>Documentos</strong>
              <ChevronRight size={18} />
            </button>
            <div className="document-list">
              <div>
                <b>Licencia</b>
                <span>Tipo, número y vencimiento</span>
                <em>Subir frente y reverso</em>
              </div>
              <div>
                <b>Identificación oficial</b>
                <span>Tipo, número y vencimiento</span>
                <em>Subir ambos lados</em>
              </div>
              <div>
                <b>Constancia de situación fiscal</b>
                <span>RFC</span>
                <em>Adjuntar PDF</em>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section className="profile-section">
        <h2>Preferencias</h2>
        <div className="profile-list">
          <article className="profile-detail">
            <button>
              <span className="profile-list-icon">
                <Settings size={17} />
              </span>
              <strong>Transmisión</strong>
              <small>Manual / Automática</small>
            </button>
          </article>

          <article className="profile-detail">
            <button>
              <span className="profile-list-icon">
                <Car size={17} />
              </span>
              <strong>Tipo de vehículo</strong>
              <ChevronRight size={18} />
            </button>
            <div className="preference-tags">
              <span>Sedán</span>
              <span>SUV</span>
              <span>Panel de carga</span>
              <span>Vehículos de pasajeros</span>
              <span>Motocicletas</span>
              <span>Vehículos de carga +3.5tn</span>
            </div>
          </article>
        </div>
      </section>

      <section className="profile-section">
        <h2>FAQs y documentación</h2>
        <div className="profile-list compact">
          {["Legales", "Administrativos", "Apoyo"].map((item) => (
            <button key={item}>
              <span className="profile-list-icon">
                <HelpCircle size={17} />
              </span>
              <strong>{item}</strong>
              <ChevronRight size={18} />
            </button>
          ))}
        </div>
      </section>

      <button className="delete-account">
        <XCircle size={18} />
        Eliminar cuenta
      </button>
    </section>
  );
}

type EvidencePhaseTab = "inicial" | "durante" | "entrega";

const evidenceSections = {
  inicial: [
    {
      label: "Exterior del vehículo",
      photos: ["Frente", "Lado conductor", "Trasera", "Lado copiloto"]
    },
    {
      label: "Interior del vehículo",
      photos: ["Tablero", "Asientos"]
    },
    {
      label: "Kilometraje",
      photos: ["Odómetro"]
    }
  ],
  durante: [
    {
      label: "Estado general",
      photos: ["Frente", "Trasera"]
    },
    {
      label: "Kilometraje actual",
      photos: ["Odómetro"]
    }
  ],
  entrega: [
    {
      label: "Exterior del vehículo",
      photos: ["Frente", "Lado conductor", "Trasera", "Lado copiloto"]
    },
    {
      label: "Interior del vehículo",
      photos: ["Tablero", "Asientos"]
    },
    {
      label: "Kilometraje final",
      photos: ["Odómetro"]
    }
  ]
};

function EvidenceCapture({
  phase,
  onBack,
  onDone
}: {
  phase: EvidencePhaseTab;
  onBack: () => void;
  onDone: () => void;
}) {
  const [activeTab, setActiveTab] = useState<EvidencePhaseTab>(phase);
  const [capturedPhotos, setCapturedPhotos] = useState<Record<string, boolean>>({});
  const sections = evidenceSections[activeTab];

  const togglePhoto = (key: string) => {
    setCapturedPhotos(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const totalPhotos = sections.reduce((acc, s) => acc + s.photos.length, 0);
  const capturedCount = Object.values(capturedPhotos).filter(Boolean).length;
  const allDone = capturedCount >= totalPhotos;

  return (
    <section className="screen evidence-capture-screen">
      <FlowHeader title="Evidencia del viaje" onBack={onBack} />

      <div className="ev-tabs">
        {(["inicial", "durante", "entrega"] as EvidencePhaseTab[]).map(t => (
          <button
            key={t}
            className={activeTab === t ? "selected" : ""}
            onClick={() => { setActiveTab(t); setCapturedPhotos({}); }}
          >
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
                  <button
                    key={photo}
                    className={`ev-photo-slot ${taken ? "taken" : ""}`}
                    onClick={() => togglePhoto(key)}
                  >
                    {taken ? (
                      <>
                        <CheckCircle2 size={22} className="ev-check" />
                        <span className="ev-photo-label">{photo}</span>
                      </>
                    ) : (
                      <>
                        <Camera size={22} />
                        <span className="ev-photo-label">{photo}</span>
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        <div className="ev-km-row">
          <span>Kilometraje</span>
          <div className="ev-km-value">
            <span>45,230 km</span>
            <button className="ev-edit-btn" aria-label="Editar kilometraje">✏️</button>
          </div>
        </div>

        <button className="primary wide ev-camera-btn">
          <Camera size={20} />
          Tomar fotos
        </button>

        <button className="ev-guidelines-link">Ver lineamientos de evidencia</button>
      </div>

      <div className="ev-footer">
        <button
          className={`primary wide ${!allDone ? "disabled-btn" : ""}`}
          onClick={allDone ? onDone : undefined}
        >
          {activeTab === "entrega" ? "FINALIZAR VIAJE" : "CONTINUAR"}
          {!allDone && <span className="ev-counter"> ({capturedCount}/{totalPhotos})</span>}
        </button>
      </div>
    </section>
  );
}

const incidentReasons = [
  "Accidente / Daño",
  "Problema mecánico",
  "Tráfico / Bloqueo",
  "Condiciones del camino",
  "Otro"
];

function IncidentReport({
  onBack,
  onSent
}: {
  onBack: () => void;
  onSent: () => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [sent, setSent] = useState(false);

  const canSend = selected !== null;

  const handleAddPhoto = () => {
    if (photos.length < 4) {
      setPhotos(prev => [...prev, `foto_${prev.length + 1}`]);
    }
  };

  const handleSend = () => {
    if (!canSend) return;
    setSent(true);
    setTimeout(onSent, 2000);
  };

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
      {/* Header */}
      <div className="incident-header">
        <button className="icon-btn" onClick={onBack}>
          <ArrowLeft size={22} />
        </button>
        <h2>Reportar incidencia</h2>
        <button className="icon-btn" onClick={onBack}>
          <X size={22} />
        </button>
      </div>

      <div className="incident-body">
        {/* Tipo de incidencia */}
        <div className="incident-section">
          <h3>Selecciona el tipo de incidencia</h3>
          <div className="incident-reasons">
            {incidentReasons.map((reason) => (
              <button
                key={reason}
                className={`incident-reason ${selected === reason ? "selected" : ""}`}
                onClick={() => setSelected(reason)}
              >
                <span className={`incident-radio ${selected === reason ? "checked" : ""}`} />
                {reason}
              </button>
            ))}
          </div>
        </div>

        {/* Descripción */}
        <div className="incident-section">
          <h3>Descripción <span className="optional">(opcional)</span></h3>
          <textarea
            className="incident-note"
            placeholder="Cuéntanos qué sucedió..."
            value={note}
            onChange={e => setNote(e.target.value)}
            rows={3}
          />
        </div>

        {/* Fotos */}
        <div className="incident-section">
          <h3>Agrega fotos <span className="optional">(opcional)</span></h3>
          <button
            className="incident-photo-zone"
            onClick={handleAddPhoto}
            disabled={photos.length >= 4}
          >
            {photos.length === 0 ? (
              <>
                <Camera size={28} />
                <span>Máx. 4 fotos</span>
              </>
            ) : (
              <div className="incident-photo-thumbs">
                {photos.map((p, i) => (
                  <div key={i} className="incident-thumb">
                    <Camera size={18} />
                  </div>
                ))}
                {photos.length < 4 && (
                  <div className="incident-thumb add-more">+</div>
                )}
              </div>
            )}
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="incident-footer">
        <button
          className={`primary wide ${!canSend ? "disabled-btn" : ""}`}
          onClick={handleSend}
        >
          Enviar reporte
        </button>
      </div>
    </section>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="metric">
      <div className="metric-icon">{icon}</div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

function MiniMetric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="mini-metric">
      <div>{icon}</div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function BottomNav({ active, setActive }: { active: Tab; setActive: (tab: Tab) => void }) {
  const tabs = [
    { id: "panel" as const, label: "Inicio", icon: <LayoutDashboard /> },
    { id: "viajes" as const, label: "Viajes", icon: <Map /> },
    { id: "dinero" as const, label: "Ganancias", icon: <BadgeDollarSign /> },
    { id: "config" as const, label: "Perfil", icon: <IdCard /> }
  ];

  return (
    <nav className="bottom-nav" aria-label="Navegación principal">
      {tabs.map((item, index) => (
        <Fragment key={item.id}>
          {index === 2 && (
            <button className="nav-add" aria-label="Agregar">
              <span>+</span>
            </button>
          )}
          <button
            className={active === item.id ? "active" : ""}
            onClick={() => setActive(item.id)}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        </Fragment>
      ))}
    </nav>
  );
}