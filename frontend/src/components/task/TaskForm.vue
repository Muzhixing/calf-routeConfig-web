<template>
  <el-form 
    ref="formRef"
    :model="formData" 
    :rules="rules" 
    label-width="100px"
    class="task-form"
  >
    <el-form-item label="任务名称" prop="name">
      <el-input v-model="formData.name" placeholder="请输入任务名称" />
    </el-form-item>
    
    <el-form-item label="选择路线" prop="routeId">
      <el-select v-model="formData.routeId" placeholder="请选择路线" style="width: 100%">
        <el-option
          v-for="route in routes"
          :key="route.id"
          :label="route.name"
          :value="route.id"
        />
      </el-select>
    </el-form-item>
    
    <el-form-item label="选择机器人" prop="robotId">
      <el-select 
        v-model="formData.robotId" 
        placeholder="请选择机器人(可选)"
        clearable
        style="width: 100%"
      >
        <el-option
          v-for="robot in availableRobots"
          :key="robot.id"
          :label="`${robot.name} (${getStatusText(robot.status)})`"
          :value="robot.id"
        />
      </el-select>
    </el-form-item>
    
    <el-form-item label="计划时间" prop="scheduledTime">
      <el-date-picker
        v-model="formData.scheduledTime"
        type="datetime"
        placeholder="选择计划执行时间"
        style="width: 100%"
        format="YYYY-MM-DD HH:mm"
        value-format="YYYY-MM-DDTHH:mm:ss"
      />
    </el-form-item>
    
    <el-form-item label="重复类型" prop="repeatType">
      <el-radio-group v-model="formData.repeatType">
        <el-radio label="none">不重复</el-radio>
        <el-radio label="daily">每天</el-radio>
        <el-radio label="weekly">每周</el-radio>
        <el-radio label="monthly">每月</el-radio>
      </el-radio-group>
    </el-form-item>
    
    <el-form-item v-if="formData.repeatType !== 'none'" label="重复时间">
      <div class="repeat-time-config">
        <el-select 
          v-model="repeatHour" 
          placeholder="小时"
          style="width: 100px"
        >
          <el-option v-for="h in 24" :key="h-1" :label="`${h-1}时`" :value="h-1" />
        </el-select>
        <span>:</span>
        <el-select 
          v-model="repeatMinute" 
          placeholder="分钟"
          style="width: 100px"
        >
          <el-option v-for="m in 60" :key="m-1" :label="`${m-1}分`" :value="m-1" />
        </el-select>
      </div>
    </el-form-item>
    
    <el-form-item>
      <el-button type="primary" @click="handleSubmit">
        {{ isEdit ? '保存' : '创建' }}
      </el-button>
      <el-button @click="handleCancel">取消</el-button>
    </el-form-item>
  </el-form>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import type { Task, RepeatType, Route, Robot } from '@/types'
import { getStatusText } from '@/services/robot'

const props = defineProps<{
  task?: Task
  routes: Route[]
  robots: Robot[]
  isEdit?: boolean
}>()

const emit = defineEmits<{
  submit: [task: Partial<Task>]
  cancel: []
}>()

const formRef = ref<FormInstance>()
const formData = ref({
  name: '',
  routeId: '',
  robotId: '',
  scheduledTime: '',
  repeatType: 'none' as RepeatType,
})

const repeatHour = ref(8)
const repeatMinute = ref(0)

// 过滤可用的机器人(在线或运行中的)
const availableRobots = computed(() => {
  return props.robots.filter(r => 
    r.status === 'online' || r.status === 'running' || r.status === 'paused'
  )
})

// 表单验证规则
const rules: FormRules = {
  name: [
    { required: true, message: '请输入任务名称', trigger: 'blur' },
    { min: 2, max: 50, message: '长度在 2 到 50 个字符', trigger: 'blur' },
  ],
  routeId: [
    { required: true, message: '请选择路线', trigger: 'change' },
  ],
  scheduledTime: [
    { required: true, message: '请选择计划时间', trigger: 'change' },
  ],
}

// 初始化表单数据
const initFormData = () => {
  if (props.task) {
    formData.value = {
      name: props.task.name,
      routeId: props.task.routeId,
      robotId: props.task.robotId || '',
      scheduledTime: props.task.scheduledTime,
      repeatType: props.task.repeatType || 'none',
    }
    
    // 解析重复时间
    if (props.task.scheduledTime) {
      const date = new Date(props.task.scheduledTime)
      repeatHour.value = date.getHours()
      repeatMinute.value = date.getMinutes()
    }
  } else {
    // 默认设置当前时间后1小时
    const defaultTime = new Date()
    defaultTime.setHours(defaultTime.getHours() + 1)
    formData.value.scheduledTime = defaultTime.toISOString().slice(0, 16)
    repeatHour.value = defaultTime.getHours()
    repeatMinute.value = defaultTime.getMinutes()
  }
}

// 提交表单
const handleSubmit = async () => {
  if (!formRef.value) return
  
  await formRef.value.validate((valid) => {
    if (valid) {
      // 如果设置了重复类型，调整计划时间
      let scheduledTime = formData.value.scheduledTime
      if (formData.value.repeatType !== 'none' && scheduledTime) {
        const date = new Date(scheduledTime)
        date.setHours(repeatHour.value)
        date.setMinutes(repeatMinute.value)
        scheduledTime = date.toISOString()
      }
      
      emit('submit', {
        ...formData.value,
        scheduledTime,
        robotId: formData.value.robotId || undefined,
        status: 'pending' as const,
      })
    }
  })
}

// 取消
const handleCancel = () => {
  emit('cancel')
}

// 监听任务数据变化
watch(() => props.task, () => {
  initFormData()
}, { immediate: true })

onMounted(() => {
  initFormData()
})
</script>

<style scoped>
.task-form {
  padding: 20px;
}

.repeat-time-config {
  display: flex;
  align-items: center;
  gap: 8px;
}

.repeat-time-config span {
  font-size: 18px;
  font-weight: bold;
}
</style>