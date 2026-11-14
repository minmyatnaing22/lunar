# LunarSight — Lunar Mission Planning System
### NASA Space Apps Challenge

**LunarSight** is a scientific mission-planning web application engineered for planetary mission designers, lunar scientists, and aerospace systems engineers. It evaluates and compares prospective landing locations on the lunar surface with special focus on the **Lunar South Pole (-75° to -90°)** for NASA's Artemis program.

---

## 🚀 Key Features

1. **Moon Map Explorer**
   - High-fidelity **Polar Stereographic projection** of the Lunar South Pole (-75° to -90° latitude boundary).
   - USGS & NASA Lunar Reconnaissance Orbiter (LRO) **LOLA Digital Elevation Model** integration.
   - Real-time surface coordinate inspection, elevation, and terrain slope sampling.
   - Interactive candidate landing location selector and custom exploration waypoint creator.
   - Visual layers for Permanent Shadow Regions (PSRs), crater rim topography, and sub-solar vector.

2. **Sun Position Simulator**
   - IAU/JPL ephemeris analytical solar geometry engine.
   - Accurate solar elevation and azimuth computation relative to local topocentric horizon.
   - Crater rim occlusion check: identifies whether candidate sites receive direct sunlight or are shadowed by surrounding crater rims.
   - 7/14/28-day illumination timeline chart powered by Recharts.
   - Engineering telemetry for vertical solar array design (VSAT) and cryogenic thermal risk assessment (40 K).

3. **Earth Visibility Simulator**
   - 360° celestial horizon radar/sky plot showing Earth's apparent position, azimuth, and elevation.
   - Lunar optical and physical libration dynamics ($l, b$) tracking over the 27.3-day draconic cycle.
   - **Crucial distinction between geometric visibility and local terrain line-of-sight**.
   - Earth phase and apparent angular diameter (~1.9°) as seen from the Moon.

4. **Communication Window Analyzer**
   - Direct-to-Earth (DTE) line-of-sight tracking linked to NASA Deep Space Network (DSN) complexes:
     - Goldstone (DSN-14, USA)
     - Madrid (DSN-63, Spain)
     - Canberra (DSN-43, Australia)
   - Real-time round-trip light time (RTT ~2.4–2.7 s) latency estimation.
   - Contact window schedule, blackout durations, and orbital Lunar Relay Satellite (L2 Halo orbit) demonstration.

5. **Landing Site Comparison & MCDA Suitability**
   - Multi-Criteria Decision Analysis (MCDA) matrix comparing all Artemis candidate locations.
   - Customizable mission priority weight sliders (Sunlight, Direct Comms, Terrain Safety, Water Ice).
   - Transparent scoring algorithm with explainable justification and risk breakdown.

6. **Mission Reports**
   - Comprehensive mission briefing synthesis dossier.
   - Printable mission report layout (`window.print()`).
   - JSON export for scientific reproducibility and telemetry logging.
   - One-click dossier clipboard copy.

---

## 🛠️ Technology Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Visualization**: HTML5 Canvas, SVG Polar Sky Radar, Recharts
- **Icons**: Lucide React
- **Astronomical Models**: JPL DE440/DE421 analytical planetary series & IAU WGCCTR standards

---

## 📦 Getting Started

### Prerequisites
- Node.js 18+ or 20+
- npm

### Installation

```bash
# Clone the repository
git clone https://github.com/minmyatnaing22/lunar.git
cd lunar

# Install dependencies
npm install

# Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📜 Scientific Datasets & Citations

- **NASA LRO LOLA**: Lunar Orbiter Laser Altimeter Digital Elevation Models (1,737.4 km reference datum).
- **USGS Astrogeology**: Lunar South Pole Topography and Permanent Shadow Region maps.
- **JPL Planetary Ephemeris**: DE440/DE421 simplified analytical series for Sun and Earth lunar topocentric coordinates.
- **NASA Artemis III**: Candidate Landing Regions Selection White Papers (2022–2024).

---

## 👥 Authors & Team
- **NASA Space Apps Challenge Team**
