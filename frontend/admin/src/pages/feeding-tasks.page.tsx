import { environment } from "@helpers/environment.ts";
import { CarIcon, RefreshCwIcon, RouteIcon, SendIcon } from "lucide-react";
import { type FC, useCallback, useEffect, useMemo, useState } from "react";
import { LayoutContent } from "@/components/layout/layout.content.tsx";
import {
    apiUrl,
    buildGeneratedPath,
    createTaskPayload,
    formatMl,
    hasCalibration,
    idNumber,
    isVehicleOnline,
    mapImageSrc,
    type MapConfig,
    normalizeMap,
    normalizePlan,
    normalizeVehicles,
    realToPixel,
    type RoutePlan,
    unwrapData,
    type VehicleStatus,
} from "@/pages/robot-map.shared.ts";

export const FeedingTasksPage: FC = () => {
    const [apiBase, setApiBase] = useState(environment.apiHost || "");
    const [maps, setMaps] = useState<MapConfig[]>([]);
    const [plans, setPlans] = useState<RoutePlan[]>([]);
    const [mapConfig, setMapConfig] = useState<MapConfig | null>(null);
    const [currentPlan, setCurrentPlan] = useState<RoutePlan | null>(null);
    const [vehicles, setVehicles] = useState<VehicleStatus[]>([]);
    const [deviceID, setDeviceID] = useState("robot001");
    const [feedAmount, setFeedAmount] = useState(500);
    const [rangeEnd, setRangeEnd] = useState("A10");
    const [rangeStart, setRangeStart] = useState("A1");
    const [selectedTargetIDs, setSelectedTargetIDs] = useState<Set<string>>(new Set());
    const [taskName, setTaskName] = useState(`投喂任务 ${new Date().toLocaleString("zh-CN")}`);
    const [imageSize, setImageSize] = useState({ height: 720, width: 960 });
    const [imageVersion] = useState(Date.now());
    const [message, setMessage] = useState("请选择地图和路线方案");

    const loadPlans = useCallback(
        async (mapID: string) => {
            const response = await fetch(
                apiUrl(apiBase, `/api/maps/${encodeURIComponent(mapID)}/plans`),
                {
                    credentials: "same-origin",
                },
            );
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            const data = unwrapData<Partial<RoutePlan>[]>(await response.json()).map((item) =>
                normalizePlan(item, mapID),
            );
            setPlans(data);
            setCurrentPlan(data[0] || null);
            setFeedAmount(data[0]?.feedAmount || 500);
            setSelectedTargetIDs(new Set(data[0]?.targetIslandIDs || []));
        },
        [apiBase],
    );

    const loadMap = useCallback(
        async (mapID: string) => {
            const response = await fetch(
                apiUrl(apiBase, `/api/maps/${encodeURIComponent(mapID)}`),
                {
                    credentials: "same-origin",
                },
            );
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            const data = normalizeMap(unwrapData<Partial<MapConfig>>(await response.json()));
            setMapConfig(data);
            await loadPlans(data.mapID);
            setMessage(`已选择 ${data.name || data.mapID}`);
        },
        [apiBase, loadPlans],
    );

    const loadMaps = useCallback(async () => {
        const response = await fetch(apiUrl(apiBase, "/api/maps"), { credentials: "same-origin" });
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        const data = unwrapData<Partial<MapConfig>[]>(await response.json()).map(normalizeMap);
        setMaps(data);
        if (data[0]?.mapID) {
            await loadMap(data[0].mapID);
        }
    }, [apiBase, loadMap]);

    const refreshVehicles = useCallback(async () => {
        const response = await fetch(apiUrl(apiBase, "/api/webget"), {
            credentials: "same-origin",
        });
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        const data = normalizeVehicles(await response.json());
        setVehicles(data);
        if (!data.some((vehicle) => vehicle.deviceID === deviceID) && data[0]) {
            setDeviceID(data[0].deviceID);
        }
    }, [apiBase, deviceID]);

    useEffect(() => {
        void loadMaps().catch((error) => setMessage(String(error)));
    }, [loadMaps]);

    useEffect(() => {
        void refreshVehicles().catch(() => undefined);
        const timer = window.setInterval(
            () => void refreshVehicles().catch(() => undefined),
            2_000,
        );
        return () => window.clearInterval(timer);
    }, [refreshVehicles]);

    const selectedVehicle = useMemo(
        () => vehicles.find((vehicle) => vehicle.deviceID === deviceID) || vehicles[0] || null,
        [deviceID, vehicles],
    );

    const zoneIDs = useMemo(
        () => [...new Set((mapConfig?.islands || []).map((island) => island.zoneID))].sort(),
        [mapConfig?.islands],
    );

    const sortedIslands = useMemo(
        () =>
            [...(mapConfig?.islands || [])].sort((a, b) => {
                const zone = a.zoneID.localeCompare(b.zoneID, undefined, { numeric: true });
                if (zone !== 0) {
                    return zone;
                }
                const aNumber = idNumber(a.id);
                const bNumber = idNumber(b.id);
                if (Number.isFinite(aNumber) && Number.isFinite(bNumber)) {
                    return aNumber - bNumber;
                }
                return a.id.localeCompare(b.id, undefined, { numeric: true });
            }),
        [mapConfig?.islands],
    );

    const selectedIslands = useMemo(
        () => sortedIslands.filter((island) => selectedTargetIDs.has(island.id)),
        [selectedTargetIDs, sortedIslands],
    );

    const previewPath = useMemo(() => {
        if (!mapConfig || selectedIslands.length === 0) {
            return [];
        }
        return buildGeneratedPath(mapConfig, selectedIslands, selectedVehicle, feedAmount);
    }, [feedAmount, mapConfig, selectedIslands, selectedVehicle]);

    const routeStatus = useMemo(() => {
        if (!mapConfig) {
            return "请选择地图";
        }
        if (!currentPlan) {
            return "请选择路线方案";
        }
        if (selectedTargetIDs.size === 0) {
            return "请选择目标犊牛岛";
        }
        if (mapConfig.roadGraph.nodes.length === 0 || mapConfig.roadGraph.edges.length === 0) {
            return "当前地图没有通道路线，无法生成沿路路径";
        }
        if (previewPath.length === 0) {
            return "无法沿通道到达目标，请检查通道是否连通并靠近目标岛";
        }
        return `已生成沿通道行驶路径 ${previewPath.length} 个点`;
    }, [currentPlan, mapConfig, previewPath.length, selectedTargetIDs.size]);

    async function submitTask(): Promise<void> {
        if (!mapConfig || !currentPlan) {
            setMessage("请先选择地图和路线方案");
            return;
        }
        if (selectedTargetIDs.size === 0) {
            setMessage("请先选择目标犊牛岛");
            return;
        }
        if (previewPath.length === 0) {
            setMessage("无法生成沿通道的可下发路径，请检查通道路线和目标岛");
            return;
        }
        const taskPlan = {
            ...currentPlan,
            robotPath: previewPath,
            targetIslandIDs: [...selectedTargetIDs],
        };
        const payload = createTaskPayload(
            mapConfig,
            taskPlan,
            previewPath,
            deviceID,
            feedAmount,
            taskName,
        );
        const response = await fetch(apiUrl(apiBase, "/api/pathSettings"), {
            body: JSON.stringify(payload),
            credentials: "same-origin",
            headers: { "Content-Type": "application/json" },
            method: "POST",
        });
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        setMessage(`已下发到 ${deviceID}`);
    }

    const imageSrc = mapConfig ? mapImageSrc(mapConfig, apiBase, imageVersion) : "";
    const activeCalibration =
        mapConfig && hasCalibration(mapConfig.calibration) ? mapConfig.calibration : null;

    function zoneIslandIDs(zoneID: string): string[] {
        return sortedIslands
            .filter((island) => island.zoneID === zoneID)
            .map((island) => island.id);
    }

    function isZoneFullySelected(zoneID: string): boolean {
        const ids = zoneIslandIDs(zoneID);
        return ids.length > 0 && ids.every((id) => selectedTargetIDs.has(id));
    }

    function toggleZoneSelection(zoneID: string): void {
        const ids = zoneIslandIDs(zoneID);
        if (ids.length === 0) {
            setMessage(`${zoneID}区没有犊牛岛`);
            return;
        }
        const next = new Set(selectedTargetIDs);
        if (ids.every((id) => next.has(id))) {
            ids.forEach((id) => next.delete(id));
        } else {
            ids.forEach((id) => next.add(id));
        }
        setSelectedTargetIDs(next);
    }

    function selectRange(): void {
        const startZone = rangeStart.match(/^[A-Z]+/i)?.[0]?.toUpperCase();
        const endZone = rangeEnd.match(/^[A-Z]+/i)?.[0]?.toUpperCase();
        const start = idNumber(rangeStart);
        const end = idNumber(rangeEnd);
        if (
            !startZone ||
            startZone !== endZone ||
            !Number.isFinite(start) ||
            !Number.isFinite(end)
        ) {
            setMessage("范围格式需要类似 A1 到 A10，且必须在同一区域");
            return;
        }
        const min = Math.min(start, end);
        const max = Math.max(start, end);
        const next = new Set(selectedTargetIDs);
        sortedIslands
            .filter(
                (island) =>
                    island.zoneID === startZone &&
                    idNumber(island.id) >= min &&
                    idNumber(island.id) <= max,
            )
            .forEach((island) => next.add(island.id));
        setSelectedTargetIDs(next);
    }

    return (
        <LayoutContent fixed className="h-[calc(100vh-4rem)]">
            <div className="ops-workspace grid h-full grid-cols-[minmax(0,1fr)_400px] text-slate-100 max-xl:grid-cols-1">
                <main className="ops-map-surface relative min-h-[620px] overflow-hidden border-r border-white/10 bg-slate-950">
                    <div className="ops-toolbar absolute left-4 top-4 z-20 rounded-md border border-white/10 bg-slate-900/90 px-3 py-2 text-sm">
                        路径点 {previewPath.length} · 目标岛 {selectedTargetIDs.size}
                    </div>
                    <div
                        className="absolute left-8 top-16 origin-top-left"
                        style={{ transform: "scale(0.72)" }}
                    >
                        {imageSrc ? (
                            <img
                                alt="feeding task map"
                                className="block max-w-none select-none"
                                draggable={false}
                                src={imageSrc}
                                style={{ height: imageSize.height, width: imageSize.width }}
                                onLoad={(event) =>
                                    setImageSize({
                                        height: event.currentTarget.naturalHeight,
                                        width: event.currentTarget.naturalWidth,
                                    })
                                }
                            />
                        ) : (
                            <div
                                className="grid place-items-center border border-dashed border-slate-600 bg-slate-900 text-sm text-slate-400"
                                style={{ height: imageSize.height, width: imageSize.width }}
                            >
                                请选择带平面图的地图
                            </div>
                        )}
                        {mapConfig && (
                            <svg
                                className="absolute left-0 top-0 overflow-visible"
                                height={imageSize.height}
                                width={imageSize.width}
                                xmlns="http://www.w3.org/2000/svg"
                            >
                                <defs>
                                    <marker
                                        id="feeding-route-arrow"
                                        markerHeight="5"
                                        markerUnits="strokeWidth"
                                        markerWidth="5"
                                        orient="auto"
                                        refX="4.5"
                                        refY="2.5"
                                        viewBox="0 0 5 5"
                                    >
                                        <path d="M 0 0 L 5 2.5 L 0 5 z" fill="#f97316" />
                                    </marker>
                                </defs>
                                {mapConfig.roadGraph.edges.map((edge) => {
                                    const from = mapConfig.roadGraph.nodes.find(
                                        (node) => node.id === edge.from,
                                    );
                                    const to = mapConfig.roadGraph.nodes.find(
                                        (node) => node.id === edge.to,
                                    );
                                    if (!from || !to) {
                                        return null;
                                    }
                                    const fromPx = realToPixel(from, activeCalibration);
                                    const toPx = realToPixel(to, activeCalibration);
                                    return (
                                        <line
                                            key={edge.id}
                                            stroke={
                                                edge.type === "robot"
                                                    ? "#f97316"
                                                    : edge.type === "main"
                                                      ? "#22d3ee"
                                                      : "#a78bfa"
                                            }
                                            strokeLinecap="round"
                                            strokeWidth={edge.type === "robot" ? 5 : 4}
                                            x1={fromPx.px}
                                            x2={toPx.px}
                                            y1={fromPx.py}
                                            y2={toPx.py}
                                        />
                                    );
                                })}
                                {mapConfig.islands.map((island) => {
                                    const center = realToPixel(island.center, activeCalibration);
                                    const target = selectedTargetIDs.has(island.id);
                                    return (
                                        <g key={island.id}>
                                            <circle
                                                cx={center.px}
                                                cy={center.py}
                                                fill={target ? "#f97316" : "#22c55e"}
                                                r={8}
                                                stroke="#020617"
                                                strokeWidth={2}
                                            />
                                            <text
                                                fill="#0f172a"
                                                fontSize={14}
                                                fontWeight={700}
                                                paintOrder="stroke"
                                                stroke="#ffffff"
                                                strokeWidth={4}
                                                x={center.px + 10}
                                                y={center.py - 8}
                                            >
                                                {island.id}
                                            </text>
                                        </g>
                                    );
                                })}
                                {previewPath.length > 1 && (
                                    <g>
                                        <polyline
                                            fill="none"
                                            points={previewPath
                                                .map((point) =>
                                                    realToPixel(point, activeCalibration),
                                                )
                                                .map((point) => `${point.px},${point.py}`)
                                                .join(" ")}
                                            stroke="rgba(249, 115, 22, 0.24)"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={7}
                                        />
                                        {previewPath.slice(1).map((point, index) => {
                                            const from = realToPixel(
                                                previewPath[index],
                                                activeCalibration,
                                            );
                                            const to = realToPixel(point, activeCalibration);
                                            return (
                                                <line
                                                    key={`${point.seq}-${index}`}
                                                    markerEnd="url(#feeding-route-arrow)"
                                                    stroke="#f97316"
                                                    strokeLinecap="round"
                                                    strokeWidth={3}
                                                    x1={from.px}
                                                    x2={to.px}
                                                    y1={from.py}
                                                    y2={to.py}
                                                />
                                            );
                                        })}
                                    </g>
                                )}
                                {vehicles.map((vehicle) => {
                                    if (vehicle.location_x == null || vehicle.location_y == null) {
                                        return null;
                                    }
                                    const point = realToPixel(
                                        { x: vehicle.location_x, y: vehicle.location_y },
                                        activeCalibration,
                                    );
                                    const online = isVehicleOnline(vehicle);
                                    return (
                                        <g key={vehicle.deviceID}>
                                            <circle
                                                cx={point.px}
                                                cy={point.py}
                                                fill={online ? "#22d3ee" : "#64748b"}
                                                r={10}
                                                stroke="#020617"
                                                strokeWidth={2}
                                            />
                                            <text
                                                fill="#0f172a"
                                                fontSize={13}
                                                fontWeight={700}
                                                paintOrder="stroke"
                                                stroke="#ffffff"
                                                strokeWidth={4}
                                                x={point.px + 12}
                                                y={point.py + 4}
                                            >
                                                {vehicle.deviceID}
                                            </text>
                                        </g>
                                    );
                                })}
                            </svg>
                        )}
                    </div>
                </main>

                <aside className="flex min-h-0 flex-col gap-3 overflow-y-auto bg-slate-900 p-4">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <h1 className="text-lg font-semibold">投喂任务</h1>
                            <div className="mt-1 text-xs text-slate-400">
                                选择地图、路线方案和目标岛，系统沿已标定通道生成任务路径
                            </div>
                        </div>
                        <button
                            className="rounded-md bg-cyan-400 p-2 text-slate-950 hover:bg-cyan-300"
                            title="刷新"
                            type="button"
                            onClick={() =>
                                void loadMaps().catch((error) => setMessage(String(error)))
                            }
                        >
                            <RefreshCwIcon className="h-4 w-4" />
                        </button>
                    </div>

                    <section className="grid gap-3 rounded-md border border-white/10 bg-slate-950 p-3">
                        <label className="grid gap-1 text-sm">
                            <span className="text-xs text-slate-500">地图</span>
                            <select
                                className="rounded-md border border-white/10 bg-slate-900 px-3 py-2"
                                value={mapConfig?.mapID || ""}
                                onChange={(event) =>
                                    void loadMap(event.target.value).catch((error) =>
                                        setMessage(String(error)),
                                    )
                                }
                            >
                                <option value="">选择地图</option>
                                {maps.map((item) => (
                                    <option key={item.mapID} value={item.mapID}>
                                        {item.name || item.mapID}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label className="grid gap-1 text-sm">
                            <span className="text-xs text-slate-500">路线方案</span>
                            <select
                                className="rounded-md border border-white/10 bg-slate-900 px-3 py-2"
                                value={currentPlan?.planID || ""}
                                onChange={(event) => {
                                    const plan =
                                        plans.find((item) => item.planID === event.target.value) ||
                                        null;
                                    setCurrentPlan(plan);
                                    setFeedAmount(plan?.feedAmount || 500);
                                    setSelectedTargetIDs(new Set(plan?.targetIslandIDs || []));
                                }}
                            >
                                <option value="">选择路线方案</option>
                                {plans.map((plan) => (
                                    <option key={plan.planID} value={plan.planID}>
                                        {plan.name || plan.planID}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <details className="rounded-md border border-white/10 bg-slate-900 px-3 py-2 text-sm">
                            <summary className="cursor-pointer text-xs font-medium text-slate-500">
                                高级接口设置
                            </summary>
                            <label className="mt-3 grid gap-1">
                                <span className="text-xs text-slate-500">API Base</span>
                                <input
                                    className="rounded-md border border-white/10 bg-slate-900 px-3 py-2"
                                    value={apiBase}
                                    onChange={(event) => setApiBase(event.target.value)}
                                />
                            </label>
                        </details>
                    </section>

                    <section className="grid gap-3 rounded-md border border-white/10 bg-slate-950 p-3">
                        <div>
                            <div className="text-sm font-medium">目标犊牛岛</div>
                            <div className="mt-1 text-xs text-slate-500">
                                目标岛只表示要投喂的“房子”，车辆路径会吸附到最近通道，并沿已画通道最短路行驶。
                            </div>
                        </div>
                        <div className="grid grid-cols-[1fr_1fr_auto] gap-2 text-sm">
                            <input
                                className="rounded-md border border-white/10 bg-slate-900 px-3 py-2"
                                placeholder="起点，如 A1"
                                value={rangeStart}
                                onChange={(event) =>
                                    setRangeStart(event.target.value.toUpperCase())
                                }
                            />
                            <input
                                className="rounded-md border border-white/10 bg-slate-900 px-3 py-2"
                                placeholder="终点，如 A10"
                                value={rangeEnd}
                                onChange={(event) => setRangeEnd(event.target.value.toUpperCase())}
                            />
                            <button
                                className="rounded-md bg-slate-800 px-3 py-2 hover:bg-slate-700"
                                type="button"
                                onClick={selectRange}
                            >
                                选择范围
                            </button>
                        </div>
                        <div className="grid gap-2">
                            <div className="text-xs text-slate-500">区域全部（可多选）</div>
                            <div className="flex flex-wrap gap-2">
                                {zoneIDs.length === 0 && (
                                    <span className="text-xs text-slate-400">
                                        当前地图还没有犊牛岛
                                    </span>
                                )}
                                {zoneIDs.map((zone) => {
                                    const active = isZoneFullySelected(zone);
                                    return (
                                        <button
                                            key={zone}
                                            className={`rounded-md px-2 py-1 text-xs ${
                                                active
                                                    ? "bg-cyan-400 text-slate-950"
                                                    : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                                            }`}
                                            type="button"
                                            onClick={() => toggleZoneSelection(zone)}
                                        >
                                            {zone}区全部
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                        <div className="max-h-32 overflow-auto rounded-md bg-slate-900 p-2">
                            <div className="flex flex-wrap gap-2">
                                {sortedIslands.map((island) => {
                                    const active = selectedTargetIDs.has(island.id);
                                    return (
                                        <button
                                            key={island.id}
                                            className={`rounded-md px-2 py-1 text-xs ${
                                                active
                                                    ? "bg-cyan-400 text-slate-950"
                                                    : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                                            }`}
                                            type="button"
                                            onClick={() => {
                                                const next = new Set(selectedTargetIDs);
                                                if (next.has(island.id)) {
                                                    next.delete(island.id);
                                                } else {
                                                    next.add(island.id);
                                                }
                                                setSelectedTargetIDs(next);
                                            }}
                                        >
                                            {island.id}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                        <div className="flex items-center justify-between gap-2 text-xs text-slate-400">
                            <span>{routeStatus}</span>
                            <button
                                className="rounded-md bg-slate-800 px-2 py-1 hover:bg-slate-700 disabled:opacity-40"
                                disabled={selectedTargetIDs.size === 0}
                                type="button"
                                onClick={() => setSelectedTargetIDs(new Set())}
                            >
                                清空目标
                            </button>
                        </div>
                    </section>

                    <section className="grid gap-3 rounded-md border border-white/10 bg-slate-950 p-3">
                        <div className="flex items-center gap-2 text-sm font-medium">
                            <CarIcon className="h-4 w-4 text-cyan-300" />
                            车辆与投喂
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <label className="grid gap-1 text-xs text-slate-500">
                                车辆 ID
                                <input
                                    className="rounded-md border border-white/10 bg-slate-900 px-3 py-2 text-sm"
                                    value={deviceID}
                                    onChange={(event) => setDeviceID(event.target.value)}
                                />
                            </label>
                            <label className="grid gap-1 text-xs text-slate-500">
                                投喂量 ml
                                <input
                                    className="rounded-md border border-white/10 bg-slate-900 px-3 py-2 text-sm"
                                    type="number"
                                    value={feedAmount}
                                    onChange={(event) =>
                                        setFeedAmount(Number(event.target.value) || 0)
                                    }
                                />
                            </label>
                        </div>
                        <label className="grid gap-1 text-xs text-slate-500">
                            任务名称
                            <input
                                className="rounded-md border border-white/10 bg-slate-900 px-3 py-2 text-sm"
                                value={taskName}
                                onChange={(event) => setTaskName(event.target.value)}
                            />
                        </label>
                        <button
                            className="inline-flex items-center justify-center gap-2 rounded-md bg-cyan-400 px-3 py-2 text-sm font-medium text-slate-950 hover:bg-cyan-300"
                            type="button"
                            onClick={() =>
                                void submitTask().catch((error) => setMessage(String(error)))
                            }
                        >
                            <SendIcon className="h-4 w-4" />
                            下发投喂任务
                        </button>
                        <div className="text-xs text-slate-400">{message}</div>
                    </section>

                    <section className="grid gap-3 rounded-md border border-white/10 bg-slate-950 p-3">
                        <div className="flex items-center gap-2 text-sm font-medium">
                            <RouteIcon className="h-4 w-4 text-cyan-300" />
                            当前方案
                        </div>
                        <div className="text-xs text-slate-400">
                            地图 {mapConfig?.name || "-"} · 方案 {currentPlan?.name || "-"}
                        </div>
                        <div className="text-xs text-slate-400">
                            目标岛 {[...selectedTargetIDs].join(", ") || "-"}
                        </div>
                        <div className="text-xs text-slate-400">{routeStatus}</div>
                        <ol className="max-h-40 overflow-auto rounded-md bg-slate-900 p-2 text-xs text-slate-400">
                            {previewPath.map((point) => (
                                <li key={`${point.seq}-${point.x}-${point.y}`}>
                                    {point.seq}. {point.action}{" "}
                                    {point.targetIslandID || point.nodeID || ""} (
                                    {point.x.toFixed(2)}, {point.y.toFixed(2)})
                                </li>
                            ))}
                        </ol>
                    </section>

                    <section className="grid gap-2 rounded-md border border-white/10 bg-slate-950 p-3 text-xs text-slate-400">
                        <div className="text-sm font-medium text-slate-200">在线车辆</div>
                        {vehicles.map((vehicle) => (
                            <button
                                key={vehicle.deviceID}
                                className="rounded-md bg-slate-900 p-2 text-left hover:bg-slate-800"
                                type="button"
                                onClick={() => setDeviceID(vehicle.deviceID)}
                            >
                                <div className="flex items-center justify-between">
                                    <span>{vehicle.deviceID}</span>
                                    <span
                                        className={
                                            isVehicleOnline(vehicle)
                                                ? "text-cyan-300"
                                                : "text-slate-500"
                                        }
                                    >
                                        {isVehicleOnline(vehicle) ? "在线" : "离线"}
                                    </span>
                                </div>
                                <div>
                                    牛奶 {formatMl(vehicle.milkRemainingMl, vehicle.milkCapacityMl)}{" "}
                                    · 饮水{" "}
                                    {formatMl(vehicle.waterRemainingMl, vehicle.waterCapacityMl)}
                                </div>
                            </button>
                        ))}
                    </section>
                </aside>
            </div>
        </LayoutContent>
    );
};
