package io.github.jinganix.admin.starter;

import java.util.Arrays;
import java.util.HashMap;
import java.util.Map;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.task.TaskExecutionAutoConfiguration;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.transaction.annotation.EnableTransactionManagement;

/** Application. */
@EnableTransactionManagement
@EnableConfigurationProperties
@SpringBootApplication(exclude = TaskExecutionAutoConfiguration.class)
public class AdminStarterApplication {

  /**
   * The main method.
   *
   * @param args arguments
   */
  public static void main(String[] args) {
    SpringApplication app = new SpringApplication(AdminStarterApplication.class);
    if (isSignalOnly(args)) {
      Map<String, Object> defaults = new HashMap<>();
      defaults.put(
          "spring.autoconfigure.exclude",
          "org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration,"
              + "org.springframework.boot.autoconfigure.orm.jpa.HibernateJpaAutoConfiguration,"
              + "org.springframework.boot.autoconfigure.flyway.FlywayAutoConfiguration,"
              + "org.springframework.boot.autoconfigure.data.redis.RedisAutoConfiguration,"
              + "org.springframework.boot.autoconfigure.data.redis.RedisRepositoriesAutoConfiguration");
      defaults.put("spring.data.jpa.repositories.enabled", "false");
      app.setDefaultProperties(defaults);
    }
    app.run(args);
  }

  private static boolean isSignalOnly(String[] args) {
    if (args != null) {
      boolean match =
          Arrays.stream(args)
              .anyMatch(arg -> arg != null && arg.contains("spring.profiles.active=signal-only"));
      if (match) {
        return true;
      }
    }
    String env = System.getenv("SPRING_PROFILES_ACTIVE");
    return env != null && env.contains("signal-only");
  }
}
