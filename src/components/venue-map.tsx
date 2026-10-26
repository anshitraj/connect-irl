"use client";
import type { EventInfo } from "@/lib/types";
import { eventBrands } from "@/lib/event-brands";
import { MapPin } from "lucide-react";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef, useState } from "react";
import styles from "./venue-map.module.css";
export function VenueMap({
  events,
  selected,
}: {
  events: EventInfo[];
  selected?: string;
}) {
  const container = useRef<HTMLDivElement>(null);
  const attributionContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("maplibre-gl").Map | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let disposed = false;
    let removeAttribution: (() => void) | undefined;
    void import("maplibre-gl")
      .then(
        ({
          Map,
          NavigationControl,
          Marker,
          Popup,
          GeolocateControl,
          AttributionControl,
          setWorkerUrl,
        }) => {
          if (!container.current || disposed) return;
          setWorkerUrl("/vendor/maplibre-gl-worker.mjs");
          try {
            const map = new Map({
              container: container.current,
              style:
                process.env.NEXT_PUBLIC_MAP_STYLE ||
                "https://tiles.openfreemap.org/styles/positron",
              center: [72.876, 19.084],
              zoom: 11.7,
              attributionControl: false,
            });
            mapRef.current = map;
            // Keep source-generated credits up to date, in a footer rather than
            // an expanded control covering a narrow map. Detach before map removal.
            const attribution = new AttributionControl({
              compact: false,
              customAttribution:
                '<a href="https://maplibre.org/" target="_blank" rel="noopener noreferrer">MapLibre</a>',
            });
            attributionContainer.current?.replaceChildren(
              attribution.onAdd(map),
            );
            removeAttribution = () => attribution.onRemove();
            map.addControl(
              new NavigationControl({ showCompass: false }),
              "top-right",
            );
            map.addControl(
              new GeolocateControl({
                positionOptions: { enableHighAccuracy: false },
                trackUserLocation: false,
              }),
              "top-right",
            );
            map.on("error", () =>
              setError(
                "Map tiles could not load. Venue addresses and directions are available below.",
              ),
            );
            map.on("load", () => {
              setError("");
              map.resize();
            });
            for (const event of events) {
              const element = document.createElement("button");
              element.type = "button";
              element.className = "venue-marker";
              element.style.background = event.color;
              element.textContent =
                event.shortName === "Devcon"
                  ? "DC8"
                  : event.shortName === "IBW"
                    ? "IBW"
                    : "SOL";
              element.setAttribute("aria-label", event.name);
              const popup = document.createElement("div");
              popup.className = "venue-popup";
              const title = document.createElement("strong");
              const brand = eventBrands[event.id];
              if (brand) {
                const logo = document.createElement("img");
                logo.src = brand.src;
                logo.alt = "";
                logo.width = brand.width;
                logo.height = brand.height;
                logo.className = `popup-event-logo event-logo-${brand.theme}`;
                popup.append(logo);
              }
              title.textContent = event.name;
              const name = document.createElement("p");
              name.textContent = event.venue;
              const address = document.createElement("p");
              address.textContent = event.address;
              const directions = document.createElement("a");
              directions.textContent = "Open directions ↗";
              directions.href = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${event.venue}, ${event.address}`)}`;
              directions.target = "_blank";
              directions.rel = "noopener noreferrer";
              popup.append(title, name, address, directions);
              new Marker({ element })
                .setLngLat(event.coordinates)
                .setPopup(new Popup({ offset: 20 }).setDOMContent(popup))
                .addTo(map);
            }
          } catch {
            setError(
              "Interactive maps need WebGL. Use the venue list and directions links below.",
            );
          }
        },
      )
      .catch(() => setError("Map could not load. Use the venue list below."));
    return () => {
      disposed = true;
      removeAttribution?.();
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [events]);
  useEffect(() => {
    const event = events.find((e) => e.id === selected);
    if (event)
      mapRef.current?.flyTo({
        center: event.coordinates,
        zoom: 15,
        essential: false,
        duration: matchMedia("(prefers-reduced-motion: reduce)").matches
          ? 0
          : 800,
      });
  }, [events, selected]);
  return (
    <div className={`real-map-wrap ${styles.frame}`}>
      <div
        ref={container}
        className="real-map"
        aria-label="Map of verified Mumbai event venues"
      />
      {error && (
        <div className="map-error" role="status">
          <MapPin size={18} />
          {error}
        </div>
      )}
      <div className={styles.footer}>
        <div
          ref={attributionContainer}
          className={styles.credits}
          role="group"
          aria-label="Map credits"
        />
        <p className={`map-privacy-caption ${styles.caption}`}>
          Public venues only · venue pins are approximate · no live attendee
          tracking
        </p>
      </div>
    </div>
  );
}
