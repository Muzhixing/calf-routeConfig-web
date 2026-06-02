import { environment } from "@helpers/environment.ts";
import { PlugIcon, RefreshCwIcon, UnplugIcon } from "lucide-react";
import { FC, useEffect, useMemo, useRef, useState } from "react";
import { LayoutContent } from "@/components/layout/layout.content.tsx";

type SignalMessage = {
    type?: string;
    sdp?: string;
    candidate?: string;
    sdpMid?: string | null;
    sdpMLineIndex?: number | null;
    to?: string;
    from?: string;
};

type Detection = {
    label?: string;
    score?: number;
    bbox?: {
        left: number;
        top: number;
        right: number;
        bottom: number;
    };
};

type Metadata = {
    deviceID?: string;
    frame_id?: number;
    frame_ts?: number;
    image?: {
        width: number;
        height: number;
        source?: string;
    };
    detected?: boolean;
    distance_m?: number;
    detections?: Detection[];
};

function defaultSignalUrl(): string {
    const apiHost = environment.apiHost || window.location.origin;
    const url = new URL(apiHost, window.location.href);
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    url.pathname = "/ws/browser";
    url.search = "";
    return url.toString();
}

function apiUrl(path: string): string {
    const base = (environment.apiHost || "").replace(/\/$/, "");
    return base ? `${base}${path}` : path;
}

export const LiveViewerPage: FC = () => {
    const wsRef = useRef<WebSocket | null>(null);
    const pcRef = useRef<RTCPeerConnection | null>(null);
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const [signalUrl, setSignalUrl] = useState(defaultSignalUrl());
    const [deviceID, setDeviceID] = useState("robot001");
    const [iceServersInput, setIceServersInput] = useState("");
    const [connected, setConnected] = useState(false);
    const [status, setStatus] = useState("未连接");
    const [metadata, setMetadata] = useState<Metadata | null>(null);
    const [deviceStatus, setDeviceStatus] = useState("{}");
    const [logs, setLogs] = useState<string[]>([]);

    const iceServers = useMemo(() => {
        const urls = iceServersInput
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean);
        return urls.length ? [{ urls }] : undefined;
    }, [iceServersInput]);

    function log(message: string): void {
        const time = new Date().toLocaleTimeString("zh-CN", { hour12: false });
        setLogs((items) => [`${time} ${message}`, ...items].slice(0, 120));
    }

    function send(message: SignalMessage): void {
        const ws = wsRef.current;
        if (ws?.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ from: "browser", to: "python", ...message }));
        }
    }

    function ensurePeer(): RTCPeerConnection {
        if (pcRef.current) {
            return pcRef.current;
        }
        const pc = new RTCPeerConnection({ iceServers });
        pcRef.current = pc;
        pc.ontrack = (event) => {
            const stream = event.streams[0];
            if (videoRef.current && stream) {
                videoRef.current.srcObject = stream;
            }
        };
        pc.onicecandidate = (event) => {
            if (event.candidate) {
                send({
                    candidate: event.candidate.candidate,
                    sdpMid: event.candidate.sdpMid,
                    sdpMLineIndex: event.candidate.sdpMLineIndex,
                    type: "candidate",
                });
            }
        };
        pc.onconnectionstatechange = () => {
            setStatus(`Peer ${pc.connectionState}`);
            setConnected(pc.connectionState === "connected");
        };
        pc.ondatachannel = (event) => {
            event.channel.onmessage = (dataEvent) => {
                try {
                    setMetadata(JSON.parse(String(dataEvent.data)) as Metadata);
                } catch {
                    log("metadata 解析失败");
                }
            };
            log(`DataChannel ${event.channel.label} 已连接`);
        };
        return pc;
    }

    async function handleSignal(message: SignalMessage): Promise<void> {
        if (message.type === "offer" && message.sdp) {
            const pc = ensurePeer();
            await pc.setRemoteDescription({ sdp: message.sdp, type: "offer" });
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            send({ sdp: pc.localDescription?.sdp, type: "answer" });
            log("收到板卡 offer，已回复 answer");
        } else if (message.type === "candidate" && message.candidate) {
            await pcRef.current?.addIceCandidate({
                candidate: message.candidate,
                sdpMid: message.sdpMid,
                sdpMLineIndex: message.sdpMLineIndex,
            });
        } else if (message.type === "ping") {
            send({ type: "pong" });
        }
    }

    async function connect(): Promise<void> {
        await disconnect();
        setStatus("连接信令中");
        const ws = new WebSocket(signalUrl);
        wsRef.current = ws;
        ws.onopen = () => {
            setConnected(true);
            setStatus("等待板卡视频");
            log(`信令已连接 ${signalUrl}`);
        };
        ws.onmessage = (event) => {
            void handleSignal(JSON.parse(String(event.data)) as SignalMessage).catch((error) =>
                log(String(error)),
            );
        };
        ws.onerror = () => setStatus("信令错误");
        ws.onclose = () => {
            setConnected(false);
            setStatus("信令断开");
        };
    }

    async function disconnect(): Promise<void> {
        pcRef.current?.getSenders().forEach((sender) => sender.track?.stop());
        pcRef.current?.close();
        pcRef.current = null;
        wsRef.current?.close();
        wsRef.current = null;
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
        setConnected(false);
    }

    async function refreshStatus(): Promise<void> {
        const response = await fetch(
            apiUrl(`/api/webget?deviceID=${encodeURIComponent(deviceID)}`),
        );
        const data = (await response.json()) as unknown;
        setDeviceStatus(JSON.stringify(data, null, 2));
    }

    useEffect(() => () => void disconnect(), []);

    useEffect(() => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (!video || !canvas || !ctx) {
            return;
        }
        const width = video.videoWidth || metadata?.image?.width || 1280;
        const height = video.videoHeight || metadata?.image?.height || 720;
        canvas.width = width;
        canvas.height = height;
        ctx.clearRect(0, 0, width, height);
        const detections = metadata?.detections || [];
        detections.forEach((item) => {
            const bbox = item.bbox;
            if (!bbox) {
                return;
            }
            const boxWidth = bbox.right - bbox.left;
            const boxHeight = bbox.bottom - bbox.top;
            ctx.strokeStyle = "#22d3ee";
            ctx.lineWidth = 3;
            ctx.strokeRect(bbox.left, bbox.top, boxWidth, boxHeight);
            ctx.fillStyle = "rgba(8, 47, 73, 0.85)";
            ctx.fillRect(bbox.left, Math.max(0, bbox.top - 24), Math.max(120, boxWidth), 24);
            ctx.fillStyle = "#e0f2fe";
            ctx.font = "16px Inter, sans-serif";
            const score = item.score == null ? "" : ` ${(item.score * 100).toFixed(0)}%`;
            ctx.fillText(
                `${item.label || "bucket"}${score}`,
                bbox.left + 6,
                Math.max(18, bbox.top - 6),
            );
        });
    }, [metadata]);

    return (
        <LayoutContent fixed className="h-[calc(100vh-4rem)]">
            <div className="ops-workspace grid h-full grid-cols-[minmax(0,1fr)_360px] text-slate-100 max-lg:grid-cols-1">
                <main className="ops-video-surface relative min-h-[520px] bg-black">
                    <video
                        ref={videoRef}
                        className="h-full w-full object-contain"
                        autoPlay
                        muted
                        playsInline
                        onLoadedMetadata={() =>
                            setMetadata((value) => (value ? { ...value } : null))
                        }
                    />
                    <canvas
                        ref={canvasRef}
                        className="pointer-events-none absolute inset-0 h-full w-full object-contain"
                    />
                    {!connected && (
                        <div className="absolute inset-0 grid place-items-center text-sm text-slate-400">
                            连接后等待板卡推送原始视频
                        </div>
                    )}
                </main>

                <aside className="flex min-h-0 flex-col gap-4 overflow-y-auto border-l border-white/10 bg-slate-900 p-4">
                    <div>
                        <h1 className="text-lg font-semibold">视频识别</h1>
                        <p className="mt-1 text-sm text-slate-400">
                            浏览器接收原始视频并叠加板卡 metadata 检测框。
                        </p>
                    </div>

                    <section className="grid gap-3 rounded-md border border-white/10 bg-slate-950 p-3">
                        <div className="text-sm font-medium">连接设置</div>
                        <label className="grid gap-1 text-sm">
                            <span className="text-slate-400">信令地址</span>
                            <input
                                className="rounded-md border border-white/10 bg-slate-950 px-3 py-2"
                                value={signalUrl}
                                onChange={(event) => setSignalUrl(event.target.value)}
                            />
                        </label>
                        <label className="grid gap-1 text-sm">
                            <span className="text-slate-400">设备 ID</span>
                            <input
                                className="rounded-md border border-white/10 bg-slate-950 px-3 py-2"
                                value={deviceID}
                                onChange={(event) => setDeviceID(event.target.value)}
                            />
                        </label>
                        <details className="rounded-md border border-white/10 bg-slate-900 px-3 py-2 text-sm">
                            <summary className="cursor-pointer text-xs font-medium text-slate-500">
                                高级 ICE 设置
                            </summary>
                            <label className="mt-3 grid gap-1">
                                <span className="text-slate-400">ICE Servers</span>
                                <input
                                    className="rounded-md border border-white/10 bg-slate-950 px-3 py-2"
                                    value={iceServersInput}
                                    placeholder="stun:stun.l.google.com:19302"
                                    onChange={(event) => setIceServersInput(event.target.value)}
                                />
                            </label>
                        </details>
                    </section>

                    <div className="grid grid-cols-3 gap-2">
                        <button
                            className="inline-flex items-center justify-center gap-2 rounded-md bg-cyan-500 px-3 py-2 text-sm font-medium text-slate-950 hover:bg-cyan-400"
                            onClick={() => void connect()}
                        >
                            <PlugIcon className="h-4 w-4" />
                            连接
                        </button>
                        <button
                            className="inline-flex items-center justify-center gap-2 rounded-md bg-slate-800 px-3 py-2 text-sm hover:bg-slate-700"
                            onClick={() => void disconnect()}
                        >
                            <UnplugIcon className="h-4 w-4" />
                            断开
                        </button>
                        <button
                            className="inline-flex items-center justify-center gap-2 rounded-md bg-slate-800 px-3 py-2 text-sm hover:bg-slate-700"
                            onClick={() =>
                                void refreshStatus().catch((error) =>
                                    setDeviceStatus(String(error)),
                                )
                            }
                        >
                            <RefreshCwIcon className="h-4 w-4" />
                            状态
                        </button>
                    </div>

                    <section className="rounded-md border border-white/10 bg-slate-950 p-3 text-sm text-slate-300">
                        <div>{status}</div>
                        <div className="mt-2 text-slate-400">
                            距离：
                            {metadata?.distance_m == null
                                ? "-"
                                : `${metadata.distance_m.toFixed(3)} m`}
                        </div>
                        <div className="text-slate-400">
                            检测：{metadata?.detected ? "是" : "否"}
                        </div>
                    </section>

                    <pre className="max-h-48 overflow-auto rounded-md border border-white/10 bg-slate-950 p-3 text-xs text-slate-400">
                        {JSON.stringify(metadata || {}, null, 2)}
                    </pre>
                    <pre className="max-h-36 overflow-auto rounded-md border border-white/10 bg-slate-950 p-3 text-xs text-slate-400">
                        {deviceStatus}
                    </pre>
                    <div className="min-h-0 flex-1 overflow-auto rounded-md border border-white/10 bg-slate-950 p-3 text-xs text-slate-400">
                        {logs.map((item) => (
                            <div key={item}>{item}</div>
                        ))}
                    </div>
                </aside>
            </div>
        </LayoutContent>
    );
};
