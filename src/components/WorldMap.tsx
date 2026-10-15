'use client';

import { geoEqualEarth, geoPath } from 'd3-geo';
import { useMemo } from 'react';
import { feature } from 'topojson-client';
import type { GeometryCollection, Topology } from 'topojson-specification';
import landTopology from 'world-atlas/land-110m.json';
import type { DisplayStatus } from '../lib/status';

export const MAP_WIDTH = 960;
export const MAP_HEIGHT = 500;

export interface MapDot {
  sourceName: string;
  lat: number;
  lon: number;
  responded: boolean;
}

export interface MapTicket {
  sourceName: string;
  lat: number;
  lon: number;
  status: DisplayStatus;
  co2eTonnesPerYear: number;
}

export interface MapBubble {
  country: string;
  lat: number;
  lon: number;
  ratePct: number;
  sourcesNotified: number;
  sourcesWithFeedback: number;
}

export interface WorldMapProps {
  dots: MapDot[];
  tickets: MapTicket[];
  bubbles: MapBubble[];
  showAlerts: boolean;
  showOverlay: boolean;
  selected: string | null;
  onSelect: (sourceName: string) => void;
}

const topology = landTopology as unknown as Topology<{ land: GeometryCollection }>;
const land = feature(topology, topology.objects.land);

/** Marker radius grows with log CO2e: 10 kt -> 4 px, 100 Mt -> 12 px. */
export function markerRadius(co2eTonnesPerYear: number): number {
  return 4 + Math.min(8, Math.max(0, Math.log10(Math.max(co2eTonnesPerYear, 1)) - 4) * 2);
}

/** 0 % -> red, 100 % -> green. */
export function rateColor(ratePct: number): string {
  return `hsl(${Math.round((Math.min(100, Math.max(0, ratePct)) / 100) * 120)}, 70%, 45%)`;
}

export function WorldMap({ dots, tickets, bubbles, showAlerts, showOverlay, selected, onSelect }: WorldMapProps) {
  const projection = useMemo(() => geoEqualEarth().fitSize([MAP_WIDTH, MAP_HEIGHT], { type: 'Sphere' }), []);
  const path = useMemo(() => geoPath(projection), [projection]);
  const project = (lon: number, lat: number): [number, number] => projection([lon, lat]) ?? [-1000, -1000];

  return (
    <svg
      viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
      className="world-map"
      role="img"
      aria-label="World map of PlumeClock methane tickets"
    >
      <path className="map-sphere" d={path({ type: 'Sphere' }) ?? ''} />
      <path className="map-land" d={path(land) ?? ''} />
      {showOverlay &&
        bubbles.map((b) => {
          const [x, y] = project(b.lon, b.lat);
          return (
            <circle
              key={`rr-${b.country}`}
              data-testid="rr-bubble"
              className="rr-bubble"
              cx={x}
              cy={y}
              r={6 + Math.sqrt(b.sourcesNotified) * 1.5}
              fill={rateColor(b.ratePct)}
            >
              <title>{`${b.country}: ${b.ratePct}% response rate (${b.sourcesWithFeedback}/${b.sourcesNotified} notified sources)`}</title>
            </circle>
          );
        })}
      {showAlerts &&
        dots.map((d) => {
          const [x, y] = project(d.lon, d.lat);
          return (
            <circle
              key={`dot-${d.sourceName}`}
              data-testid="alert-dot"
              className={d.responded ? 'alert-dot responded' : 'alert-dot'}
              cx={x}
              cy={y}
              r={1.6}
              onClick={() => onSelect(d.sourceName)}
            />
          );
        })}
      {tickets.map((t) => {
        const [x, y] = project(t.lon, t.lat);
        return (
          <circle
            key={`ticket-${t.sourceName}`}
            data-testid="ticket-marker"
            className={`ticket-marker status-${t.status}${selected === t.sourceName ? ' selected' : ''}`}
            cx={x}
            cy={y}
            r={markerRadius(t.co2eTonnesPerYear)}
            onClick={() => onSelect(t.sourceName)}
          >
            <title>{t.sourceName}</title>
          </circle>
        );
      })}
    </svg>
  );
}
