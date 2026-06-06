"use client";

import { useState } from "react";
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
  Map,
  MapPin,
  Navigation,
  ReceiptText,
  Settings,
  Timer,
  Wallet,
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
  | "destinationMap"
  | "destinationArrival"
  | "done";

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
  const [tab, setTab] = useState<Tab>("panel");
  const [tripTab, setTripTab] = useState<TripTab>("ofertas");
  const [flow, setFlow] = useState<FlowStep | null>(null);
  const [acceptedOffer, setAcceptedOffer] = useState(false);
  const [evidenceIndex, setEvidenceIndex] = useState(0);

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
      return <LocateVehicle onBack={() => setFlow("originMap")} onFound={() => setFlow("evidence")} />;
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
          onBack={() => setFlow("evidence")}
          onArrive={() => setFlow("destinationArrival")}
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
      return <Panel onSettings={() => setTab("config")} hasTrip={acceptedOffer} onTrip={openSummary} />;
    }
    if (tab === "viajes") {
      return (
        <Trips
          active={tripTab}
          setActive={setTripTab}
          acceptedOffer={acceptedOffer}
          onSettings={() => setTab("config")}
          onOffer={() => setFlow("offerDetail")}
          onAccepted={openSummary}
        />
      );
    }
    if (tab === "dinero") {
      return <Money onSettings={() => setTab("config")} />;
    }
    return <SettingsScreen />;
  })();

  return (
    <main className="shell">
      <div className="phone">
        <StatusBar />
        {content}
        {flow !== "offerDetail" && flow !== "done" && <BottomNav active={tab} setActive={setTab} />}
        <div className="system-nav">
          <span />
          <span />
          <span />
        </div>
      </div>
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
  onSettings,
  hasTrip,
  onTrip
}: {
  onSettings: () => void;
  hasTrip: boolean;
  onTrip: () => void;
}) {
  return (
    <section className="screen">
      <Header title="Panel" onSettings={onSettings} />
      <div className="availability">
        <strong>¿Disponible para viajes?</strong>
        <div className="switch" aria-label="Disponible para viajes">
          <span>NO</span>
          <span className="active">SÍ</span>
        </div>
      </div>

      {hasTrip ? (
        <button className="active-trip-card" onClick={onTrip}>
          <span>VIAJE EN CURSO</span>
          <strong>Viaje #{offerTrip.id}</strong>
          <small>
            {offerTrip.origin} → {offerTrip.destination}
          </small>
          <ChevronRight />
        </button>
      ) : (
        <div className="priority">Prioridad activada</div>
      )}

      <div className="section-head">
        <h2>Esta Semana</h2>
        <div className="view-switch two">
          <span className="selected">
            <Calendar size={28} />
          </span>
          <span>
            <Columns3 size={34} />
          </span>
        </div>
      </div>

      <div className="stats-grid">
        <Metric icon={<BadgeDollarSign />} label="GANADO" value={hasTrip ? "$623.28" : "$0.00"} />
        <Metric icon={<Map />} label="VIAJES" value={hasTrip ? "1" : "0"} />
        <Metric icon={<Car />} label="VEHÍCULOS MOVIDOS" value="0" />
        <Metric icon={<Calendar />} label="SIGUIENTE PAGO" value="Vie, 12 de Jun, 2026" />
        <Metric icon={<Wallet />} label="DEPÓSITO EST." value={hasTrip ? "$623.28" : "$0.00"} />
      </div>
    </section>
  );
}

function Trips({
  active,
  setActive,
  acceptedOffer,
  onSettings,
  onOffer,
  onAccepted
}: {
  active: TripTab;
  setActive: (tab: TripTab) => void;
  acceptedOffer: boolean;
  onSettings: () => void;
  onOffer: () => void;
  onAccepted: () => void;
}) {
  return (
    <section className="screen trips-screen">
      <Header title="Viajes" onSettings={onSettings} />
      <div className="segmented">
        <button className={active === "ofertas" ? "selected" : ""} onClick={() => setActive("ofertas")}>
          OFERTAS
        </button>
        <button className={active === "aceptados" ? "selected" : ""} onClick={() => setActive("aceptados")}>
          ACEPTADOS
        </button>
      </div>
      <p className="date-range">Semana 13 a 19 Marzo</p>
      <div className="week-row compact-week">
        {week.map(([day, num]) => (
          <div className="date-cell" key={num}>
            <span>{day}</span>
            <strong className={num === "14" ? "today" : ""}>{num}</strong>
          </div>
        ))}
      </div>

      {active === "ofertas" ? (
        <div className="trip-day">
          <div className="day-label">
            <strong>HOY</strong>
            <span>14 de mar. 2026</span>
          </div>
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
          <div className="day-label accepted">
            <strong>MAÑANA</strong>
            <span>14 de abr. 2026</span>
            <b>{acceptedOffer ? "3 Viajes" : "2 Viajes"}</b>
          </div>
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

function LocateVehicle({ onBack, onFound }: { onBack: () => void; onFound: () => void }) {
  return (
    <section className="screen flow-screen locate-screen">
      <FlowHeader title="Localizar Vehículo" onBack={onBack} />
      <p className="soft">Estas buscando un</p>
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
        vas a recoger.
      </p>
      <div className="instructions">
        <strong>Ver instrucciones de recogida</strong>
        <ChevronUp />
      </div>
      <div className="action-row fixed-actions">
        <button className="secondary">NO LO ENCUENTRO</button>
        <button className="primary" onClick={onFound}>
          LO ENCONTRÉ
        </button>
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

function Money({ onSettings }: { onSettings: () => void }) {
  return (
    <section className="screen">
      <Header title="Mi dinero" onSettings={onSettings} />
      <div className="money-tabs">
        <span>PENDIENTES</span>
        <span className="divider" />
        <strong>PAGOS</strong>
      </div>
      <div className="section-head compact">
        <h2>Esta Semana</h2>
        <div className="view-switch three">
          <span className="selected">
            <Calendar size={28} />
          </span>
          <span>
            <Columns3 size={34} />
          </span>
          <span>
            <Calendar size={30} />
          </span>
        </div>
      </div>
      <div className="earned">
        <BadgeDollarSign size={54} />
        <div>
          <span>GANADO</span>
          <strong>$1,432.00</strong>
        </div>
      </div>
      <article className="payment-card">
        <h3>
          <Calendar size={32} />
          5 de jun
        </h3>
        <div className="payment-row">
          <MiniMetric icon={<BadgeDollarSign />} label="GANANCIAS" value="$1,432.00" />
          <MiniMetric icon={<ReceiptText />} label="GASTOS" value="$0.00" />
          <MiniMetric icon={<Wallet />} label="DEPÓSITO" value="$2,126.88" />
        </div>
      </article>
    </section>
  );
}

function SettingsScreen() {
  return (
    <section className="screen settings-screen">
      <div className="recommend">Recomienda a un amigo</div>
      {menu.map((group) => (
        <div className="menu-group" key={group.title}>
          <h2>{group.title}</h2>
          {group.items.map((item) => (
            <button key={item}>{item}</button>
          ))}
        </div>
      ))}
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
    { id: "panel" as const, label: "Panel", icon: <LayoutDashboard /> },
    { id: "viajes" as const, label: "Viajes", icon: <Map /> },
    { id: "dinero" as const, label: "Mi dinero", icon: <IdCard /> }
  ];

  return (
    <nav className="bottom-nav" aria-label="Navegación principal">
      {tabs.map((item) => (
        <button
          className={active === item.id ? "active" : ""}
          key={item.id}
          onClick={() => setActive(item.id)}
        >
          {item.icon}
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  );
}
