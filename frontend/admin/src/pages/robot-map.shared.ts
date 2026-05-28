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
    type: "inner" | "main";
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
        islands: Array.isArray(raw?.islands) ? raw.islands : [],
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

export function pathDistance(graph: RoadGraph, startId: string, endId: string): number {
    const nodes = nodeMap(graph);
    const path = shortestNodePath(graph, startId, endId);
    return path.slice(1).reduce((sum, id, index) => {
        const from = nodes.get(path[index]);
        const to = nodes.get(id);
        return from && to ? sum + distance(from, to) : sum;
    }, 0);
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

export function buildGeneratedPath(
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

export function mapImageSrc(mapConfig: MapConfig, apiBase: string, imageVersion: number): string {
    return mapConfig.imageUrl
        ? `${apiUrl(apiBase, mapConfig.imageUrl)}${mapConfig.imageUrl.includes("?") ? "&" : "?"}v=${imageVersion}`
        : "";
}
