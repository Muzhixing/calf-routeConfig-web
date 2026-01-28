package top.publicnote.cowfarm.Controller;

import jakarta.websocket.OnClose;
import jakarta.websocket.OnMessage;
import jakarta.websocket.OnOpen;
import jakarta.websocket.Session;
import jakarta.websocket.server.ServerEndpoint;
import org.springframework.stereotype.Controller;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Controller
@ServerEndpoint(value = "/ws")
public class WebRTCSignalController {
    private static final Map<String, Map<String, Session>> Rooms = new ConcurrentHashMap<>();

    @OnOpen
    public void onOpen(Session session) {
        String deviceId = getQueryParam(session, "deviceId", "default");
        Rooms.computeIfAbsent(deviceId, key -> new ConcurrentHashMap<>())
                .put(session.getId(), session);
        session.getUserProperties().put("deviceId", deviceId);
        System.out.println("WebRTC WS connected: deviceId=" + deviceId + ", session=" + session.getId());
    }

    @OnMessage
    public void onMessage(String message, Session session) throws IOException {
        String deviceId = (String) session.getUserProperties().getOrDefault("deviceId", "default");
        Map<String, Session> room = Rooms.get(deviceId);
        if (room == null) {
            return;
        }
        for (Session target : room.values()) {
            if (target.isOpen() && !target.getId().equals(session.getId())) {
                target.getBasicRemote().sendText(message);
            }
        }
    }

    @OnClose
    public void onClose(Session session) {
        String deviceId = (String) session.getUserProperties().getOrDefault("deviceId", "default");
        Map<String, Session> room = Rooms.get(deviceId);
        if (room != null) {
            room.remove(session.getId());
            if (room.isEmpty()) {
                Rooms.remove(deviceId);
            }
        }
        System.out.println("WebRTC WS closed: deviceId=" + deviceId + ", session=" + session.getId());
    }

    private String getQueryParam(Session session, String key, String fallback) {
        Map<String, java.util.List<String>> params = session.getRequestParameterMap();
        if (params == null || !params.containsKey(key)) {
            return fallback;
        }
        java.util.List<String> values = params.get(key);
        if (values == null || values.isEmpty() || values.get(0) == null || values.get(0).isEmpty()) {
            return fallback;
        }
        return values.get(0);
    }
}
