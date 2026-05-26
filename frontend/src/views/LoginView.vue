<template>
  <div class="login-view">
    <div class="login-container">
      <div class="login-header">
        <div class="logo">
          <el-icon class="logo-icon"><Grid /></el-icon>
          <h1>智慧牧场管理系统</h1>
        </div>
        <p class="subtitle">Smart Farm Management System</p>
      </div>
      
      <LoginForm />
      
      <div class="login-footer">
        <p>© 2024 智慧牧场管理系统 - 现代化牧场解决方案</p>
      </div>
    </div>
    
    <div class="login-background">
      <div class="bg-pattern"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import LoginForm from '@/components/common/LoginForm.vue'
import { Grid } from '@element-plus/icons-vue'
</script>

<style scoped>
.login-view {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  position: relative;
  overflow: hidden;
}

.login-container {
  position: relative;
  z-index: 10;
  width: 100%;
  max-width: 480px;
  padding: 20px;
}

.login-header {
  text-align: center;
  margin-bottom: 30px;
}

.logo {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-bottom: 10px;
}

.logo-icon {
  font-size: 48px;
  color: #fff;
}

.logo h1 {
  font-size: 28px;
  font-weight: 600;
  color: #fff;
  margin: 0;
}

.subtitle {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.8);
  margin: 0;
  letter-spacing: 2px;
}

.login-footer {
  text-align: center;
  margin-top: 30px;
}

.login-footer p {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
  margin: 0;
}

.login-background {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.bg-pattern {
  position: absolute;
  width: 200%;
  height: 200%;
  top: -50%;
  left: -50%;
  background-image: 
    radial-gradient(circle at 20% 80%, rgba(255, 255, 255, 0.1) 0%, transparent 50%),
    radial-gradient(circle at 80% 20%, rgba(255, 255, 255, 0.1) 0%, transparent 50%),
    radial-gradient(circle at 40% 40%, rgba(255, 255, 255, 0.05) 0%, transparent 30%);
  animation: float 20s ease-in-out infinite;
}

@keyframes float {
  0%, 100% {
    transform: translate(0, 0) rotate(0deg);
  }
  50% {
    transform: translate(2%, 2%) rotate(1deg);
  }
}
</style>