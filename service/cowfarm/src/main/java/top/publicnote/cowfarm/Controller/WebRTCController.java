package top.publicnote.cowfarm.Controller;

import jakarta.websocket.OnClose;
import jakarta.websocket.OnMessage;
import jakarta.websocket.OnOpen;
import jakarta.websocket.Session;
import jakarta.websocket.server.PathParam;
import jakarta.websocket.server.ServerEndpoint;
import org.springframework.stereotype.Controller;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Controller
@ServerEndpoint(value = "/ws/{user_id}")
public class WebRTCController {
    //ConcurrentHashMap<>()对象：在多线程环境下，安全、高效地存取共享数据。
    //HashMap<>()对象：线程不安全，效率较低。
    private static final Map<String, Session> Sessions = new ConcurrentHashMap<>();

    @OnOpen
    public void onOpen(Session session, @PathParam("user_id") String userId){
        /**
         * 1.browser
         * 2.python
         */
        Sessions.put(userId, session);//{"python":session}
        System.out.println(userId+"已连接");
    }

    @OnMessage
    //可能抛出IOException异常
    public void onMessage(String message,@PathParam("user_id") String userId) throws IOException{
        // message 示例：{ "to":"browser", "type":"offer", ... }

        // 以下两行：解析json字符串，构建json树结构
        ObjectMapper mapper = new ObjectMapper();
        JsonNode jsonNode = mapper.readTree(message);

        // .asText()的作用是把json节点安全地转为String字符串
        String to = jsonNode.get("to").asText();
        Session target = Sessions.get(to);

        if(target != null){
            target.getBasicRemote().sendText(message);
            System.out.println(userId+"已转发消息给"+to);
        }
    }

    @OnClose
    public void onClose(@PathParam("user_id") String userId){
        Sessions.remove(userId);
        System.out.println(userId+"已断开连接");
    }
}
