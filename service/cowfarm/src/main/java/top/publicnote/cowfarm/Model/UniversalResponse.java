package top.publicnote.cowfarm.Model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@NoArgsConstructor
@AllArgsConstructor
@Data
public class UniversalResponse<T> {
    private String code;//状态码
    private String message;//返回信息
    private T data;//返回数据

    //Lombok不知为何没生效，报错
    public UniversalResponse(String code, String message, T data) {
        this.code = code;
        this.message = message;
        this.data = data;
    }

    //无数据返回
    public static <E> UniversalResponse<E> success(){
        return new UniversalResponse<E>("200","操作成功",null);
    }

    //有信息返回
    public static <E> UniversalResponse<E> success(String message){
        return new UniversalResponse<E>("200",message,null);
    }

    //有数据返回
    public static <E> UniversalResponse<E> success(String message,E data){
        return new UniversalResponse<>("200",message,data);
    }

    //无数据失败返回
    public static <E> UniversalResponse<E> error(String message){
        return new UniversalResponse<E>("400",message,null);
    }

    //有数据失败返回
    public static <E> UniversalResponse<E> error(String message,E data){
        return new UniversalResponse<>("400",message,data);
    }

    //自定义返回信息
    public static <E> UniversalResponse<E> result(String code,String message,E data){
        return new UniversalResponse<E>(code,message,data);
    }

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public T getData() {
        return data;
    }

    public void setData(T data) {
        this.data = data;
    }
}
