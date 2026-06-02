package io.github.jinganix.admin.starter.robot;

import java.net.URI;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@Slf4j
@Component
public class WebRtcSignalHandler extends TextWebSocketHandler {

  private final Map<String, WebSocketSession> sessions = new ConcurrentHashMap<>();

  private final ObjectMapper objectMapper = new ObjectMapper();

  @Override
  public void afterConnectionEstablished(WebSocketSession session) {
    String userId = userId(session);
    sessions.put(userId, session);
    log.info("WebRTC signaling connected: {}", userId);
  }

  @Override
  protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
    String from = userId(session);
    JsonNode json = objectMapper.readTree(message.getPayload());
    String to = text(json, "to");
    if (to == null || to.isBlank()) {
      to = "python".equals(from) ? "browser" : "python";
    }
    WebSocketSession target = sessions.get(to);
    if (target != null && target.isOpen()) {
      synchronized (target) {
        target.sendMessage(new TextMessage(message.getPayload()));
      }
      log.debug("WebRTC signaling forwarded: {} -> {}", from, to);
    } else {
      log.debug("WebRTC signaling target offline: {} -> {}", from, to);
    }
  }

  @Override
  public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
    String userId = userId(session);
    sessions.remove(userId);
    log.info("WebRTC signaling disconnected: {}", userId);
  }

  private static String text(JsonNode json, String field) {
    JsonNode value = json == null ? null : json.get(field);
    return value == null ? null : value.asText();
  }

  private static String userId(WebSocketSession session) {
    URI uri = session.getUri();
    if (uri == null || uri.getPath() == null) {
      return session.getId();
    }
    String[] parts = uri.getPath().split("/");
    for (int i = parts.length - 1; i >= 0; i--) {
      if (!parts[i].isBlank()) {
        return parts[i];
      }
    }
    return session.getId();
  }
}
