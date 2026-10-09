<template>
  <div class="dashboard-container">
    <header class="dashboard-header">
      <div>
        <h2>Welcome {{ authState.user?.username || 'back' }}</h2>
        <h3 class="today-date">{{ todayLabel }}</h3>
      </div>
      <button class="refresh-button" :disabled="isLoading" @click="loadDashboard">
        {{ isLoading ? 'Refreshing…' : 'Refresh' }}
      </button>
    </header>

    <p v-if="errorMessage" class="error-message" role="alert">{{ errorMessage }}</p>

    <section v-if="activeSession" class="active-session">
      <div>
        <p class="eyebrow">Currently studying</p>
        <h3>{{ activeSubjectName }}</h3>
        <p v-if="activeSession.topic">{{ activeSession.topic }}</p>
      </div>
      <router-link to="/study" class="text-link">Go to study</router-link>
    </section>

    <div class="dashboard-grid">
      <section class="panel habits-panel">
        <div class="panel-heading">
          <div>
            <p class="eyebrow">Daily checklist</p>
            <h3>Today’s habits</h3>
          </div>
          <span class="progress-count">{{ completedCount }} / {{ todaysHabits.length }}</span>
        </div>

        <div class="progress-track" role="progressbar" :aria-valuenow="progress" aria-valuemin="0" aria-valuemax="100" :aria-label="`Today's habits ${progress}% complete`">
          <div class="progress-fill" :style="{ width: `${progress}%` }"></div>
        </div>
        <p class="progress-caption">{{ progress }}% complete</p>

        <p v-if="!todaysHabits.length" class="empty-state">
          No habits are scheduled for today.
          <router-link to="/habits">Manage habits</router-link>
        </p>

        <ul v-else class="habit-list">
          <li v-for="habit in todaysHabits" :key="habit._id || habit.id" class="habit-row">
            <label>
              <input
                type="checkbox"
                :checked="habit.completed"
                :disabled="isHabitPending(habit) || isToggling(habit)"
                @change="toggleHabit(habit)"
              >
              <span class="habit-name" :class="{ completed: habit.completed }">{{ habit.name }}</span>
            </label>
            <span v-if="isHabitPending(habit)" class="pending-label">Waiting to sync</span>
          </li>
        </ul>

        <router-link to="/habits" class="panel-link">View all habits</router-link>
      </section>

      <section class="panel stats-panel">
        <div class="panel-heading">
          <div>
            <p class="eyebrow">Last 7 days</p>
            <h3>Study activity</h3>
          </div>
          <router-link to="/study" class="text-link">Study page</router-link>
        </div>

        <div class="weekly-totals">
          <div>
            <strong>{{ formatDuration(weeklyStats.totalStudyTime) }}</strong>
            <span>Total study time</span>
          </div>
          <div>
            <strong>{{ weeklyStats.sessionCount }}</strong>
            <span>Sessions</span>
          </div>
          <div>
            <strong>{{ formatDuration(weeklyStats.averageSessionLength) }}</strong>
            <span>Average session</span>
          </div>
        </div>

        <div class="weekly-chart" aria-label="Study time by day for the last seven days">
          <div v-for="day in weeklyDays" :key="day.date" class="chart-day">
            <div class="bar-area">
              <div class="bar" :style="{ height: `${barHeight(day.totalStudyTime)}%` }" :title="`${formatDuration(day.totalStudyTime)} on ${day.label}\n${day.sessionCount} sessions`"></div>
            </div>
            <span class="day-label">{{ day.label }}</span>
          </div>
        </div>

        <p v-if="!weeklyStats.sessionCount" class="empty-note">No study sessions in this period yet.</p>
        <p v-else class="chart-caption">Daily totals are shown in your local time.</p>
      </section>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { request } from '@/services/api.js'
import { authState } from '@/services/authState.js'

const habits = ref([])
const weeklyStats = ref({ totalStudyTime: 0, sessionCount: 0, averageSessionLength: 0, byDay: [] })
const activeSession = ref(null)
const subjects = ref([])
const isLoading = ref(false)
const errorMessage = ref('')
const pendingHabitIds = ref(new Set())
const togglingHabitIds = ref(new Set())

const now = new Date()
const todayLabel = now.toLocaleDateString('en-GB')

const todaysHabits = computed(() => habits.value.filter(habit => habit.isToday))
const completedCount = computed(() => todaysHabits.value.filter(habit => habit.completed).length)
const progress = computed(() => todaysHabits.value.length
  ? Math.round((completedCount.value / todaysHabits.value.length) * 100)
  : 0)

const activeSubjectName = computed(() => {
  const sessionSubjectId = typeof activeSession.value?.subjectId === 'object'
    ? activeSession.value.subjectId?._id || activeSession.value.subjectId?.id
    : activeSession.value?.subjectId
  return subjects.value.find(subject => subjectId(subject) === sessionSubjectId)?.name || 'Study session'
})

const weeklyDays = computed(() => {
  const byDate = new Map((weeklyStats.value.byDay || []).map(day => [day.date, day]))
  const days = []
  const today = new Date()

  for (let daysAgo = 6; daysAgo >= 0; daysAgo -= 1) {
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() - daysAgo)
    const key = localDateKey(date)
    days.push({
      date: key,
      label: date.toLocaleDateString(undefined, { weekday: 'short' }),
      totalStudyTime: byDate.get(key)?.totalStudyTime || 0,
      sessionCount: byDate.get(key)?.sessionCount || 0
    })
  }
  return days
})

onMounted(loadDashboard)

async function loadDashboard() {
  isLoading.value = true
  errorMessage.value = ''

  try {
    const todayRange = getLocalDayRange(new Date())
    const weekStart = new Date()
    weekStart.setDate(weekStart.getDate() - 6)
    weekStart.setHours(0, 0, 0, 0)
    const weekEnd = new Date()
    weekEnd.setDate(weekEnd.getDate() + 1)
    weekEnd.setHours(0, 0, 0, 0)
    const weekRange = new URLSearchParams({
      start: formatLocalTimestamp(weekStart),
      end: formatLocalTimestamp(weekEnd),
      timezoneOffsetMinutes: String(-weekStart.getTimezoneOffset())
    })
    const todayParams = new URLSearchParams({
      start: todayRange.start,
      end: todayRange.end,
      timezoneOffsetMinutes: String(todayRange.timezoneOffsetMinutes)
    })

    const results = await Promise.allSettled([
      request(`/habits?${todayParams.toString()}`, { method: 'GET' }),
      request(`/study/stats?${weekRange.toString()}`, { method: 'GET' }),
      request('/subjects', { method: 'GET' }),
      request(`/study/sessions/active?timezoneOffsetMinutes=${-new Date().getTimezoneOffset()}`, { method: 'GET' })
    ])

    if (results[0].status === 'fulfilled') habits.value = results[0].value.habits || []
    else throw results[0].reason

    if (results[1].status === 'fulfilled') {
      weeklyStats.value = results[1].value.stats || weeklyStats.value
    } else if (!errorMessage.value) {
      errorMessage.value = 'Could not load your study summary.'
    }

    if (results[2].status === 'fulfilled') subjects.value = results[2].value.subjects || []
    if (results[3].status === 'fulfilled') activeSession.value = results[3].value.studySession || null
  } catch (error) {
    errorMessage.value = error?.message || 'Could not load your dashboard.'
  } finally {
    isLoading.value = false
  }
}

async function toggleHabit(habit) {
  const id = subjectId(habit)
  if (!id || isHabitPending(habit)) return

  togglingHabitIds.value = new Set([...togglingHabitIds.value, id])
  errorMessage.value = ''
  try {
    let response
    if (habit.completed) {
      if (!habit.completionId) throw new Error('This completion cannot be changed until it syncs.')
      response = await request(`/habits/${id}/completions/${habit.completionId}`, { method: 'DELETE' })
    } else {
      const range = getLocalDayRange(new Date())
      response = await request(`/habits/${id}/completions`, {
        method: 'POST',
        body: JSON.stringify({
          start: range.start,
          end: range.end,
          completedAt: formatLocalTimestamp(new Date()),
          timezoneOffsetMinutes: range.timezoneOffsetMinutes
        })
      })
    }

    if (response.queued) {
      habit.completed = !habit.completed
      pendingHabitIds.value = new Set([...pendingHabitIds.value, id])
      return
    }
    await loadDashboard()
  } catch (error) {
    errorMessage.value = error.message || 'Could not update this habit.'
  } finally {
    const next = new Set(togglingHabitIds.value)
    next.delete(id)
    togglingHabitIds.value = next
  }
}

function isHabitPending(habit) {
  return pendingHabitIds.value.has(subjectId(habit))
}

function isToggling(habit) {
  return togglingHabitIds.value.has(subjectId(habit))
}

function getLocalDayRange(date) {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const end = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1)
  return {
    start: formatLocalTimestamp(start),
    end: formatLocalTimestamp(end),
    timezoneOffsetMinutes: -start.getTimezoneOffset()
  }
}

function formatLocalTimestamp(date) {
  const offset = -date.getTimezoneOffset()
  const sign = offset >= 0 ? '+' : '-'
  const absolute = Math.abs(offset)
  const datePart = localDateKey(date)
  const timePart = [date.getHours(), date.getMinutes(), date.getSeconds()]
    .map(part => String(part).padStart(2, '0')).join(':')
  const milliseconds = String(date.getMilliseconds()).padStart(3, '0')
  return `${datePart}T${timePart}.${milliseconds}${sign}${String(Math.floor(absolute / 60)).padStart(2, '0')}:${String(absolute % 60).padStart(2, '0')}`
}

function localDateKey(date) {
  return [date.getFullYear(), date.getMonth() + 1, date.getDate()]
    .map((part, index) => String(part).padStart(index === 0 ? 4 : 2, '0'))
    .join('-')
}

function subjectId(record) {
  return record?._id || record?.id
}

function barHeight(seconds) {
  const values = weeklyDays.value.map(day => day.totalStudyTime)
  const max = Math.max(...values, 1)
  return seconds > 0 ? Math.max(8, (seconds / max) * 100) : 0
}

function formatDuration(value) {
  const totalSeconds = Math.max(0, Math.floor(Number(value) || 0))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  if (hours) return `${hours}h ${String(minutes).padStart(2, '0')}m`
  return `${minutes}m ${String(seconds).padStart(2, '0')}s`
}
</script>

<style scoped>
.dashboard-container {
  max-width: 1100px;
  margin: 0 auto;
  padding: 32px 24px;
  font-family: Arial, sans-serif;
}

.dashboard-header,
.panel-heading,
.active-session,
.habit-row,
.weekly-totals,
.chart-day,
.bar-area {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.dashboard-header {
  margin-bottom: 24px;
}

.dashboard-header h2 {
  margin: 0;
  font-size: 32px;
}

.eyebrow,
.today-date,
.progress-caption,
.weekly-totals span,
.day-label,
.chart-caption,
.empty-note,
.empty-state {
  color: #666;
}

.eyebrow {
  margin: 0 0 4px;
  font-size: 12px;
  font-weight: bold;
  text-transform: uppercase;
}

.today-date {
  margin: 6px 0 0;
  font-size: 1.17em;
  font-weight: normal;
}

.dashboard-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  align-items: start;
}

.panel,
.active-session {
  border: 1px solid #ddd;
  border-radius: 8px;
  background: white;
}

.panel {
  padding: 22px;
}

.panel-heading {
  margin-bottom: 16px;
}

.panel-heading h3,
.active-session h3 {
  margin: 0;
}

.progress-count {
  font-weight: bold;
}

.progress-track {
  height: 12px;
  overflow: hidden;
  border-radius: 8px;
  background: #e5e7eb;
}

.progress-fill {
  height: 100%;
  background: #4caf50;
}

.habit-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.habit-row {
  padding: 12px 0;
  border-bottom: 1px solid #eee;
}

.habit-row label {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
}

.habit-name.completed {
  color: #777;
  text-decoration: line-through;
}

.pending-label {
  color: #8a5a00;
  font-size: 12px;
}

.panel-link,
.text-link,
.empty-state a {
  color: #378a40;
}

.weekly-totals {
  align-items: flex-start;
}

.weekly-totals div {
  display: flex;
  flex-direction: column;
}

.weekly-totals strong {
  font-size: 20px;
}

.weekly-chart {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 8px;
  height: 130px;
  margin-top: 18px;
}

.chart-day {
  flex-direction: column;
  justify-content: flex-end;
}

.bar-area {
  align-items: flex-end;
  justify-content: center;
  width: 100%;
  flex: 1;
  border-bottom: 1px solid #ddd;
}

.bar {
  width: 24px;
  background: #69b96f;
}

.empty-state {
  padding: 14px;
  border: 1px dashed #ccc;
}

.active-session {
  margin-bottom: 20px;
  padding: 18px 22px;
  background: #eef8ef;
}

.refresh-button {
  padding: 9px 14px;
  border: 0;
  border-radius: 6px;
  background: #eee;
  cursor: pointer;
}

.error-message {
  margin: 12px 0;
  padding: 10px 12px;
  color: #8c1d18;
  background: #fdecea;
}
</style>
