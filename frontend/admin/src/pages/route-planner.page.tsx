import { environment } from "@helpers/environment.ts";
import {
    BoxSelectIcon,
    CheckIcon,
    CrosshairIcon,
    EraserIcon,
    HelpCircleIcon,
    InfoIcon,
    MapIcon,
    MoveIcon,
    PanelLeftIcon,
    PlusIcon,
    Redo2Icon,
    RefreshCwIcon,
    SaveIcon,
    TargetIcon,
    Trash2Icon,
    Undo2Icon,
    UploadIcon,
    WaypointsIcon,
    ZoomInIcon,
    ZoomOutIcon,
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
import {
    apiUrl,
    type Calibration,
    DEFAULT_MAP,
    distance,
    EMPTY_CALIBRATION,
    hasCalibration,
    idNumber,
    mapImageSrc,
    type MapConfig,
    type PixelPoint,
    pixelToReal,
    type RealPoint,
    type RoadEdge,
    realToPixel,
    type RoadNode,
    roundMeter,
    type RoutePlan,
    normalizeMap,
    normalizePlan,
    nextIslandID,
    nodeMap,
    type WizardStep,
    unwrapData,
} from "@/pages/robot-map.shared.ts";

type Mode = "autoGrid" | "calibrate" | "island" | "pan" | "road" | "select" | "zone";

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

type EditSnapshot = {
    autoGridAnchors: AutoGridAnchors;
    autoGridMaxCols: string;
    autoGridMaxRows: string;
    autoGridPick: AutoGridPick;
    autoGridStartID: string;
    autoGridZoneID: string;
    currentPlan: RoutePlan | null;
    islandID: string;
    islandZoneID: string;
    mapConfig: MapConfig;
    mode: Mode;
    roadCursorID: string | null;
    step: WizardStep;
    zoneDraft: RealPoint[];
    zoneID: string;
};

type FeedbackPoint = PixelPoint & {
    label: string;
};

type AutoGridPick = "bottomRight" | "down" | "origin" | "right" | null;

type AutoGridAnchors = {
    bottomRight?: RealPoint;
    down?: RealPoint;
    origin?: RealPoint;
    right?: RealPoint;
};

const MAX_ZOOM = 3;
const MIN_ZOOM = 0.25;
const ROAD_EDGE_SNAP_SCREEN_PX = 12;
const ROAD_NODE_SNAP_SCREEN_PX = 18;
const ZOOM_STEP = 1.15;

const MODE_OPTIONS: { icon: typeof MoveIcon; label: string; value: Mode }[] = [
    { icon: MoveIcon, label: "平移", value: "pan" },
    { icon: CrosshairIcon, label: "标定", value: "calibrate" },
    { icon: MapIcon, label: "区域", value: "zone" },
    { icon: TargetIcon, label: "犊牛岛", value: "island" },
    { icon: WaypointsIcon, label: "通道", value: "road" },
    { icon: BoxSelectIcon, label: "框选", value: "select" },
];

const STEPS: { description: string; title: string; value: WizardStep }[] = [
    {
        description: "导入一张犊牛岛区二维平面图，或从历史平面图继续编辑。",
        title: "导入平面图",
        value: "upload",
    },
    {
        description: "点击图上两个已知点，并填写它们的真实坐标，系统据此换算比例尺。",
        title: "两点标定",
        value: "calibration",
    },
    {
        description: "先画 A-F 区域，再标出每个犊牛岛旁的车辆投喂停靠点。",
        title: "犊牛岛标定",
        value: "islands",
    },
    {
        description: "沿主通道和内部通道逐点点击生成通道网络。",
        title: "通道路线",
        value: "roads",
    },
    {
        description: "命名地图和路线方案，只保存区域、投喂点和通道路线。",
        title: "保存方案",
        value: "save",
    },
];

function clampZoom(value: number): number {
    return Number(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value)).toFixed(3));
}

function pointInRect(point: PixelPoint, rect: SelectionRect): boolean {
    const left = Math.min(rect.startPx, rect.endPx);
    const right = Math.max(rect.startPx, rect.endPx);
    const top = Math.min(rect.startPy, rect.endPy);
    const bottom = Math.max(rect.startPy, rect.endPy);
    return point.px >= left && point.px <= right && point.py >= top && point.py <= bottom;
}

function lineDistance(point: RealPoint, a: RealPoint, b: RealPoint): number {
    const length = Math.max(distance(a, b), 0.0001);
    const t = Math.max(
        0,
        Math.min(
            1,
            ((point.x - a.x) * (b.x - a.x) + (point.y - a.y) * (b.y - a.y)) / (length * length),
        ),
    );
    return distance(point, { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
}

function projectPixelToSegment(
    point: PixelPoint,
    from: PixelPoint,
    to: PixelPoint,
): PixelPoint & { distancePx: number; t: number } {
    const dx = to.px - from.px;
    const dy = to.py - from.py;
    const lengthSq = dx * dx + dy * dy;
    const t =
        lengthSq <= 0.000001
            ? 0
            : Math.max(
                  0,
                  Math.min(1, ((point.px - from.px) * dx + (point.py - from.py) * dy) / lengthSq),
              );
    const projected = {
        px: from.px + dx * t,
        py: from.py + dy * t,
    };
    return {
        ...projected,
        distancePx: Math.hypot(projected.px - point.px, projected.py - point.py),
        t,
    };
}

function cloneJson<T>(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T;
}

function nextZoneIDValue(id: string): string {
    if (/^[A-Y]$/.test(id)) {
        return String.fromCharCode(id.charCodeAt(0) + 1);
    }
    return id;
}

function autoGridAnchorLabel(key: Exclude<AutoGridPick, null>): string {
    if (key === "origin") {
        return "左上端点";
    }
    if (key === "right") {
        return "右上端点";
    }
    if (key === "down") {
        return "左下端点";
    }
    return "右下端点";
}

function interpolatePoint(start: RealPoint, end: RealPoint, ratio: number): RealPoint {
    return {
        x: roundMeter(start.x + (end.x - start.x) * ratio),
        y: roundMeter(start.y + (end.y - start.y) * ratio),
    };
}

function parseAutoGridCount(value: string): number | null {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 1) {
        return null;
    }
    return Math.floor(parsed);
}

function remapPointForCalibration(
    point: RealPoint,
    previous: Calibration,
    next: Calibration,
): RealPoint {
    return pixelToReal(realToPixel(point, previous), next);
}

function remapMapForCalibration(mapConfig: MapConfig, nextCalibration: Calibration): MapConfig {
    const previous = mapConfig.calibration;
    if (!hasCalibration(previous) || !hasCalibration(nextCalibration)) {
        return { ...mapConfig, calibration: nextCalibration };
    }
    return {
        ...mapConfig,
        calibration: nextCalibration,
        islands: mapConfig.islands.map((island) => ({
            ...island,
            center: remapPointForCalibration(island.center, previous, nextCalibration),
            servicePoint: remapPointForCalibration(
                island.servicePoint || island.center,
                previous,
                nextCalibration,
            ),
        })),
        roadGraph: {
            ...mapConfig.roadGraph,
            nodes: mapConfig.roadGraph.nodes.map((node) => ({
                ...node,
                ...remapPointForCalibration(node, previous, nextCalibration),
            })),
        },
        zones: mapConfig.zones.map((zone) => ({
            ...zone,
            polygon: zone.polygon.map((point) =>
                remapPointForCalibration(point, previous, nextCalibration),
            ),
        })),
    };
}

function polygonCenter(points: RealPoint[]): RealPoint {
    if (points.length === 0) {
        return { x: 0, y: 0 };
    }
    return {
        x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
        y: points.reduce((sum, point) => sum + point.y, 0) / points.length,
    };
}

function isModeAllowedForStep(mode: Mode, step: WizardStep): boolean {
    if (mode === "pan") {
        return true;
    }
    if (mode === "select") {
        return step !== "upload";
    }
    if (step === "calibration") {
        return mode === "calibrate";
    }
    if (step === "islands") {
        return mode === "autoGrid" || mode === "island" || mode === "zone";
    }
    if (step === "roads") {
        return mode === "road";
    }
    return false;
}

function stepHelp(step: WizardStep): string[] {
    if (step === "upload") {
        return ["左侧列表管理历史平面图。", "点击新建后上传图片，图片和草稿会自动保存。"];
    }
    if (step === "calibration") {
        return [
            "点击 P1/P2 后在图上选择对应点。",
            "两个点距离越远比例尺越稳定，右键标记点或框选后可删除。",
        ];
    }
    if (step === "islands") {
        return [
            "区域模式逐点画 A-F 区域，点击完成区域保存。",
            "犊牛岛模式标的是车辆给该岛投喂时的停靠点，一个点就是一个犊牛岛。",
            "批量生成工具用左右端点和数量均分投喂点；多行时补充左下端点，右下端点可选。",
        ];
    }
    if (step === "roads") {
        return [
            "先点击路口节点作为连接起点，再点击另一个路口节点建立通路。",
            "同一个路口节点可以反复作为起点，连接三个或四个方向的通路。",
            "需要分叉时点击“选择新的连接起点”，再点已有路口节点继续连接。",
            "右键节点或边可删除；视觉上交叉的线不算连通，必须共用节点。",
        ];
    }
    return [
        "保存方案只保存当前平面图、区域、犊牛岛投喂点和道路网络。",
        "投喂目标和可下发路径在投喂任务页面生成。",
    ];
}

export const RoutePlannerPage: FC = () => {
    const fileRef = useRef<HTMLInputElement | null>(null);
    const viewportRef = useRef<HTMLDivElement | null>(null);
    const mapSaveTimerRef = useRef<number | null>(null);
    const planSaveTimerRef = useRef<number | null>(null);
    const feedbackTimerRef = useRef<number | null>(null);
    const saveNoticeTimerRef = useRef<number | null>(null);
    const skipMapSaveRef = useRef(false);
    const skipPlanSaveRef = useRef(false);
    const dragRef = useRef<DragState>(null);
    const roadCursorRef = useRef<string | null>(null);
    const apiBase = environment.apiHost || "";
    const [maps, setMaps] = useState<MapConfig[]>([]);
    const [plans, setPlans] = useState<RoutePlan[]>([]);
    const [mapConfig, setMapConfig] = useState<MapConfig>(DEFAULT_MAP);
    const [currentPlan, setCurrentPlan] = useState<RoutePlan | null>(null);
    const [step, setStep] = useState<WizardStep>("upload");
    const [mode, setMode] = useState<Mode>("pan");
    const [imageSize, setImageSize] = useState({ height: 900, width: 1400 });
    const [imageVersion, setImageVersion] = useState(0);
    const [offset, setOffset] = useState({ x: 24, y: 24 });
    const [zoom, setZoom] = useState(0.72);
    const [calibrationClick, setCalibrationClick] = useState<"p1" | "p2">("p1");
    const [zoneID, setZoneID] = useState("A");
    const [zoneDraft, setZoneDraft] = useState<RealPoint[]>([]);
    const [islandID, setIslandID] = useState("A1");
    const [islandZoneID, setIslandZoneID] = useState("A");
    const [roadEdgeType, setRoadEdgeType] = useState<"inner" | "main" | "robot">("main");
    const [roadCursorID, setRoadCursorID] = useState<string | null>(null);
    const [selectedMarkers, setSelectedMarkers] = useState<Set<string>>(new Set());
    const [selectionRect, setSelectionRect] = useState<SelectionRect | null>(null);
    const [planNameDraft, setPlanNameDraft] = useState("");
    const [mapSaveStatus, setMapSaveStatus] = useState("等待编辑");
    const [planSaveStatus, setPlanSaveStatus] = useState("等待方案");
    const [message, setMessage] = useState("请选择历史平面图或新建地图");
    const [history, setHistory] = useState<EditSnapshot[]>([]);
    const [futureHistory, setFutureHistory] = useState<EditSnapshot[]>([]);
    const [feedbackPoint, setFeedbackPoint] = useState<FeedbackPoint | null>(null);
    const [saveSuccessNotice, setSaveSuccessNotice] = useState("");
    const [showHelp, setShowHelp] = useState(true);
    const [autoGridAnchors, setAutoGridAnchors] = useState<AutoGridAnchors>({});
    const [autoGridPick, setAutoGridPick] = useState<AutoGridPick>(null);
    const [autoGridZoneID, setAutoGridZoneID] = useState("A");
    const [autoGridStartID, setAutoGridStartID] = useState("A1");
    const [autoGridMaxCols, setAutoGridMaxCols] = useState("80");
    const [autoGridMaxRows, setAutoGridMaxRows] = useState("12");

    const activeCalibration = useMemo(
        () => (hasCalibration(mapConfig.calibration) ? mapConfig.calibration : null),
        [mapConfig.calibration],
    );
    const autoGridColumnCount = useMemo(
        () => parseAutoGridCount(autoGridMaxCols),
        [autoGridMaxCols],
    );
    const autoGridRowCount = useMemo(() => parseAutoGridCount(autoGridMaxRows), [autoGridMaxRows]);
    const imageSrc = mapImageSrc(mapConfig, apiBase, imageVersion);
    const roadCursorNode = useMemo(
        () => mapConfig.roadGraph.nodes.find((node) => node.id === roadCursorID) || null,
        [mapConfig.roadGraph.nodes, roadCursorID],
    );

    const loadPlans = useCallback(
        async (mapID: string, preferredPlanID?: string) => {
            if (!mapID) {
                setPlans([]);
                setCurrentPlan(null);
                return;
            }
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
            const selected =
                data.find((plan) => plan.planID === preferredPlanID) || data[0] || null;
            skipPlanSaveRef.current = true;
            setCurrentPlan(selected);
            setPlanNameDraft(selected?.name || "");
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
            skipMapSaveRef.current = true;
            setMapConfig(data);
            setStep(data.currentStep || (data.imageUrl ? "calibration" : "upload"));
            setImageVersion(Date.now());
            setSelectedMarkers(new Set());
            setRoadCursor(null);
            resetAutoGridDraft();
            setMessage(`已打开 ${data.name || data.mapID}`);
            await loadPlans(data.mapID);
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
        if (data[0]?.mapID && !mapConfig.mapID) {
            await loadMap(data[0].mapID);
        }
    }, [apiBase, loadMap, mapConfig.mapID]);

    useEffect(() => {
        void loadMaps().catch((error) => setMessage(String(error)));
    }, [loadMaps]);

    useEffect(
        () => () => {
            if (feedbackTimerRef.current) {
                window.clearTimeout(feedbackTimerRef.current);
            }
            if (saveNoticeTimerRef.current) {
                window.clearTimeout(saveNoticeTimerRef.current);
            }
        },
        [],
    );

    useEffect(() => {
        if (step === "calibration") {
            setMode("calibrate");
        } else if (step === "islands") {
            setMode("zone");
        } else if (step === "roads") {
            setMode("road");
        } else if (step === "save") {
            setMode("pan");
        } else {
            setMode("pan");
        }
    }, [step]);

    useEffect(() => {
        if (!mapConfig.mapID) {
            return;
        }
        if (skipMapSaveRef.current) {
            skipMapSaveRef.current = false;
            return;
        }
        setMapSaveStatus("保存中...");
        if (mapSaveTimerRef.current) {
            window.clearTimeout(mapSaveTimerRef.current);
        }
        mapSaveTimerRef.current = window.setTimeout(() => {
            void saveMapNow(mapConfig)
                .then(() =>
                    setMapSaveStatus(
                        `已自动保存 ${new Date().toLocaleTimeString("zh-CN", { hour12: false })}`,
                    ),
                )
                .catch((error) => setMapSaveStatus(`保存失败 ${String(error)}`));
        }, 800);
        return () => {
            if (mapSaveTimerRef.current) {
                window.clearTimeout(mapSaveTimerRef.current);
            }
        };
    }, [mapConfig]);

    useEffect(() => {
        if (!currentPlan?.planID || !mapConfig.mapID) {
            return;
        }
        if (skipPlanSaveRef.current) {
            skipPlanSaveRef.current = false;
            return;
        }
        setPlanSaveStatus("保存中...");
        if (planSaveTimerRef.current) {
            window.clearTimeout(planSaveTimerRef.current);
        }
        planSaveTimerRef.current = window.setTimeout(() => {
            void savePlanNow(currentPlan)
                .then(() =>
                    setPlanSaveStatus(
                        `已自动保存 ${new Date().toLocaleTimeString("zh-CN", { hour12: false })}`,
                    ),
                )
                .catch((error) => setPlanSaveStatus(`保存失败 ${String(error)}`));
        }, 800);
        return () => {
            if (planSaveTimerRef.current) {
                window.clearTimeout(planSaveTimerRef.current);
            }
        };
    }, [currentPlan, mapConfig.mapID]);

    async function saveMapNow(data: MapConfig): Promise<void> {
        const response = await fetch(
            apiUrl(apiBase, `/api/maps/${encodeURIComponent(data.mapID)}`),
            {
                body: JSON.stringify(data),
                credentials: "same-origin",
                headers: { "Content-Type": "application/json" },
                method: "PATCH",
            },
        );
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        const saved = normalizeMap(unwrapData<Partial<MapConfig>>(await response.json()));
        setMaps((items) => [saved, ...items.filter((item) => item.mapID !== saved.mapID)]);
    }

    async function savePlanNow(data: RoutePlan): Promise<RoutePlan> {
        const response = await fetch(
            apiUrl(
                apiBase,
                `/api/maps/${encodeURIComponent(data.mapID)}/plans/${encodeURIComponent(data.planID)}`,
            ),
            {
                body: JSON.stringify(data),
                credentials: "same-origin",
                headers: { "Content-Type": "application/json" },
                method: "PATCH",
            },
        );
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        const saved = normalizePlan(
            unwrapData<Partial<RoutePlan>>(await response.json()),
            data.mapID,
        );
        setPlans((items) => [saved, ...items.filter((item) => item.planID !== saved.planID)]);
        return saved;
    }

    function setRoadCursor(id: string | null): void {
        roadCursorRef.current = id;
        setRoadCursorID(id);
    }

    function createSnapshot(): EditSnapshot {
        return {
            autoGridAnchors: cloneJson(autoGridAnchors),
            autoGridMaxCols,
            autoGridMaxRows,
            autoGridPick,
            autoGridStartID,
            autoGridZoneID,
            currentPlan: currentPlan ? cloneJson(currentPlan) : null,
            islandID,
            islandZoneID,
            mapConfig: cloneJson(mapConfig),
            mode,
            roadCursorID: roadCursorRef.current,
            step,
            zoneDraft: cloneJson(zoneDraft),
            zoneID,
        };
    }

    function restoreSnapshot(snapshot: EditSnapshot): void {
        setMapConfig(snapshot.mapConfig);
        setCurrentPlan(snapshot.currentPlan);
        setZoneDraft(snapshot.zoneDraft);
        setAutoGridAnchors(snapshot.autoGridAnchors);
        setAutoGridMaxCols(snapshot.autoGridMaxCols);
        setAutoGridMaxRows(snapshot.autoGridMaxRows);
        setAutoGridPick(snapshot.autoGridPick);
        setAutoGridStartID(snapshot.autoGridStartID);
        setAutoGridZoneID(snapshot.autoGridZoneID);
        setIslandID(snapshot.islandID);
        setIslandZoneID(snapshot.islandZoneID);
        setZoneID(snapshot.zoneID);
        setStep(snapshot.step);
        setMode(snapshot.mode);
        setRoadCursor(snapshot.roadCursorID);
        setSelectedMarkers(new Set());
    }

    function pushHistory(snapshot = createSnapshot()): void {
        setHistory((items) => [...items.slice(-29), snapshot]);
        setFutureHistory([]);
    }

    function clearGeneratedPath(): void {
        setCurrentPlan((plan) =>
            plan?.robotPath.length
                ? {
                      ...plan,
                      robotPath: [],
                  }
                : plan,
        );
    }

    function updateMap(
        mutator: (current: MapConfig) => MapConfig,
        recordHistory = true,
        invalidatePath = false,
    ): void {
        if (recordHistory) {
            pushHistory();
        }
        setMapConfig((current) => mutator(normalizeMap(current)));
        if (invalidatePath) {
            clearGeneratedPath();
        }
    }

    function undoLast(): void {
        const last = history[history.length - 1];
        if (!last) {
            return;
        }
        const current = createSnapshot();
        restoreSnapshot(last);
        setHistory((items) => items.slice(0, -1));
        setFutureHistory((items) => [current, ...items.slice(0, 29)]);
        setMessage("已撤回上一步");
    }

    function redoLast(): void {
        const next = futureHistory[0];
        if (!next) {
            return;
        }
        const current = createSnapshot();
        restoreSnapshot(next);
        setFutureHistory((items) => items.slice(1));
        setHistory((items) => [...items.slice(-29), current]);
        setMessage("已恢复下一步");
    }

    function showClickFeedback(point: PixelPoint, label: string): void {
        setFeedbackPoint({ ...point, label });
        if (feedbackTimerRef.current) {
            window.clearTimeout(feedbackTimerRef.current);
        }
        feedbackTimerRef.current = window.setTimeout(() => setFeedbackPoint(null), 1200);
    }

    async function createNewMap(): Promise<MapConfig> {
        const response = await fetch(apiUrl(apiBase, "/api/maps"), {
            body: JSON.stringify({ name: `犊牛岛平面图 ${new Date().toLocaleString("zh-CN")}` }),
            credentials: "same-origin",
            headers: { "Content-Type": "application/json" },
            method: "POST",
        });
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        const data = normalizeMap(unwrapData<Partial<MapConfig>>(await response.json()));
        skipMapSaveRef.current = true;
        setMapConfig(data);
        setStep("upload");
        resetAutoGridDraft();
        setRoadCursor(null);
        setPlans([]);
        setCurrentPlan(null);
        setMaps((items) => [data, ...items.filter((item) => item.mapID !== data.mapID)]);
        setMessage("新地图草稿已创建，请上传平面图");
        return data;
    }

    async function deleteCurrentMap(): Promise<void> {
        if (!mapConfig.mapID) {
            return;
        }
        if (!window.confirm(`删除平面图「${mapConfig.name || mapConfig.mapID}」及其路线方案？`)) {
            return;
        }
        const response = await fetch(
            apiUrl(apiBase, `/api/maps/${encodeURIComponent(mapConfig.mapID)}`),
            {
                credentials: "same-origin",
                method: "DELETE",
            },
        );
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        const remaining = maps.filter((item) => item.mapID !== mapConfig.mapID);
        setMaps(remaining);
        setPlans([]);
        setCurrentPlan(null);
        setPlanNameDraft("");
        setRoadCursor(null);
        setSelectedMarkers(new Set());
        setHistory([]);
        setFutureHistory([]);
        if (remaining[0]) {
            await loadMap(remaining[0].mapID);
        } else {
            skipMapSaveRef.current = true;
            setMapConfig(DEFAULT_MAP);
            setRoadCursor(null);
            setStep("upload");
        }
        setMessage("平面图已删除");
    }

    function clearIslandZones(): void {
        if (!window.confirm("清空已标区域和当前区域草稿？投喂点会保留。")) {
            return;
        }
        pushHistory();
        setMapConfig((current) => ({
            ...normalizeMap(current),
            zones: [],
        }));
        setZoneDraft([]);
        setAutoGridAnchors({});
        setAutoGridPick(null);
        setSelectedMarkers(new Set());
        clearGeneratedPath();
        setMessage("区域已清空，投喂点已保留");
    }

    function clearIslandPoints(): void {
        if (!window.confirm("清空所有犊牛岛投喂点？已标区域会保留。")) {
            return;
        }
        pushHistory();
        setMapConfig((current) => ({
            ...normalizeMap(current),
            islands: [],
        }));
        setCurrentPlan((plan) =>
            plan
                ? {
                      ...plan,
                      robotPath: [],
                      targetIslandIDs: [],
                  }
                : plan,
        );
        setAutoGridAnchors({});
        setAutoGridPick(null);
        setSelectedMarkers(new Set());
        setMessage("投喂点已清空，区域已保留");
    }

    function clearAutoGridAnchor(): void {
        const key = autoGridPick;
        if (!key || !autoGridAnchors[key]) {
            return;
        }
        pushHistory();
        setAutoGridAnchors((current) => {
            const next = { ...current };
            delete next[key];
            return next;
        });
        setMessage("当前样点已撤销，可重新点击地图标定");
    }

    function clearAutoGridAnchors(): void {
        if (
            !autoGridAnchors.bottomRight &&
            !autoGridAnchors.down &&
            !autoGridAnchors.origin &&
            !autoGridAnchors.right
        ) {
            return;
        }
        pushHistory();
        setAutoGridAnchors({});
        setMessage("批量标定样点已清空");
    }

    function resetAutoGridDraft(): void {
        setAutoGridAnchors({});
        setAutoGridPick(null);
    }

    function clearCurrentStep(): void {
        if (step === "islands") {
            setMessage("第三步请分别使用“清空区域”或“清空投喂点”");
            return;
        }
        if (!window.confirm("清空当前步骤中的标注内容？")) {
            return;
        }
        pushHistory();
        if (step === "calibration") {
            setMapConfig((current) => ({ ...current, calibration: null }));
            clearGeneratedPath();
        } else if (step === "roads") {
            setMapConfig((current) => ({ ...current, roadGraph: { edges: [], nodes: [] } }));
            setRoadCursor(null);
            clearGeneratedPath();
        }
        setSelectedMarkers(new Set());
        setMessage("当前步骤已清空");
    }

    function clearAllAnnotations(): void {
        if (!window.confirm("清空当前平面图的全部标定、犊牛岛、通道和可下发路径？")) {
            return;
        }
        pushHistory();
        setMapConfig((current) => ({
            ...current,
            calibration: null,
            currentStep: "upload",
            islands: [],
            roadGraph: { edges: [], nodes: [] },
            zones: [],
        }));
        setCurrentPlan((plan) =>
            plan
                ? {
                      ...plan,
                      robotPath: [],
                      targetIslandIDs: [],
                  }
                : plan,
        );
        setStep("upload");
        setRoadCursor(null);
        setZoneDraft([]);
        setAutoGridAnchors({});
        setAutoGridPick(null);
        setSelectedMarkers(new Set());
        setMessage("全部标注已清空");
    }

    async function createPlanDraft(overrides: Partial<RoutePlan> = {}): Promise<RoutePlan | null> {
        if (!mapConfig.mapID) {
            setMessage("请先创建或选择地图");
            return null;
        }
        const fallbackName = `路线方案 ${new Date().toLocaleString("zh-CN")}`;
        const response = await fetch(
            apiUrl(apiBase, `/api/maps/${encodeURIComponent(mapConfig.mapID)}/plans`),
            {
                body: JSON.stringify({
                    name: planNameDraft.trim() || fallbackName,
                    robotPath: [],
                    targetIslandIDs: [],
                    ...overrides,
                }),
                credentials: "same-origin",
                headers: { "Content-Type": "application/json" },
                method: "POST",
            },
        );
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        const data = normalizePlan(
            unwrapData<Partial<RoutePlan>>(await response.json()),
            mapConfig.mapID,
        );
        skipPlanSaveRef.current = true;
        setCurrentPlan(data);
        setPlans((items) => [data, ...items.filter((item) => item.planID !== data.planID)]);
        setPlanNameDraft(data.name || "");
        return data;
    }

    async function createNewPlan(): Promise<void> {
        const data = await createPlanDraft();
        if (!data) {
            return;
        }
        setMessage("新路线方案已创建");
    }

    async function saveDesignPlan(): Promise<void> {
        if (!mapConfig.mapID) {
            setMessage("请先创建或选择地图");
            return;
        }
        const name = planNameDraft.trim() || currentPlan?.name || "未命名路线方案";
        const mapToSave = normalizeMap({ ...mapConfig, currentStep: "save" });
        setMapSaveStatus("保存中...");
        await saveMapNow(mapToSave);
        skipMapSaveRef.current = true;
        setMapConfig(mapToSave);
        setMapSaveStatus(`已保存 ${new Date().toLocaleTimeString("zh-CN", { hour12: false })}`);

        setPlanSaveStatus("保存中...");
        if (currentPlan?.planID) {
            const saved = await savePlanNow({
                ...currentPlan,
                mapID: mapConfig.mapID,
                name,
                robotPath: [],
                targetIslandIDs: [],
            });
            skipPlanSaveRef.current = true;
            setCurrentPlan(saved);
            setPlanNameDraft(saved.name || name);
        } else {
            await createPlanDraft({
                name,
                robotPath: [],
                targetIslandIDs: [],
            });
        }
        setPlanSaveStatus(`已保存 ${new Date().toLocaleTimeString("zh-CN", { hour12: false })}`);
        const successText = `「${name}」保存成功：区域 ${mapConfig.zones.length}、投喂点 ${mapConfig.islands.length}、通道节点 ${mapConfig.roadGraph.nodes.length}、通道边 ${mapConfig.roadGraph.edges.length}`;
        setMessage(successText);
        setSaveSuccessNotice(successText);
        if (saveNoticeTimerRef.current) {
            window.clearTimeout(saveNoticeTimerRef.current);
        }
        saveNoticeTimerRef.current = window.setTimeout(() => setSaveSuccessNotice(""), 4_000);
    }

    async function uploadImage(event: ChangeEvent<HTMLInputElement>): Promise<void> {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (!file) {
            return;
        }
        let targetMap = mapConfig;
        if (!targetMap.mapID) {
            targetMap = await createNewMap();
        }
        const mapID = targetMap.mapID || maps[0]?.mapID;
        if (!mapID) {
            setMessage("地图创建失败，请重试");
            return;
        }
        const data = new FormData();
        data.append("file", file);
        const response = await fetch(
            apiUrl(apiBase, `/api/maps/${encodeURIComponent(mapID)}/image`),
            {
                body: data,
                credentials: "same-origin",
                method: "POST",
            },
        );
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        const next = normalizeMap(unwrapData<Partial<MapConfig>>(await response.json()));
        setMapConfig({ ...next, currentStep: "calibration" });
        clearGeneratedPath();
        setStep("calibration");
        setRoadCursor(null);
        resetAutoGridDraft();
        setImageVersion(Date.now());
        setMessage("平面图已上传，请进行两点标定");
    }

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

    function setStepAndSave(value: WizardStep): void {
        if (value !== "roads") {
            setRoadCursor(null);
        }
        if (value !== "islands") {
            resetAutoGridDraft();
        }
        dragRef.current = null;
        setSelectionRect(null);
        setSelectedMarkers(new Set());
        setStep(value);
        updateMap((current) => ({ ...current, currentStep: value }));
    }

    function chooseMode(nextMode: Mode): void {
        if (!isModeAllowedForStep(nextMode, step)) {
            setMessage("该工具只能在对应步骤中使用，请先切换到正确步骤");
            return;
        }
        if (
            step === "islands" &&
            zoneDraft.length > 0 &&
            nextMode !== "zone" &&
            nextMode !== "pan" &&
            nextMode !== "select"
        ) {
            setMessage("当前区域还未完成，请先点击完成区域或框选删除草稿点");
            return;
        }
        dragRef.current = null;
        setSelectionRect(null);
        if (nextMode !== "autoGrid") {
            setAutoGridPick(null);
        }
        setMode(nextMode);
    }

    function setCalibrationPoint(which: "p1" | "p2", point: PixelPoint): void {
        updateMap(
            (data) => {
                const current = data.calibration || EMPTY_CALIBRATION;
                const nextCalibration = {
                    ...current,
                    [which]: {
                        ...current[which],
                        px: Number(point.px.toFixed(1)),
                        py: Number(point.py.toFixed(1)),
                    },
                };
                return remapMapForCalibration(data, nextCalibration);
            },
            true,
            true,
        );
        setCalibrationClick(which === "p1" ? "p2" : "p1");
    }

    function updateCalibrationValue(
        which: "p1" | "p2",
        key: "px" | "py" | "x" | "y",
        value: number,
    ): void {
        updateMap(
            (data) => {
                const current = data.calibration || EMPTY_CALIBRATION;
                const nextCalibration = {
                    ...current,
                    [which]: { ...current[which], [key]: value },
                };
                return remapMapForCalibration(data, nextCalibration);
            },
            true,
            true,
        );
    }

    function handleMapClick(point: PixelPoint): void {
        const real = pixelToReal(point, activeCalibration);
        if (step === "calibration" && mode === "calibrate") {
            showClickFeedback(point, calibrationClick.toUpperCase());
            setCalibrationPoint(calibrationClick, point);
            return;
        }
        if (step === "islands" && mode === "autoGrid") {
            setAutoGridAnchor(point, real);
            return;
        }
        if (step === "islands" && mode === "zone") {
            pushHistory();
            clearGeneratedPath();
            showClickFeedback(point, `区域点 ${zoneDraft.length + 1}`);
            setZoneDraft((items) => [...items, real]);
            return;
        }
        if (step === "islands" && mode === "island") {
            if (!islandID.trim()) {
                setMessage("请填写犊牛岛编号");
                return;
            }
            const nextIsland = {
                center: real,
                id: islandID.trim().toUpperCase(),
                servicePoint: real,
                zoneID: islandZoneID.trim().toUpperCase() || "A",
            };
            updateMap(
                (current) => ({
                    ...current,
                    islands: [
                        ...current.islands.filter((item) => item.id !== nextIsland.id),
                        nextIsland,
                    ],
                }),
                true,
                true,
            );
            showClickFeedback(point, nextIsland.id);
            setIslandID(nextIslandID(nextIsland.id));
            setMessage(`${nextIsland.id} 投喂点已标注`);
            return;
        }
        if (step === "roads" && mode === "road") {
            showClickFeedback(point, "通道点");
            addRoadPoint(real);
        }
    }

    function setAutoGridAnchor(point: PixelPoint, real: RealPoint): void {
        if (!autoGridPick) {
            setMessage("请先在右侧批量生成工具中选择要标定的样点");
            return;
        }
        pushHistory();
        setAutoGridAnchors((current) => ({ ...current, [autoGridPick]: real }));
        const label = autoGridAnchorLabel(autoGridPick);
        showClickFeedback(point, label);
        setMessage(`${label}已标，可继续点击微调，满意后再切换下一个端点`);
    }

    function generateAutoGridIslands(): void {
        const selectedZoneID = mapConfig.zones.some((item) => item.id === autoGridZoneID)
            ? autoGridZoneID
            : mapConfig.zones[0]?.id || autoGridZoneID;
        const zone = mapConfig.zones.find((item) => item.id === selectedZoneID);
        const origin = autoGridAnchors.origin;
        const right = autoGridAnchors.right;
        if (!zone || !origin || !right) {
            setMessage("请先选择区域，并标左上端点和右上端点");
            return;
        }
        const rowCount = autoGridRowCount;
        const columnCount = autoGridColumnCount;
        if (!rowCount || !columnCount) {
            setMessage("请输入有效的行数和每行数量，数值必须大于等于 1");
            return;
        }
        const horizontalLength = distance(origin, right);
        if (horizontalLength < 0.05) {
            setMessage("左右端点距离太近，无法计算间距");
            return;
        }
        if (rowCount > 1 && !autoGridAnchors.down) {
            setMessage("多行生成需要标左下端点；右下端点可选");
            return;
        }
        const prefix = autoGridStartID.match(/^[A-Z]+/i)?.[0]?.toUpperCase() || zone.id;
        const startNumber = idNumber(autoGridStartID);
        let nextNumber = Number.isFinite(startNumber) ? startNumber : 1;
        const created = [];
        const topLeft = origin;
        const topRight = right;
        const bottomLeft = autoGridAnchors.down || origin;
        const bottomRight =
            autoGridAnchors.bottomRight ||
            (autoGridAnchors.down
                ? {
                      x: roundMeter(autoGridAnchors.down.x + right.x - origin.x),
                      y: roundMeter(autoGridAnchors.down.y + right.y - origin.y),
                  }
                : right);
        for (let row = 0; row < rowCount; row += 1) {
            const rowRatio = rowCount === 1 ? 0 : row / (rowCount - 1);
            const rowStart = interpolatePoint(topLeft, bottomLeft, rowRatio);
            const rowEnd = interpolatePoint(topRight, bottomRight, rowRatio);
            for (let col = 0; col < columnCount; col += 1) {
                const columnRatio = columnCount === 1 ? 0 : col / (columnCount - 1);
                const candidate = interpolatePoint(rowStart, rowEnd, columnRatio);
                created.push({
                    center: candidate,
                    id: `${prefix}${nextNumber}`,
                    servicePoint: candidate,
                    zoneID: zone.id,
                });
                nextNumber += 1;
            }
        }
        applyGeneratedAutoGrid(created, prefix, zone.id);
    }

    function applyGeneratedAutoGrid(
        created: { center: RealPoint; id: string; servicePoint: RealPoint; zoneID: string }[],
        prefix: string,
        zoneID: string,
    ): void {
        if (created.length === 0) {
            const text = "没有生成投喂点，请检查当前区域、起始编号、行数、每行数量和端点";
            setMessage(text);
            window.alert(text);
            return;
        }
        if (
            !window.confirm(
                `将覆盖 ${zoneID} 区已有 ${prefix} 编号犊牛岛，并生成 ${created.length} 个投喂点？`,
            )
        ) {
            return;
        }
        updateMap(
            (current) => {
                const generatedIds = new Set(created.map((island) => island.id));
                return {
                    ...current,
                    islands: [
                        ...current.islands.filter(
                            (island) => island.zoneID !== zoneID && !generatedIds.has(island.id),
                        ),
                        ...created,
                    ],
                };
            },
            true,
            true,
        );
        setIslandZoneID(zoneID);
        setIslandID(nextIslandID(created[created.length - 1].id));
        setMode("island");
        setMessage(`已自动生成 ${created.length} 个犊牛岛投喂点，可继续补充或进入通道路线`);
    }

    function findRoadEdgeSnap(point: RealPoint): {
        edge: RoadEdge;
        point: RealPoint;
        screenDistance: number;
    } | null {
        const graph = mapConfig.roadGraph;
        const nodes = nodeMap(graph);
        const pointPixel = realToPixel(point, activeCalibration);
        let best: { edge: RoadEdge; point: RealPoint; screenDistance: number } | null = null;
        graph.edges.forEach((edge) => {
            const from = nodes.get(edge.from);
            const to = nodes.get(edge.to);
            if (!from || !to) {
                return;
            }
            const fromPixel = realToPixel(from, activeCalibration);
            const toPixel = realToPixel(to, activeCalibration);
            const projected = projectPixelToSegment(pointPixel, fromPixel, toPixel);
            if (projected.t <= 0.02 || projected.t >= 0.98) {
                return;
            }
            const screenDistance = projected.distancePx * zoom;
            if (screenDistance > ROAD_EDGE_SNAP_SCREEN_PX) {
                return;
            }
            const projectedReal = interpolatePoint(from, to, projected.t);
            if (!best || screenDistance < best.screenDistance) {
                best = { edge, point: projectedReal, screenDistance };
            }
        });
        return best;
    }

    function addRoadPoint(point: RealPoint): void {
        const graph = mapConfig.roadGraph;
        const pointPixel = realToPixel(point, activeCalibration);
        const nearest = graph.nodes.reduce<{
            node: RoadNode;
            screenDistance: number;
        } | null>((best, node) => {
            const nodePixel = realToPixel(node, activeCalibration);
            const screenDistance =
                Math.hypot(nodePixel.px - pointPixel.px, nodePixel.py - pointPixel.py) * zoom;
            return !best || screenDistance < best.screenDistance ? { node, screenDistance } : best;
        }, null);
        const reuse = Boolean(nearest && nearest.screenDistance <= ROAD_NODE_SNAP_SCREEN_PX);
        const edgeSnap = reuse ? null : findRoadEdgeSnap(point);
        const previousID = roadCursorRef.current;
        const timestamp = Date.now();
        const node: RoadNode =
            reuse && nearest
                ? nearest.node
                : {
                      id: `n${timestamp}`,
                      x: roundMeter(edgeSnap?.point.x ?? point.x),
                      y: roundMeter(edgeSnap?.point.y ?? point.y),
                  };
        const edgeExistsBefore =
            graph.edges.some(
                (edge) =>
                    previousID &&
                    ((edge.from === previousID && edge.to === node.id) ||
                        (edge.from === node.id && edge.to === previousID)),
            ) ||
            Boolean(
                previousID &&
                edgeSnap &&
                [edgeSnap.edge.from, edgeSnap.edge.to].includes(previousID),
            );
        pushHistory();
        setRoadCursor(node.id);
        setMapConfig((current) => {
            const data = normalizeMap(current);
            const nodes = reuse ? data.roadGraph.nodes : [...data.roadGraph.nodes, node];
            const splitEdge = edgeSnap
                ? data.roadGraph.edges.find((edge) => edge.id === edgeSnap.edge.id)
                : null;
            const splitEdges =
                splitEdge && !reuse
                    ? [
                          {
                              from: splitEdge.from,
                              id: `e${timestamp}a`,
                              to: node.id,
                              type: splitEdge.type,
                          },
                          {
                              from: node.id,
                              id: `e${timestamp}b`,
                              to: splitEdge.to,
                              type: splitEdge.type,
                          },
                      ]
                    : [];
            const baseEdges =
                splitEdge && !reuse
                    ? [
                          ...data.roadGraph.edges.filter((edge) => edge.id !== splitEdge.id),
                          ...splitEdges,
                      ]
                    : data.roadGraph.edges;
            const edgeExistsAfterSplit = baseEdges.some(
                (edge) =>
                    previousID &&
                    ((edge.from === previousID && edge.to === node.id) ||
                        (edge.from === node.id && edge.to === previousID)),
            );
            const edges =
                previousID && previousID !== node.id && !edgeExistsBefore && !edgeExistsAfterSplit
                    ? [
                          ...baseEdges,
                          {
                              from: previousID,
                              id: `e${timestamp}c`,
                              to: node.id,
                              type: roadEdgeType,
                          },
                      ]
                    : baseEdges;
            return { ...data, roadGraph: { edges, nodes } };
        });
        clearGeneratedPath();
        if (!previousID || previousID === node.id) {
            setMessage(
                reuse
                    ? `已吸附并合并到已有路口节点 ${node.id}，作为连接起点`
                    : edgeSnap
                      ? `已吸附到已有通路并新增路口节点 ${node.id}，原通路已自动拆分`
                      : `已标注路口节点 ${node.id}，请继续点击下一个路口建立通路`,
            );
            return;
        }
        setMessage(
            edgeExistsBefore
                ? `节点 ${previousID} 与 ${node.id} 已存在通路，当前连接起点切换为 ${node.id}`
                : edgeSnap
                  ? `已吸附到已有通路并连接 ${previousID} -> ${node.id}，原通路已自动拆分`
                  : `已连接 ${previousID} -> ${node.id}，可继续连接或重新选择起点`,
        );
    }

    function handleMouseDown(event: MouseEvent<HTMLDivElement>): void {
        event.preventDefault();
        if (event.button !== 0 && event.button !== 2) {
            return;
        }
        dragRef.current = null;
        const point = viewportPoint(event.clientX, event.clientY);
        if (!point) {
            return;
        }
        if (mode === "select" && event.button === 0) {
            dragRef.current = { startPx: point.px, startPy: point.py, type: "select" };
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
        event.preventDefault();
        if (drag.type === "pan" && event.buttons === 0) {
            dragRef.current = null;
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
            return;
        }
        const dx = event.clientX - drag.startClientX;
        const dy = event.clientY - drag.startClientY;
        drag.moved = drag.moved || Math.hypot(dx, dy) > 3;
        drag.clientX = event.clientX;
        drag.clientY = event.clientY;
        if (mode === "pan" || event.buttons === 2 || event.altKey) {
            setOffset({ x: drag.startOffsetX + dx, y: drag.startOffsetY + dy });
        }
    }

    function handleMouseUp(event: MouseEvent<HTMLDivElement>): void {
        event.preventDefault();
        const drag = dragRef.current;
        dragRef.current = null;
        const point = viewportPoint(event.clientX, event.clientY);
        if (!drag || !point) {
            setSelectionRect(null);
            return;
        }
        if (event.button !== 0) {
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
            const selected = selectMarkers(rect);
            setSelectedMarkers(selected);
            setMessage(
                selected.size
                    ? `已框选 ${selected.size} 个对象，可点击删除选中`
                    : "框选区域内没有可删除对象",
            );
            setSelectionRect(null);
            return;
        }
        if (!drag.moved && mode !== "pan") {
            handleMapClick(point);
        }
    }

    function handleMouseLeave(): void {
        dragRef.current = null;
        setSelectionRect(null);
    }

    function handleContextMenu(event: MouseEvent<HTMLDivElement>): void {
        event.preventDefault();
        if (selectedMarkers.size > 0) {
            deleteSelected();
            return;
        }
        const point = viewportPoint(event.clientX, event.clientY);
        if (!point) {
            return;
        }
        deleteNearest(point);
    }

    function handleWheel(event: WheelEvent<HTMLDivElement>): void {
        event.preventDefault();
        setOffset((current) => ({ x: current.x - event.deltaX, y: current.y - event.deltaY }));
    }

    function zoomBy(factor: number): void {
        const viewport = viewportRef.current;
        const nextZoom = clampZoom(zoom * factor);
        if (!viewport || nextZoom === zoom) {
            setZoom(nextZoom);
            return;
        }
        const rect = viewport.getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const imageX = (centerX - offset.x) / zoom;
        const imageY = (centerY - offset.y) / zoom;
        setZoom(nextZoom);
        setOffset({ x: centerX - imageX * nextZoom, y: centerY - imageY * nextZoom });
    }

    function selectMarkers(rect: SelectionRect): Set<string> {
        const selected = new Set<string>();
        if (step === "calibration" && mapConfig.calibration) {
            (["p1", "p2"] as const).forEach((key) => {
                const point = mapConfig.calibration?.[key];
                if (point && pointInRect({ px: point.px, py: point.py }, rect)) {
                    selected.add(`cal:${key}`);
                }
            });
        }
        if (step === "islands") {
            zoneDraft.forEach((draftPoint, index) => {
                if (pointInRect(realToPixel(draftPoint, activeCalibration), rect)) {
                    selected.add(`draft:${index}`);
                }
            });
            if (selected.size > 0) {
                return selected;
            }
            const islandMarkers = new Set<string>();
            mapConfig.islands.forEach((island) => {
                if (pointInRect(realToPixel(island.center, activeCalibration), rect)) {
                    islandMarkers.add(`island:${island.id}`);
                }
            });
            if (islandMarkers.size > 0) {
                islandMarkers.forEach((marker) => selected.add(marker));
                return selected;
            }
            mapConfig.zones.forEach((zone) => {
                const center = realToPixel(polygonCenter(zone.polygon), activeCalibration);
                if (
                    pointInRect(center, rect) ||
                    zone.polygon.some((point) =>
                        pointInRect(realToPixel(point, activeCalibration), rect),
                    )
                ) {
                    selected.add(`zone:${zone.id}`);
                }
            });
        }
        if (step === "roads") {
            mapConfig.roadGraph.nodes.forEach((node) => {
                if (pointInRect(realToPixel(node, activeCalibration), rect)) {
                    selected.add(`node:${node.id}`);
                }
            });
            const nodes = nodeMap(mapConfig.roadGraph);
            mapConfig.roadGraph.edges.forEach((edge) => {
                const from = nodes.get(edge.from);
                const to = nodes.get(edge.to);
                if (!from || !to) {
                    return;
                }
                const fromPx = realToPixel(from, activeCalibration);
                const toPx = realToPixel(to, activeCalibration);
                const midPx = {
                    px: (fromPx.px + toPx.px) / 2,
                    py: (fromPx.py + toPx.py) / 2,
                };
                if (
                    pointInRect(fromPx, rect) ||
                    pointInRect(toPx, rect) ||
                    pointInRect(midPx, rect)
                ) {
                    selected.add(`edge:${edge.id}`);
                }
            });
        }
        return selected;
    }

    function deleteNearest(point: PixelPoint): void {
        if (step === "calibration" && mapConfig.calibration) {
            const entries = (["p1", "p2"] as const).map((key) => ({
                key,
                px: mapConfig.calibration?.[key].px || 0,
                py: mapConfig.calibration?.[key].py || 0,
            }));
            const nearest = entries.reduce((best, item) =>
                Math.hypot(item.px - point.px, item.py - point.py) <
                Math.hypot(best.px - point.px, best.py - point.py)
                    ? item
                    : best,
            );
            if (Math.hypot(nearest.px - point.px, nearest.py - point.py) < 20 / zoom) {
                deleteSelected(new Set([`cal:${nearest.key}`]));
            }
        }
        const real = pixelToReal(point, activeCalibration);
        if (step === "islands") {
            const nearestIsland = mapConfig.islands.reduce<{ id: string; value: number } | null>(
                (best, island) => {
                    const value = distance(real, island.center);
                    return !best || value < best.value ? { id: island.id, value } : best;
                },
                null,
            );
            if (nearestIsland && nearestIsland.value < 1.5) {
                setSelectedMarkers(new Set([`island:${nearestIsland.id}`]));
                deleteSelected(new Set([`island:${nearestIsland.id}`]));
            }
        }
        if (step === "roads") {
            const nearestNode = mapConfig.roadGraph.nodes.reduce<{
                id: string;
                value: number;
            } | null>((best, node) => {
                const value = distance(real, node);
                return !best || value < best.value ? { id: node.id, value } : best;
            }, null);
            if (nearestNode && nearestNode.value < 1.5) {
                deleteSelected(new Set([`node:${nearestNode.id}`]));
                return;
            }
            const nodes = nodeMap(mapConfig.roadGraph);
            const nearestEdge = mapConfig.roadGraph.edges.reduce<{
                id: string;
                value: number;
            } | null>((best, edge) => {
                const from = nodes.get(edge.from);
                const to = nodes.get(edge.to);
                if (!from || !to) {
                    return best;
                }
                const value = lineDistance(real, from, to);
                return !best || value < best.value ? { id: edge.id, value } : best;
            }, null);
            if (nearestEdge && nearestEdge.value < 1.5) {
                updateMap(
                    (current) => ({
                        ...current,
                        roadGraph: {
                            ...current.roadGraph,
                            edges: current.roadGraph.edges.filter(
                                (edge) => edge.id !== nearestEdge.id,
                            ),
                        },
                    }),
                    true,
                    true,
                );
            }
        }
    }

    function deleteSelected(markers = selectedMarkers): void {
        if (markers.size === 0) {
            return;
        }
        const draftIndexes = new Set(
            [...markers]
                .filter((id) => id.startsWith("draft:"))
                .map((id) => Number(id.slice(6)))
                .filter(Number.isFinite),
        );
        const hasMapMarkers = [...markers].some((id) => !id.startsWith("draft:"));
        if (draftIndexes.size > 0 && !hasMapMarkers) {
            pushHistory();
        }
        if (draftIndexes.size > 0) {
            setZoneDraft((items) => items.filter((_, index) => !draftIndexes.has(index)));
        }
        if (hasMapMarkers) {
            const deletedNodeIds = new Set(
                [...markers].filter((id) => id.startsWith("node:")).map((id) => id.slice(5)),
            );
            if (roadCursorRef.current && deletedNodeIds.has(roadCursorRef.current)) {
                setRoadCursor(null);
            }
            updateMap(
                (current) => {
                    let calibration = current.calibration;
                    if (calibration && markers.has("cal:p1")) {
                        calibration = { ...calibration, p1: EMPTY_CALIBRATION.p1 };
                    }
                    if (calibration && markers.has("cal:p2")) {
                        calibration = { ...calibration, p2: EMPTY_CALIBRATION.p2 };
                    }
                    const islandIds = new Set(
                        [...markers]
                            .filter((id) => id.startsWith("island:"))
                            .map((id) => id.slice(7)),
                    );
                    const zoneIds = new Set(
                        [...markers]
                            .filter((id) => id.startsWith("zone:"))
                            .map((id) => id.slice(5)),
                    );
                    const nodeIds = new Set(
                        [...markers]
                            .filter((id) => id.startsWith("node:"))
                            .map((id) => id.slice(5)),
                    );
                    const edgeIds = new Set(
                        [...markers]
                            .filter((id) => id.startsWith("edge:"))
                            .map((id) => id.slice(5)),
                    );
                    return {
                        ...current,
                        calibration,
                        islands: current.islands.filter((island) => !islandIds.has(island.id)),
                        roadGraph: {
                            edges: current.roadGraph.edges.filter(
                                (edge) =>
                                    !edgeIds.has(edge.id) &&
                                    !nodeIds.has(edge.from) &&
                                    !nodeIds.has(edge.to),
                            ),
                            nodes: current.roadGraph.nodes.filter((node) => !nodeIds.has(node.id)),
                        },
                        zones:
                            islandIds.size > 0
                                ? current.zones
                                : current.zones.filter((zone) => !zoneIds.has(zone.id)),
                    };
                },
                true,
                true,
            );
        }
        setSelectedMarkers(new Set());
        setMessage(`已删除 ${markers.size} 个选中对象`);
    }

    function completeZone(): void {
        if (zoneDraft.length < 3) {
            setMessage("区域至少需要 3 个点");
            return;
        }
        const id = zoneID.trim().toUpperCase() || "A";
        pushHistory();
        setMapConfig((current) => {
            const data = normalizeMap(current);
            return {
                ...data,
                zones: [
                    ...data.zones.filter((zone) => zone.id !== id),
                    { id, name: `${id}区`, polygon: zoneDraft },
                ],
            };
        });
        clearGeneratedPath();
        setZoneDraft([]);
        setZoneID(nextZoneIDValue(id));
        setAutoGridZoneID(id);
        setAutoGridStartID(`${id}1`);
        setMessage(`${id}区已完成，可继续标下一区域或开始标犊牛岛投喂点`);
    }

    const savedZoneIDs = useMemo(
        () => mapConfig.zones.map((zone) => zone.id).sort(),
        [mapConfig.zones],
    );

    const stepInfo = STEPS.find((item) => item.value === step) || STEPS[0];

    return (
        <LayoutContent fixed className="h-[calc(100vh-4rem)]">
            <div className="ops-workspace grid h-full grid-cols-[260px_minmax(0,1fr)_400px] text-slate-100 max-2xl:grid-cols-[240px_minmax(0,1fr)_380px] max-xl:grid-cols-1">
                <aside className="flex min-h-0 flex-col gap-3 overflow-y-auto border-r border-white/10 bg-slate-950 p-3">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                        <PanelLeftIcon className="h-4 w-4 text-cyan-300" />
                        平面图列表
                    </div>
                    <button
                        className="inline-flex items-center justify-center gap-2 rounded-md bg-cyan-400 px-3 py-2 text-sm font-medium text-slate-950 hover:bg-cyan-300"
                        type="button"
                        onClick={() =>
                            void createNewMap().catch((error) => setMessage(String(error)))
                        }
                    >
                        <PlusIcon className="h-4 w-4" />
                        新增平面图
                    </button>
                    <div className="grid gap-2">
                        {maps.map((item) => (
                            <button
                                key={item.mapID}
                                className={`rounded-md border p-3 text-left text-sm ${
                                    item.mapID === mapConfig.mapID
                                        ? "border-cyan-400 bg-cyan-400 text-slate-950"
                                        : "border-white/10 bg-slate-900 text-slate-300 hover:bg-slate-800"
                                }`}
                                type="button"
                                onClick={() =>
                                    void loadMap(item.mapID).catch((error) =>
                                        setMessage(String(error)),
                                    )
                                }
                            >
                                <span className="block font-medium">{item.name || item.mapID}</span>
                                <span className="mt-1 block text-xs opacity-75">
                                    区域 {item.zones.length} · 犊牛岛 {item.islands.length}
                                </span>
                            </button>
                        ))}
                    </div>
                    <div className="mt-auto grid gap-2 border-t border-white/10 pt-3">
                        <button
                            className="inline-flex items-center justify-center gap-2 rounded-md bg-slate-800 px-3 py-2 text-sm hover:bg-slate-700 disabled:opacity-40"
                            disabled={!mapConfig.mapID}
                            type="button"
                            onClick={() =>
                                void saveMapNow(mapConfig).catch((error) =>
                                    setMessage(String(error)),
                                )
                            }
                        >
                            <SaveIcon className="h-4 w-4" />
                            保存当前平面图
                        </button>
                        <button
                            className="inline-flex items-center justify-center gap-2 rounded-md bg-rose-500 px-3 py-2 text-sm font-medium text-white hover:bg-rose-400 disabled:opacity-40"
                            disabled={!mapConfig.mapID}
                            type="button"
                            onClick={() =>
                                void deleteCurrentMap().catch((error) => setMessage(String(error)))
                            }
                        >
                            <Trash2Icon className="h-4 w-4" />
                            删除当前平面图
                        </button>
                    </div>
                </aside>
                <main
                    ref={viewportRef}
                    className="ops-map-surface relative min-h-[620px] overflow-hidden border-r border-white/10 bg-slate-950"
                    onContextMenu={handleContextMenu}
                    onMouseDown={handleMouseDown}
                    onMouseLeave={handleMouseLeave}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onWheel={handleWheel}
                >
                    <div
                        className="ops-toolbar absolute left-4 top-4 z-20 flex flex-wrap items-center gap-2 rounded-md border border-white/10 bg-slate-900/90 p-2"
                        onClick={(event) => event.stopPropagation()}
                        onMouseDown={(event) => event.stopPropagation()}
                        onMouseUp={(event) => event.stopPropagation()}
                    >
                        {MODE_OPTIONS.map((item) => {
                            const Icon = item.icon;
                            const disabled = !isModeAllowedForStep(item.value, step);
                            return (
                                <button
                                    key={item.value}
                                    className={`inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm disabled:cursor-not-allowed disabled:opacity-35 ${
                                        mode === item.value
                                            ? "bg-cyan-400 text-slate-950"
                                            : "bg-slate-800 text-slate-200 hover:bg-slate-700"
                                    }`}
                                    disabled={disabled}
                                    title={item.label}
                                    type="button"
                                    onClick={() => chooseMode(item.value)}
                                >
                                    <Icon className="h-4 w-4" />
                                    {item.label}
                                </button>
                            );
                        })}
                    </div>

                    <div
                        className="ops-toolbar absolute right-4 top-4 z-20 flex items-center gap-2 rounded-md border border-white/10 bg-slate-900/90 p-2 text-sm text-slate-300"
                        onClick={(event) => event.stopPropagation()}
                        onMouseDown={(event) => event.stopPropagation()}
                        onMouseUp={(event) => event.stopPropagation()}
                    >
                        <button
                            className="grid h-8 w-8 place-items-center rounded-md bg-slate-800 hover:bg-slate-700 disabled:opacity-40"
                            disabled={zoom <= MIN_ZOOM}
                            title="缩小地图"
                            type="button"
                            onClick={() => zoomBy(1 / ZOOM_STEP)}
                        >
                            <ZoomOutIcon className="h-4 w-4" />
                        </button>
                        <span className="min-w-16 text-center">{(zoom * 100).toFixed(0)}%</span>
                        <button
                            className="grid h-8 w-8 place-items-center rounded-md bg-slate-800 hover:bg-slate-700 disabled:opacity-40"
                            disabled={zoom >= MAX_ZOOM}
                            title="放大地图"
                            type="button"
                            onClick={() => zoomBy(ZOOM_STEP)}
                        >
                            <ZoomInIcon className="h-4 w-4" />
                        </button>
                    </div>

                    {selectedMarkers.size > 0 && (
                        <div
                            className="ops-toolbar absolute bottom-4 left-4 z-30 flex flex-wrap items-center gap-2 rounded-md border border-cyan-400/30 bg-cyan-400/10 p-2 text-sm"
                            onClick={(event) => event.stopPropagation()}
                            onMouseDown={(event) => event.stopPropagation()}
                            onMouseUp={(event) => event.stopPropagation()}
                        >
                            <span className="text-cyan-100">
                                已框选 {selectedMarkers.size} 个对象
                            </span>
                            <button
                                className="inline-flex items-center justify-center gap-2 rounded-md bg-rose-500 px-3 py-2 text-xs font-medium text-white hover:bg-rose-400"
                                type="button"
                                onClick={() => deleteSelected()}
                            >
                                <Trash2Icon className="h-4 w-4" />
                                删除选中
                            </button>
                        </div>
                    )}

                    <div
                        className="absolute left-0 top-0 origin-top-left"
                        style={{
                            transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
                        }}
                    >
                        {imageSrc ? (
                            <img
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
                            {mapConfig.zones.map((zone) => {
                                const points = zone.polygon.map((point) =>
                                    realToPixel(point, activeCalibration),
                                );
                                return (
                                    <g key={zone.id} opacity={step === "roads" ? 0.18 : 1}>
                                        <polygon
                                            fill="rgba(14, 165, 233, 0.08)"
                                            points={points
                                                .map((point) => `${point.px},${point.py}`)
                                                .join(" ")}
                                            stroke={
                                                selectedMarkers.has(`zone:${zone.id}`)
                                                    ? "#facc15"
                                                    : "#38bdf8"
                                            }
                                            strokeDasharray="8 6"
                                            strokeWidth={2 / zoom}
                                        />
                                        {points[0] && step !== "roads" && (
                                            <text
                                                fill="#0f172a"
                                                fontSize={18 / zoom}
                                                fontWeight={700}
                                                paintOrder="stroke"
                                                stroke="#ffffff"
                                                strokeWidth={4 / zoom}
                                                x={points[0].px + 8 / zoom}
                                                y={points[0].py + 20 / zoom}
                                            >
                                                {zone.name}
                                            </text>
                                        )}
                                    </g>
                                );
                            })}
                            {zoneDraft.length > 0 && step !== "roads" && (
                                <g>
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
                                    {zoneDraft.map((point, index) => {
                                        const pixel = realToPixel(point, activeCalibration);
                                        return (
                                            <g key={`${point.x}-${point.y}-${index}`}>
                                                <circle
                                                    cx={pixel.px}
                                                    cy={pixel.py}
                                                    fill="#facc15"
                                                    r={6 / zoom}
                                                    stroke="#020617"
                                                    strokeWidth={2 / zoom}
                                                />
                                                <text
                                                    fill="#0f172a"
                                                    fontSize={13 / zoom}
                                                    fontWeight={800}
                                                    paintOrder="stroke"
                                                    stroke="#ffffff"
                                                    strokeWidth={4 / zoom}
                                                    x={pixel.px + 8 / zoom}
                                                    y={pixel.py - 8 / zoom}
                                                >
                                                    区域点{index + 1}
                                                </text>
                                            </g>
                                        );
                                    })}
                                </g>
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
                                        stroke={
                                            edge.type === "robot"
                                                ? "#f97316"
                                                : edge.type === "main"
                                                  ? "#22d3ee"
                                                  : "#a78bfa"
                                        }
                                        strokeLinecap="round"
                                        strokeWidth={
                                            (edge.type === "robot"
                                                ? 6
                                                : edge.type === "main"
                                                  ? 5
                                                  : 3) / zoom
                                        }
                                        x1={fromPx.px}
                                        x2={toPx.px}
                                        y1={fromPx.py}
                                        y2={toPx.py}
                                    />
                                );
                            })}
                            {mapConfig.roadGraph.nodes.map((node) => {
                                const point = realToPixel(node, activeCalibration);
                                const isCurrentRoadCursor = roadCursorID === node.id;
                                return (
                                    <g key={node.id}>
                                        <circle
                                            cx={point.px}
                                            cy={point.py}
                                            fill={
                                                isCurrentRoadCursor
                                                    ? "#f97316"
                                                    : selectedMarkers.has(`node:${node.id}`)
                                                      ? "#facc15"
                                                      : "#e0f2fe"
                                            }
                                            r={(isCurrentRoadCursor ? 8 : 5) / zoom}
                                            stroke={isCurrentRoadCursor ? "#ffffff" : "#020617"}
                                            strokeWidth={(isCurrentRoadCursor ? 3 : 1.5) / zoom}
                                        />
                                        {step === "roads" && isCurrentRoadCursor && (
                                            <text
                                                fill="#0f172a"
                                                fontSize={11 / zoom}
                                                fontWeight={800}
                                                paintOrder="stroke"
                                                stroke="#ffffff"
                                                strokeWidth={3 / zoom}
                                                x={point.px + 8 / zoom}
                                                y={point.py - 7 / zoom}
                                            >
                                                起点
                                            </text>
                                        )}
                                    </g>
                                );
                            })}
                            {mapConfig.islands.map((island) => {
                                const center = realToPixel(island.center, activeCalibration);
                                const selected = selectedMarkers.has(`island:${island.id}`);
                                return (
                                    <g key={island.id} opacity={step === "roads" ? 0.22 : 1}>
                                        <circle
                                            cx={center.px}
                                            cy={center.py}
                                            fill={selected ? "#facc15" : "#22c55e"}
                                            r={7 / zoom}
                                            stroke="#020617"
                                            strokeWidth={2 / zoom}
                                        />
                                        {step !== "roads" && (
                                            <text
                                                fill="#0f172a"
                                                fontSize={13 / zoom}
                                                fontWeight={700}
                                                paintOrder="stroke"
                                                stroke="#ffffff"
                                                strokeWidth={4 / zoom}
                                                x={center.px + 9 / zoom}
                                                y={center.py - 8 / zoom}
                                            >
                                                {island.id}
                                            </text>
                                        )}
                                    </g>
                                );
                            })}
                            {step !== "roads" &&
                                mapConfig.calibration &&
                                (["p1", "p2"] as const).map((key, index) => {
                                    const point = mapConfig.calibration?.[key];
                                    return point ? (
                                        <g key={key}>
                                            <circle
                                                cx={point.px}
                                                cy={point.py}
                                                fill="#0f172a"
                                                r={8 / zoom}
                                                stroke={
                                                    selectedMarkers.has(`cal:${key}`)
                                                        ? "#f87171"
                                                        : "#facc15"
                                                }
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
                                    ) : null;
                                })}
                            {selectionRect && (
                                <g>
                                    <rect
                                        fill="rgba(34, 211, 238, 0.18)"
                                        height={Math.abs(
                                            selectionRect.endPy - selectionRect.startPy,
                                        )}
                                        stroke="#22d3ee"
                                        strokeDasharray="6 4"
                                        strokeWidth={3 / zoom}
                                        width={Math.abs(
                                            selectionRect.endPx - selectionRect.startPx,
                                        )}
                                        x={Math.min(selectionRect.startPx, selectionRect.endPx)}
                                        y={Math.min(selectionRect.startPy, selectionRect.endPy)}
                                    />
                                    <text
                                        fill="#0f172a"
                                        fontSize={13 / zoom}
                                        fontWeight={800}
                                        paintOrder="stroke"
                                        stroke="#ffffff"
                                        strokeWidth={4 / zoom}
                                        x={
                                            Math.min(selectionRect.startPx, selectionRect.endPx) +
                                            8 / zoom
                                        }
                                        y={
                                            Math.min(selectionRect.startPy, selectionRect.endPy) -
                                            8 / zoom
                                        }
                                    >
                                        框选删除对象
                                    </text>
                                </g>
                            )}
                            {step === "islands" &&
                                (["origin", "right", "down", "bottomRight"] as const).map((key) => {
                                    const realPoint = autoGridAnchors[key];
                                    if (!realPoint) {
                                        return null;
                                    }
                                    const point = realToPixel(realPoint, activeCalibration);
                                    const label = autoGridAnchorLabel(key).replace("端点", "");
                                    return (
                                        <g key={key}>
                                            <circle
                                                cx={point.px}
                                                cy={point.py}
                                                fill="#f59e0b"
                                                r={8 / zoom}
                                                stroke="#020617"
                                                strokeWidth={2 / zoom}
                                            />
                                            <text
                                                fill="#0f172a"
                                                fontSize={13 / zoom}
                                                fontWeight={800}
                                                paintOrder="stroke"
                                                stroke="#ffffff"
                                                strokeWidth={4 / zoom}
                                                x={point.px + 10 / zoom}
                                                y={point.py + 4 / zoom}
                                            >
                                                {label}
                                            </text>
                                        </g>
                                    );
                                })}
                            {feedbackPoint && (
                                <g>
                                    <circle
                                        cx={feedbackPoint.px}
                                        cy={feedbackPoint.py}
                                        fill="rgba(250, 204, 21, 0.35)"
                                        r={18 / zoom}
                                        stroke="#facc15"
                                        strokeWidth={3 / zoom}
                                    />
                                    <circle
                                        cx={feedbackPoint.px}
                                        cy={feedbackPoint.py}
                                        fill="#facc15"
                                        r={6 / zoom}
                                        stroke="#020617"
                                        strokeWidth={2 / zoom}
                                    />
                                    <text
                                        fill="#0f172a"
                                        fontSize={13 / zoom}
                                        fontWeight={700}
                                        paintOrder="stroke"
                                        stroke="#ffffff"
                                        strokeWidth={4 / zoom}
                                        x={feedbackPoint.px + 12 / zoom}
                                        y={feedbackPoint.py - 10 / zoom}
                                    >
                                        {feedbackPoint.label}
                                    </text>
                                </g>
                            )}
                        </svg>
                    </div>
                </main>

                <aside className="flex min-h-0 flex-col gap-3 overflow-y-auto bg-slate-900 p-4">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <h1 className="text-lg font-semibold">路径规划</h1>
                            <div className="mt-1 text-xs text-slate-400">
                                只保存地图与路线方案，不下发车辆任务
                            </div>
                        </div>
                        <button
                            className="rounded-md bg-cyan-400 p-2 text-slate-950 hover:bg-cyan-300"
                            title="刷新历史"
                            type="button"
                            onClick={() =>
                                void loadMaps().catch((error) => setMessage(String(error)))
                            }
                        >
                            <RefreshCwIcon className="h-4 w-4" />
                        </button>
                    </div>

                    <section className="grid grid-cols-2 gap-2 rounded-md border border-white/10 bg-slate-950 p-3">
                        <button
                            className="inline-flex items-center justify-center gap-2 rounded-md bg-slate-800 px-3 py-2 text-sm hover:bg-slate-700 disabled:opacity-40"
                            disabled={history.length === 0}
                            type="button"
                            onClick={undoLast}
                        >
                            <Undo2Icon className="h-4 w-4" />
                            撤回上一步
                        </button>
                        <button
                            className="inline-flex items-center justify-center gap-2 rounded-md bg-slate-800 px-3 py-2 text-sm hover:bg-slate-700 disabled:opacity-40"
                            disabled={futureHistory.length === 0}
                            type="button"
                            onClick={redoLast}
                        >
                            <Redo2Icon className="h-4 w-4" />
                            恢复下一步
                        </button>
                        {step === "islands" ? (
                            <>
                                <button
                                    className="inline-flex items-center justify-center gap-2 rounded-md bg-slate-800 px-3 py-2 text-sm hover:bg-slate-700 disabled:opacity-40"
                                    disabled={
                                        mapConfig.zones.length === 0 && zoneDraft.length === 0
                                    }
                                    type="button"
                                    onClick={clearIslandZones}
                                >
                                    <EraserIcon className="h-4 w-4" />
                                    清空区域
                                </button>
                                <button
                                    className="inline-flex items-center justify-center gap-2 rounded-md bg-slate-800 px-3 py-2 text-sm hover:bg-slate-700 disabled:opacity-40"
                                    disabled={mapConfig.islands.length === 0}
                                    type="button"
                                    onClick={clearIslandPoints}
                                >
                                    <TargetIcon className="h-4 w-4" />
                                    清空投喂点
                                </button>
                            </>
                        ) : (
                            <button
                                className="col-span-2 inline-flex items-center justify-center gap-2 rounded-md bg-slate-800 px-3 py-2 text-sm hover:bg-slate-700"
                                type="button"
                                onClick={clearCurrentStep}
                            >
                                <EraserIcon className="h-4 w-4" />
                                清空当前步骤
                            </button>
                        )}
                        <button
                            className="col-span-2 inline-flex items-center justify-center gap-2 rounded-md bg-rose-500 px-3 py-2 text-sm font-medium text-white hover:bg-rose-400"
                            type="button"
                            onClick={clearAllAnnotations}
                        >
                            <Trash2Icon className="h-4 w-4" />
                            一键清空全部标注
                        </button>
                    </section>

                    <section className="grid gap-3 rounded-md border border-white/10 bg-slate-950 p-3">
                        <div className="grid grid-cols-[1fr_auto] gap-2">
                            <select
                                className="rounded-md border border-white/10 bg-slate-900 px-3 py-2 text-sm"
                                value={mapConfig.mapID}
                                onChange={(event) =>
                                    void loadMap(event.target.value).catch((error) =>
                                        setMessage(String(error)),
                                    )
                                }
                            >
                                <option value="">选择历史平面图</option>
                                {maps.map((item) => (
                                    <option key={item.mapID} value={item.mapID}>
                                        {item.name || item.mapID}
                                    </option>
                                ))}
                            </select>
                            <button
                                className="inline-flex items-center gap-2 rounded-md bg-slate-800 px-3 py-2 text-sm hover:bg-slate-700"
                                type="button"
                                onClick={() =>
                                    void createNewMap().catch((error) => setMessage(String(error)))
                                }
                            >
                                <PlusIcon className="h-4 w-4" />
                                新建
                            </button>
                        </div>
                        <input
                            className="rounded-md border border-white/10 bg-slate-900 px-3 py-2 text-sm"
                            placeholder="地图名称"
                            value={mapConfig.name || ""}
                            onChange={(event) =>
                                updateMap((current) => ({ ...current, name: event.target.value }))
                            }
                        />
                        <div className="grid gap-2">
                            <button
                                className="inline-flex items-center justify-center gap-2 rounded-md bg-slate-800 px-3 py-2 text-sm hover:bg-slate-700"
                                type="button"
                                onClick={() => fileRef.current?.click()}
                            >
                                <UploadIcon className="h-4 w-4" />
                                上传图
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
                        <div className="text-xs text-slate-400">
                            {mapSaveStatus} · {message}
                        </div>
                    </section>

                    <section className="grid gap-2 rounded-md border border-white/10 bg-slate-950 p-3">
                        {STEPS.map((item, index) => (
                            <button
                                key={item.value}
                                className={`flex items-start gap-3 rounded-md p-2 text-left ${step === item.value ? "bg-cyan-400 text-slate-950" : "bg-slate-900 text-slate-300 hover:bg-slate-800"}`}
                                type="button"
                                onClick={() => setStepAndSave(item.value)}
                            >
                                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-black/20 text-xs">
                                    {index + 1}
                                </span>
                                <span>
                                    <span className="block text-sm font-medium">{item.title}</span>
                                    <span className="block text-xs opacity-80">
                                        {item.description}
                                    </span>
                                </span>
                            </button>
                        ))}
                    </section>

                    <section className="grid gap-3 rounded-md border border-white/10 bg-slate-950 p-3">
                        <button
                            className="flex items-center justify-between text-left text-sm font-medium"
                            type="button"
                            onClick={() => setShowHelp((value) => !value)}
                        >
                            <span className="inline-flex items-center gap-2">
                                <HelpCircleIcon className="h-4 w-4 text-cyan-300" />
                                帮助
                            </span>
                            <span className="text-xs text-slate-400">
                                {showHelp ? "收起" : "展开"}
                            </span>
                        </button>
                        {showHelp && (
                            <div className="grid gap-2 text-xs text-slate-400">
                                {stepHelp(step).map((item) => (
                                    <div key={item} className="flex gap-2">
                                        <InfoIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-300" />
                                        <span>{item}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>

                    <section className="grid gap-3 rounded-md border border-white/10 bg-slate-950 p-3">
                        <div className="flex items-center gap-2 text-sm font-medium">
                            <CheckIcon className="h-4 w-4 text-cyan-300" />
                            {stepInfo.title}
                        </div>
                        <p className="text-xs text-slate-400">{stepInfo.description}</p>
                        {step === "calibration" && (
                            <div className="grid gap-3">
                                <p className="text-xs text-slate-500">
                                    建议两个点尽量分布在图的对角或远距离位置；填写真实坐标时保持米制坐标方向一致。标错可右键点标记删除，或切换“框选”后删除选中。
                                </p>
                                {(["p1", "p2"] as const).map((key) => (
                                    <div key={key} className="grid grid-cols-5 gap-2 text-xs">
                                        <button
                                            className={`rounded-md px-2 py-2 ${calibrationClick === key ? "bg-cyan-400 text-slate-950" : "bg-slate-800"}`}
                                            type="button"
                                            onClick={() => setCalibrationClick(key)}
                                        >
                                            {key.toUpperCase()}
                                        </button>
                                        {(["px", "py", "x", "y"] as const).map((field) => (
                                            <input
                                                key={field}
                                                className="rounded-md border border-white/10 bg-slate-900 px-2 py-2"
                                                placeholder={field}
                                                type="number"
                                                value={mapConfig.calibration?.[key][field] || 0}
                                                onChange={(event) =>
                                                    updateCalibrationValue(
                                                        key,
                                                        field,
                                                        Number(event.target.value),
                                                    )
                                                }
                                            />
                                        ))}
                                    </div>
                                ))}
                                <button
                                    className="rounded-md bg-cyan-400 px-3 py-2 text-sm font-medium text-slate-950 hover:bg-cyan-300"
                                    type="button"
                                    onClick={() => setStepAndSave("islands")}
                                >
                                    标定完成，进入犊牛岛标定
                                </button>
                            </div>
                        )}
                        {step === "islands" && (
                            <div className="grid gap-3">
                                <p className="text-xs text-slate-500">
                                    先用“区域”模式逐点画出 A-F
                                    区域并点击完成区域，再用“犊牛岛”模式标出每个岛旁边的车辆投喂停靠点。
                                </p>
                                {mapConfig.zones.length > 0 && zoneDraft.length === 0 && (
                                    <div className="grid gap-2 rounded-md border border-cyan-400/30 bg-cyan-400/10 p-3">
                                        <div className="text-sm font-medium text-cyan-100">
                                            已完成 {mapConfig.zones.length} 个区域
                                        </div>
                                        <div className="grid gap-2">
                                            <button
                                                className="rounded-md bg-cyan-400 px-3 py-2 text-sm font-medium text-slate-950 hover:bg-cyan-300"
                                                type="button"
                                                onClick={() => {
                                                    setMode("island");
                                                    setIslandZoneID(autoGridZoneID);
                                                    setIslandID(`${autoGridZoneID}1`);
                                                }}
                                            >
                                                标犊牛岛投喂点
                                            </button>
                                        </div>
                                    </div>
                                )}
                                <div className="grid grid-cols-3 gap-2 text-sm">
                                    <input
                                        className="rounded-md border border-white/10 bg-slate-900 px-2 py-2"
                                        placeholder="区域ID"
                                        value={zoneID}
                                        onChange={(event) =>
                                            setZoneID(event.target.value.toUpperCase())
                                        }
                                    />
                                    <input
                                        className="rounded-md border border-white/10 bg-slate-900 px-2 py-2"
                                        placeholder="投喂点ID"
                                        value={islandID}
                                        onChange={(event) =>
                                            setIslandID(event.target.value.toUpperCase())
                                        }
                                    />
                                    <input
                                        className="rounded-md border border-white/10 bg-slate-900 px-2 py-2"
                                        placeholder="所属区域"
                                        value={islandZoneID}
                                        onChange={(event) =>
                                            setIslandZoneID(event.target.value.toUpperCase())
                                        }
                                    />
                                </div>
                                <button
                                    className="inline-flex items-center justify-center gap-2 rounded-md bg-slate-800 px-3 py-2 text-sm hover:bg-slate-700"
                                    type="button"
                                    onClick={completeZone}
                                >
                                    <MapIcon className="h-4 w-4" />
                                    完成区域
                                </button>
                                <div className="grid gap-3 rounded-md border border-white/10 bg-slate-900 p-3">
                                    <div>
                                        <div className="text-sm font-medium text-slate-100">
                                            批量生成犊牛岛投喂点
                                        </div>
                                        <div className="mt-1 text-xs text-slate-500">
                                            先标左上、右上端点并输入每行数量；多行时再标左下端点，右下端点可选。
                                            每行数量包含左右两个端点，系统按数量减一计算间隔；当前样点可重复点击微调。
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                        <select
                                            className="rounded-md border border-white/10 bg-slate-950 px-2 py-2"
                                            disabled={savedZoneIDs.length === 0}
                                            value={
                                                savedZoneIDs.includes(autoGridZoneID)
                                                    ? autoGridZoneID
                                                    : ""
                                            }
                                            onChange={(event) => {
                                                const nextZone = event.target.value;
                                                if (!nextZone) {
                                                    return;
                                                }
                                                pushHistory();
                                                setAutoGridZoneID(nextZone);
                                                setAutoGridStartID(`${nextZone}1`);
                                                setAutoGridAnchors({});
                                            }}
                                        >
                                            <option value="">
                                                {savedZoneIDs.length
                                                    ? "选择已保存区域"
                                                    : "请先完成区域"}
                                            </option>
                                            {savedZoneIDs.map((zone) => (
                                                <option key={zone} value={zone}>
                                                    {zone}区
                                                </option>
                                            ))}
                                        </select>
                                        <input
                                            className="rounded-md border border-white/10 bg-slate-950 px-2 py-2"
                                            placeholder="起始编号"
                                            value={autoGridStartID}
                                            onChange={(event) =>
                                                setAutoGridStartID(event.target.value.toUpperCase())
                                            }
                                        />
                                        <label className="grid gap-1 text-xs text-slate-400">
                                            行数
                                            <input
                                                className="rounded-md border border-white/10 bg-slate-950 px-2 py-2 text-sm text-slate-100"
                                                min={1}
                                                type="number"
                                                value={autoGridMaxRows}
                                                onChange={(event) =>
                                                    setAutoGridMaxRows(event.target.value)
                                                }
                                            />
                                        </label>
                                        <label className="grid gap-1 text-xs text-slate-400">
                                            每行数量
                                            <input
                                                className="rounded-md border border-white/10 bg-slate-950 px-2 py-2 text-sm text-slate-100"
                                                min={1}
                                                type="number"
                                                value={autoGridMaxCols}
                                                onChange={(event) =>
                                                    setAutoGridMaxCols(event.target.value)
                                                }
                                            />
                                        </label>
                                    </div>
                                    <div className="grid grid-cols-4 gap-2">
                                        {[
                                            ["origin", "左上端点"],
                                            ["right", "右上端点"],
                                            ["down", "左下端点"],
                                            ["bottomRight", "右下端点"],
                                        ].map(([value, label]) => (
                                            <button
                                                key={value}
                                                className={`rounded-md px-2 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-40 ${
                                                    autoGridPick === value
                                                        ? "bg-cyan-400 text-slate-950"
                                                        : "bg-slate-800 hover:bg-slate-700"
                                                }`}
                                                disabled={
                                                    zoneDraft.length > 0 ||
                                                    savedZoneIDs.length === 0
                                                }
                                                type="button"
                                                onClick={() => {
                                                    chooseMode("autoGrid");
                                                    setAutoGridPick(value as AutoGridPick);
                                                }}
                                            >
                                                {label}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="text-xs text-slate-400">
                                        左上 {autoGridAnchors.origin ? "已标" : "未标"} · 右上{" "}
                                        {autoGridAnchors.right ? "已标" : "未标"} · 左下{" "}
                                        {autoGridAnchors.down ? "已标" : "未标"} · 右下{" "}
                                        {autoGridAnchors.bottomRight ? "已标" : "未标"}
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            className="rounded-md bg-slate-800 px-3 py-2 text-xs hover:bg-slate-700 disabled:opacity-40"
                                            disabled={
                                                !autoGridPick || !autoGridAnchors[autoGridPick]
                                            }
                                            type="button"
                                            onClick={clearAutoGridAnchor}
                                        >
                                            撤销当前样点
                                        </button>
                                        <button
                                            className="rounded-md bg-slate-800 px-3 py-2 text-xs hover:bg-slate-700 disabled:opacity-40"
                                            disabled={
                                                !autoGridAnchors.bottomRight &&
                                                !autoGridAnchors.down &&
                                                !autoGridAnchors.origin &&
                                                !autoGridAnchors.right
                                            }
                                            type="button"
                                            onClick={clearAutoGridAnchors}
                                        >
                                            清空样点
                                        </button>
                                    </div>
                                    <button
                                        className="rounded-md bg-cyan-400 px-3 py-2 text-sm font-medium text-slate-950 hover:bg-cyan-300 disabled:opacity-40"
                                        disabled={
                                            savedZoneIDs.length === 0 ||
                                            !autoGridRowCount ||
                                            !autoGridColumnCount ||
                                            !autoGridAnchors.origin ||
                                            !autoGridAnchors.right ||
                                            (autoGridRowCount > 1 && !autoGridAnchors.down)
                                        }
                                        type="button"
                                        onClick={generateAutoGridIslands}
                                    >
                                        生成本区域投喂点
                                    </button>
                                </div>
                                <button
                                    className="rounded-md bg-cyan-400 px-3 py-2 text-sm font-medium text-slate-950 hover:bg-cyan-300"
                                    type="button"
                                    onClick={() => setStepAndSave("roads")}
                                >
                                    进入通道路线标定
                                </button>
                            </div>
                        )}
                        {step === "roads" && (
                            <div className="grid gap-3">
                                <p className="text-xs text-slate-500">
                                    先标注或点击已有路口节点作为连接起点，再点击另一个路口节点建立通路。需要从同一路口连多个方向时，点击“选择新的连接起点”，再点该路口继续分叉。
                                </p>
                                <div className="rounded-md border border-white/10 bg-slate-900 p-3 text-xs text-slate-400">
                                    当前连接起点：
                                    {roadCursorNode
                                        ? `${roadCursorNode.id} (${roadCursorNode.x.toFixed(2)}, ${roadCursorNode.y.toFixed(2)})`
                                        : "未选择，请点击一个路口节点"}
                                </div>
                                {mode !== "road" && (
                                    <button
                                        className="rounded-md bg-cyan-400 px-3 py-2 text-sm font-medium text-slate-950 hover:bg-cyan-300"
                                        type="button"
                                        onClick={() => setMode("road")}
                                    >
                                        继续标定通道路线
                                    </button>
                                )}
                                <select
                                    className="rounded-md border border-white/10 bg-slate-900 px-3 py-2 text-sm"
                                    value={roadEdgeType}
                                    onChange={(event) =>
                                        setRoadEdgeType(
                                            event.target.value as "inner" | "main" | "robot",
                                        )
                                    }
                                >
                                    <option value="main">主通道</option>
                                    <option value="inner">内部通道</option>
                                    <option value="robot">机器人行进路线</option>
                                </select>
                                <button
                                    className="rounded-md bg-orange-500 px-3 py-2 text-sm font-medium text-white hover:bg-orange-400"
                                    type="button"
                                    onClick={() => {
                                        setRoadEdgeType("robot");
                                        setMode("road");
                                    }}
                                >
                                    标定机器人行进路线
                                </button>
                                <button
                                    className="rounded-md bg-slate-800 px-3 py-2 text-sm hover:bg-slate-700"
                                    type="button"
                                    onClick={() => {
                                        setRoadCursor(null);
                                        setMessage("请选择新的路口节点作为连接起点");
                                    }}
                                >
                                    选择新的连接起点
                                </button>
                                <button
                                    className="rounded-md bg-cyan-400 px-3 py-2 text-sm font-medium text-slate-950 hover:bg-cyan-300"
                                    type="button"
                                    onClick={() => setStepAndSave("save")}
                                >
                                    进入保存方案
                                </button>
                            </div>
                        )}
                        {step === "save" && (
                            <div className="grid gap-3">
                                <div className="rounded-md border border-cyan-400/30 bg-cyan-400/10 p-3 text-xs text-cyan-100">
                                    保存方案只保存当前平面图中的区域、犊牛岛投喂点和通道路线。投喂目标选择、投喂量和任务下发在“投喂任务”页面完成。
                                </div>
                                <div className="grid grid-cols-[1fr_auto] gap-2">
                                    <select
                                        className="rounded-md border border-white/10 bg-slate-900 px-3 py-2 text-sm"
                                        value={currentPlan?.planID || ""}
                                        onChange={(event) => {
                                            const plan =
                                                plans.find(
                                                    (item) => item.planID === event.target.value,
                                                ) || null;
                                            skipPlanSaveRef.current = true;
                                            setCurrentPlan(plan);
                                            setPlanNameDraft(plan?.name || "");
                                        }}
                                    >
                                        <option value="">选择历史路线方案</option>
                                        {plans.map((plan) => (
                                            <option key={plan.planID} value={plan.planID}>
                                                {plan.name || plan.planID}
                                            </option>
                                        ))}
                                    </select>
                                    <button
                                        className="rounded-md bg-slate-800 px-3 py-2 text-sm hover:bg-slate-700"
                                        type="button"
                                        onClick={() =>
                                            void createNewPlan().catch((error) =>
                                                setMessage(String(error)),
                                            )
                                        }
                                    >
                                        新建方案
                                    </button>
                                </div>
                                <input
                                    className="rounded-md border border-white/10 bg-slate-900 px-3 py-2 text-sm"
                                    placeholder="路线方案名称"
                                    value={planNameDraft}
                                    onChange={(event) => setPlanNameDraft(event.target.value)}
                                />
                                <button
                                    className="inline-flex items-center justify-center gap-2 rounded-md bg-cyan-400 px-3 py-2 text-sm font-medium text-slate-950 hover:bg-cyan-300 disabled:opacity-50"
                                    disabled={!mapConfig.mapID}
                                    type="button"
                                    onClick={() =>
                                        void saveDesignPlan().catch((error) =>
                                            setMessage(String(error)),
                                        )
                                    }
                                >
                                    <SaveIcon className="h-4 w-4" />
                                    保存方案
                                </button>
                                {saveSuccessNotice && (
                                    <div className="flex items-start gap-2 rounded-md border border-emerald-400/40 bg-emerald-400/15 p-3 text-sm text-emerald-100">
                                        <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                                        <span>{saveSuccessNotice}</span>
                                    </div>
                                )}
                                <div className="grid gap-1 rounded-md border border-white/10 bg-slate-900 p-3 text-xs text-slate-400">
                                    <div>
                                        保存内容：区域 {mapConfig.zones.length} · 犊牛岛投喂点{" "}
                                        {mapConfig.islands.length} · 通道节点{" "}
                                        {mapConfig.roadGraph.nodes.length} · 通道边{" "}
                                        {mapConfig.roadGraph.edges.length}
                                    </div>
                                    <div>
                                        地图：{mapSaveStatus} · 方案：{planSaveStatus}
                                    </div>
                                </div>
                            </div>
                        )}
                        {selectedMarkers.size > 0 && (
                            <div className="grid gap-2 rounded-md border border-cyan-400/30 bg-cyan-400/10 p-3">
                                <div className="text-xs text-cyan-100">
                                    已框选 {selectedMarkers.size} 个对象，可批量删除。
                                </div>
                                <button
                                    className="inline-flex items-center justify-center gap-2 rounded-md bg-rose-500 px-3 py-2 text-sm font-medium text-white hover:bg-rose-400"
                                    type="button"
                                    onClick={() => deleteSelected()}
                                >
                                    <Trash2Icon className="h-4 w-4" />
                                    删除选中 {selectedMarkers.size}
                                </button>
                            </div>
                        )}
                    </section>

                    <section className="grid gap-2 rounded-md border border-white/10 bg-slate-950 p-3 text-xs text-slate-400">
                        <div className="flex items-center gap-2 text-sm font-medium text-slate-200">
                            <SaveIcon className="h-4 w-4 text-cyan-300" />
                            当前统计
                        </div>
                        <div>
                            区域 {mapConfig.zones.length} · 犊牛岛 {mapConfig.islands.length} ·
                            通道节点 {mapConfig.roadGraph.nodes.length} · 通道边{" "}
                            {mapConfig.roadGraph.edges.length}
                        </div>
                        <div>当前方案 {currentPlan?.name || planNameDraft || "-"}</div>
                    </section>
                </aside>
            </div>
        </LayoutContent>
    );
};
