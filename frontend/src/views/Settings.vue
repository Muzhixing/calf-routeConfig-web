<template>
  <div class="settings">
    <el-card>
      <template #header>
        <span>系统设置</span>
      </template>
      <el-form label-width="120px">
        <el-form-item label="系统名称">
          <el-input v-model="settings.systemName" />
        </el-form-item>
        <el-form-item label="API地址">
          <el-input v-model="settings.apiUrl" />
        </el-form-item>
        <el-form-item label="刷新间隔">
          <el-input-number v-model="settings.refreshInterval" :min="5" :max="300" />
          <span style="margin-left: 10px">秒</span>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSave">保存设置</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'

const settings = ref({
  systemName: '智慧牧场管理系统',
  apiUrl: 'http://localhost:8080/api',
  refreshInterval: 30
})

const handleSave = () => {
  ElMessage.success('设置已保存')
}
</script>