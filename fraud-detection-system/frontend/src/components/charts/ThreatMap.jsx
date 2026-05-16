import React, { useMemo } from "react";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";
import { scaleQuantize } from "d3-scale";

const geoUrl = "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json";

// Mock data: state names or IDs to fraud counts
// In a real app, this would come from the API
const MOCK_DATA = [
  { id: "01", val: 2 }, // Alabama
  { id: "04", val: 5 }, // Arizona
  { id: "06", val: 8 }, // California
  { id: "08", val: 1 }, // Colorado
  { id: "12", val: 4 }, // Florida
  { id: "13", val: 6 }, // Georgia
  { id: "17", val: 3 }, // Illinois
  { id: "25", val: 2 }, // Massachusetts
  { id: "26", val: 4 }, // Michigan
  { id: "36", val: 9 }, // New York
  { id: "48", val: 7 }, // Texas
  { id: "53", val: 3 }, // Washington
];

const colorScale = scaleQuantize()
  .domain([1, 10])
  .range([
    "var(--brand-500)", // Need to adjust colors to fit the dark theme
    "#8b5cf6", // violet-500
    "#d946ef", // fuchsia-500
    "#ec4899", // pink-500
    "#f43f5e", // rose-500
    "#ef4444", // red-500
    "#dc2626", // red-600
  ]);

// Dark theme specific colors
const darkThemeScale = scaleQuantize()
  .domain([1, 10])
  .range([
    "rgba(239, 68, 68, 0.1)", // Lowest risk - very faint red
    "rgba(239, 68, 68, 0.25)",
    "rgba(239, 68, 68, 0.4)",
    "rgba(239, 68, 68, 0.6)",
    "rgba(239, 68, 68, 0.8)",
    "rgba(239, 68, 68, 1)",   // Highest risk - solid red
  ]);

export default function ThreatMap() {
  const maxVal = Math.max(...MOCK_DATA.map(d => d.val));
  const minVal = Math.min(...MOCK_DATA.map(d => d.val));

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex-1 min-h-[250px] relative flex items-center justify-center">
        <ComposableMap projection="geoAlbersUsa" className="w-full h-full">
          <Geographies geography={geoUrl}>
            {({ geographies }) =>
              geographies.map(geo => {
                const cur = MOCK_DATA.find(s => s.id === geo.id);
                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill={cur ? darkThemeScale(cur.val) : "var(--bg-tertiary)"}
                    stroke="var(--border)"
                    strokeWidth={0.5}
                    style={{
                      default: { outline: "none" },
                      hover: { fill: cur ? "var(--brand-500)" : "var(--bg-tertiary)", outline: "none", opacity: 0.8 },
                      pressed: { outline: "none" }
                    }}
                  />
                );
              })
            }
          </Geographies>
        </ComposableMap>
      </div>
      
      {/* Legend */}
      <div className="mt-4 flex items-center justify-between text-[10px] text-[var(--text-muted)] font-semibold uppercase tracking-wider">
        <span>Low Fraud Activity ({minVal})</span>
        <div className="flex-1 mx-4 h-2 rounded-full flex overflow-hidden">
          {darkThemeScale.range().map((color, i) => (
            <div key={i} className="h-full flex-1" style={{ backgroundColor: color }} />
          ))}
        </div>
        <span>High Fraud Activity ({maxVal})</span>
      </div>
    </div>
  );
}
