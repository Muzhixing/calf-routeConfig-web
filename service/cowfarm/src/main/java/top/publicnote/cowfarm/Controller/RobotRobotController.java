package top.publicnote.cowfarm.Controller;

import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.web.bind.annotation.*;
import top.publicnote.cowfarm.Model.UniversalResponse;

import java.util.Map;

@RestController
@RequestMapping("/api")
public class RobotRobotController implements IRobotController {
    @Override
    @PostMapping("/basicdata")
    public UniversalResponse<Map<String,Object>> ReseiveData(@RequestBody Map<String,Object> data) {
        System.out.println("请求成功（后端输出）");
        //遍历输出
        data.forEach((k,v)-> System.out.println(k+":"+v));
        return UniversalResponse.success("请求成功");
    }

}
