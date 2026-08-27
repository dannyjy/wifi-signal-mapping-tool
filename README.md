# Enterprise Wi-Fi Signal Strength Mapping Tool

**Case Study**: University of Juba Campus Wireless Infrastructure Management

A fully functional, enterprise-grade Model-View-Controller (MVC) web application designed for university network engineers and surveyors to manage campus buildings, log Received Signal Strength Indicator (RSSI) measurement points on interactive floor plan canvases, compute spatial heat maps using Inverse Distance Weighting (IDW) interpolation ($p = 2.0$), annotate Access Points (APs), and export executive PDF diagnostic reports.

---

## Key Features

- **MVC Architecture**: Modular separation of concerns across models, controllers, views, middleware, utilities, and configuration.
- **Dual Database Engine Support**: Out-of-the-box zero-config **SQLite3** local fallback alongside production-ready **MySQL 8.0+** support via Knex.js.
- **Interactive HTML5 Canvas Workspace**: Point-and-click RSSI logging, AP marker placement, hover tooltips, live frequency band selection (2.4GHz, 5GHz, 6GHz), and signal strength slider (-30 dBm to -90 dBm).
- **IDW Spatial Interpolation Engine**: Server-side and client-side 2D spatial interpolation calculating spatial coverage grids with $p = 2.0$.
- **Signal Quality Classification**:
  - **Excellent** ($\ge -50\text{ dBm}$): Emerald `#10B981` (Strong)
  - **Good** ($-50 \text{ to } -60\text{ dBm}$): Blue `#3B82F6` (Healthy)
  - **Acceptable** ($-60 \text{ to } -70\text{ dBm}$): Amber `#F59E0B` (Fair)
  - **Poor / Dead Zone** ($< -70\text{ dBm}$): Red `#EF4444` (Dead Zone)
- **Executive PDF Diagnostics**: Native PDFKit report generator with institutional headers, statistics summary, dead zone analysis, AP inventory, and engineering recommendations.
- **Minimalist Slate & Emerald Theme**: Responsive design built with Tailwind CSS.

---

## Quick Start & Local Execution

### 1. Installation
```bash
cd wifi-signal-mapping-tool
npm install
```

### 2. Run Database Seed & Start Server
```bash
npm start
```
The application will automatically initialize the database schema, seed test buildings (College of Natural Resources & Environmental Studies, Computer Center), floor plan SVGs, sample RSSI points, and AP annotations, then launch on:
`http://localhost:3000`

### 3. Demo Credentials
- **Admin**: `admin` / `admin123`
- **Surveyor**: `surveyor1` / `surveyor123`
- **Viewer**: `viewer1` / `viewer123`

---

## Database Configuration

By default, `.env` uses `DB_CLIENT=sqlite3`. To switch to MySQL 8.0+:

1. Create a MySQL database named `wifi_mapping_db` or execute `database/schema.sql`.
2. Update `.env`:
```env
DB_CLIENT=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=yourpassword
DB_NAME=wifi_mapping_db
```
3. Run `npm start`.

---

## API Endpoints

- `GET /api/surveys/:sessionId/points` — Retrieve all RSSI measurement points.
- `POST /api/surveys/:sessionId/points` — Log a new RSSI measurement point.
- `DELETE /api/points/:pointId` — Delete a measurement point.
- `GET /api/floors/:floorId/aps` — Retrieve Access Points on a floor.
- `POST /api/floors/:floorId/aps` — Annotate a new Access Point.
- `DELETE /api/aps/:apId` — Remove Access Point annotation.
- `POST /api/surveys/:sessionId/interpolate` — Execute IDW spatial interpolation engine.
- `GET /surveys/:id/report/pdf` — Binary stream download of executive PDF diagnostic report.
