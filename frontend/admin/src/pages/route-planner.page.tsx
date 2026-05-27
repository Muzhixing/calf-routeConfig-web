import { environment } from "@helpers/environment.ts";
import {
  DownloadIcon,
  PlusIcon,
  RefreshCwIcon,
  SendIcon,
  Trash2Icon,
  Undo2Icon,
  UploadIcon,
} from "lucide-react";
import { FC, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LayoutContent } from "@/components/layout/layout.content.tsx";

type Point = {
  row: number;
  col: number;
  selectedCount: number;
};

type Connection = {
  from: string;
  to: string;
};

type RouteDef = {
  id: number;
  color: string;
  connections: Connection[];
  logs: string[];
};

type ViewState = {
  offsetX: number;
  offsetY: number;
};

const GRID_GAP = 40;
const POINT_RADIUS = 5;
const HIT_RADIUS = 20;
const GRID_SCALE_M = 0.5;
const ROUTE_COLORS = ["#0ea5e9", "#f43f5e", "#84cc16", "#f59e0b", "#8b5cf6", "#14b8a6"];

function apiUrl(baseUrl: string, path: string): string {
  const base = baseUrl.replace(/\/$/, "");
  return base ? `${base}${path}` : path;
}

function parsePointKey(key: string): Point {
  const [row, col] = key.split(",").map(Number);
  return { col, row, selectedCount: 1 };
}

function createRoute(id: number): RouteDef {
  return {
    color: ROUTE_COLORS[(id - 1) % ROUTE_COLORS.length],
    connections: [],
    id,
    logs: [],
  };
}

function orderedPointKeys(route: RouteDef, lastClickedPoint: string | null): string[] {
  if (route.connections.length === 0) {
    return lastClickedPoint ? [lastClickedPoint] : [];
  }
  return [route.connections[0].from, ...route.connections.map((conn) => conn.to)];
}

function buildTask(
  route: RouteDef,
  lastClickedPoint: string | null,
  deviceID: string,
  gridScaleM: number,
  feedAmount: number,
): Record<string, unknown> {
  const keys = orderedPointKeys(route, lastClickedPoint);
  const robotPath = keys.map((key, index) => {
    const point = parsePointKey(key);
    const isFirst = index === 0;
    const isLast = index === keys.length - 1;
    const action = isFirst ? "start" : isLast ? "feed" : "pass";
    return {
      action,
      col: point.col,
      feedAmount: action === "feed" ? feedAmount : undefined,
      row: point.row,
      seq: index + 1,
      x: Number((point.col * gridScaleM).toFixed(3)),
      y: Number((point.row * gridScaleM).toFixed(3)),
    };
  });
  return {
    deviceID,
    gridScaleM,
    robotPath,
    taskID: `task-${Date.now()}`,
  };
}

export const RoutePlannerPage: FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const dragRef = useRef({ active: false, moved: false, x: 0, y: 0 });
  const [routes, setRoutes] = useState<RouteDef[]>([createRoute(1)]);
  const [activeRouteIdx, setActiveRouteIdx] = useState(0);
  const [points, setPoints] = useState<Record<string, Point>>({});
  const [history, setHistory] = useState<
    { points: Record<string, Point>; routes: RouteDef[]; lastClickedPoint: string | null }[]
  >([]);
  const [lastClickedPoint, setLastClickedPoint] = useState<string | null>(null);
  const [view, setView] = useState<ViewState>({ offsetX: 0, offsetY: 0 });
  const [deviceID, setDeviceID] = useState("robot001");
  const [gridScaleM, setGridScaleM] = useState(GRID_SCALE_M);
  const [feedAmount, setFeedAmount] = useState(500);
  const [apiBase, setApiBase] = useState(environment.apiHost || "");
  const [message, setMessage] = useState("等待提交路径任务");
  const [statusJson, setStatusJson] = useState("{}");

  const currentRoute = routes[activeRouteIdx] || createRoute(0);
  const plannedPoints = useMemo(
    () => orderedPointKeys(currentRoute, lastClickedPoint),
    [currentRoute, lastClickedPoint],
  );

  const saveHistory = useCallback(() => {
    setHistory((items) => [
      ...items.slice(-49),
      {
        lastClickedPoint,
        points: JSON.parse(JSON.stringify(points)) as Record<string, Point>,
        routes: JSON.parse(JSON.stringify(routes)) as RouteDef[],
      },
    ]);
  }, [lastClickedPoint, points, routes]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) {
      return;
    }
    const centerX = canvas.width / 2 + view.offsetX;
    const centerY = canvas.height / 2 + view.offsetY;
    ctx.fillStyle = "#111827";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const startCol = Math.floor((-view.offsetX - canvas.width / 2) / GRID_GAP) - 1;
    const endCol = Math.ceil((-view.offsetX + canvas.width / 2) / GRID_GAP) + 1;
    const startRow = Math.floor((-view.offsetY - canvas.height / 2) / GRID_GAP) - 1;
    const endRow = Math.ceil((-view.offsetY + canvas.height / 2) / GRID_GAP) + 1;

    ctx.fillStyle = "#475569";
    for (let row = startRow; row <= endRow; row++) {
      for (let col = startCol; col <= endCol; col++) {
        const x = centerX + col * GRID_GAP;
        const y = centerY + row * GRID_GAP;
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    routes.forEach((route) => {
      route.connections.forEach((conn, index) => {
        const from = parsePointKey(conn.from);
        const to = parsePointKey(conn.to);
        const x1 = centerX + from.col * GRID_GAP;
        const y1 = centerY + from.row * GRID_GAP;
        const x2 = centerX + to.col * GRID_GAP;
        const y2 = centerY + to.row * GRID_GAP;
        const angle = Math.atan2(y2 - y1, x2 - x1);
        ctx.strokeStyle = route.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        ctx.fillStyle = route.color;
        const endX = x2 - Math.cos(angle) * 10;
        const endY = y2 - Math.sin(angle) * 10;
        ctx.beginPath();
        ctx.moveTo(endX, endY);
        ctx.lineTo(endX - 10 * Math.cos(angle - Math.PI / 6), endY - 10 * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(endX - 10 * Math.cos(angle + Math.PI / 6), endY - 10 * Math.sin(angle + Math.PI / 6));
        ctx.fill();
        if (index === 0) {
          ctx.font = "700 12px Inter, sans-serif";
          ctx.fillText(`R${route.id}`, x1 + 8, y1 - 8);
        }
      });
    });

    Object.values(points).forEach((point) => {
      const x = centerX + point.col * GRID_GAP;
      const y = centerY + point.row * GRID_GAP;
      ctx.fillStyle = "#f8fafc";
      ctx.beginPath();
      ctx.arc(x, y, POINT_RADIUS, 0, Math.PI * 2);
      ctx.fill();
    });
  }, [points, routes, view.offsetX, view.offsetY]);

  useEffect(() => {
    const resize = () => {
      const canvas = canvasRef.current;
      if (!canvas) {
        return;
      }
      canvas.width = canvas.clientWidth;
      canvas.height = canvas.clientHeight;
      draw();
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [draw]);

  useEffect(() => {
    draw();
  }, [draw]);

  function selectPoint(row: number, col: number): void {
    saveHistory();
    const key = `${row},${col}`;
    setPoints((prev) => ({
      ...prev,
      [key]: {
        col,
        row,
        selectedCount: (prev[key]?.selectedCount || 0) + 1,
      },
    }));
    setRoutes((prev) =>
      prev.map((route, index) =>
        index === activeRouteIdx && lastClickedPoint && lastClickedPoint !== key
          ? {
              ...route,
              connections: [...route.connections, { from: lastClickedPoint, to: key }],
              logs: [...route.logs, `(${lastClickedPoint}) -> (${key})`],
            }
          : route,
      ),
    );
    setLastClickedPoint(key);
  }

  function canvasPoint(clientX: number, clientY: number): { row: number; col: number } | null {
    const canvas = canvasRef.current;
    if (!canvas) {
      return null;
    }
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const centerX = canvas.width / 2 + view.offsetX;
    const centerY = canvas.height / 2 + view.offsetY;
    const col = Math.round((x - centerX) / GRID_GAP);
    const row = Math.round((y - centerY) / GRID_GAP);
    const gridX = centerX + col * GRID_GAP;
    const gridY = centerY + row * GRID_GAP;
    return Math.hypot(x - gridX, y - gridY) < HIT_RADIUS ? { col, row } : null;
  }

  function handleMouseDown(event: React.MouseEvent<HTMLCanvasElement>): void {
    dragRef.current = { active: true, moved: false, x: event.clientX, y: event.clientY };
  }

  function handleMouseMove(event: React.MouseEvent<HTMLCanvasElement>): void {
    const drag = dragRef.current;
    if (!drag.active) {
      return;
    }
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    drag.moved = drag.moved || Math.hypot(dx, dy) > 3;
    drag.x = event.clientX;
    drag.y = event.clientY;
    setView((prev) => ({ offsetX: prev.offsetX + dx, offsetY: prev.offsetY + dy }));
  }

  function handleMouseUp(event: React.MouseEvent<HTMLCanvasElement>): void {
    const drag = dragRef.current;
    dragRef.current = { ...drag, active: false };
    if (drag.moved) {
      return;
    }
    const point = canvasPoint(event.clientX, event.clientY);
    point && selectPoint(point.row, point.col);
  }

  async function submitTask(): Promise<void> {
    if (plannedPoints.length === 0) {
      setMessage("当前路线没有可提交的路径点");
      return;
    }
    const task = buildTask(currentRoute, lastClickedPoint, deviceID, gridScaleM, feedAmount);
    const response = await fetch(apiUrl(apiBase, "/api/pathSettings"), {
      body: JSON.stringify(task),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    setMessage(`已提交 ${plannedPoints.length} 个路径点到 ${deviceID}`);
  }

  async function refreshStatus(): Promise<void> {
    const response = await fetch(
      apiUrl(apiBase, `/api/webget?deviceID=${encodeURIComponent(deviceID)}`),
    );
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const data = (await response.json()) as unknown;
    setStatusJson(JSON.stringify(data, null, 2));
  }

  function addRoute(): void {
    setRoutes((prev) => [...prev, createRoute(prev.length + 1)]);
    setActiveRouteIdx(routes.length);
    setLastClickedPoint(null);
  }

  function clearRoute(): void {
    saveHistory();
    setRoutes((prev) =>
      prev.map((route, index) =>
        index === activeRouteIdx ? { ...route, connections: [], logs: [] } : route,
      ),
    );
    setPoints({});
    setLastClickedPoint(null);
  }

  function undo(): void {
    const last = history[history.length - 1];
    if (!last) {
      return;
    }
    setPoints(last.points);
    setRoutes(last.routes);
    setLastClickedPoint(last.lastClickedPoint);
    setHistory((items) => items.slice(0, -1));
  }

  function exportData(): void {
    const blob = new Blob([JSON.stringify({ points, routes }, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "grid-routes.json";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function importData(event: React.ChangeEvent<HTMLInputElement>): void {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const data = JSON.parse(String(reader.result)) as { points?: Record<string, Point>; routes?: RouteDef[] };
      setPoints(data.points || {});
      setRoutes(data.routes?.length ? data.routes : [createRoute(1)]);
      setActiveRouteIdx(0);
      setLastClickedPoint(null);
    };
    reader.readAsText(file);
    event.target.value = "";
  }

  return (
    <LayoutContent fixed className="h-[calc(100vh-4rem)]">
      <div className="grid h-full grid-cols-[minmax(0,1fr)_360px] bg-slate-950 text-slate-100 max-lg:grid-cols-1">
        <div className="relative min-h-[520px] overflow-hidden">
          <canvas
            ref={canvasRef}
            className="h-full w-full"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          />
          <div className="absolute left-4 top-4 flex items-center gap-2 rounded-md border border-white/10 bg-slate-900/90 px-3 py-2 text-sm">
            <span className="h-2 w-2 rounded-full bg-cyan-400" />
            路径点 {plannedPoints.length}
          </div>
        </div>

        <aside className="flex min-h-0 flex-col gap-4 border-l border-white/10 bg-slate-900 p-4">
          <div>
            <h1 className="text-lg font-semibold">路径规划</h1>
            <p className="mt-1 text-sm text-slate-400">双击或单击网格点连线，提交后板卡按 seq 顺序拉取。</p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <label className="grid gap-1">
              <span className="text-slate-400">设备 ID</span>
              <input className="rounded-md border border-white/10 bg-slate-950 px-3 py-2" value={deviceID} onChange={(event) => setDeviceID(event.target.value)} />
            </label>
            <label className="grid gap-1">
              <span className="text-slate-400">网格米数</span>
              <input className="rounded-md border border-white/10 bg-slate-950 px-3 py-2" type="number" step="0.1" value={gridScaleM} onChange={(event) => setGridScaleM(Number(event.target.value) || GRID_SCALE_M)} />
            </label>
            <label className="grid gap-1">
              <span className="text-slate-400">投喂量</span>
              <input className="rounded-md border border-white/10 bg-slate-950 px-3 py-2" type="number" value={feedAmount} onChange={(event) => setFeedAmount(Number(event.target.value) || 0)} />
            </label>
            <label className="grid gap-1">
              <span className="text-slate-400">路线</span>
              <select className="rounded-md border border-white/10 bg-slate-950 px-3 py-2" value={activeRouteIdx} onChange={(event) => { setActiveRouteIdx(Number(event.target.value)); setLastClickedPoint(null); }}>
                {routes.map((route, index) => (
                  <option key={route.id} value={index}>#{route.id} ({route.connections.length})</option>
                ))}
              </select>
            </label>
          </div>

          <label className="grid gap-1 text-sm">
            <span className="text-slate-400">API Base</span>
            <input className="rounded-md border border-white/10 bg-slate-950 px-3 py-2" value={apiBase} placeholder="同源留空" onChange={(event) => setApiBase(event.target.value)} />
          </label>

          <div className="grid grid-cols-4 gap-2">
            <button className="rounded-md bg-slate-800 p-2 hover:bg-slate-700" title="新增路线" onClick={addRoute}><PlusIcon className="mx-auto h-4 w-4" /></button>
            <button className="rounded-md bg-slate-800 p-2 hover:bg-slate-700 disabled:opacity-40" title="撤销" disabled={history.length === 0} onClick={undo}><Undo2Icon className="mx-auto h-4 w-4" /></button>
            <button className="rounded-md bg-slate-800 p-2 hover:bg-slate-700" title="导出" onClick={exportData}><DownloadIcon className="mx-auto h-4 w-4" /></button>
            <button className="rounded-md bg-slate-800 p-2 hover:bg-slate-700" title="导入" onClick={() => fileRef.current?.click()}><UploadIcon className="mx-auto h-4 w-4" /></button>
            <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={importData} />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button className="inline-flex items-center justify-center gap-2 rounded-md bg-cyan-500 px-3 py-2 text-sm font-medium text-slate-950 hover:bg-cyan-400" onClick={() => void submitTask().catch((error) => setMessage(String(error)))}>
              <SendIcon className="h-4 w-4" />提交
            </button>
            <button className="inline-flex items-center justify-center gap-2 rounded-md bg-slate-800 px-3 py-2 text-sm hover:bg-slate-700" onClick={() => void refreshStatus().catch((error) => setStatusJson(String(error)))}>
              <RefreshCwIcon className="h-4 w-4" />状态
            </button>
            <button className="col-span-2 inline-flex items-center justify-center gap-2 rounded-md bg-rose-500 px-3 py-2 text-sm font-medium text-white hover:bg-rose-400" onClick={clearRoute}>
              <Trash2Icon className="h-4 w-4" />清空当前路线
            </button>
          </div>

          <div className="rounded-md border border-white/10 bg-slate-950 p-3 text-sm text-slate-300">{message}</div>

          <div className="min-h-0 flex-1 overflow-auto rounded-md border border-white/10 bg-slate-950 p-3">
            <h2 className="mb-2 text-sm font-medium text-slate-200">当前路线</h2>
            <ol className="space-y-1 text-xs text-slate-400">
              {plannedPoints.map((key, index) => (
                <li key={`${key}-${index}`}>{index + 1}. ({key})</li>
              ))}
            </ol>
          </div>

          <pre className="max-h-44 overflow-auto rounded-md border border-white/10 bg-slate-950 p-3 text-xs text-slate-400">{statusJson}</pre>
        </aside>
      </div>
    </LayoutContent>
  );
};
