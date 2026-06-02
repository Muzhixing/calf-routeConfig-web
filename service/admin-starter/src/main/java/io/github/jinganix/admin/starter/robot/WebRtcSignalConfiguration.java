package io.github.jinganix.admin.starter.robot;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

@Configuration
@EnableWebSocket
@RequiredArgsConstructor
public class WebRtcSignalConfiguration implements WebSocketConfigurer {

  private final WebRtcSignalHandler webRtcSignalHandler;

  @Override
  public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
    registry.addHandler(webRtcSignalHandler, "/ws/{userId}").setAllowedOrigins("*");
  }
}
