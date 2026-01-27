package top.publicnote.cowfarm.Controller;

import top.publicnote.cowfarm.Model.UniversalResponse;

import java.util.Map;

public interface IRobotController {
    public UniversalResponse <Map<String,Object>> ReseiveData(Map<String,Object> data);
}
