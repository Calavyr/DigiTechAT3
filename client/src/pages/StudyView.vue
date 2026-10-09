<template>
  <div class="study-container">
    <header class="page-header">
      <div>
        <h2>Study</h2>
        <p class="date-label">{{ date }}</p>
      </div>
      <button class="primary-button" @click="openCreateForm">
        Add subject
      </button>
    </header>

    <p v-if="errorMessage" class="message error-message" role="alert">
      {{ errorMessage }}
    </p>
    <p v-if="successMessage" class="message success-message" role="status">
      {{ successMessage }}
    </p>

    <section v-if="activeSession" class="active-session" aria-live="polite">
      <div>
        <p class="section-eyebrow">Study session in progress</p>
        <h3>{{ activeSubjectName }}</h3>
        <p v-if="activeSession.topic">{{ activeSession.topic }}</p>
        <p class="timer">{{ formatDuration(elapsedSeconds) }}</p>
        <p class="muted">Started {{ formatTime(activeSession.startedAt) }}</p>
      </div>
      <button class="end-button" :disabled="isBusy" @click="endSession">
        {{ isBusy ? 'Saving…' : 'End session' }}
      </button>
    </section>

    <section v-if="showSubjectForm" class="subject-form">
      <h3>{{ editingSubject ? 'Edit subject' : 'Add subject' }}</h3>
      <form @submit.prevent="saveSubject">
        <label for="subject-name">Subject name</label>
        <input
          id="subject-name"
          v-model="subjectForm.name"
          type="text"
          maxlength="80"
          placeholder="e.g. Biology"
          required
        >
        <div class="form-actions">
          <button class="primary-button" type="submit" :disabled="isBusy">
            {{ isBusy ? 'Saving…' : editingSubject ? 'Save changes' : 'Create subject' }}
          </button>
          <button type="button" :disabled="isBusy" @click="closeSubjectForm">
            Cancel
          </button>
        </div>
      </form>
    </section>

    <section class="subjects-section">
      <h3>Your subjects</h3>
      <p v-if="!subjects.length" class="empty-state">
        No subjects yet. Add a subject to start tracking study sessions.
      </p>

      <div v-else class="subjects-list">
        <article v-for="subject in subjects" :key="subject._id || subject.id" class="subject-card">
          <div class="subject-heading">
            <h4>{{ subject.name }}</h4>
            <div class="subject-actions">
              <button type="button" @click="openEditForm(subject)">Edit</button>
              <button
                type="button"
                class="text-danger"
                :disabled="activeSession?.subjectId === (subject._id || subject.id)"
                @click="deleteSubject(subject)"
              >
                Delete
              </button>
            </div>
          </div>

          <form class="start-form" @submit.prevent="startSession(subject)">
            <label :for="`topic-${subject._id || subject.id}`">Topic (optional)</label>
            <div class="start-controls">
              <input
                :id="`topic-${subject._id || subject.id}`"
                v-model="topics[subject._id || subject.id]"
                type="text"
                maxlength="120"
                placeholder="What are you studying?"
              >
              <button
                class="primary-button"
                type="submit"
                :disabled="isBusy || Boolean(activeSession)"
              >
                Start studying
              </button>
            </div>
          </form>
        </article>
      </div>
    </section>

    <section class="stats-section">
      <div class="stats-heading">
        <div>
          <h3>Study statistics</h3>
          <p class="muted">Daily breakdown uses UTC dates.</p>
        </div>
        <form class="range-form" @submit.prevent="loadStats">
          <label>
            From
            <input v-model="statsFromDate" type="date" required>
          </label>
          <label>
            To
            <input v-model="statsToDate" type="date" required>
          </label>
          <button type="submit" :disabled="isLoadingStats">
            {{ isLoadingStats ? 'Loading…' : 'Update' }}
          </button>
        </form>
      </div>

      <p v-if="statsError" class="message error-message" role="alert">{{ statsError }}</p>

      <div class="stat-cards">
        <article class="stat-card">
          <span>Total study time</span>
          <strong>{{ formatDuration(studyStats.totalStudyTime) }}</strong>
        </article>
        <article class="stat-card">
          <span>Sessions</span>
          <strong>{{ studyStats.sessionCount }}</strong>
        </article>
        <article class="stat-card">
          <span>Average session</span>
          <strong>{{ formatDuration(studyStats.averageSessionLength) }}</strong>
        </article>
      </div>

      <div class="breakdown-grid">
        <div>
          <h4>By subject</h4>
          <p v-if="!studyStats.bySubject.length" class="muted">No study time in this range.</p>
          <ul v-else class="stats-list">
            <li v-for="item in studyStats.bySubject" :key="item.subjectId">
              <span>{{ item.subjectName }} <small>{{ item.sessionCount }} session{{ item.sessionCount === 1 ? '' : 's' }}</small></span>
              <strong>{{ formatDuration(item.totalStudyTime) }}</strong>
            </li>
          </ul>
        </div>
        <div>
          <h4>By day (UTC)</h4>
          <p v-if="!studyStats.byDay.length" class="muted">No study time in this range.</p>
          <ul v-else class="stats-list">
            <li v-for="item in studyStats.byDay" :key="item.date">
              <span>{{ formatUtcDate(item.date) }} <small>{{ item.sessionCount }} session{{ item.sessionCount === 1 ? '' : 's' }}</small></span>
              <strong>{{ formatDuration(item.totalStudyTime) }}</strong>
            </li>
          </ul>
        </div>
      </div>
    </section>

    <section class="history-section">
      <h3>Today's sessions</h3>
      <p v-if="!todaySessions.length" class="empty-state">
        Your completed sessions for today will appear here.
      </p>
      <div v-else class="sessions-list">
        <article v-for="session in todaySessions" :key="session._id || session.id" class="session-card">
          <div>
            <h4>{{ subjectName(session.subjectId) }}</h4>
            <p v-if="session.topic" class="muted">{{ session.topic }}</p>
          </div>
          <div class="session-meta">
            <span>{{ formatTime(session.startedAt) }}–{{ session.endedAt ? formatTime(session.endedAt) : 'In progress' }}</span>
            <strong>{{ session.endedAt ? formatDuration(session.duration) : 'In progress' }}</strong>
          </div>
        </article>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import { request } from '@/services/api.js'

const subjects = ref([])
const todaySessions = ref([])
const activeSession = ref(null)
const showSubjectForm = ref(false)
const editingSubject = ref(null)
const isBusy = ref(false)
const errorMessage = ref('')
const statsError = ref('')
const isLoadingStats = ref(false)
const successMessage = ref('')
const elapsedSeconds = ref(0)
const topics = reactive({})
const subjectForm = reactive({ name: '' })
const statsFromDate = ref(getLocalDateInput(new Date()))
const statsToDate = ref(getLocalDateInput(new Date()))
const studyStats = ref({
  totalStudyTime: 0,
  sessionCount: 0,
  averageSessionLength: 0,
  bySubject: [],
  byDay: []
})
let timerId

const date = ref(
  new Date().toLocaleDateString('en-GB')
)

const activeSubjectName = computed(() => {
  return subjectName(activeSession.value?.subjectId) || 'Study session'
})

onMounted(async () => {
  await loadStudyData()
  updateElapsedTime()
  timerId = window.setInterval(updateElapsedTime, 1000)
})

onUnmounted(() => {
  window.clearInterval(timerId)
})

async function loadStudyData() {
  errorMessage.value = ''
  const { start, end } = getTodayRange()
  const range = new URLSearchParams({ start, end })
  const statsRange = getStatsRangeParams()

  const results = await Promise.allSettled([
    request('/subjects', { method: 'GET' }),
    request(`/study/sessions?${range.toString()}`, { method: 'GET' }),
    request('/study/sessions/active', { method: 'GET' }),
    request(`/study/stats?${statsRange.toString()}`, { method: 'GET' })
  ])

  if (results[0].status === 'fulfilled') {
    subjects.value = results[0].value.subjects || []
  } else {
    errorMessage.value = 'Could not load your subjects. Please try again.'
  }

  if (results[1].status === 'fulfilled') {
    todaySessions.value = results[1].value.studySessions || []
  } else if (!errorMessage.value) {
    errorMessage.value = 'Could not load today’s study sessions.'
  }

  if (results[2].status === 'fulfilled') {
    activeSession.value = results[2].value.studySession || null
  } else if (!errorMessage.value) {
    errorMessage.value = 'Could not check for an active study session.'
  }
  if (results[3].status === 'fulfilled') {
    studyStats.value = results[3].value.stats || studyStats.value
    statsError.value = ''
  } else {
    statsError.value = 'Could not load study statistics for this range.'
  }
  updateElapsedTime()
}

async function loadStats() {
  statsError.value = ''
  let params
  try {
    params = getStatsRangeParams()
  } catch (error) {
    statsError.value = error.message
    return
  }

  isLoadingStats.value = true
  try {
    const response = await request(`/study/stats?${params.toString()}`, { method: 'GET' })
    studyStats.value = response.stats || studyStats.value
  } catch (error) {
    statsError.value = error.message || 'Could not load study statistics.'
  } finally {
    isLoadingStats.value = false
  }
}

function openCreateForm() {
  editingSubject.value = null
  subjectForm.name = ''
  errorMessage.value = ''
  showSubjectForm.value = true
}

function openEditForm(subject) {
  editingSubject.value = subject
  subjectForm.name = subject.name
  errorMessage.value = ''
  showSubjectForm.value = true
}

function closeSubjectForm() {
  showSubjectForm.value = false
  editingSubject.value = null
}

async function saveSubject() {
  const name = subjectForm.name.trim()
  if (!name) {
    errorMessage.value = 'Enter a subject name.'
    return
  }

  isBusy.value = true
  errorMessage.value = ''
  successMessage.value = ''
  const wasEditing = Boolean(editingSubject.value)
  try {
    const response = editingSubject.value
      ? await request(`/subjects/${subjectId(editingSubject.value)}`, {
          method: 'PATCH',
          body: JSON.stringify({ name })
        })
      : await request('/subjects', {
          method: 'POST',
          body: JSON.stringify({ name })
        })

    closeSubjectForm()
    if (response.queued) {
      successMessage.value = 'Subject saved on this device and waiting to sync.'
    } else {
      successMessage.value = wasEditing ? 'Subject updated.' : 'Subject created.'
    }
    await loadStudyData()
  } catch (error) {
    errorMessage.value = error.message || 'Could not save the subject.'
  } finally {
    isBusy.value = false
  }
}

async function deleteSubject(subject) {
  if (!confirm(`Delete “${subject.name}”?`)) return

  isBusy.value = true
  errorMessage.value = ''
  successMessage.value = ''
  try {
    const response = await request(`/subjects/${subjectId(subject)}`, { method: 'DELETE' })
    successMessage.value = response.queued
      ? 'Subject deletion is waiting to sync.'
      : 'Subject deleted.'
    await loadStudyData()
  } catch (error) {
    errorMessage.value = error.message || 'Could not delete the subject.'
  } finally {
    isBusy.value = false
  }
}

async function startSession(subject) {
  isBusy.value = true
  errorMessage.value = ''
  successMessage.value = ''
  try {
    const response = await request('/study/sessions', {
      method: 'POST',
      body: JSON.stringify({
        subjectId: subjectId(subject),
        topic: (topics[subjectId(subject)] || '').trim()
      })
    })

    if (response.queued) {
      successMessage.value = 'Session start is queued. It will begin when the server receives it.'
      return
    }

    topics[subjectId(subject)] = ''
    successMessage.value = 'Study session started.'
    await loadStudyData()
  } catch (error) {
    errorMessage.value = error.message || 'Could not start the study session.'
  } finally {
    isBusy.value = false
  }
}

async function endSession() {
  if (!activeSession.value) return

  isBusy.value = true
  errorMessage.value = ''
  successMessage.value = ''
  try {
    const response = await request(
      `/study/sessions/${activeSession.value._id || activeSession.value.id}/end`,
      { method: 'POST' }
    )

    if (response.queued) {
      successMessage.value = 'Session end is queued. It will sync when you are online.'
      return
    }

    successMessage.value = 'Study session ended.'
    await loadStudyData()
  } catch (error) {
    errorMessage.value = error.message || 'Could not end the study session.'
  } finally {
    isBusy.value = false
  }
}

function getTodayRange() {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
  return { start: start.toISOString(), end: end.toISOString() }
}

function getStatsRangeParams() {
  if (!statsFromDate.value || !statsToDate.value || statsFromDate.value > statsToDate.value) {
    throw new Error('Choose a valid date range. The start date must be on or before the end date.')
  }

  const start = new Date(`${statsFromDate.value}T00:00:00`)
  const end = new Date(`${statsToDate.value}T00:00:00`)
  end.setDate(end.getDate() + 1)
  return new URLSearchParams({ start: start.toISOString(), end: end.toISOString() })
}

function getLocalDateInput(dateValue) {
  const year = dateValue.getFullYear()
  const month = String(dateValue.getMonth() + 1).padStart(2, '0')
  const day = String(dateValue.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function subjectId(subject) {
  return subject?._id || subject?.id
}

function subjectName(id) {
  if (!id) return 'Deleted subject'
  const normalizedId = typeof id === 'object' ? (id._id || id.id) : id
  return subjects.value.find(subject => subjectId(subject) === normalizedId)?.name || 'Deleted subject'
}

function updateElapsedTime() {
  if (!activeSession.value?.startedAt) {
    elapsedSeconds.value = 0
    return
  }
  elapsedSeconds.value = Math.max(0, Math.floor((Date.now() - new Date(activeSession.value.startedAt).getTime()) / 1000))
}

function formatTime(value) {
  return new Date(value).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

function formatUtcDate(value) {
  return new Date(`${value}T00:00:00Z`).toLocaleDateString(undefined, {
    timeZone: 'UTC', month: 'short', day: 'numeric', year: 'numeric'
  })
}

function formatDuration(value) {
  const totalSeconds = Math.max(0, Math.floor(Number(value) || 0))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return hours > 0
    ? `${hours}h ${String(minutes).padStart(2, '0')}m`
    : `${minutes}m ${String(seconds).padStart(2, '0')}s`
}
</script>

<style scoped>
.study-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 32px 24px;
}

.page-header, .subject-heading, .active-session, .session-card, .form-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.page-header { margin-bottom: 24px; }
.page-header h2 { margin: 0; font-size: 32px; }
.date-label, .muted, .empty-state { color: #6b7280; }
.date-label { margin-top: 4px; }

.subjects-section, .history-section { margin-top: 32px; }
.subjects-section > h3, .history-section > h3 { margin-bottom: 14px; }
.subjects-list, .sessions-list { display: flex; flex-direction: column; gap: 12px; }
.stats-section { margin-top: 32px; padding-top: 24px; border-top: 1px solid #e1e5e9; }
.stats-heading { display: flex; justify-content: space-between; align-items: flex-start; gap: 20px; margin-bottom: 16px; }
.stats-heading h3 { margin: 0; }
.stats-heading p { margin-top: 4px; font-size: 13px; }
.range-form { display: flex; flex-wrap: wrap; align-items: flex-end; gap: 10px; }
.range-form label { display: flex; flex-direction: column; gap: 4px; font-size: 12px; font-weight: 600; }
.range-form input { padding: 7px 8px; border: 1px solid #ccc; border-radius: 6px; font: inherit; }
.stat-cards { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
.stat-card { display: flex; flex-direction: column; gap: 4px; padding: 16px; border: 1px solid #e1e5e9; border-radius: 9px; background: #fff; }
.stat-card span { color: #6b7280; font-size: 13px; }
.stat-card strong { font-size: 22px; }
.breakdown-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 24px; margin-top: 22px; }
.breakdown-grid h4 { margin-bottom: 8px; }
.stats-list { margin: 0; padding: 0; list-style: none; }
.stats-list li { display: flex; justify-content: space-between; gap: 12px; padding: 10px 0; border-bottom: 1px solid #edf0f2; }
.stats-list li span { display: flex; flex-direction: column; }
.stats-list small { color: #6b7280; }
.stats-list strong { white-space: nowrap; }

.subject-card, .session-card, .subject-form {
  padding: 18px;
  background: #fff;
  border: 1px solid #e1e5e9;
  border-radius: 10px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
}

.subject-heading h4, .session-card h4 { margin: 0; font-size: 18px; }
.subject-actions { display: flex; gap: 8px; }
.start-form { margin-top: 16px; }
.start-form label, .subject-form label { display: block; margin-bottom: 6px; font-size: 14px; font-weight: 600; }
.start-controls { display: flex; gap: 10px; }
input[type="text"] { min-width: 0; flex: 1; padding: 10px 12px; border: 1px solid #ccc; border-radius: 6px; font: inherit; }
input[type="text"]:focus { outline: none; border-color: #4caf50; }
.subject-form { margin: 20px 0; background: #f8f9fa; }
.subject-form h3 { margin: 0 0 16px; }
.subject-form form { display: flex; flex-direction: column; }
.form-actions { justify-content: flex-start; margin-top: 16px; }

button { border: 0; border-radius: 7px; padding: 9px 14px; font-size: 14px; cursor: pointer; background: #eee; }
button:hover:not(:disabled) { background: #ddd; }
button:disabled { opacity: .55; cursor: not-allowed; }
.primary-button { background: #4caf50; color: white; font-weight: 600; }
.primary-button:hover:not(:disabled) { background: #43a047; }
.end-button { background: #d9534f; color: #fff; font-weight: 600; }
.text-danger { color: #b42318; }

.active-session { margin: 24px 0; padding: 20px; border-radius: 10px; background: #eef8ef; border: 1px solid #b7dfbb; }
.section-eyebrow { margin: 0 0 4px; color: #43864a; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; }
.active-session h3 { margin: 0; }
.active-session p { margin-bottom: 4px; }
.timer { font-size: 28px; font-variant-numeric: tabular-nums; font-weight: 700; }
.session-card { align-items: flex-start; }
.session-card p { margin: 4px 0 0; }
.session-meta { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; color: #555; text-align: right; }
.empty-state { padding: 18px; border: 1px dashed #cbd5e1; border-radius: 8px; }
.message { margin: 12px 0; padding: 10px 12px; border-radius: 6px; }
.error-message { color: #8c1d18; background: #fdecea; }
.success-message { color: #246b32; background: #eaf7ec; }

@media (max-width: 600px) {
  .study-container { padding: 24px 16px; }
  .page-header { align-items: flex-start; }
  .page-header h2 { font-size: 28px; }
  .start-controls { flex-direction: column; }
  .start-controls button { align-self: flex-start; }
  .subject-heading { align-items: flex-start; }
  .active-session { align-items: flex-start; flex-direction: column; }
  .session-card { flex-direction: column; }
  .session-meta { align-items: flex-start; text-align: left; }
  .stats-heading { flex-direction: column; }
  .stat-cards { grid-template-columns: 1fr; }
  .breakdown-grid { grid-template-columns: 1fr; }
}
</style>
