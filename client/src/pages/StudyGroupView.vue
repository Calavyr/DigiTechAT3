<template>
  <div class="study-group-container">
    <router-link to="/study-groups" class="back-link">← Study groups</router-link>

    <header>
      <h2>{{ studyGroup?.name || 'Study group' }}</h2>
      <h3>{{ date }}</h3>
      <p v-if="studyGroup">Join code: <strong>{{ studyGroup.joinCode }}</strong></p>
    </header>

    <p v-if="errorMessage" class="error-message" role="alert">
      {{ errorMessage }}
    </p>

    <section class="members-section">
      <div class="members-heading">
        <div>
          <h3>Group activity</h3>
          <p>Study time over the past 7 days</p>
        </div>
        <button :disabled="isLoading" @click="loadMembers">
          {{ isLoading ? 'Refreshing…' : 'Refresh' }}
        </button>
      </div>

      <p v-if="isLoading && !members.length">Loading group members…</p>
      <p v-else-if="!members.length" class="empty-state">
        No group members were found.
      </p>

      <div v-else class="members-list">
        <article v-for="member in members" :key="member.userId" class="member-card">
          <div class="member-heading">
            <h4>
              {{ member.username }}
              <span v-if="member.userId === authState.user?.userId">(you)</span>
            </h4>
            <strong>{{ formatDuration(displayWeeklyStudyTime(member)) }}</strong>
          </div>

          <p>{{ member.sessionCount }} study session{{ member.sessionCount === 1 ? '' : 's' }} this week</p>

          <div v-if="member.activeStudySession" class="active-session">
            <span class="active-dot"></span>
            <div>
              <strong>Studying {{ member.activeStudySession.subjectName }}</strong>
              <span v-if="member.activeStudySession.topic"> · {{ member.activeStudySession.topic }}</span>
              <p>For {{ formatDuration(activeSessionSeconds(member.activeStudySession)) }}</p>
            </div>
          </div>
          <p v-else class="not-studying">Not studying right now</p>
        </article>
      </div>
    </section>

    <section class="chat-section">
      <h3>Study group chat</h3>
      <p class="chat-note">Prototype chatroom. Recent messages are saved with this group.</p>

      <div ref="chatWindow" class="chat-window" aria-live="polite">
        <p v-if="!isSocketConnected">Connecting to chat…</p>
        <p v-else-if="!chatMessages.length">No messages yet. Say hello.</p>
        <p v-for="message in chatMessages" :key="message.id" class="chat-message">
          <span>[{{ formatChatTime(message.createdAt) }}] </span>
          <strong>{{ message.username }}:</strong> {{ message.message }}
        </p>
      </div>

      <form class="chat-form" @submit.prevent="sendChatMessage">
        <input
          v-model="chatDraft"
          type="text"
          maxlength="500"
          placeholder="Type a message"
          :disabled="!isSocketConnected || isSendingMessage"
          required
        >
        <button type="submit" :disabled="!isSocketConnected || isSendingMessage || !chatDraft.trim()">
          Send
        </button>
      </form>
      <p v-if="chatError" class="error-message" role="alert">{{ chatError }}</p>
    </section>
  </div>
</template>


<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { io } from 'socket.io-client'
import { request } from '@/services/api.js'
import { authState } from '@/services/authState.js'


const route = useRoute()
const router = useRouter()
const date = ref(new Date().toLocaleDateString('en-GB'))
const studyGroup = ref(null)
const members = ref([])
const chatMessages = ref([])
const chatDraft = ref('')
const now = ref(Date.now())
const activityUpdatedAt = ref(Date.now())
const isLoading = ref(false)
const isSocketConnected = ref(false)
const isSendingMessage = ref(false)
const errorMessage = ref('')
const chatError = ref('')
const chatWindow = ref(null)
let socket
let clockTimer
let loadRequestNumber = 0


const groupId = computed(() => route.params.groupId)
watch(groupId, (nextGroupId, previousGroupId) => {
  studyGroup.value = null
  members.value = []
  chatMessages.value = []
  loadMembers()

  if (socket?.connected) {
    if (previousGroupId) socket.emit('leaveStudyGroup', previousGroupId)
    joinGroupRoom()
  }
})


onMounted(() => {
  loadMembers()
  socket = io({ withCredentials: true })
  socket.on('connect', () => {
    isSocketConnected.value = true
    joinGroupRoom()
  })
  socket.on('disconnect', () => {
    isSocketConnected.value = false
  })
  socket.on('studyGroupActivity', handleStudyGroupActivity)
  socket.on('studyGroupChatHistory', handleChatHistory)
  socket.on('studyGroupChatMessage', handleChatMessage)
  socket.on('studyGroupChatUpdated', handleChatUpdated)
  socket.on('studyGroupDeleted', handleStudyGroupDeleted)
  socket.on('studyGroupAccessRemoved', handleStudyGroupAccessRemoved)
  socket.on('connect_error', () => {
    errorMessage.value = 'Live updates are unavailable right now.'
  })
  clockTimer = window.setInterval(() => {
    now.value = Date.now()
  }, 1000)
})


onUnmounted(() => {
  window.clearInterval(clockTimer)
  if (socket?.connected && groupId.value) socket.emit('leaveStudyGroup', groupId.value)
  socket?.disconnect()
})


async function loadMembers() {
  const requestNumber = ++loadRequestNumber
  isLoading.value = true
  errorMessage.value = ''

  try {
    const data = await request(`/study-groups/${groupId.value}/members`, {
      method: 'GET'
    })
    if (requestNumber === loadRequestNumber) {
      studyGroup.value = data.studyGroup
      members.value = data.members || []
      activityUpdatedAt.value = new Date(data.weekEnd).getTime()
    }
  } catch (error) {
    if (requestNumber === loadRequestNumber) {
      errorMessage.value = error.message || 'Could not load this study group.'
    }
  } finally {
    if (requestNumber === loadRequestNumber) isLoading.value = false
  }
}


function joinGroupRoom() {
  socket.emit('joinStudyGroup', groupId.value, response => {
    if (!response?.ok) {
      errorMessage.value = response?.message || 'Could not join live group updates.'
    }
  })
}


function handleChatHistory(history) {
  if (history.groupId !== groupId.value) return
  chatMessages.value = history.messages || []
  chatError.value = ''
  scrollChatToBottom()
}


function handleChatMessage(message) {
  if (chatMessages.value.some(existing => existing.id === message.id)) return
  chatMessages.value.push(message)
  scrollChatToBottom()
}


function handleChatUpdated(update) {
  if (update.groupId === groupId.value && socket?.connected) {
    socket.emit('loadStudyGroupChat', groupId.value)
  }
}


async function sendChatMessage() {
  const message = chatDraft.value.trim()
  if (!message || !socket?.connected) return

  isSendingMessage.value = true
  chatError.value = ''
  socket.emit('sendStudyGroupMessage', {
    groupId: groupId.value,
    message
  }, response => {
    isSendingMessage.value = false
    if (!response?.ok) {
      chatError.value = response?.message || 'Could not send message.'
      return
    }

    if (chatDraft.value.trim() === message) chatDraft.value = ''
  })
}


function scrollChatToBottom() {
  nextTick(() => {
    if (chatWindow.value) chatWindow.value.scrollTop = chatWindow.value.scrollHeight
  })
}


function handleStudyGroupActivity(activity) {
  if (activity.studyGroup?.id !== groupId.value) return

  loadRequestNumber += 1
  studyGroup.value = activity.studyGroup
  members.value = activity.members || []
  activityUpdatedAt.value = new Date(activity.weekEnd).getTime()
  isLoading.value = false
  errorMessage.value = ''
}


function handleStudyGroupDeleted(update) {
  if (update.groupId === groupId.value) router.push('/study-groups')
}


function handleStudyGroupAccessRemoved(update) {
  if (update.groupId === groupId.value) router.push('/study-groups')
}


function activeSessionSeconds(session) {
  const startedAt = new Date(session.startedAt).getTime()
  return Math.max(0, Math.floor((now.value - startedAt) / 1000))
}


function displayWeeklyStudyTime(member) {
  const liveSeconds = member.activeStudySession
    ? Math.max(0, Math.floor((now.value - activityUpdatedAt.value) / 1000))
    : 0
  return member.weeklyStudyTime + liveSeconds
}


function formatDuration(seconds) {
  const totalSeconds = Math.max(0, Math.floor(seconds || 0))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const remainingSeconds = totalSeconds % 60
  return `${hours}h ${String(minutes).padStart(2, '0')}m ${String(remainingSeconds).padStart(2, '0')}s`
}


function formatChatTime(value) {
  return new Date(value).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit'
  })
}
</script>


<style scoped>
.study-group-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 32px 24px;
  font-family: Arial, sans-serif;
}

.back-link {
  display: inline-block;
  margin-bottom: 16px;
  color: #378a40;
}

header h2 {
  margin: 0;
  font-size: 32px;
}

header h3 {
  margin: 6px 0 0;
  color: #666;
  font-weight: normal;
}

header p,
.members-heading p,
.member-card > p,
.not-studying {
  color: #666;
}

.members-section {
  margin-top: 28px;
}

.chat-section {
  margin-top: 32px;
}

.chat-section h3 {
  margin-bottom: 4px;
}

.chat-note {
  margin-top: 0;
  color: #666;
}

.chat-window {
  height: 240px;
  overflow-y: auto;
  padding: 10px;
  border: 1px solid #999;
  background: white;
  font-family: monospace;
}

.chat-window p {
  margin: 4px 0;
}

.chat-message span {
  color: #666;
}

.chat-form {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

.chat-form input {
  flex: 1;
  min-width: 0;
  padding: 9px;
  border: 1px solid #999;
  font: inherit;
}

.members-heading,
.member-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.members-heading h3,
.members-heading p,
.member-heading h4,
.member-card p {
  margin: 4px 0;
}

.members-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 16px;
}

.member-card {
  padding: 16px;
  border: 1px solid #e1e5e9;
  border-radius: 8px;
  background: white;
}

.member-heading span {
  color: #666;
  font-size: 14px;
  font-weight: normal;
}

.active-session {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  margin-top: 12px;
  padding: 12px;
  border-radius: 7px;
  background: #eef8ef;
}

.active-dot {
  width: 9px;
  height: 9px;
  margin-top: 4px;
  border-radius: 50%;
  background: #4caf50;
}

.active-session p {
  margin-top: 5px;
}

.empty-state {
  margin-top: 16px;
  padding: 16px;
  border: 1px dashed #ccc;
}

.error-message {
  color: #8c1d18;
}

button {
  padding: 9px 14px;
  border: 0;
  border-radius: 6px;
  background: #eee;
  cursor: pointer;
}

button:hover {
  background: #ddd;
}

button:disabled {
  opacity: .6;
  cursor: wait;
}
</style>
