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

    const previewPath = useMemo(() => {
        if (!mapConfig || !currentPlan) {
            return [];
        }
        if (currentPlan.robotPath.length > 0) {
            return currentPlan.robotPath;
        }
        const selectedIslands = mapConfig.islands.filter((island) =>
            currentPlan.targetIslandIDs.includes(island.id),
        );
        return buildGeneratedPath(mapConfig, selectedIslands, selectedVehicle, feedAmount);
    }, [currentPlan, feedAmount, mapConfig, selectedVehicle]);

    async function submitTask(): Promise<void> {
        if (!mapConfig || !currentPlan) {
            setMessage("请先选择地图和路线方案");
            return;
        }
        if (previewPath.length === 0) {
            setMessage("当前路线方案没有可下发路径");
            return;
        }
        const payload = createTaskPayload(
            mapConfig,
            currentPlan,
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

    return (
        <LayoutContent fixed className="h-[calc(100vh-4rem)]">
            <div className="ops-workspace grid h-full grid-cols-[minmax(0,1fr)_400px] text-slate-100 max-xl:grid-cols-1">
                <main className="ops-map-surface relative min-h-[620px] overflow-hidden border-r border-white/10 bg-slate-950">
                    <div className="ops-toolbar absolute left-4 top-4 z-20 rounded-md border border-white/10 bg-slate-900/90 px-3 py-2 text-sm">
                        路径点 {previewPath.length} · 目标岛{" "}
                        {currentPlan?.targetIslandIDs.length || 0}
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
                                            stroke={edge.type === "main" ? "#3d6b56" : "#6b7280"}
                                            strokeLinecap="round"
                                            strokeWidth={4}
                                            x1={fromPx.px}
                                            x2={toPx.px}
                                            y1={fromPx.py}
                                            y2={toPx.py}
                                        />
                                    );
                                })}
                                {mapConfig.islands.map((island) => {
                                    const center = realToPixel(island.center, activeCalibration);
                                    const target = currentPlan?.targetIslandIDs.includes(island.id);
                                    return (
                                        <g key={island.id}>
                                            <circle
                                                cx={center.px}
                                                cy={center.py}
                                                fill={target ? "#9a6a2f" : "#3f7d55"}
                                                r={8}
                                                stroke="#1f2937"
                                                strokeWidth={2}
                                            />
                                            <text
                                                fill="#1f2937"
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
                                    <polyline
                                        fill="none"
                                        points={previewPath
                                            .map((point) => realToPixel(point, activeCalibration))
                                            .map((point) => `${point.px},${point.py}`)
                                            .join(" ")}
                                        stroke="#9a6a2f"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={6}
                                    />
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
                                                fill={online ? "#3d6b56" : "#9ca3af"}
                                                r={10}
                                                stroke="#1f2937"
                                                strokeWidth={2}
                                            />
                                            <text
                                                fill="#1f2937"
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
                                选择路径规划生成的地图和路线方案后下发
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
                            目标岛 {(currentPlan?.targetIslandIDs || []).join(", ") || "-"}
                        </div>
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
