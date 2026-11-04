import { useEffect, useRef, useState } from "react";

type Point = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  street?: string;
  number?: string | number;
  isDemo?: boolean;
};
type Props = {
  items: Point[];
  selected?: string;
  onSelect?: (id: string) => void;
  location?: number[];
  onPick?: (lat: number, lng: number) => void;
  onError: () => void;
};

declare global {
  interface Window {
    google?: { maps: any };
    achedoacoesMapsReady?: () => void;
  }
}

// Compartilha o carregamento do script entre todos os mapas da aplicação.
let loading: Promise<any> | undefined;
function loadMaps(apiKey: string): Promise<any> {
  if (window.google?.maps?.marker?.AdvancedMarkerElement) {
    return Promise.resolve(window.google.maps);
  }
  if (!loading) {
    loading = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      let finished = false;
      const fail = () => {
        if (finished) return;
        finished = true;
        window.clearTimeout(timeout);
        loading = undefined;
        delete window.achedoacoesMapsReady;
        reject(new Error("Google Maps indisponível"));
      };
      const timeout = window.setTimeout(fail, 15000);
      window.achedoacoesMapsReady = () => {
        if (finished) return;
        if (window.google?.maps?.marker?.AdvancedMarkerElement) {
          finished = true;
          window.clearTimeout(timeout);
          delete window.achedoacoesMapsReady;
          resolve(window.google.maps);
        } else {
          fail();
        }
      };
      script.onerror = fail;
      script.async = true;
      script.src =
        "https://maps.googleapis.com/maps/api/js?key=" +
        encodeURIComponent(apiKey) +
        "&v=weekly&libraries=marker&loading=async&callback=achedoacoesMapsReady&language=pt-BR&region=BR";
      document.head.appendChild(script);
    });
  }
  return loading;
}

const valid = (p: Point) =>
  Number.isFinite(p.latitude) &&
  Number.isFinite(p.longitude) &&
  Math.abs(p.latitude) <= 90 &&
  Math.abs(p.longitude) <= 180;

export default function GoogleMap({
  items,
  selected = "",
  onSelect,
  location,
  onPick,
  onError,
}: Props) {
  const element = useRef<HTMLDivElement>(null);
  const onPickRef = useRef(onPick);
  const onErrorRef = useRef(onError);
  const [state, setState] = useState<{ maps: any; map: any }>();
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim();
  const mapId = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID?.trim() || "DEMO_MAP_ID";

  useEffect(() => {
    onPickRef.current = onPick;
    onErrorRef.current = onError;
  }, [onPick, onError]);

  useEffect(() => {
    if (!apiKey) return;
    let active = true;
    let clickListener: any;
    loadMaps(apiKey)
      .then((maps) => {
        if (!active || !element.current) return;
        const map = new maps.Map(element.current, {
          center: { lat: -23.55, lng: -46.63 },
          zoom: 10,
          mapId,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: true,
        });
        clickListener = map.addListener("click", (event: any) => {
          if (event.latLng && onPickRef.current) {
            onPickRef.current(event.latLng.lat(), event.latLng.lng());
          }
        });
        setState({ maps, map });
      })
      .catch(() => {
        if (active) onErrorRef.current();
      });
    return () => {
      active = false;
      clickListener?.remove();
    };
  }, [apiKey, mapId]);

  useEffect(() => {
    if (!state) return;
    const { maps, map } = state;
    const info = new maps.InfoWindow();
    const markers: any[] = [];
    const points = items.filter(valid);
    let chosen: { p: Point; marker: any } | undefined;

    function showInfo(p: Point, marker: any) {
      const content = document.createElement("div");
      content.className = "google-map-popup";
      const title = document.createElement("strong");
      title.textContent = p.name;
      content.appendChild(title);
      const address = document.createElement("p");
      address.textContent = p.isDemo
        ? "DEMONSTRAÇÃO — LOCAL FICTÍCIO"
        : [p.street, p.number].filter(Boolean).join(", ");
      content.appendChild(address);
      if (!onPick) {
        const link = document.createElement("a");
        link.textContent = "Ver detalhes";
        link.href = "/pontos/" + encodeURIComponent(p.id);
        content.appendChild(link);
      }
      info.setContent(content);
      info.open({ map, anchor: marker, shouldFocus: false });
    }

    for (const p of points) {
      const markerElement = document.createElement("div");
      markerElement.className =
        "google-map-pin" + (p.id === selected ? " selected" : "");
      markerElement.setAttribute("aria-label", p.name);
      const marker = new maps.marker.AdvancedMarkerElement({
        map,
        position: { lat: p.latitude, lng: p.longitude },
        title: p.name,
        content: markerElement,
      });
      marker.addListener("click", () => {
        onSelect?.(p.id);
        showInfo(p, marker);
      });
      markers.push(marker);
      if (p.id === selected) chosen = { p, marker };
    }

    if (chosen) {
      const { p, marker } = chosen;
      map.panTo({ lat: p.latitude, lng: p.longitude });
      map.setZoom(13);
      showInfo(p, marker);
    } else if (location && location.length === 2) {
      map.setCenter({ lat: location[0], lng: location[1] });
      map.setZoom(11);
    } else if (points.length === 1) {
      map.setCenter({ lat: points[0].latitude, lng: points[0].longitude });
      map.setZoom(13);
    } else if (points.length > 1) {
      const bounds = new maps.LatLngBounds();
      for (const p of points) bounds.extend({ lat: p.latitude, lng: p.longitude });
      map.fitBounds(bounds, 35);
    }

    return () => {
      info.close();
      for (const marker of markers) marker.map = null;
    };
  }, [state, items, selected, location, onSelect, onPick]);

  return (
    <div className="map-wrap">
      {!state && (
        <p className="map-warning" role="status">
          Carregando Google Maps…
        </p>
      )}
      <div
        ref={element}
        className="google-map-canvas"
        aria-label="Mapa de pontos de doação"
      />
    </div>
  );
}
