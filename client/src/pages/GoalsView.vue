<template>
  <div class="goals-container">
    <header class="page-header">
      <div>
        <h2>Study goals</h2>
        <p>Set a target and keep track of your progress.</p>
      </div>
      <button class="primary-button" @click="openCreateForm">Add goal</button>
    </header>

    <p v-if="errorMessage" class="message error-message" role="alert">{{ errorMessage }}</p>
    <p v-if="successMessage" class="message success-message" role="status">{{ successMessage }}</p>

    <section v-if="showGoalForm" class="goal-form">
      <h3>{{ editingGoal ? 'Edit goal' : 'Create a goal' }}</h3>
      <form @submit.prevent="saveGoal">
        <div class="form-field">
          <label for="goal-title">Goal</label>
          <input id="goal-title" v-model="goalForm.title" type="text" maxlength="100" required>
        </div>

        <div class="form-field">
          <label for="goal-description">Description (optional)</label>
          <textarea id="goal-description" v-model="goalForm.description" rows="2"></textarea>
        </div>

        <div class="form-row">
          <div class="form-field">
            <label for="goal-type">Goal type</label>
            <select id="goal-type" v-model="goalForm.type">
              <option value="time">Study time for a subject</option>
              <option value="checklist">Checklist</option>
            </select>
          </div>
          <div class="form-field">
            <label for="goal-term">Time frame</label>
            <select id="goal-term" v-model="goalForm.term">
              <option value="short-term">Short-term</option>
              <option value="long-term">Long-term</option>
            </select>
          </div>
        </div>

        <template v-if="goalForm.type === 'time'">
          <div class="form-row">
            <div class="form-field">
              <label for="goal-subject">Subject</label>
              <select id="goal-subject" v-model="goalForm.subjectId" required>
                <option value="" disabled>Select a subject</option>
                <option v-for="subject in subjects" :key="subject._id || subject.id" :value="subject._id || subject.id">
                  {{ subject.name }}
                </option>
              </select>
            </div>
            <div class="form-field">
              <label for="goal-hours">Target study time (hours)</label>
              <input id="goal-hours" v-model.number="goalForm.targetHours" type="number" min="0.1" step="0.1" required>
            </div>
          </div>
          <div class="form-row">
            <div class="form-field">
              <label for="goal-start">Start date</label>
              <input id="goal-start" v-model="goalForm.startDate" type="date" required>
            </div>
            <div class="form-field">
              <label for="goal-end">Target date (optional)</label>
              <input id="goal-end" v-model="goalForm.endDate" type="date">
            </div>
          </div>
        </template>

        <div class="form-actions">
          <button class="primary-button" type="submit" :disabled="isBusy">
            {{ isBusy ? 'Saving…' : editingGoal ? 'Save changes' : 'Create goal' }}
          </button>
          <button type="button" :disabled="isBusy" @click="closeGoalForm">Cancel</button>
        </div>
      </form>
    </section>

    <p v-if="!studyGoals.length" class="empty-state">
      No study goals yet. Add a time target or a checklist goal to get started.
    </p>

    <div class="goals-list">
      <article v-for="goal in studyGoals" :key="goal._id || goal.id" class="goal-card">
        <div class="goal-heading">
          <div>
            <p class="goal-label">{{ goal.term }} · {{ goal.type === 'time' ? 'Study time' : 'Checklist' }}</p>
            <h3>{{ goal.title }}</h3>
          </div>
          <div class="goal-actions">
            <button type="button" @click="openEditForm(goal)">Edit</button>
            <button type="button" class="delete-button" @click="deleteGoal(goal)">Delete</button>
          </div>
        </div>

        <p v-if="goal.description" class="goal-description">{{ goal.description }}</p>

        <template v-if="goal.type === 'time'">
          <p class="goal-progress-text">
            {{ subjectName(goal.subjectId) }} · {{ formatDuration(goal.progress) }} of {{ formatDuration(goal.targetDuration) }}
            <span v-if="goal.endDate">· Due {{ formatDate(goal.endDate) }}</span>
          </p>
          <div class="progress-track" role="progressbar" :aria-valuenow="goal.progressPercent" aria-valuemin="0" aria-valuemax="100">
            <div class="progress-fill" :style="{ width: `${goal.progressPercent}%` }"></div>
          </div>
          <p class="progress-caption">{{ goal.progressPercent }}% complete</p>
        </template>

        <template v-else>
          <p class="goal-progress-text">
            {{ goal.progress || 0 }} of {{ goal.taskCount || 0 }} tasks complete
          </p>
          <div class="progress-track" role="progressbar" :aria-valuenow="goal.progressPercent || 0" aria-valuemin="0" aria-valuemax="100">
            <div class="progress-fill" :style="{ width: `${goal.progressPercent || 0}%` }"></div>
          </div>
          <p class="progress-caption">
            {{ goal.isComplete ? 'Goal complete' : `${goal.progressPercent || 0}% complete` }}
          </p>

          <ul v-if="goal.studyTasks?.length" class="task-list">
            <li v-for="task in goal.studyTasks" :key="task._id || task.id" class="task-row">
              <label>
                <input
                  type="checkbox"
                  :checked="task.completed"
                  :disabled="isBusy"
                  @change="setTaskCompleted(goal, task, $event.target.checked)"
                >
                <span :class="{ completed: task.completed }">{{ task.title }}</span>
              </label>
              <div class="task-actions">
                <button type="button" @click="editTask(task)">Edit</button>
                <button type="button" class="delete-button" @click="deleteTask(task)">Delete</button>
              </div>
            </li>
          </ul>
          <p v-else class="no-tasks">Add tasks to make this checklist goal actionable.</p>

          <form class="task-form" @submit.prevent="addTask(goal)">
            <input
              v-model="taskDrafts[goalId(goal)]"
              type="text"
              maxlength="100"
              placeholder="Add a task"
              :aria-label="`New task for ${goal.title}`"
              required
            >
            <button type="submit" :disabled="isBusy">Add task</button>
          </form>
        </template>
      </article>
    </div>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { request } from '@/services/api.js'

const studyGoals = ref([])
const subjects = ref([])
const showGoalForm = ref(false)
const editingGoal = ref(null)
const isBusy = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const taskDrafts = reactive({})

const goalForm = reactive({
  title: '',
  description: '',
  type: 'time',
  term: 'short-term',
  subjectId: '',
  targetHours: 5,
  startDate: getLocalDate(new Date()),
  endDate: ''
})

onMounted(loadData)

async function loadData() {
  errorMessage.value = ''
  const results = await Promise.allSettled([
    request('/study/goals', { method: 'GET' }),
    request('/subjects', { method: 'GET' })
  ])

  if (results[0].status === 'fulfilled') {
    studyGoals.value = results[0].value.studyGoals || []
  } else {
    errorMessage.value = 'Could not load your study goals.'
  }

  if (results[1].status === 'fulfilled') {
    subjects.value = results[1].value.subjects || []
  } else if (!errorMessage.value) {
    errorMessage.value = 'Could not load your subjects.'
  }
}

function openCreateForm() {
  editingGoal.value = null
  Object.assign(goalForm, {
    title: '',
    description: '',
    type: 'time',
    term: 'short-term',
    subjectId: subjects.value[0] ? subjectId(subjects.value[0]) : '',
    targetHours: 5,
    startDate: getLocalDate(new Date()),
    endDate: ''
  })
  errorMessage.value = ''
  showGoalForm.value = true
}

function openEditForm(goal) {
  editingGoal.value = goal
  Object.assign(goalForm, {
    title: goal.title,
    description: goal.description || '',
    type: goal.type,
    term: goal.term,
    subjectId: goal.subjectId || '',
    targetHours: goal.targetDuration ? goal.targetDuration / 3600 : 5,
    startDate: getLocalDate(goal.startDate),
    endDate: goal.endDate ? getLocalDate(goal.endDate) : ''
  })
  errorMessage.value = ''
  showGoalForm.value = true
}

function closeGoalForm() {
  showGoalForm.value = false
  editingGoal.value = null
}

async function saveGoal() {
  const title = goalForm.title.trim()
  if (!title) {
    errorMessage.value = 'Enter a goal title.'
    return
  }
  if (goalForm.type === 'time' && !goalForm.subjectId) {
    errorMessage.value = 'Create a subject on the Study page before making a time goal.'
    return
  }
  if (goalForm.endDate && goalForm.endDate < goalForm.startDate) {
    errorMessage.value = 'The target date must be on or after the start date.'
    return
  }

  const body = {
    title,
    description: goalForm.description.trim(),
    type: goalForm.type,
    term: goalForm.term
  }

  if (goalForm.type === 'time') {
    body.subjectId = goalForm.subjectId
    body.targetDuration = Math.round(Number(goalForm.targetHours) * 60 * 60)
    body.startDate = localDateTimestamp(goalForm.startDate)
    body.endDate = goalForm.endDate
      ? localDateTimestamp(addDays(goalForm.endDate, 1))
      : null
    body.timezoneOffsetMinutes = -new Date(`${goalForm.startDate}T00:00:00`).getTimezoneOffset()
  }

  isBusy.value = true
  errorMessage.value = ''
  successMessage.value = ''
  try {
    const wasEditing = Boolean(editingGoal.value)
    const response = wasEditing
      ? await request(`/study/goals/${goalId(editingGoal.value)}`, {
          method: 'PATCH',
          body: JSON.stringify(body)
        })
      : await request('/study/goals', {
          method: 'POST',
          body: JSON.stringify(body)
        })

    closeGoalForm()
    successMessage.value = response.queued
      ? 'Goal saved on this device and waiting to sync.'
      : wasEditing ? 'Goal updated.' : 'Goal created.'
    await loadData()
  } catch (error) {
    errorMessage.value = error.message || 'Could not save the goal.'
  } finally {
    isBusy.value = false
  }
}

async function deleteGoal(goal) {
  if (!confirm(`Delete “${goal.title}” and its tasks?`)) return

  isBusy.value = true
  errorMessage.value = ''
  successMessage.value = ''
  try {
    const response = await request(`/study/goals/${goalId(goal)}`, { method: 'DELETE' })
    successMessage.value = response.queued
      ? 'Goal deletion is waiting to sync.'
      : 'Goal deleted.'
    await loadData()
  } catch (error) {
    errorMessage.value = error.message || 'Could not delete the goal.'
  } finally {
    isBusy.value = false
  }
}

async function addTask(goal) {
  const id = goalId(goal)
  const title = (taskDrafts[id] || '').trim()
  if (!title) return

  isBusy.value = true
  errorMessage.value = ''
  successMessage.value = ''
  try {
    const response = await request(`/study/goals/${id}/tasks`, {
      method: 'POST',
      body: JSON.stringify({ title })
    })
    taskDrafts[id] = ''
    successMessage.value = response.queued
      ? 'Task saved on this device and waiting to sync.'
      : 'Task added.'
    await loadData()
  } catch (error) {
    errorMessage.value = error.message || 'Could not add the task.'
  } finally {
    isBusy.value = false
  }
}

async function setTaskCompleted(goal, task, completed) {
  isBusy.value = true
  errorMessage.value = ''
  try {
    const response = await request(`/study/tasks/${task._id || task.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ completed })
    })

    if (response.queued) {
      task.completed = completed
      task.pending = true
      updateChecklistProgress(goal)
      successMessage.value = 'Task update is waiting to sync.'
    } else {
      await loadData()
    }
  } catch (error) {
    errorMessage.value = error.message || 'Could not update the task.'
    await loadData()
  } finally {
    isBusy.value = false
  }
}

async function editTask(task) {
  const title = prompt('Edit task', task.title)
  if (title === null) return
  if (!title.trim()) {
    errorMessage.value = 'Task title cannot be empty.'
    return
  }

  isBusy.value = true
  errorMessage.value = ''
  try {
    const response = await request(`/study/tasks/${task._id || task.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ title: title.trim() })
    })
    successMessage.value = response.queued
      ? 'Task edit is waiting to sync.'
      : 'Task updated.'
    await loadData()
  } catch (error) {
    errorMessage.value = error.message || 'Could not edit the task.'
  } finally {
    isBusy.value = false
  }
}

async function deleteTask(task) {
  if (!confirm(`Delete “${task.title}”?`)) return

  isBusy.value = true
  errorMessage.value = ''
  try {
    const response = await request(`/study/tasks/${task._id || task.id}`, { method: 'DELETE' })
    successMessage.value = response.queued
      ? 'Task deletion is waiting to sync.'
      : 'Task deleted.'
    await loadData()
  } catch (error) {
    errorMessage.value = error.message || 'Could not delete the task.'
  } finally {
    isBusy.value = false
  }
}

function updateChecklistProgress(goal) {
  const tasks = goal.studyTasks || []
  const completedCount = tasks.filter(task => task.completed).length
  goal.progress = completedCount
  goal.taskCount = tasks.length
  goal.progressPercent = tasks.length
    ? Math.round((completedCount / tasks.length) * 100)
    : (goal.completed ? 100 : 0)
  goal.isComplete = tasks.length > 0
    ? completedCount === tasks.length
    : goal.completed
}

function goalId(goal) {
  return goal?._id || goal?.id
}

function subjectId(subject) {
  return subject?._id || subject?.id
}

function subjectName(id) {
  const normalizedId = typeof id === 'object' ? id?._id || id?.id : id
  return subjects.value.find(subject => subjectId(subject) === normalizedId)?.name || 'Subject'
}

function getLocalDate(value) {
  const date = new Date(value)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function localDateTimestamp(value) {
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  const offset = -date.getTimezoneOffset()
  const sign = offset >= 0 ? '+' : '-'
  const absoluteOffset = Math.abs(offset)
  return `${value}T00:00:00.000${sign}${String(Math.floor(absoluteOffset / 60)).padStart(2, '0')}:${String(absoluteOffset % 60).padStart(2, '0')}`
}

function addDays(value, count) {
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(year, month - 1, day + count)
  return getLocalDate(date)
}

function formatDate(value) {
  return new Date(value).toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric'
  })
}

function formatDuration(seconds) {
  const totalSeconds = Math.max(0, Math.floor(Number(seconds) || 0))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  return hours ? `${hours}h ${minutes}m` : `${minutes}m`
}
</script>

<style scoped>
.goals-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 32px 24px;
  font-family: Arial, sans-serif;
}

.page-header,
.goal-heading,
.task-row,
.task-form,
.form-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.page-header {
  margin-bottom: 24px;
}

.page-header h2,
.goal-heading h3,
.goal-form h3 {
  margin: 0;
}

.page-header p,
.goal-description {
  color: #666;
}

.goal-form,
.goal-card {
  margin-top: 20px;
  padding: 18px;
  border: 1px solid #ddd;
  border-radius: 8px;
  background: white;
}

.goal-form form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.form-row {
  display: flex;
  gap: 12px;
}

.form-field {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 5px;
}

label {
  font-weight: bold;
}

input,
select,
textarea {
  padding: 8px 10px;
  border: 1px solid #ccc;
  border-radius: 5px;
  font: inherit;
}

.form-actions {
  justify-content: flex-start;
}

.goal-label,
.goal-progress-text,
.progress-caption,
.no-tasks {
  color: #666;
}

.progress-track {
  height: 16px;
  overflow: hidden;
  border-radius: 8px;
  background: #e5e7eb;
}

.progress-fill {
  height: 100%;
  background: #4caf50;
}

.task-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.task-row {
  padding: 10px 0;
  border-bottom: 1px solid #eee;
}

.task-row label {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 10px;
  cursor: pointer;
}

.completed {
  color: #777;
  text-decoration: line-through;
}

.task-form {
  justify-content: flex-start;
  margin-top: 12px;
}

.task-form input {
  flex: 1;
}

.empty-state {
  margin-top: 20px;
  padding: 16px;
  border: 1px dashed #ccc;
  color: #666;
}

.error-message {
  color: #8c1d18;
}

.success-message {
  color: #246b32;
}

button {
  padding: 8px 12px;
  border: 0;
  border-radius: 5px;
  background: #eee;
  cursor: pointer;
}

.primary-button {
  background: #4caf50;
  color: white;
  font-weight: bold;
}

.delete-button {
  color: #a22;
}
</style>