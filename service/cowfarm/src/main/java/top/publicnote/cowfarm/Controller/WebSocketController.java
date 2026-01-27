package top.publicnote.cowfarm.Controller;

import jakarta.websocket.OnClose;
import jakarta.websocket.OnMessage;
import jakarta.websocket.OnOpen;
import jakarta.websocket.Session;
import jakarta.websocket.server.PathParam;
import jakarta.websocket.server.ServerEndpoint;
import org.springframework.stereotype.Controller;

import java.io.IOException;

@ServerEndpoint(value = "/api/websocket/{userId}")
@Controller
public class WebSocketController {
    private String userId;

    /**
     * 连接建立成功调用的方法
     */
    @OnOpen
    public void onOpen(Session session, @PathParam("userId") String userId){
        this.userId = userId;
        System.out.println("用户："+userId+"连接成功！");
    }

    /**
     * 连接关闭时自动调用的方法
     */
    @OnClose
    public void onClose(){
        System.out.println("连接已关闭");
    }
    /**
     * 收到客户端主动发送消息时调用的方法
     */
    @OnMessage
    public void onMessage(String message, Session session){

        try {
            System.out.println("用户："+userId+"发送了消息："+message);
            //给客户端发消息
            session.getBasicRemote().sendText("用户："+userId+"，已收到消息："+message);
        } catch (IOException e) {
            e.printStackTrace();
        }
    }
}
