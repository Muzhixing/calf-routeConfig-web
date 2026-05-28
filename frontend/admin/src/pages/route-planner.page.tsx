import { environment } from "@helpers/environment.ts";
import {
    BoxSelectIcon,
    CarIcon,
    CheckIcon,
    CrosshairIcon,
    MapIcon,
    MousePointer2Icon,
    MoveIcon,
    PlusIcon,
    RefreshCwIcon,
    RouteIcon,
    SaveIcon,
    SendIcon,
    TargetIcon,
    Trash2Icon,
    UploadIcon,
    WaypointsIcon,
} from "lucide-react";
import {
    type ChangeEvent,
    type FC,
    type MouseEvent,
    type WheelEvent,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import { LayoutContent } from "@/components/layout/layout.content.tsx";

type RealPoint = {
    x: number;
    y: number;
};

type PixelPoint = {
    px: number;
    py: number;
};

type CalibrationPoint = PixelPoint & RealPoint;

type Calibration = {
    p1: CalibrationPoint;
    p2: CalibrationPoint;
};

type Zone = {
    id: string;
    name: string;
    polygon: RealPoint[];
};

type Island = {
    center: RealPoint;
    id: string;
    servicePoint: RealPoint;
    zoneID: string;
};

type RoadNode = RealPoint & {
    id: string;
};

type RoadEdge = {
    from: string;
    id: string;
    to: string;
    type: "inner" | "main";
};

type RoadGraph = {
    edges: RoadEdge[];
    nodes: RoadNode[];
};

type MapConfig = {
    calibration: Calibration | null;
    imageUrl?: string;
    islands: Island[];
    mapID: string;
    roadGraph: RoadGraph;
    zones: Zone[];
};

type VehicleStatus = {
    currentSeq?: number;
    deviceID: string;
    lastOnlineTime?: string;
    location_x?: number;
    location_y?: number;
    milkCapacityMl?: number;
    milkRemainingMl?: number;
    serverReceivedAt?: string;
    status?: boolean;
    stm32State?: string;
    taskID?: string;
    taskState?: string;
    waterCapacityMl?: number;
    waterRemainingMl?: number;
};

type Mode = "calibrate" | "island" | "pan" | "road" | "select" | "service" | "zone";

type GeneratedPoint = RealPoint & {
    action: "feed" | "pass" | "start";
    feedAmount?: number;
    nodeID?: string;
    seq: number;
    targetIslandID?: string;
};

type DragState =
    | {
          clientX: number;
          clientY: number;
          moved: boolean;
          startClientX: number;
          startClientY: number;
          startOffsetX: number;
          startOffsetY: number;
          type: "pan";
      }
    | {
          clientX: number;
          clientY: number;
          startPx: number;
          startPy: number;
          type: "select";
      }
    | null;

type SelectionRect = {
    endPx: number;
    endPy: number;
    startPx: number;
    startPy: number;
};

const EMPTY_CALIBRATION: Calibration = {
    p1: { px: 0, py: 0, x: 0, y: 0 },
    p2: { px: 0, py: 0, x: 50, y: 30 },
};

const DEFAULT_MAP: MapConfig = {
    calibration: null,
    islands: [],
    mapID: "calf-map-001",
    roadGraph: { edges: [], nodes: [] },
    zones: [],
};

const MODE_OPTIONS: { icon: typeof MoveIcon; label: string; value: Mode }[] = [
    { icon: MoveIcon, label: "平移", value: "pan" },
    { icon: CrosshairIcon, label: "标定", value: "calibrate" },
    { icon: MapIcon, label: "区域", value: "zone" },
    { icon: TargetIcon, label: "犊牛岛", value: "island" },
    { icon: MousePointer2Icon, label: "服务点", value: "service" },
    { icon: WaypointsIcon, label: "通道", value: "road" },
    { icon: BoxSelectIcon, label: "选择", value: "select" },
];

function apiUrl(baseUrl: string, path: string): string {
    const base = baseUrl.replace(/\/$/, "");
    return base ? `${base}${path}` : path;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function unwrapData<T>(payload: unknown): T {
    return isRecord(payload) && "data" in payload ? (payload.data as T) : (payload as T);
}

function toNumber(value: unknown, fallback = 0): number {
    if (typeof value === "number" && Number.isFinite(value)) {
        return value;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function toOptionalNumber(value: unknown): number | undefined {
    const parsed = toNumber(value, Number.NaN);
    return Number.isFinite(parsed) ? parsed : undefined;
}

function toStringValue(value: unknown, fallback = ""): string {
    return typeof value === "string" && value.trim() ? value : fallback;
}

function normalizeMap(raw: Partial<MapConfig> | null | undefined): MapConfig {
    const roadGraph = raw?.roadGraph || DEFAULT_MAP.roadGraph;
    return {
        calibration: raw?.calibration || null,
        imageUrl: raw?.imageUrl,
        islands: Array.isArray(raw?.islands) ? raw.islands : [],
        mapID: raw?.mapID || DEFAULT_MAP.mapID,
        roadGraph: {
            edges: Array.isArray(roadGraph.edges) ? roadGraph.edges : [],
            nodes: Array.isArray(roadGraph.nodes) ? roadGraph.nodes : [],
        },
        zones: Array.isArray(raw?.zones) ? raw.zones : [],
    };
}

function normalizeVehicle(raw: unknown): VehicleStatus | null {
    if (!isRecord(raw)) {
        return null;
    }
    const deviceID = toStringValue(raw.deviceID, "");
    if (!deviceID) {
        return null;
    }
    return {
        currentSeq: toOptionalNumber(raw.currentSeq),
        deviceID,
        lastOnlineTime: toStringValue(raw.lastOnlineTime, undefined),
        location_x: toOptionalNumber(raw.location_x),
        location_y: toOptionalNumber(raw.location_y),
        milkCapacityMl: toOptionalNumber(raw.milkCapacityMl),
        milkRemainingMl: toOptionalNumber(raw.milkRemainingMl),
        serverReceivedAt: toStringValue(raw.serverReceivedAt, undefined),
        status: raw.status === true || raw.status === "true",
        stm32State: toStringValue(raw.stm32State, undefined),
        taskID: toStringValue(raw.taskID, undefined),
        taskState: toStringValue(raw.taskState, undefined),
        waterCapacityMl: toOptionalNumber(raw.waterCapacityMl),
        waterRemainingMl: toOptionalNumber(raw.waterRemainingMl),
    };
}

function normalizeVehicles(raw: unknown): VehicleStatus[] {
    const data = unwrapData<unknown>(raw);
    const list = Array.isArray(data) ? data : data ? [data] : [];
    return list.map(normalizeVehicle).filter((item): item is VehicleStatus => item !== null);
}

function hasCalibration(calibration: Calibration | null): calibration is Calibration {
    if (!calibration) {
        return false;
    }
    return (
        Math.abs(calibration.p2.px - calibration.p1.px) > 1 &&
        Math.abs(calibration.p2.py - calibration.p1.py) > 1 &&
        Math.abs(calibration.p2.x - calibration.p1.x) > 0.0001 &&
        Math.abs(calibration.p2.y - calibration.p1.y) > 0.0001
    );
}

function pixelToReal(point: PixelPoint, calibration: Calibration | null): RealPoint {
    if (!hasCalibration(calibration)) {
        return { x: point.px, y: point.py };
    }
    const scaleX = (calibration.p2.x - calibration.p1.x) / (calibration.p2.px - calibration.p1.px);
    const scaleY = (calibration.p2.y - calibration.p1.y) / (calibration.p2.py - calibration.p1.py);
    return {
        x: roundMeter(calibration.p1.x + (point.px - calibration.p1.px) * scaleX),
        y: roundMeter(calibration.p1.y + (point.py - calibration.p1.py) * scaleY),
    };
}

function realToPixel(point: RealPoint, calibration: Calibration | null): PixelPoint {
    if (!hasCalibration(calibration)) {
        return { px: point.x, py: point.y };
    }
    const scaleX = (calibration.p2.x - calibration.p1.x) / (calibration.p2.px - calibration.p1.px);
    const scaleY = (calibration.p2.y - calibration.p1.y) / (calibration.p2.py - calibration.p1.py);
    return {
        px: calibration.p1.px + (point.x - calibration.p1.x) / scaleX,
        py: calibration.p1.py + (point.y - calibration.p1.y) / scaleY,
    };
}

function roundMeter(value: number): number {
    return Number(value.toFixed(3));
}

function distance(a: RealPoint, b: RealPoint): number {
    return Math.hypot(a.x - b.x, a.y - b.y);
}

function isVehicleOnline(vehicle: VehicleStatus): boolean {
    if (vehicle.status !== true) {
        return false;
    }
    const time = Date.parse(vehicle.serverReceivedAt || vehicle.lastOnlineTime || "");
    return Number.isFinite(time) && Date.now() - time <= 10_000;
}

function nodeMap(graph: RoadGraph): Map<string, RoadNode> {
    return new Map(graph.nodes.map((node) => [node.id, node]));
}

function findNearestNode(graph: RoadGraph, point: RealPoint): RoadNode | null {
    return graph.nodes.reduce<RoadNode | null>((nearest, node) => {
        if (!nearest) {
            return node;
        }
        return distance(node, point) < distance(nearest, point) ? node : nearest;
    }, null);
}

function shortestNodePath(graph: RoadGraph, startId: string, endId: string): string[] {
    if (startId === endId) {
        return [startId];
    }
    const nodes = nodeMap(graph);
    const adjacency = new Map<string, { id: string; weight: number }[]>();
    graph.nodes.forEach((node) => adjacency.set(node.id, []));
    graph.edges.forEach((edge) => {
        const from = nodes.get(edge.from);
        const to = nodes.get(edge.to);
        if (!from || !to) {
            return;
        }
        const weight = distance(from, to);
        adjacency.get(edge.from)?.push({ id: edge.to, weight });
        adjacency.get(edge.to)?.push({ id: edge.from, weight });
    });

    const dist = new Map<string, number>();
    const prev = new Map<string, string>();
    const unvisited = new Set(graph.nodes.map((node) => node.id));
    graph.nodes.forEach((node) => dist.set(node.id, Number.POSITIVE_INFINITY));
    dist.set(startId, 0);

    while (unvisited.size > 0) {
        let current: string | null = null;
        unvisited.forEach((id) => {
            if (
                current === null ||
                (dist.get(id) || Number.POSITIVE_INFINITY) <
                    (dist.get(current) || Number.POSITIVE_INFINITY)
            ) {
                current = id;
            }
        });
        if (current === null || current === endId) {
            break;
        }
        unvisited.delete(current);
        adjacency.get(current)?.forEach((next) => {
            if (!unvisited.has(next.id)) {
                return;
            }
            const candidate = (dist.get(current as string) || 0) + next.weight;
            if (candidate < (dist.get(next.id) || Number.POSITIVE_INFINITY)) {
                dist.set(next.id, candidate);
                prev.set(next.id, current as string);
            }
        });
    }

    if (!prev.has(endId) && startId !== endId) {
        return [startId, endId];
    }
    const path = [endId];
    let cursor = endId;
    while (cursor !== startId) {
        const previous = prev.get(cursor);
        if (!previous) {
            return [startId, endId];
        }
        path.unshift(previous);
        cursor = previous;
    }
    return path;
}

function pathDistance(graph: RoadGraph, startId: string, endId: string): number {
    const nodes = nodeMap(graph);
    const path = shortestNodePath(graph, startId, endId);
    return path.slice(1).reduce((sum, id, index) => {
        const from = nodes.get(path[index]);
        const to = nodes.get(id);
        return from && to ? sum + distance(from, to) : sum;
    }, 0);
}

function nextIslandID(current: string): string {
    const match = current.match(/^([A-Z]+)(\d+)$/i);
    if (!match) {
        return current;
    }
    return `${match[1].toUpperCase()}${Number(match[2]) + 1}`;
}

function idNumber(id: string): number {
    const match = id.match(/(\d+)$/);
    return match ? Number(match[1]) : Number.NaN;
}

function formatMl(current?: number, capacity?: number): string {
    if (current == null && capacity == null) {
        return "-";
    }
    if (capacity == null) {
        return `${current || 0} ml`;
    }
    return `${current || 0}/${capacity} ml`;
}

function createTaskPayload(
    mapConfig: MapConfig,
    points: GeneratedPoint[],
    deviceID: string,
    selectedIslandIDs: string[],
): Record<string, unknown> {
    return {
        deviceID,
        gridScaleM: 1,
        mapID: mapConfig.mapID,
        robotPath: points.map((point) => ({
            action: point.action,
            feedAmount: point.feedAmount,
            nodeID: point.nodeID,
            seq: point.seq,
            targetIslandID: point.targetIslandID,
            x: roundMeter(point.x),
            y: roundMeter(point.y),
        })),
        targetIslandIDs: selectedIslandIDs,
        taskID: `task-${Date.now()}`,
    };
}

function appendUnique(points: GeneratedPoint[], point: Omit<GeneratedPoint, "seq">): void {
    const last = points[points.length - 1];
    if (last && distance(last, point) < 0.001 && last.action === point.action) {
        return;
    }
    points.push({ ...point, seq: points.length + 1 });
}

function buildGeneratedPath(
    mapConfig: MapConfig,
    selectedIslands: Island[],
    vehicle: VehicleStatus | null,
    feedAmount: number,
): GeneratedPoint[] {
    if (selectedIslands.length === 0) {
        return [];
    }

    const startPoint =
        vehicle?.location_x != null && vehicle.location_y != null
            ? { x: vehicle.location_x, y: vehicle.location_y }
            : mapConfig.roadGraph.nodes[0] || selectedIslands[0].servicePoint;
    const points: GeneratedPoint[] = [];
    appendUnique(points, {
        action: "start",
        x: roundMeter(startPoint.x),
        y: roundMeter(startPoint.y),
    });

    if (mapConfig.roadGraph.nodes.length === 0) {
        selectedIslands.forEach((island) => {
            appendUnique(points, {
                action: "feed",
                feedAmount,
                targetIslandID: island.id,
                x: island.servicePoint.x,
                y: island.servicePoint.y,
            });
        });
        return points;
    }

    const nodes = nodeMap(mapConfig.roadGraph);
    let currentNode = findNearestNode(mapConfig.roadGraph, startPoint);
    if (currentNode) {
        appendUnique(points, {
            action: "pass",
            nodeID: currentNode.id,
            x: currentNode.x,
            y: currentNode.y,
        });
    }
    const remaining = [...selectedIslands];
    while (remaining.length > 0 && currentNode) {
        let bestIndex = 0;
        let bestScore = Number.POSITIVE_INFINITY;
        remaining.forEach((island, index) => {
            const targetNode = findNearestNode(mapConfig.roadGraph, island.servicePoint);
            if (!targetNode) {
                return;
            }
            const score =
                pathDistance(mapConfig.roadGraph, currentNode?.id || targetNode.id, targetNode.id) +
                distance(targetNode, island.servicePoint);
            if (score < bestScore) {
                bestIndex = index;
                bestScore = score;
            }
        });

        const island = remaining.splice(bestIndex, 1)[0];
        const targetNode = findNearestNode(mapConfig.roadGraph, island.servicePoint);
        if (!targetNode) {
            appendUnique(points, {
                action: "feed",
                feedAmount,
                targetIslandID: island.id,
                x: island.servicePoint.x,
                y: island.servicePoint.y,
            });
            continue;
        }
        shortestNodePath(mapConfig.roadGraph, currentNode.id, targetNode.id).forEach((nodeId) => {
            const node = nodes.get(nodeId);
            if (node) {
                appendUnique(points, { action: "pass", nodeID: node.id, x: node.x, y: node.y });
            }
        });
        appendUnique(points, {
            action: "feed",
            feedAmount,
            targetIslandID: island.id,
            x: island.servicePoint.x,
            y: island.servicePoint.y,
        });
        currentNode = targetNode;
    }
    return points;
}

export const RoutePlannerPage: FC = () => {
    const fileRef = useRef<HTMLInputElement | null>(null);
    const viewportRef = useRef<HTMLDivElement | null>(null);
    const imageRef = useRef<HTMLImageElement | null>(null);
    const dragRef = useRef<DragState>(null);
    const roadCursorRef = useRef<string | null>(null);
    const [mapConfig, setMapConfig] = useState<MapConfig>(DEFAULT_MAP);
    const [calibrationDraft, setCalibrationDraft] = useState<Calibration>(EMPTY_CALIBRATION);
    const [calibrationClick, setCalibrationClick] = useState<"p1" | "p2">("p1");
    const [imageSize, setImageSize] = useState({ height: 900, width: 1400 });
    const [imageVersion, setImageVersion] = useState(0);
    const [apiBase, setApiBase] = useState(environment.apiHost || "");
    const [mode, setMode] = useState<Mode>("pan");
    const [offset, setOffset] = useState({ x: 24, y: 24 });
    const [zoom, setZoom] = useState(0.72);
    const [zoneID, setZoneID] = useState("A");
    const [zoneDraft, setZoneDraft] = useState<RealPoint[]>([]);
    const [islandID, setIslandID] = useState("A1");
    const [islandZoneID, setIslandZoneID] = useState("A");
    const [activeIslandID, setActiveIslandID] = useState("");
    const [roadEdgeType, setRoadEdgeType] = useState<"inner" | "main">("main");
    const [selectedIslandIDs, setSelectedIslandIDs] = useState<Set<string>>(new Set());
    const [selectionRect, setSelectionRect] = useState<SelectionRect | null>(null);
    const [vehicles, setVehicles] = useState<VehicleStatus[]>([]);
    const [hoveredVehicleID, setHoveredVehicleID] = useState<string | null>(null);
    const [deviceID, setDeviceID] = useState("robot001");
    const [feedAmount, setFeedAmount] = useState(500);
    const [rangeStart, setRangeStart] = useState("A1");
    const [rangeEnd, setRangeEnd] = useState("A10");
    const [generatedPath, setGeneratedPath] = useState<GeneratedPoint[]>([]);
    const [message, setMessage] = useState("等待地图配置");

    const activeCalibration = useMemo(
        () => (hasCalibration(calibrationDraft) ? calibrationDraft : null),
        [calibrationDraft],
    );
    const selectedIslands = useMemo(
        () => mapConfig.islands.filter((island) => selectedIslandIDs.has(island.id)),
        [mapConfig.islands, selectedIslandIDs],
    );
    const selectedVehicle = useMemo(
        () => vehicles.find((vehicle) => vehicle.deviceID === deviceID) || vehicles[0] || null,
        [deviceID, vehicles],
    );
    const imageSrc = mapConfig.imageUrl
        ? `${apiUrl(apiBase, mapConfig.imageUrl)}${mapConfig.imageUrl.includes("?") ? "&" : "?"}v=${imageVersion}`
        : "";

    const loadMap = useCallback(async () => {
        const response = await fetch(apiUrl(apiBase, "/api/maps/active"), {
            credentials: "same-origin",
        });
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        const data = normalizeMap(unwrapData<Partial<MapConfig>>(await response.json()));
        setMapConfig(data);
        setCalibrationDraft(data.calibration || EMPTY_CALIBRATION);
        setImageVersion(Date.now());
        setMessage("地图已加载");
    }, [apiBase]);

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
        void loadMap().catch((error) => setMessage(String(error)));
    }, [loadMap]);

    useEffect(() => {
        void refreshVehicles().catch(() => undefined);
        const timer = window.setInterval(() => {
            void refreshVehicles().catch(() => undefined);
        }, 2_000);
        return () => window.clearInterval(timer);
    }, [refreshVehicles]);

    function viewportPoint(clientX: number, clientY: number): PixelPoint | null {
        const viewport = viewportRef.current;
        if (!viewport) {
            return null;
        }
        const rect = viewport.getBoundingClientRect();
        return {
            px: (clientX - rect.left - offset.x) / zoom,
            py: (clientY - rect.top - offset.y) / zoom,
        };
    }

    function updateMap(mutator: (current: MapConfig) => MapConfig): void {
        setMapConfig((current) => mutator(normalizeMap(current)));
    }

    function setCalibrationPoint(which: "p1" | "p2", point: PixelPoint): void {
        setCalibrationDraft((current) => ({
            ...current,
            [which]: {
                ...current[which],
                px: Number(point.px.toFixed(1)),
                py: Number(point.py.toFixed(1)),
            },
        }));
        setCalibrationClick(which === "p1" ? "p2" : "p1");
    }

    function handleCanvasClick(point: PixelPoint): void {
        const real = pixelToReal(point, activeCalibration);
        if (mode === "calibrate") {
            setCalibrationPoint(calibrationClick, point);
            return;
        }
        if (mode === "zone") {
            setZoneDraft((items) => [...items, real]);
            return;
        }
        if (mode === "island") {
            if (!islandID.trim()) {
                setMessage("请填写犊牛岛编号");
                return;
            }
            const nextIsland: Island = {
                center: real,
                id: islandID.trim().toUpperCase(),
                servicePoint: real,
                zoneID: islandZoneID.trim().toUpperCase() || "A",
            };
            updateMap((current) => ({
                ...current,
                islands: [
                    ...current.islands.filter((item) => item.id !== nextIsland.id),
                    nextIsland,
                ],
            }));
            setActiveIslandID(nextIsland.id);
            setIslandID(nextIslandID(nextIsland.id));
            setMessage(`${nextIsland.id} 已标注`);
            return;
        }
        if (mode === "service") {
            const targetID = activeIslandID || mapConfig.islands[0]?.id;
            updateMap((current) => ({
                ...current,
                islands: current.islands.map((island) =>
                    island.id === targetID ? { ...island, servicePoint: real } : island,
                ),
            }));
            setMessage(targetID ? `${targetID} 服务点已更新` : "请先选择犊牛岛");
            return;
        }
        if (mode === "road") {
            addRoadPoint(real);
        }
    }

    function addRoadPoint(point: RealPoint): void {
        const graph = mapConfig.roadGraph;
        const nearest = findNearestNode(graph, point);
        const nearestPixel = nearest ? realToPixel(nearest, activeCalibration) : null;
        const pointPixel = realToPixel(point, activeCalibration);
        const reuse =
            nearest && nearestPixel
                ? Math.hypot(nearestPixel.px - pointPixel.px, nearestPixel.py - pointPixel.py) *
                      zoom <
                  14
                : false;
        const node: RoadNode =
            reuse && nearest
                ? nearest
                : {
                      id: `n${Date.now()}`,
                      x: roundMeter(point.x),
                      y: roundMeter(point.y),
                  };
        const previousID = roadCursorRef.current;
        roadCursorRef.current = node.id;
        updateMap((current) => {
            const nodes = reuse ? current.roadGraph.nodes : [...current.roadGraph.nodes, node];
            const edgeExists = current.roadGraph.edges.some(
                (edge) =>
                    previousID &&
                    ((edge.from === previousID && edge.to === node.id) ||
                        (edge.from === node.id && edge.to === previousID)),
            );
            const edges =
                previousID && previousID !== node.id && !edgeExists
                    ? [
                          ...current.roadGraph.edges,
                          {
                              from: previousID,
                              id: `e${Date.now()}`,
                              to: node.id,
                              type: roadEdgeType,
                          },
                      ]
                    : current.roadGraph.edges;
            return { ...current, roadGraph: { edges, nodes } };
        });
    }

    function completeZone(): void {
        if (zoneDraft.length < 3) {
            setMessage("区域至少需要 3 个点");
            return;
        }
        const id = zoneID.trim().toUpperCase() || "A";
        const zone: Zone = {
            id,
            name: `${id}区`,
            polygon: zoneDraft,
        };
        updateMap((current) => ({
            ...current,
            zones: [...current.zones.filter((item) => item.id !== zone.id), zone],
        }));
        setZoneDraft([]);
        setZoneID(String.fromCharCode(id.charCodeAt(0) + 1));
        setMessage(`${zone.name} 已保存到当前地图`);
    }

    function clearRoadCursor(): void {
        roadCursorRef.current = null;
        setMessage("已断开当前通道连线游标");
    }

    function deleteActiveIsland(): void {
        if (!activeIslandID) {
            return;
        }
        updateMap((current) => ({
            ...current,
            islands: current.islands.filter((island) => island.id !== activeIslandID),
        }));
        setSelectedIslandIDs((items) => {
            const next = new Set(items);
            next.delete(activeIslandID);
            return next;
        });
        setActiveIslandID("");
    }

    function deleteLastRoad(): void {
        updateMap((current) => ({
            ...current,
            roadGraph: {
                edges: current.roadGraph.edges.slice(0, -1),
                nodes:
                    current.roadGraph.edges.length === 0
                        ? current.roadGraph.nodes.slice(0, -1)
                        : current.roadGraph.nodes,
            },
        }));
        roadCursorRef.current = null;
    }

    function handleMouseDown(event: MouseEvent<HTMLDivElement>): void {
        const point = viewportPoint(event.clientX, event.clientY);
        if (!point) {
            return;
        }
        if (mode === "select") {
            dragRef.current = {
                clientX: event.clientX,
                clientY: event.clientY,
                startPx: point.px,
                startPy: point.py,
                type: "select",
            };
            setSelectionRect({
                endPx: point.px,
                endPy: point.py,
                startPx: point.px,
                startPy: point.py,
            });
            return;
        }
        dragRef.current = {
            clientX: event.clientX,
            clientY: event.clientY,
            moved: false,
            startClientX: event.clientX,
            startClientY: event.clientY,
            startOffsetX: offset.x,
            startOffsetY: offset.y,
            type: "pan",
        };
    }

    function handleMouseMove(event: MouseEvent<HTMLDivElement>): void {
        const drag = dragRef.current;
        if (!drag) {
            return;
        }
        if (drag.type === "select") {
            const point = viewportPoint(event.clientX, event.clientY);
            if (point) {
                setSelectionRect({
                    endPx: point.px,
                    endPy: point.py,
                    startPx: drag.startPx,
                    startPy: drag.startPy,
                });
            }
            drag.clientX = event.clientX;
            drag.clientY = event.clientY;
            return;
        }
        const dx = event.clientX - drag.startClientX;
        const dy = event.clientY - drag.startClientY;
        drag.moved =
            drag.moved ||
            Math.hypot(event.clientX - drag.clientX, event.clientY - drag.clientY) > 2;
        drag.clientX = event.clientX;
        drag.clientY = event.clientY;
        if (mode === "pan" || event.buttons === 2 || event.altKey) {
            setOffset({ x: drag.startOffsetX + dx, y: drag.startOffsetY + dy });
        }
    }

    function handleMouseUp(event: MouseEvent<HTMLDivElement>): void {
        const drag = dragRef.current;
        dragRef.current = null;
        const point = viewportPoint(event.clientX, event.clientY);
        if (!drag || !point) {
            setSelectionRect(null);
            return;
        }
        if (drag.type === "select") {
            const rect = selectionRect || {
                endPx: point.px,
                endPy: point.py,
                startPx: drag.startPx,
                startPy: drag.startPy,
            };
            const left = Math.min(rect.startPx, rect.endPx);
            const right = Math.max(rect.startPx, rect.endPx);
            const top = Math.min(rect.startPy, rect.endPy);
            const bottom = Math.max(rect.startPy, rect.endPy);
            const selected = mapConfig.islands
                .filter((island) => {
                    const pixel = realToPixel(island.center, activeCalibration);
                    return (
                        pixel.px >= left &&
                        pixel.px <= right &&
                        pixel.py >= top &&
                        pixel.py <= bottom
                    );
                })
                .map((island) => island.id);
            setSelectedIslandIDs((items) => new Set([...items, ...selected]));
            setSelectionRect(null);
            setMessage(`已选择 ${selected.length} 个犊牛岛`);
            return;
        }
        if (!drag.moved || mode !== "pan") {
            handleCanvasClick(point);
        }
    }

    function handleWheel(event: WheelEvent<HTMLDivElement>): void {
        event.preventDefault();
        const nextZoom = Math.min(3, Math.max(0.25, zoom * (event.deltaY > 0 ? 0.9 : 1.1)));
        setZoom(Number(nextZoom.toFixed(3)));
    }

    function updateCalibration(
        which: "p1" | "p2",
        key: keyof CalibrationPoint,
        value: number,
    ): void {
        setCalibrationDraft((current) => ({
            ...current,
            [which]: {
                ...current[which],
                [key]: value,
            },
        }));
    }

    function applyCalibration(): void {
        if (!hasCalibration(calibrationDraft)) {
            setMessage("请先在图上点击两个标定点，并填写真实坐标");
            return;
        }
        updateMap((current) => ({ ...current, calibration: calibrationDraft }));
        setMessage("标定已应用");
    }

    async function uploadImage(event: ChangeEvent<HTMLInputElement>): Promise<void> {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (!file) {
            return;
        }
        const data = new FormData();
        data.append("file", file);
        const response = await fetch(apiUrl(apiBase, "/api/maps/active/image"), {
            body: data,
            credentials: "same-origin",
            method: "POST",
        });
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        const next = normalizeMap(unwrapData<Partial<MapConfig>>(await response.json()));
        setMapConfig(next);
        setImageVersion(Date.now());
        setMessage("平面图已上传");
    }

    async function saveMap(): Promise<void> {
        const payload: MapConfig = {
            ...mapConfig,
            calibration: hasCalibration(calibrationDraft)
                ? calibrationDraft
                : mapConfig.calibration,
        };
        const response = await fetch(apiUrl(apiBase, "/api/maps/active"), {
            body: JSON.stringify(payload),
            credentials: "same-origin",
            headers: { "Content-Type": "application/json" },
            method: "POST",
        });
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        const next = normalizeMap(unwrapData<Partial<MapConfig>>(await response.json()));
        setMapConfig(next);
        setCalibrationDraft(next.calibration || EMPTY_CALIBRATION);
        setMessage("地图配置已保存");
    }

    function toggleIsland(id: string): void {
        setSelectedIslandIDs((items) => {
            const next = new Set(items);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    }

    function selectZone(zone: string): void {
        const zoneValue = zone.trim().toUpperCase();
        setSelectedIslandIDs(
            new Set(
                mapConfig.islands
                    .filter((island) => island.zoneID === zoneValue)
                    .map((island) => island.id),
            ),
        );
        setMessage(`已选择 ${zoneValue} 区`);
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
            setMessage("范围格式需要类似 A1 到 A10");
            return;
        }
        const min = Math.min(start, end);
        const max = Math.max(start, end);
        setSelectedIslandIDs(
            new Set(
                mapConfig.islands
                    .filter(
                        (island) =>
                            island.zoneID === startZone &&
                            idNumber(island.id) >= min &&
                            idNumber(island.id) <= max,
                    )
                    .map((island) => island.id),
            ),
        );
        setMessage(`已选择 ${rangeStart.toUpperCase()}-${rangeEnd.toUpperCase()}`);
    }

    function generatePath(): void {
        const path = buildGeneratedPath(mapConfig, selectedIslands, selectedVehicle, feedAmount);
        setGeneratedPath(path);
        setMessage(path.length ? `已生成 ${path.length} 个路径点` : "请先选择犊牛岛");
    }

    async function submitTask(): Promise<void> {
        const path = generatedPath.length
            ? generatedPath
            : buildGeneratedPath(mapConfig, selectedIslands, selectedVehicle, feedAmount);
        if (path.length === 0) {
            setMessage("当前没有可提交的路径");
            return;
        }
        const payload = createTaskPayload(
            mapConfig,
            path,
            deviceID,
            selectedIslands.map((island) => island.id),
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
        setGeneratedPath(path);
        setMessage(`任务已下发到 ${deviceID}`);
    }

    const zoneIDs = useMemo(() => {
        const ids = new Set<string>(["A", "B", "C", "D", "E", "F"]);
        mapConfig.zones.forEach((zone) => ids.add(zone.id));
        mapConfig.islands.forEach((island) => ids.add(island.zoneID));
        return [...ids].sort();
    }, [mapConfig.islands, mapConfig.zones]);

    return (
        <LayoutContent fixed className="h-[calc(100vh-4rem)]">
            <div className="grid h-full grid-cols-[minmax(0,1fr)_430px] bg-slate-950 text-slate-100 max-xl:grid-cols-1">
                <main
                    ref={viewportRef}
                    className="relative min-h-[620px] overflow-hidden border-r border-white/10 bg-slate-950"
                    onContextMenu={(event) => event.preventDefault()}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    onWheel={handleWheel}
                >
                    <div className="absolute left-4 top-4 z-20 flex flex-wrap items-center gap-2 rounded-md border border-white/10 bg-slate-900/90 p-2 shadow-lg">
                        {MODE_OPTIONS.map((item) => {
                            const Icon = item.icon;
                            return (
                                <button
                                    key={item.value}
                                    className={`inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm ${
                                        mode === item.value
                                            ? "bg-cyan-400 text-slate-950"
                                            : "bg-slate-800 text-slate-200 hover:bg-slate-700"
                                    }`}
                                    title={item.label}
                                    onClick={() => setMode(item.value)}
                                    type="button"
                                >
                                    <Icon className="h-4 w-4" />
                                    {item.label}
                                </button>
                            );
                        })}
                    </div>

                    <div className="absolute right-4 top-4 z-20 rounded-md border border-white/10 bg-slate-900/90 px-3 py-2 text-sm text-slate-300">
                        缩放 {(zoom * 100).toFixed(0)}% · 犊牛岛 {mapConfig.islands.length} · 通道{" "}
                        {mapConfig.roadGraph.edges.length}
                    </div>

                    <div
                        className="absolute left-0 top-0 origin-top-left"
                        style={{
                            transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
                        }}
                    >
                        {imageSrc ? (
                            <img
                                ref={imageRef}
                                alt="calf island map"
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
                                上传犊牛岛区平面图
                            </div>
                        )}
                        <svg
                            className="absolute left-0 top-0 overflow-visible"
                            height={imageSize.height}
                            width={imageSize.width}
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <defs>
                                <filter
                                    id="route-shadow"
                                    x="-20%"
                                    y="-20%"
                                    width="140%"
                                    height="140%"
                                >
                                    <feDropShadow
                                        dx="0"
                                        dy="2"
                                        floodColor="#020617"
                                        floodOpacity="0.8"
                                        stdDeviation="2"
                                    />
                                </filter>
                            </defs>

                            {mapConfig.zones.map((zone) => {
                                const points = zone.polygon.map((point) =>
                                    realToPixel(point, activeCalibration),
                                );
                                return (
                                    <g key={zone.id}>
                                        <polygon
                                            fill="rgba(14, 165, 233, 0.08)"
                                            points={points
                                                .map((point) => `${point.px},${point.py}`)
                                                .join(" ")}
                                            stroke="#38bdf8"
                                            strokeDasharray="8 6"
                                            strokeWidth={2 / zoom}
                                        />
                                        {points[0] && (
                                            <text
                                                fill="#e0f2fe"
                                                fontSize={18 / zoom}
                                                fontWeight={700}
                                                x={points[0].px + 8 / zoom}
                                                y={points[0].py + 20 / zoom}
                                            >
                                                {zone.name}
                                            </text>
                                        )}
                                    </g>
                                );
                            })}

                            {zoneDraft.length > 0 && (
                                <polyline
                                    fill="none"
                                    points={zoneDraft
                                        .map((point) => realToPixel(point, activeCalibration))
                                        .map((point) => `${point.px},${point.py}`)
                                        .join(" ")}
                                    stroke="#facc15"
                                    strokeDasharray="5 5"
                                    strokeWidth={2 / zoom}
                                />
                            )}

                            {mapConfig.roadGraph.edges.map((edge) => {
                                const nodes = nodeMap(mapConfig.roadGraph);
                                const from = nodes.get(edge.from);
                                const to = nodes.get(edge.to);
                                if (!from || !to) {
                                    return null;
                                }
                                const fromPx = realToPixel(from, activeCalibration);
                                const toPx = realToPixel(to, activeCalibration);
                                return (
                                    <line
                                        key={edge.id}
                                        stroke={edge.type === "main" ? "#22d3ee" : "#a78bfa"}
                                        strokeLinecap="round"
                                        strokeWidth={(edge.type === "main" ? 5 : 3) / zoom}
                                        x1={fromPx.px}
                                        x2={toPx.px}
                                        y1={fromPx.py}
                                        y2={toPx.py}
                                    />
                                );
                            })}

                            {mapConfig.roadGraph.nodes.map((node) => {
                                const point = realToPixel(node, activeCalibration);
                                return (
                                    <circle
                                        key={node.id}
                                        cx={point.px}
                                        cy={point.py}
                                        fill="#e0f2fe"
                                        r={4 / zoom}
                                    />
                                );
                            })}

                            {mapConfig.islands.map((island) => {
                                const center = realToPixel(island.center, activeCalibration);
                                const service = realToPixel(island.servicePoint, activeCalibration);
                                const selected = selectedIslandIDs.has(island.id);
                                const active = activeIslandID === island.id;
                                return (
                                    <g key={island.id} onClick={(event) => event.stopPropagation()}>
                                        <line
                                            stroke={selected ? "#facc15" : "#94a3b8"}
                                            strokeDasharray="5 5"
                                            strokeWidth={1.5 / zoom}
                                            x1={center.px}
                                            x2={service.px}
                                            y1={center.py}
                                            y2={service.py}
                                        />
                                        <circle
                                            className="cursor-pointer"
                                            cx={center.px}
                                            cy={center.py}
                                            fill={
                                                selected
                                                    ? "#facc15"
                                                    : active
                                                      ? "#fb7185"
                                                      : "#22c55e"
                                            }
                                            r={7 / zoom}
                                            stroke="#020617"
                                            strokeWidth={2 / zoom}
                                            onClick={() => {
                                                setActiveIslandID(island.id);
                                                toggleIsland(island.id);
                                            }}
                                        />
                                        <circle
                                            cx={service.px}
                                            cy={service.py}
                                            fill="#0f172a"
                                            r={5 / zoom}
                                            stroke="#f97316"
                                            strokeWidth={2 / zoom}
                                        />
                                        <text
                                            fill="#f8fafc"
                                            fontSize={13 / zoom}
                                            fontWeight={700}
                                            x={center.px + 9 / zoom}
                                            y={center.py - 8 / zoom}
                                        >
                                            {island.id}
                                        </text>
                                    </g>
                                );
                            })}

                            {generatedPath.length > 1 && (
                                <polyline
                                    fill="none"
                                    filter="url(#route-shadow)"
                                    points={generatedPath
                                        .map((point) => realToPixel(point, activeCalibration))
                                        .map((point) => `${point.px},${point.py}`)
                                        .join(" ")}
                                    stroke="#f97316"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={5 / zoom}
                                />
                            )}

                            {hasCalibration(calibrationDraft) &&
                                [calibrationDraft.p1, calibrationDraft.p2].map((point, index) => (
                                    <g key={`calibration-${index}`}>
                                        <circle
                                            cx={point.px}
                                            cy={point.py}
                                            fill="#0f172a"
                                            r={8 / zoom}
                                            stroke="#facc15"
                                            strokeWidth={3 / zoom}
                                        />
                                        <text
                                            fill="#facc15"
                                            fontSize={14 / zoom}
                                            fontWeight={700}
                                            x={point.px + 12 / zoom}
                                            y={point.py + 5 / zoom}
                                        >
                                            P{index + 1}
                                        </text>
                                    </g>
                                ))}

                            {selectionRect && (
                                <rect
                                    fill="rgba(34, 211, 238, 0.12)"
                                    height={Math.abs(selectionRect.endPy - selectionRect.startPy)}
                                    stroke="#22d3ee"
                                    strokeDasharray="6 4"
                                    strokeWidth={2 / zoom}
                                    width={Math.abs(selectionRect.endPx - selectionRect.startPx)}
                                    x={Math.min(selectionRect.startPx, selectionRect.endPx)}
                                    y={Math.min(selectionRect.startPy, selectionRect.endPy)}
                                />
                            )}
                        </svg>

                        {vehicles.map((vehicle) => {
                            const online = isVehicleOnline(vehicle);
                            const x = vehicle.location_x;
                            const y = vehicle.location_y;
                            if (x == null || y == null) {
                                return null;
                            }
                            const point = realToPixel({ x, y }, activeCalibration);
                            return (
                                <div
                                    key={vehicle.deviceID}
                                    className="absolute -translate-x-1/2 -translate-y-1/2"
                                    style={{ left: point.px, top: point.py }}
                                    onMouseEnter={() => setHoveredVehicleID(vehicle.deviceID)}
                                    onMouseLeave={() => setHoveredVehicleID(null)}
                                >
                                    <button
                                        className={`grid h-9 w-9 place-items-center rounded-full border-2 shadow-lg ${
                                            online
                                                ? "border-cyan-200 bg-cyan-400 text-slate-950"
                                                : "border-slate-400 bg-slate-700 text-slate-200"
                                        }`}
                                        style={{ transform: `scale(${1 / zoom})` }}
                                        title={vehicle.deviceID}
                                        type="button"
                                        onClick={() => setDeviceID(vehicle.deviceID)}
                                    >
                                        <CarIcon className="h-5 w-5" />
                                    </button>
                                    {hoveredVehicleID === vehicle.deviceID && (
                                        <div
                                            className="absolute left-8 top-0 z-30 w-64 rounded-md border border-white/10 bg-slate-950 p-3 text-xs text-slate-200 shadow-xl"
                                            style={{
                                                transform: `scale(${1 / zoom})`,
                                                transformOrigin: "left top",
                                            }}
                                        >
                                            <div className="mb-2 flex items-center justify-between font-semibold">
                                                <span>{vehicle.deviceID}</span>
                                                <span
                                                    className={
                                                        online ? "text-cyan-300" : "text-slate-400"
                                                    }
                                                >
                                                    {online ? "在线" : "离线"}
                                                </span>
                                            </div>
                                            <div>
                                                坐标 {x.toFixed(2)}, {y.toFixed(2)}
                                            </div>
                                            <div>
                                                任务 {vehicle.taskState || "-"} · seq{" "}
                                                {vehicle.currentSeq ?? "-"}
                                            </div>
                                            <div>
                                                牛奶{" "}
                                                {formatMl(
                                                    vehicle.milkRemainingMl,
                                                    vehicle.milkCapacityMl,
                                                )}
                                            </div>
                                            <div>
                                                饮水{" "}
                                                {formatMl(
                                                    vehicle.waterRemainingMl,
                                                    vehicle.waterCapacityMl,
                                                )}
                                            </div>
                                            <div>STM32 {vehicle.stm32State || "-"}</div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </main>

                <aside className="flex min-h-0 flex-col gap-3 overflow-y-auto bg-slate-900 p-4">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <h1 className="text-lg font-semibold">路径规划</h1>
                            <div className="mt-1 text-xs text-slate-400">{mapConfig.mapID}</div>
                        </div>
                        <div className="flex gap-2">
                            <button
                                className="rounded-md bg-slate-800 p-2 hover:bg-slate-700"
                                title="刷新"
                                type="button"
                                onClick={() =>
                                    void loadMap().catch((error) => setMessage(String(error)))
                                }
                            >
                                <RefreshCwIcon className="h-4 w-4" />
                            </button>
                            <button
                                className="rounded-md bg-cyan-400 p-2 text-slate-950 hover:bg-cyan-300"
                                title="保存地图"
                                type="button"
                                onClick={() =>
                                    void saveMap().catch((error) => setMessage(String(error)))
                                }
                            >
                                <SaveIcon className="h-4 w-4" />
                            </button>
                        </div>
                    </div>

                    <div className="grid gap-2 rounded-md border border-white/10 bg-slate-950 p-3">
                        <div className="grid grid-cols-[1fr_auto] gap-2">
                            <input
                                className="rounded-md border border-white/10 bg-slate-900 px-3 py-2 text-sm"
                                placeholder="API Base"
                                value={apiBase}
                                onChange={(event) => setApiBase(event.target.value)}
                            />
                            <button
                                className="inline-flex items-center gap-2 rounded-md bg-slate-800 px-3 py-2 text-sm hover:bg-slate-700"
                                type="button"
                                onClick={() => fileRef.current?.click()}
                            >
                                <UploadIcon className="h-4 w-4" />
                                上传
                            </button>
                            <input
                                ref={fileRef}
                                accept="image/*"
                                className="hidden"
                                type="file"
                                onChange={(event) =>
                                    void uploadImage(event).catch((error) =>
                                        setMessage(String(error)),
                                    )
                                }
                            />
                        </div>
                        <div className="text-xs text-slate-400">{message}</div>
                    </div>

                    <section className="grid gap-3 rounded-md border border-white/10 bg-slate-950 p-3">
                        <div className="flex items-center gap-2 text-sm font-medium">
                            <CrosshairIcon className="h-4 w-4 text-cyan-300" />
                            两点标定
                        </div>
                        {(["p1", "p2"] as const).map((key) => (
                            <div key={key} className="grid grid-cols-4 gap-2 text-xs">
                                <span className="self-center font-medium text-slate-300">
                                    {key.toUpperCase()}
                                </span>
                                {(["px", "py", "x", "y"] as const).map((field) => (
                                    <label key={field} className="grid gap-1">
                                        <span className="text-slate-500">{field}</span>
                                        <input
                                            className="w-full rounded-md border border-white/10 bg-slate-900 px-2 py-1.5"
                                            type="number"
                                            value={calibrationDraft[key][field]}
                                            onChange={(event) =>
                                                updateCalibration(
                                                    key,
                                                    field,
                                                    Number(event.target.value),
                                                )
                                            }
                                        />
                                    </label>
                                ))}
                            </div>
                        ))}
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                className={`rounded-md px-3 py-2 text-sm ${calibrationClick === "p1" ? "bg-cyan-400 text-slate-950" : "bg-slate-800 hover:bg-slate-700"}`}
                                type="button"
                                onClick={() => setCalibrationClick("p1")}
                            >
                                点击 P1
                            </button>
                            <button
                                className={`rounded-md px-3 py-2 text-sm ${calibrationClick === "p2" ? "bg-cyan-400 text-slate-950" : "bg-slate-800 hover:bg-slate-700"}`}
                                type="button"
                                onClick={() => setCalibrationClick("p2")}
                            >
                                点击 P2
                            </button>
                            <button
                                className="col-span-2 inline-flex items-center justify-center gap-2 rounded-md bg-slate-800 px-3 py-2 text-sm hover:bg-slate-700"
                                type="button"
                                onClick={applyCalibration}
                            >
                                <CheckIcon className="h-4 w-4" />
                                应用标定
                            </button>
                        </div>
                    </section>

                    <section className="grid gap-3 rounded-md border border-white/10 bg-slate-950 p-3">
                        <div className="flex items-center gap-2 text-sm font-medium">
                            <MapIcon className="h-4 w-4 text-cyan-300" />
                            区域与犊牛岛
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-sm">
                            <label className="grid gap-1">
                                <span className="text-xs text-slate-500">区域</span>
                                <input
                                    className="rounded-md border border-white/10 bg-slate-900 px-2 py-2"
                                    value={zoneID}
                                    onChange={(event) =>
                                        setZoneID(event.target.value.toUpperCase())
                                    }
                                />
                            </label>
                            <label className="grid gap-1">
                                <span className="text-xs text-slate-500">岛号</span>
                                <input
                                    className="rounded-md border border-white/10 bg-slate-900 px-2 py-2"
                                    value={islandID}
                                    onChange={(event) =>
                                        setIslandID(event.target.value.toUpperCase())
                                    }
                                />
                            </label>
                            <label className="grid gap-1">
                                <span className="text-xs text-slate-500">所属区</span>
                                <input
                                    className="rounded-md border border-white/10 bg-slate-900 px-2 py-2"
                                    value={islandZoneID}
                                    onChange={(event) =>
                                        setIslandZoneID(event.target.value.toUpperCase())
                                    }
                                />
                            </label>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                className="inline-flex items-center justify-center gap-2 rounded-md bg-slate-800 px-3 py-2 text-sm hover:bg-slate-700"
                                type="button"
                                onClick={completeZone}
                            >
                                <PlusIcon className="h-4 w-4" />
                                完成区域
                            </button>
                            <button
                                className="inline-flex items-center justify-center gap-2 rounded-md bg-rose-500 px-3 py-2 text-sm font-medium text-white hover:bg-rose-400"
                                type="button"
                                onClick={deleteActiveIsland}
                            >
                                <Trash2Icon className="h-4 w-4" />
                                删除岛
                            </button>
                        </div>
                        <select
                            className="rounded-md border border-white/10 bg-slate-900 px-3 py-2 text-sm"
                            value={activeIslandID}
                            onChange={(event) => setActiveIslandID(event.target.value)}
                        >
                            <option value="">选择犊牛岛</option>
                            {mapConfig.islands.map((island) => (
                                <option key={island.id} value={island.id}>
                                    {island.id} · {island.zoneID}区
                                </option>
                            ))}
                        </select>
                    </section>

                    <section className="grid gap-3 rounded-md border border-white/10 bg-slate-950 p-3">
                        <div className="flex items-center gap-2 text-sm font-medium">
                            <WaypointsIcon className="h-4 w-4 text-cyan-300" />
                            通道网络
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <select
                                className="rounded-md border border-white/10 bg-slate-900 px-3 py-2 text-sm"
                                value={roadEdgeType}
                                onChange={(event) =>
                                    setRoadEdgeType(event.target.value as "inner" | "main")
                                }
                            >
                                <option value="main">主通道</option>
                                <option value="inner">内部通道</option>
                            </select>
                            <button
                                className="rounded-md bg-slate-800 px-3 py-2 text-sm hover:bg-slate-700"
                                type="button"
                                onClick={clearRoadCursor}
                            >
                                断开连线
                            </button>
                            <button
                                className="col-span-2 inline-flex items-center justify-center gap-2 rounded-md bg-slate-800 px-3 py-2 text-sm hover:bg-slate-700"
                                type="button"
                                onClick={deleteLastRoad}
                            >
                                <Trash2Icon className="h-4 w-4" />
                                撤销最后一段
                            </button>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs text-slate-400">
                            <div>节点 {mapConfig.roadGraph.nodes.length}</div>
                            <div>边 {mapConfig.roadGraph.edges.length}</div>
                        </div>
                    </section>

                    <section className="grid gap-3 rounded-md border border-white/10 bg-slate-950 p-3">
                        <div className="flex items-center gap-2 text-sm font-medium">
                            <RouteIcon className="h-4 w-4 text-cyan-300" />
                            投喂任务
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                            <label className="grid gap-1">
                                <span className="text-xs text-slate-500">车辆</span>
                                <input
                                    className="rounded-md border border-white/10 bg-slate-900 px-3 py-2"
                                    value={deviceID}
                                    onChange={(event) => setDeviceID(event.target.value)}
                                />
                            </label>
                            <label className="grid gap-1">
                                <span className="text-xs text-slate-500">投喂量 ml</span>
                                <input
                                    className="rounded-md border border-white/10 bg-slate-900 px-3 py-2"
                                    type="number"
                                    value={feedAmount}
                                    onChange={(event) =>
                                        setFeedAmount(Number(event.target.value) || 0)
                                    }
                                />
                            </label>
                            <label className="grid gap-1">
                                <span className="text-xs text-slate-500">起始岛</span>
                                <input
                                    className="rounded-md border border-white/10 bg-slate-900 px-3 py-2"
                                    value={rangeStart}
                                    onChange={(event) =>
                                        setRangeStart(event.target.value.toUpperCase())
                                    }
                                />
                            </label>
                            <label className="grid gap-1">
                                <span className="text-xs text-slate-500">结束岛</span>
                                <input
                                    className="rounded-md border border-white/10 bg-slate-900 px-3 py-2"
                                    value={rangeEnd}
                                    onChange={(event) =>
                                        setRangeEnd(event.target.value.toUpperCase())
                                    }
                                />
                            </label>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            {zoneIDs.slice(0, 6).map((zone) => (
                                <button
                                    key={zone}
                                    className="rounded-md bg-slate-800 px-3 py-2 text-sm hover:bg-slate-700"
                                    type="button"
                                    onClick={() => selectZone(zone)}
                                >
                                    {zone}区全部
                                </button>
                            ))}
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            <button
                                className="rounded-md bg-slate-800 px-3 py-2 text-sm hover:bg-slate-700"
                                type="button"
                                onClick={selectRange}
                            >
                                选择范围
                            </button>
                            <button
                                className="rounded-md bg-slate-800 px-3 py-2 text-sm hover:bg-slate-700"
                                type="button"
                                onClick={() => setSelectedIslandIDs(new Set())}
                            >
                                清空选择
                            </button>
                            <button
                                className="rounded-md bg-slate-800 px-3 py-2 text-sm hover:bg-slate-700"
                                type="button"
                                onClick={() =>
                                    void refreshVehicles().catch((error) =>
                                        setMessage(String(error)),
                                    )
                                }
                            >
                                刷新车辆
                            </button>
                            <button
                                className="col-span-3 inline-flex items-center justify-center gap-2 rounded-md bg-amber-400 px-3 py-2 text-sm font-medium text-slate-950 hover:bg-amber-300"
                                type="button"
                                onClick={generatePath}
                            >
                                <RouteIcon className="h-4 w-4" />
                                生成路线
                            </button>
                            <button
                                className="col-span-3 inline-flex items-center justify-center gap-2 rounded-md bg-cyan-400 px-3 py-2 text-sm font-medium text-slate-950 hover:bg-cyan-300"
                                type="button"
                                onClick={() =>
                                    void submitTask().catch((error) => setMessage(String(error)))
                                }
                            >
                                <SendIcon className="h-4 w-4" />
                                提交任务
                            </button>
                        </div>
                    </section>

                    <section className="grid min-h-0 gap-3 rounded-md border border-white/10 bg-slate-950 p-3">
                        <div className="flex items-center justify-between text-sm font-medium">
                            <span>已选犊牛岛 {selectedIslandIDs.size}</span>
                            <span>路径点 {generatedPath.length}</span>
                        </div>
                        <div className="max-h-32 overflow-auto rounded-md bg-slate-900 p-2">
                            <div className="flex flex-wrap gap-2">
                                {mapConfig.islands.map((island) => (
                                    <button
                                        key={island.id}
                                        className={`rounded-md px-2 py-1 text-xs ${selectedIslandIDs.has(island.id) ? "bg-cyan-400 text-slate-950" : "bg-slate-800 text-slate-300 hover:bg-slate-700"}`}
                                        type="button"
                                        onClick={() => toggleIsland(island.id)}
                                    >
                                        {island.id}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <ol className="max-h-40 space-y-1 overflow-auto rounded-md bg-slate-900 p-2 text-xs text-slate-400">
                            {generatedPath.map((point) => (
                                <li key={`${point.seq}-${point.x}-${point.y}`}>
                                    {point.seq}. {point.action}{" "}
                                    {point.targetIslandID || point.nodeID || ""} (
                                    {point.x.toFixed(2)}, {point.y.toFixed(2)})
                                </li>
                            ))}
                        </ol>
                    </section>
                </aside>
            </div>
        </LayoutContent>
    );
};
