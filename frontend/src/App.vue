<template>
  <div class="app-container">
    <!-- Login page - full screen without sidebar -->
    <router-view v-if="isLoginPage" />
    
    <!-- Main app with sidebar -->
    <el-container v-else>
      <el-aside width="220px" class="app-aside">
        <div class="logo">
          <el-icon class="logo-icon"><Grid /></el-icon>
          <h3>智慧牧场</h3>
        </div>
        <el-menu
          :default-active="activeMenu"
          class="el-menu-vertical"
          router
          background-color="#263445"
          text-color="#bfcbd9"
          active-text-color="#409eff"
        >
          <el-menu-item index="/dashboard">
            <el-icon><Odometer /></el-icon>
            <span>控制台</span>
          </el-menu-item>
          <el-menu-item index="/cows">
            <el-icon><Aim /></el-icon>
            <span>牛只管理</span>
          </el-menu-item>
          <el-menu-item index="/robots">
            <el-icon><Monitor /></el-icon>
            <span>机器人管理</span>
          </el-menu-item>
          <el-menu-item index="/routes">
            <el-icon><Path /></el-icon>
            <span>路线管理</span>
          </el-menu-item>
          <el-menu-item index="/tasks">
            <el-icon><Clock /></el-icon>
            <span>任务管理</span>
          </el-menu-item>
          <el-menu-item index="/alarms">
            <el-icon><BellFilled /></el-icon>
            <span>告警中心</span>
          </el-menu-item>
          <el-menu-item index="/health">
            <el-icon><FirstAidKit /></el-icon>
            <span>健康记录</span>
          </el-menu-item>
          <el-menu-item index="/feeding">
            <el-icon><Food /></el-icon>
            <span>喂养管理</span>
          </el-menu-item>
          <el-menu-item index="/statistics">
            <el-icon><DataAnalysis /></el-icon>
            <span>数据统计</span>
          </el-menu-item>
          <el-menu-item index="/settings">
            <el-icon><Setting /></el-icon>
            <span>系统设置</span>
          </el-menu-item>
          <el-menu-item index="/map">
            <el-icon><Location /></el-icon>
            <span>牧场地图</span>
          </el-menu-item>
          <el-menu-item index="/map-editor">
            <el-icon><EditPen /></el-icon>
            <span>路线编辑</span>
          </el-menu-item>
          <el-menu-item index="/video">
            <el-icon><VideoCamera /></el-icon>
            <span>视频监控</span>
          </el-menu-item>
          <el-menu-item index="/history">
            <el-icon><Clock /></el-icon>
            <span>历史记录</span>
          </el-menu-item>
          <el-menu-item index="/logs">
            <el-icon><Document /></el-icon>
            <span>操作日志</span>
          </el-menu-item>
        </el-menu>
      </el-aside>
      <el-container>
        <el-header class="app-header">
          <div class="header-left">
            <h2>{{ pageTitle }}</h2>
          </div>
          <div class="header-right">
            <el-dropdown @command="handleCommand">
              <span class="user-dropdown">
                <el-icon><User /></el-icon>
                <span>{{ username }}</span>
                <el-icon class="el-icon--right"><ArrowDown /></el-icon>
              </span>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="profile">个人信息</el-dropdown-item>
                  <el-dropdown-item command="logout" divided>退出登录</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </el-header>
        <el-main class="app-main">
          <router-view />
        </el-main>
      </el-container>
    </el-container>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from './stores/auth'
import {
  Odometer,
  Aim,
  FirstAidKit,
  Food,
  DataAnalysis,
  Setting,
  User,
  ArrowDown,
  Grid,
  Monitor,
  Guide,
  Clock,
  BellFilled,
  Location,
  EditPen,
  VideoCamera,
  Document
} from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const isLoginPage = computed(() => route.path === '/login')

const activeMenu = computed(() => route.path)

const pageTitle = computed(() => {
  return (route.meta.title as string) || '智慧牧场管理系统'
})

const username = computed(() => authStore.user?.username || '未登录')

const handleCommand = async (command: string) => {
  if (command === 'logout') {
    await authStore.logout()
    router.push('/login')
  } else if (command === 'profile') {
    router.push('/profile')
  }
}
</script>

<style scoped>
.app-container {
  height: 100vh;
}

.el-container {
  height: 100%;
}

.app-aside {
  background-color: #263445;
  color: #fff;
}

.logo {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #1f2d3d;
  gap: 8px;
}

.logo-icon {
  font-size: 24px;
  color: var(--color-primary, #4CAF50);
}

.logo h3 {
  color: #fff;
  font-size: 16px;
  font-weight: 600;
  margin: 0;
}

.el-menu {
  border-right: none;
}

.el-menu-item {
  height: 50px;
  line-height: 50px;
}

.el-menu-item:hover,
.el-menu-item.is-active {
  background-color: #1f2d3d !important;
}

.app-header {
  background-color: #fff;
  box-shadow: 0 1px 4px rgba(0, 21, 41, 0.08);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
}

.header-left h2 {
  font-size: 18px;
  font-weight: 500;
  color: #303133;
  margin: 0;
}

.header-right {
  display: flex;
  align-items: center;
}

.user-dropdown {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  padding: 8px 12px;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.user-dropdown:hover {
  background-color: #f5f7fa;
}

.app-main {
  background-color: #f0f2f5;
  padding: 20px;
  overflow-y: auto;
}
</style>