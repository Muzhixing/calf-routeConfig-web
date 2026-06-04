export type RealPoint = {
    x: number;
    y: number;
};

export type PixelPoint = {
    px: number;
    py: number;
};

export type CalibrationPoint = PixelPoint & RealPoint;

export type Calibration = {
    p1: CalibrationPoint;
    p2: CalibrationPoint;
};

export type Zone = {
    id: string;
    name: string;
    polygon: RealPoint[];
};

export type Island = {
    center: RealPoint;
    id: string;
    servicePoint: RealPoint;
    zoneID: string;
};

export type RoadNode = RealPoint & {
    id: string;
};

export type RoadEdge = {
    from: string;
    id: string;
    to: string;
    type: "inner" | "main" | "robot";
};

export type RoadGraph = {
    edges: RoadEdge[];
    nodes: RoadNode[];
};

export type MapConfig = {
    calibration: Calibration | null;
    currentStep?: WizardStep;
    description?: string;
    imageUrl?: string;
    islands: Island[];
    mapID: string;
    name?: string;
    roadGraph: RoadGraph;
    updatedAt?: string;
    zones: Zone[];
};

export type RoutePlan = {
    createdAt?: string;
    description?: string;
    feedAmount?: number;
    mapID: string;
    name?: string;
    planID: string;
    robotPath: GeneratedPoint[];
    targetIslandIDs: string[];
    updatedAt?: string;
};

export type VehicleStatus = {
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

export type GeneratedPoint = RealPoint & {
    action: "feed" | "pass" | "start";
    feedAmount?: number;
    nodeID?: string;
    seq: number;
    targetIslandID?: string;
};

export type WizardStep = "calibration" | "islands" | "roads" | "save" | "upload";

export const EMPTY_CALIBRATION: Calibration = {
    p1: { px: 0, py: 0, x: 0, y: 0 },
    p2: { px: 0, py: 0, x: 50, y: 30 },
};

export const DEFAULT_MAP: MapConfig = {
    calibration: null,
    currentStep: "upload",
    islands: [],
    mapID: "",
    roadGraph: { edges: [], nodes: [] },
    zones: [],
};

export function apiUrl(baseUrl: string, path: string): string {
    const base = baseUrl.replace(/\/$/, "");
    return base ? `${base}${path}` : path;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function unwrapData<T>(payload: unknown): T {
    return isRecord(payload) && "data" in payload ? (payload.data as T) : (payload as T);
}

export function toNumber(value: unknown, fallback = 0): number {
    if (typeof value === "number" && Number.isFinite(value)) {
        return value;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

export function toOptionalNumber(value: unknown): number | undefined {
    const parsed = toNumber(value, Number.NaN);
    return Number.isFinite(parsed) ? parsed : undefined;
}

export function toStringValue(value: unknown, fallback = ""): string {
    return typeof value === "string" && value.trim() ? value : fallback;
}

export function normalizeMap(raw: Partial<MapConfig> | null | undefined): MapConfig {
    const roadGraph = raw?.roadGraph || DEFAULT_MAP.roadGraph;
    return {
        calibration: raw?.calibration || null,
        currentStep: raw?.currentStep || "upload",
        description: raw?.description,
        imageUrl: raw?.imageUrl,
        islands: Array.isArray(raw?.islands)
            ? raw.islands.map((island) => ({
                  ...island,
                  servicePoint: island.center,
              }))
            : [],
        mapID: raw?.mapID || "",
        name: raw?.name || "未命名平面图",
        roadGraph: {
            edges: Array.isArray(roadGraph.edges) ? roadGraph.edges : [],
            nodes: Array.isArray(roadGraph.nodes) ? roadGraph.nodes : [],
        },
        updatedAt: raw?.updatedAt,
        zones: Array.isArray(raw?.zones) ? raw.zones : [],
    };
}

export function normalizePlan(raw: Partial<RoutePlan> | null | undefined, mapID = ""): RoutePlan {
    return {
        createdAt: raw?.createdAt,
        description: raw?.description,
        feedAmount: raw?.feedAmount ?? 500,
        mapID: raw?.mapID || mapID,
        name: raw?.name || "未命名路线方案",
        planID: raw?.planID || "",
        robotPath: Array.isArray(raw?.robotPath) ? raw.robotPath : [],
        targetIslandIDs: Array.isArray(raw?.targetIslandIDs) ? raw.targetIslandIDs : [],
        updatedAt: raw?.updatedAt,
    };
}

export function normalizeVehicle(raw: unknown): VehicleStatus | null {
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

export function normalizeVehicles(raw: unknown): VehicleStatus[] {
    const data = unwrapData<unknown>(raw);
    const list = Array.isArray(data) ? data : data ? [data] : [];
    return list.map(normalizeVehicle).filter((item): item is VehicleStatus => item !== null);
}

export function hasCalibration(calibration: Calibration | null): calibration is Calibration {
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

export function pixelToReal(point: PixelPoint, calibration: Calibration | null): RealPoint {
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

export function realToPixel(point: RealPoint, calibration: Calibration | null): PixelPoint {
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

export function roundMeter(value: number): number {
    return Number(value.toFixed(3));
}

export function distance(a: RealPoint, b: RealPoint): number {
    return Math.hypot(a.x - b.x, a.y - b.y);
}

export function isVehicleOnline(vehicle: VehicleStatus): boolean {
    if (vehicle.status !== true) {
        return false;
    }
    const time = Date.parse(vehicle.serverReceivedAt || vehicle.lastOnlineTime || "");
    return Number.isFinite(time) && Date.now() - time <= 10_000;
}

export function nodeMap(graph: RoadGraph): Map<string, RoadNode> {
    return new Map(graph.nodes.map((node) => [node.id, node]));
}

export function findNearestNode(graph: RoadGraph, point: RealPoint): RoadNode | null {
    return graph.nodes.reduce<RoadNode | null>((nearest, node) => {
        if (!nearest) {
            return node;
        }
        return distance(node, point) < distance(nearest, point) ? node : nearest;
    }, null);
}

type RoadAnchor = {
    edgeID?: string;
    edges: { to: string; weight: number }[];
    id: string;
    point: RealPoint;
    virtual: boolean;
};

type RoadPathStep = RealPoint & {
    nodeID?: string;
};

type RoadProjection = {
    edgeID: string;
    from: RoadNode;
    point: RealPoint & { t: number };
    to: RoadNode;
};

function addUndirectedEdge(
    adjacency: Map<string, { id: string; weight: number }[]>,
    from: string,
    to: string,
    weight: number,
): void {
    adjacency.set(from, [...(adjacency.get(from) || []), { id: to, weight }]);
    adjacency.set(to, [...(adjacency.get(to) || []), { id: from, weight }]);
}

function projectPointToSegment(
    point: RealPoint,
    from: RealPoint,
    to: RealPoint,
): RealPoint & {
    t: number;
} {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const lengthSq = dx * dx + dy * dy;
    const t =
        lengthSq <= 0.000001
            ? 0
            : Math.max(
                  0,
                  Math.min(1, ((point.x - from.x) * dx + (point.y - from.y) * dy) / lengthSq),
              );
    return {
        t,
        x: roundMeter(from.x + dx * t),
        y: roundMeter(from.y + dy * t),
    };
}

function nearestRoadAnchor(graph: RoadGraph, point: RealPoint, id: string): RoadAnchor | null {
    const nodes = nodeMap(graph);
    let best: RoadProjection | null = null;
    for (const edge of graph.edges) {
        const from = nodes.get(edge.from);
        const to = nodes.get(edge.to);
        if (!from || !to) {
            continue;
        }
        const projected = projectPointToSegment(point, from, to);
        if (!best || distance(projected, point) < distance(best.point, point)) {
            best = { edgeID: edge.id, from, point: projected, to };
        }
    }
    if (best) {
        if (best.point.t <= 0.001) {
            return { edges: [], id: best.from.id, point: best.from, virtual: false };
        }
        if (best.point.t >= 0.999) {
            return { edges: [], id: best.to.id, point: best.to, virtual: false };
        }
        return {
            edgeID: best.edgeID,
            edges: [
                { to: best.from.id, weight: distance(best.point, best.from) },
                { to: best.to.id, weight: distance(best.point, best.to) },
            ],
            id,
            point: best.point,
            virtual: true,
        };
    }
    const nearest = findNearestNode(graph, point);
    return nearest ? { edges: [], id: nearest.id, point: nearest, virtual: false } : null;
}

export function shortestNodePath(graph: RoadGraph, startId: string, endId: string): string[] {
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
        return [];
    }
    const path = [endId];
    let cursor = endId;
    while (cursor !== startId) {
        const previous = prev.get(cursor);
        if (!previous) {
            return [];
        }
        path.unshift(previous);
        cursor = previous;
    }
    return path;
}

export function pathDistance(graph: RoadGraph, startId: string, endId: string): number {
    const nodes = nodeMap(graph);
    const path = shortestNodePath(graph, startId, endId);
    if (path.length === 0) {
        return Number.POSITIVE_INFINITY;
    }
    return path.slice(1).reduce((sum, id, index) => {
        const from = nodes.get(path[index]);
        const to = nodes.get(id);
        return from && to ? sum + distance(from, to) : sum;
    }, 0);
}

function shortestRoadPathSteps(
    graph: RoadGraph,
    startPoint: RealPoint,
    targetPoint: RealPoint,
): RoadPathStep[] {
    if (graph.nodes.length === 0 || graph.edges.length === 0) {
        return [];
    }
    const baseNodes = nodeMap(graph);
    const start = nearestRoadAnchor(graph, startPoint, "__route_start");
    const target = nearestRoadAnchor(graph, targetPoint, "__route_target");
    if (!start || !target) {
        return [];
    }

    const points = new Map<string, RealPoint>();
    graph.nodes.forEach((node) => points.set(node.id, node));
    if (start.virtual) {
        points.set(start.id, start.point);
    }
    if (target.virtual) {
        points.set(target.id, target.point);
    }

    const adjacency = new Map<string, { id: string; weight: number }[]>();
    points.forEach((_, id) => adjacency.set(id, []));
    graph.edges.forEach((edge) => {
        const from = baseNodes.get(edge.from);
        const to = baseNodes.get(edge.to);
        if (!from || !to) {
            return;
        }
        addUndirectedEdge(adjacency, edge.from, edge.to, distance(from, to));
    });
    if (start.virtual) {
        start.edges.forEach((edge) => addUndirectedEdge(adjacency, start.id, edge.to, edge.weight));
    }
    if (target.virtual) {
        target.edges.forEach((edge) =>
            addUndirectedEdge(adjacency, target.id, edge.to, edge.weight),
        );
    }
    if (start.virtual && target.virtual && start.edgeID && start.edgeID === target.edgeID) {
        addUndirectedEdge(adjacency, start.id, target.id, distance(start.point, target.point));
    }

    const startId = start.id;
    const targetId = target.id;
    if (startId === targetId) {
        return [{ ...start.point, nodeID: start.virtual ? undefined : startId }];
    }

    const dist = new Map<string, number>();
    const prev = new Map<string, string>();
    const unvisited = new Set(points.keys());
    points.forEach((_, id) => dist.set(id, Number.POSITIVE_INFINITY));
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
        if (current === null || current === targetId) {
            break;
        }
        if ((dist.get(current) || Number.POSITIVE_INFINITY) === Number.POSITIVE_INFINITY) {
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

    if (!prev.has(targetId)) {
        return [];
    }
    const path = [targetId];
    let cursor = targetId;
    while (cursor !== startId) {
        const previous = prev.get(cursor);
        if (!previous) {
            return [];
        }
        path.unshift(previous);
        cursor = previous;
    }

    return path
        .map<RoadPathStep | null>((id) => {
            const point = points.get(id);
            return point ? { ...point, nodeID: baseNodes.has(id) ? id : undefined } : null;
        })
        .filter((point): point is RoadPathStep => point !== null);
}

export function nextIslandID(current: string): string {
    const match = current.match(/^([A-Z]+)(\d+)$/i);
    if (!match) {
        return current;
    }
    return `${match[1].toUpperCase()}${Number(match[2]) + 1}`;
}

export function idNumber(id: string): number {
    const match = id.match(/(\d+)$/);
    return match ? Number(match[1]) : Number.NaN;
}

export function formatMl(current?: number, capacity?: number): string {
    if (current == null && capacity == null) {
        return "-";
    }
    if (capacity == null) {
        return `${current || 0} ml`;
    }
    return `${current || 0}/${capacity} ml`;
}

export function createTaskPayload(
    mapConfig: MapConfig,
    plan: RoutePlan,
    points: GeneratedPoint[],
    deviceID: string,
    feedAmount: number,
    taskName: string,
): Record<string, unknown> {
    return {
        deviceID,
        feedAmount,
        gridScaleM: 1,
        mapID: mapConfig.mapID,
        planID: plan.planID,
        robotPath: points.map((point) => ({
            action: point.action,
            feedAmount: point.action === "feed" ? feedAmount : point.feedAmount,
            nodeID: point.nodeID,
            seq: point.seq,
            targetIslandID: point.targetIslandID,
            x: roundMeter(point.x),
            y: roundMeter(point.y),
        })),
        targetIslandIDs: plan.targetIslandIDs,
        taskID: `task-${Date.now()}`,
        taskName,
    };
}

export function appendUnique(points: GeneratedPoint[], point: Omit<GeneratedPoint, "seq">): void {
    const last = points[points.length - 1];
    if (last && distance(last, point) < 0.001 && last.action === point.action) {
        return;
    }
    points.push({ ...point, seq: points.length + 1 });
}

function zoneSortValue(zoneID: string): string {
    return zoneID || "";
}

function estimateRowTolerance(islands: Island[]): number {
    const values = [...new Set(islands.map((island) => Number(island.center.y.toFixed(3))))].sort(
        (a, b) => a - b,
    );
    const gaps = values
        .slice(1)
        .map((value, index) => value - values[index])
        .filter((value) => value > 0.05)
        .sort((a, b) => a - b);
    if (gaps.length === 0) {
        return 0.35;
    }
    const median = gaps[Math.floor(gaps.length / 2)];
    return Math.max(0.2, Math.min(1.5, median * 0.45));
}

function groupIslandRows(islands: Island[]): Island[][] {
    const tolerance = estimateRowTolerance(islands);
    const rows: { items: Island[]; y: number }[] = [];
    [...islands]
        .sort((a, b) => a.center.y - b.center.y || a.center.x - b.center.x)
        .forEach((island) => {
            const row = rows.find((item) => Math.abs(item.y - island.center.y) <= tolerance);
            if (!row) {
                rows.push({ items: [island], y: island.center.y });
                return;
            }
            row.items.push(island);
            row.y = row.items.reduce((sum, item) => sum + item.center.y, 0) / row.items.length;
        });
    return rows.sort((a, b) => a.y - b.y).map((row) => row.items);
}

function orderZoneIslandsForCoverage(islands: Island[], startPoint: RealPoint): Island[] {
    const rows = groupIslandRows(islands);
    const ordered: Island[] = [];
    let cursor = startPoint;
    let leftToRight = true;
    rows.forEach((row, index) => {
        const sorted = [...row].sort((a, b) => a.center.x - b.center.x);
        if (index === 0) {
            leftToRight =
                distance(cursor, sorted[0].center) <=
                distance(cursor, sorted[sorted.length - 1].center);
        } else {
            leftToRight = !leftToRight;
        }
        const rowOrder = leftToRight ? sorted : sorted.reverse();
        ordered.push(...rowOrder);
        cursor = rowOrder[rowOrder.length - 1].center;
    });
    return ordered;
}

function orderIslandsForCoverage(islands: Island[], startPoint: RealPoint): Island[] {
    const byZone = new Map<string, Island[]>();
    islands.forEach((island) => {
        const zoneID = island.zoneID || "";
        byZone.set(zoneID, [...(byZone.get(zoneID) || []), island]);
    });
    const ordered: Island[] = [];
    let cursor = startPoint;
    [...byZone.entries()]
        .sort(([a], [b]) =>
            zoneSortValue(a).localeCompare(zoneSortValue(b), undefined, { numeric: true }),
        )
        .forEach(([, zoneIslands]) => {
            const zoneOrder = orderZoneIslandsForCoverage(zoneIslands, cursor);
            ordered.push(...zoneOrder);
            cursor = zoneOrder[zoneOrder.length - 1]?.center || cursor;
        });
    return ordered;
}

export function buildGeneratedPath(
    mapConfig: MapConfig,
    selectedIslands: Island[],
    vehicle: VehicleStatus | null,
    feedAmount: number,
): GeneratedPoint[] {
    if (selectedIslands.length === 0) {
        return [];
    }
    if (mapConfig.roadGraph.nodes.length === 0 || mapConfig.roadGraph.edges.length === 0) {
        return [];
    }

    const feedPoint = (island: Island): RealPoint => island.center;
    const startPoint =
        vehicle?.location_x != null && vehicle.location_y != null
            ? { x: vehicle.location_x, y: vehicle.location_y }
            : mapConfig.roadGraph.nodes[0];
    const startRoad = shortestRoadPathSteps(mapConfig.roadGraph, startPoint, startPoint)[0];
    if (!startRoad) {
        return [];
    }
    const orderedIslands = orderIslandsForCoverage(selectedIslands, startPoint);
    const points: GeneratedPoint[] = [];
    appendUnique(points, {
        action: "start",
        nodeID: startRoad.nodeID,
        x: roundMeter(startRoad.x),
        y: roundMeter(startRoad.y),
    });

    let cursor = startRoad;
    for (const island of orderedIslands) {
        const roadSteps = shortestRoadPathSteps(mapConfig.roadGraph, cursor, feedPoint(island));
        if (roadSteps.length === 0) {
            return [];
        }
        roadSteps.slice(1, -1).forEach((step) => {
            appendUnique(points, {
                action: "pass",
                nodeID: step.nodeID,
                x: roundMeter(step.x),
                y: roundMeter(step.y),
            });
        });
        const stop = roadSteps[roadSteps.length - 1];
        appendUnique(points, {
            action: "feed",
            feedAmount,
            targetIslandID: island.id,
            x: roundMeter(stop.x),
            y: roundMeter(stop.y),
        });
        cursor = stop;
    }
    return points;
}

export function mapImageSrc(mapConfig: MapConfig, apiBase: string, imageVersion: number): string {
    return mapConfig.imageUrl
        ? `${apiUrl(apiBase, mapConfig.imageUrl)}${mapConfig.imageUrl.includes("?") ? "&" : "?"}v=${imageVersion}`
        : "";
}
