import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { ComputedRoute, RouteLocation } from "@/types/routes";

interface RouteMapProps {
  origin?: RouteLocation | null;
  destination?: RouteLocation | null;
  routes: ComputedRoute[];
  selectedRouteId: string | null;
  onSelectRoute: (routeId: string) => void;
  className?: string;
}

/**
 * Creates custom Design D vector HTML pin icons using L.divIcon
 */
function createCustomPin(color: string, label: string): L.DivIcon {
  return L.divIcon({
    className: "custom-leaflet-marker",
    html: `
      <div style="
        display: flex;
        align-items: center;
        justify-content: center;
        width: 28px;
        height: 28px;
        border-radius: 50%;
        background-color: ${color};
        color: #111111;
        border: 2px solid #ffffff;
        box-shadow: 0 2px 6px rgba(0,0,0,0.25);
        font-family: inherit;
        font-weight: 700;
        font-size: 11px;
      ">
        ${label}
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

export function RouteMap({
  origin,
  destination,
  routes,
  selectedRouteId,
  onSelectRoute,
  className = "h-[360px] sm:h-[440px]",
}: RouteMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);

  // 1. Initialize Map instance
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const hasOrigin = origin && typeof origin.latitude === "number" && !Number.isNaN(origin.latitude);
    const hasDest = destination && typeof destination.latitude === "number" && !Number.isNaN(destination.latitude);

    let centerLat = 28.6139;
    let centerLng = 77.209;
    let initialZoom = 11;

    if (hasOrigin && hasDest) {
      centerLat = (origin!.latitude + destination!.latitude) / 2;
      centerLng = (origin!.longitude + destination!.longitude) / 2;
      initialZoom = 12;
    } else if (hasOrigin) {
      centerLat = origin!.latitude;
      centerLng = origin!.longitude;
      initialZoom = 13;
    } else if (hasDest) {
      centerLat = destination!.latitude;
      centerLng = destination!.longitude;
      initialZoom = 13;
    }

    const map = L.map(mapContainerRef.current, {
      center: [centerLat, centerLng],
      zoom: initialZoom,
      zoomControl: true,
      attributionControl: true,
    });

    // OpenStreetMap tile layer with compliant attribution
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
    }).addTo(map);

    const layerGroup = L.layerGroup().addTo(map);

    mapInstanceRef.current = map;
    layerGroupRef.current = layerGroup;

    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 150);

    return () => {
      clearTimeout(timer);
      map.remove();
      mapInstanceRef.current = null;
      layerGroupRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2. Update Polylines, Markers, and Bounds whenever routes or locations change
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layerGroup = layerGroupRef.current;
    if (!map || !layerGroup) return;

    layerGroup.clearLayers();

    const boundsPoints: [number, number][] = [];

    const hasOrigin = origin && typeof origin.latitude === "number" && !Number.isNaN(origin.latitude);
    const hasDest = destination && typeof destination.latitude === "number" && !Number.isNaN(destination.latitude);

    // Add Origin Marker if valid
    if (hasOrigin && origin) {
      boundsPoints.push([origin.latitude, origin.longitude]);
      const originMarker = L.marker([origin.latitude, origin.longitude], {
        icon: createCustomPin("#D1EB8F", "A"),
        title: origin.name,
      }).bindPopup(`<strong>Origin:</strong> ${origin.name}`);
      layerGroup.addLayer(originMarker);
    }

    // Add Destination Marker if valid
    if (hasDest && destination) {
      boundsPoints.push([destination.latitude, destination.longitude]);
      const destMarker = L.marker([destination.latitude, destination.longitude], {
        icon: createCustomPin("#AFC8B5", "B"),
        title: destination.name,
      }).bindPopup(`<strong>Destination:</strong> ${destination.name}`);
      layerGroup.addLayer(destMarker);
    }

    // Render Routes
    if (routes && routes.length > 0) {
      const sortedRoutes = [...routes].sort((a, b) => {
        if (a.id === selectedRouteId) return 1;
        if (b.id === selectedRouteId) return -1;
        return 0;
      });

      sortedRoutes.forEach((route) => {
        const isSelected = route.id === selectedRouteId;
        const latLngs: L.LatLngExpression[] = route.polyline.map(([lat, lng]) => [
          lat,
          lng,
        ]);

        if (latLngs.length > 0) {
          route.polyline.forEach(([lat, lng]) => {
            boundsPoints.push([lat, lng]);
          });

          let lineColor = isSelected ? "#111111" : "#8A9488";
          let dashPattern: string | undefined = isSelected ? undefined : "6, 8";

          if (route.travelMode === "WALK") {
            lineColor = isSelected ? "#2E7D4E" : "#76A685";
            dashPattern = isSelected ? "4, 6" : "2, 6";
          } else if (route.travelMode === "BICYCLE") {
            lineColor = isSelected ? "#0D9488" : "#5EEAD4";
            dashPattern = isSelected ? "6, 6" : "3, 6";
          }

          const polyline = L.polyline(latLngs, {
            color: lineColor,
            weight: isSelected ? 5 : 3.5,
            opacity: isSelected ? 0.95 : 0.55,
            dashArray: dashPattern,
          });

          polyline.on("click", () => {
            onSelectRoute(route.id);
          });

          polyline.bindTooltip(
            `<strong>${route.summary}</strong><br/>${route.distanceKm} km • ${route.durationMinutes} min`,
            { sticky: true }
          );

          layerGroup.addLayer(polyline);
        }
      });
    }

    // Fit map bounds smoothly
    if (boundsPoints.length >= 2) {
      try {
        const bounds = L.latLngBounds(boundsPoints);
        if (bounds.isValid()) {
          map.fitBounds(bounds, {
            padding: [35, 35],
            maxZoom: 15,
          });
        }
      } catch {
        // ignore
      }
    } else if (boundsPoints.length === 1) {
      map.setView(boundsPoints[0]!, 13);
    }
  }, [routes, selectedRouteId, origin, destination, onSelectRoute]);

  return (
    <div className="relative rounded-2xl overflow-hidden border border-[#D6D6D2] shadow-xs">
      <div ref={mapContainerRef} className={`w-full ${className} z-0`} />

      {/* Floating Map Legend (Design D Minimalist) */}
      <div className="absolute top-3 right-3 z-10 bg-white/95 backdrop-blur-xs border border-[#D6D6D2] rounded-xl px-3 py-2 text-[11px] shadow-xs space-y-1">
        {origin?.name && (
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-[#D1EB8F] border border-[#111111]/40" />
            <span className="font-medium text-[#111111] max-w-[140px] truncate">{origin.name}</span>
          </div>
        )}
        {destination?.name && (
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-[#AFC8B5] border border-[#111111]/40" />
            <span className="font-medium text-[#111111] max-w-[140px] truncate">{destination.name}</span>
          </div>
        )}
        {routes.length > 1 && (
          <div className="pt-1 border-t border-[#D6D6D2] text-[10px] text-[#626762]">
            Click route line to select
          </div>
        )}
        <div className="pt-1 border-t border-[#D6D6D2] text-[9px] text-[#626762]/80">
          OpenRouteService via HeiGIT
        </div>
      </div>
    </div>
  );
}
