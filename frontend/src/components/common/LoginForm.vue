<template>
  <div class="login-form">
    <el-form
      ref="formRef"
      :model="formData"
      :rules="rules"
      class="login-form-content"
      @submit.prevent="handleLogin"
    >
      <el-form-item prop="username">
        <el-input
          v-model="formData.username"
          placeholder="请输入用户名"
          size="large"
          :prefix-icon="User"
        />
      </el-form-item>
      
      <el-form-item prop="password">
        <el-input
          v-model="formData.password"
          type="password"
          placeholder="请输入密码"
          size="large"
          :prefix-icon="Lock"
          show-password
          @keyup.enter="handleLogin"
        />
      </el-form-item>
      
      <el-form-item>
        <div class="login-options">
          <el-checkbox v-model="formData.remember">记住我</el-checkbox>
        </div>
      </el-form-item>
      
      <el-form-item>
        <el-button
          type="primary"
          size="large"
          class="login-button"
          :loading="loading"
          @click="handleLogin"
        >
          {{ loading ? '登录中...' : '登录' }}
        </el-button>
      </el-form-item>
      
      <el-alert
        v-if="error"
        :title="error"
        type="error"
        show-icon
        closable
        class="login-error"
        @close="authStore.clearError"
      />
      
      <div class="login-hint">
        <p>测试账号：</p>
        <p>管理员: admin / admin123</p>
        <p>饲养员: feeder01 / feeder123</p>
        <p>访客: guest / guest123</p>
      </div>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { User, Lock } from '@element-plus/icons-vue'
import type { FormInstance, FormRules } from 'element-plus'

const router = useRouter()
const authStore = useAuthStore()

const formRef = ref<FormInstance>()

const formData = reactive({
  username: '',
  password: '',
  remember: false,
})

const rules: FormRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 20, message: '用户名长度在 3 到 20 个字符', trigger: 'blur' },
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, max: 20, message: '密码长度在 6 到 20 个字符', trigger: 'blur' },
  ],
}

const loading = computed(() => authStore.loading)
const error = computed(() => authStore.error)

const handleLogin = async () => {
  if (!formRef.value) return
  
  await formRef.value.validate(async (valid) => {
    if (!valid) return
    
    const success = await authStore.login({
      username: formData.username,
      password: formData.password,
    })
    
    if (success) {
      router.push('/dashboard')
    }
  })
}
</script>

<style scoped>
.login-form {
  width: 100%;
  max-width: 400px;
}

.login-form-content {
  padding: 30px 20px;
}

.login-options {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.login-button {
  width: 100%;
}

.login-error {
  margin-bottom: 20px;
}

.login-hint {
  margin-top: 20px;
  padding: 15px;
  background-color: #f5f7fa;
  border-radius: 4px;
  font-size: 12px;
  color: #909399;
}

.login-hint p {
  margin: 4px 0;
}

.login-hint p:first-child {
  font-weight: 600;
  color: #606266;
  margin-bottom: 8px;
}
</style>