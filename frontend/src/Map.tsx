import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  useMap,
  useMapEvents,
} from "react-leaflet";
import { useEffect, useState, useRef } from "react";
import type { CircleMarker as LeafletCircle } from "leaflet";
import { Link } from "react-router-dom";
import "leaflet/dist/leaflet.css";
function Focus({
  selected,
  items,
  location,
}: {
  selected: string;
  items: any[];
  location?: number[];
}) {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize();
    const p = items.find((p) => p.id === selected);
    if (p)
      map.flyTo([p.latitude, p.longitude], 13, {
        animate: !matchMedia("(prefers-reduced-motion: reduce)").matches,
      });
    else if (location) map.setView([location[0], location[1]], 11);
    else if (items.length)
      map.fitBounds(
        items.map((p) => [p.latitude, p.longitude]),
        { padding: [35, 35], maxZoom: 12 },
      );
  }, [selected, items, location, map]);
  return null;
}
function Pick({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onPick(e.latlng.lat, e.latlng.lng) });
  return null;
}
export default function Map({
  items,
  selected = "",
  onSelect = () => {},
  location,
  onPick,
}: {
  items: any[];
  selected?: string;
  onSelect?: (id: string) => void;
  location?: number[];
  onPick?: (lat: number, lng: number) => void;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <div className="map-wrap">
      {failed && (
        <p className="map-warning" role="status">
          Mapa indisponível. Use os endereços na lista.
        </p>
      )}
      <MapContainer
        center={[-23.55, -46.63]}
        zoom={10}
        style={{ height: "100%", minHeight: 360 }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          eventHandlers={{ tileerror: () => setFailed(true) }}
        />
        <Focus items={items} selected={selected} location={location} />
        {onPick && <Pick onPick={onPick} />}{" "}
        {items.map((p) => (
          <PointMarker
            key={p.id}
            p={p}
            selected={selected}
            onSelect={onSelect}
            picking={!!onPick}
          />
        ))}
      </MapContainer>
    </div>
  );
}

function PointMarker({
  p,
  selected,
  onSelect,
  picking,
}: {
  p: any;
  selected: string;
  onSelect: (id: string) => void;
  picking: boolean;
}) {
  const ref = useRef<LeafletCircle>(null);
  useEffect(() => {
    if (p.id === selected) ref.current?.openPopup();
  }, [selected, p.id]);
  return (
    <CircleMarker
      ref={ref}
      center={[p.latitude, p.longitude]}
      radius={p.id === selected ? 14 : 9}
      pathOptions={{
        color: "#fff",
        weight: 3,
        fillColor: p.id === selected ? "#b66747" : "#174f3d",
        fillOpacity: 1,
      }}
      eventHandlers={{ click: () => onSelect(p.id) }}
    >
      <Popup>
        <strong>{p.name}</strong>
        <p>
          {p.isDemo
            ? "DEMONSTRAÇÃO — LOCAL FICTÍCIO"
            : (p.street || "") + ", " + (p.number || "")}
        </p>
        {!picking && <Link to={"/pontos/" + p.id}>Ver detalhes</Link>}
      </Popup>
    </CircleMarker>
  );
}
