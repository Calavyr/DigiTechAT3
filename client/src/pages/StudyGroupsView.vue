<template>
  <div class="study-groups-container">
    <h2>Study groups</h2>
    <h3>{{ date }}</h3>

    <p v-if="errorMessage" class="error-message" role="alert">
      {{ errorMessage }}
    </p>
    <p v-if="successMessage" class="success-message" role="status">
      {{ successMessage }}
    </p>

    <h3>Join a study group</h3>
    <form class="join-form" @submit.prevent="joinGroup">
      <label for="join-code">Six character group code</label>
      <div>
        <input
          id="join-code"
          v-model="joinCode"
          type="text"
          maxlength="6"
          placeholder="ABC123"
          required
        >
        <button type="submit" :disabled="isBusy">
          Join group
        </button>
      </div>
    </form>

    <div v-if="showGroupForm" class="group-form">
      <h3>{{ editingGroup ? 'Edit study group' : 'Create a study group' }}</h3>
      <form @submit.prevent="saveGroup">
        <label for="group-name">Group name</label>
        <input
          id="group-name"
          v-model="groupName"
          type="text"
          maxlength="80"
          required
        >
        <button type="submit" :disabled="isBusy">
          {{ editingGroup ? 'Save changes' : 'Create group' }}
        </button>
        <button type="button" :disabled="isBusy" @click="closeGroupForm">
          Cancel
        </button>
      </form>
    </div>

    <h3>Your study groups</h3>
    <p v-if="isLoading">Loading study groups…</p>
    <p v-else-if="studyGroups.length === 0" class="empty-state">
      You have not joined any study groups yet.
    </p>

    <div v-else class="groups-list">
      <div
        v-for="studyGroup in studyGroups"
        :key="getGroupId(studyGroup)"
        class="study-group"
      >
        <router-link :to="`/study-group/${getGroupId(studyGroup)}`" class="group-details-link">
          <h4>{{ studyGroup.name }}</h4>
          <p>Join code: <strong>{{ studyGroup.joinCode }}</strong></p>
          <p>{{ studyGroup.memberIds.length }} member{{ studyGroup.memberIds.length === 1 ? '' : 's' }}</p>
        </router-link>

        <div class="group-actions">
          <template v-if="isGroupCreator(studyGroup)">
            <button @click="openEditForm(studyGroup)">Edit</button>
            <button @click="deleteGroup(studyGroup)">Delete</button>
          </template>
          <button @click="leaveGroup(studyGroup)">Leave</button>
        </div>
      </div>
    </div>

    <button class="add-group-button" @click="openCreateForm">
      Create a study group
    </button>
  </div>
</template>


<script setup>
import { onMounted, ref } from 'vue'
import { request } from '@/services/api.js'
import { authState } from '@/services/authState.js'


const date = ref(new Date().toLocaleDateString('en-GB'))
const studyGroups = ref([])
const joinCode = ref('')
const groupName = ref('')
const showGroupForm = ref(false)
const editingGroup = ref(null)
const isLoading = ref(false)
const isBusy = ref(false)
const errorMessage = ref('')
const successMessage = ref('')


onMounted(() => {
  loadGroups()
})


function openCreateForm() {
  editingGroup.value = null
  groupName.value = ''
  showGroupForm.value = true
}


function openEditForm(studyGroup) {
  editingGroup.value = studyGroup
  groupName.value = studyGroup.name
  showGroupForm.value = true
}


function closeGroupForm() {
  showGroupForm.value = false
  editingGroup.value = null
}


async function saveGroup() {
  isBusy.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    const isEditing = Boolean(editingGroup.value)
    const endpoint = isEditing
      ? `/study-groups/${getGroupId(editingGroup.value)}`
      : '/study-groups'
    const response = await request(endpoint, {
      method: isEditing ? 'PATCH' : 'POST',
      body: JSON.stringify({ name: groupName.value.trim() })
    })

    closeGroupForm()
    if (response.queued) {
      successMessage.value = 'This change is saved on this device and will sync when you are online.'
      return
    }

    successMessage.value = isEditing ? 'Study group updated.' : 'Study group created.'
    await loadGroups()
  } catch (error) {
    errorMessage.value = error.message || 'Could not save the study group.'
  } finally {
    isBusy.value = false
  }
}


async function joinGroup() {
  isBusy.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    const response = await request('/study-groups/join', {
      method: 'POST',
      body: JSON.stringify({ joinCode: joinCode.value.trim().toUpperCase() })
    })

    joinCode.value = ''
    if (response.queued) {
      successMessage.value = 'Your join request is saved on this device and will sync when you are online.'
      return
    }

    successMessage.value = `You joined ${response.studyGroup.name}.`
    await loadGroups()
  } catch (error) {
    errorMessage.value = error.message || 'Could not join the study group.'
  } finally {
    isBusy.value = false
  }
}


async function leaveGroup(studyGroup) {
  if (!confirm(`Leave "${studyGroup.name}"?`)) return

  await updateMembership(studyGroup, 'leave')
}


async function deleteGroup(studyGroup) {
  if (!confirm(`Delete "${studyGroup.name}" for everyone?`)) return

  await updateMembership(studyGroup, 'delete')
}


async function updateMembership(studyGroup, action) {
  isBusy.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    const response = await request(
      `/study-groups/${getGroupId(studyGroup)}${action === 'leave' ? '/leave' : ''}`,
      { method: action === 'leave' ? 'POST' : 'DELETE' }
    )

    if (response.queued) {
      successMessage.value = `Your request to ${action} this group is saved and will sync when you are online.`
      return
    }

    successMessage.value = action === 'leave' ? 'You left the study group.' : 'Study group deleted.'
    await loadGroups()
  } catch (error) {
    errorMessage.value = error.message || `Could not ${action} the study group.`
  } finally {
    isBusy.value = false
  }
}


async function loadGroups() {
  isLoading.value = true
  errorMessage.value = ''

  try {
    const data = await request('/study-groups', { method: 'GET' })
    studyGroups.value = data.studyGroups || []
  } catch (error) {
    errorMessage.value = error.message || 'Could not load your study groups.'
  } finally {
    isLoading.value = false
  }
}


function getGroupId(studyGroup) {
  return studyGroup._id || studyGroup.id
}


function isGroupCreator(studyGroup) {
  return studyGroup.creatorId === authState.user?.userId
    || studyGroup.creatorId?._id === authState.user?.userId
}
</script>


<style scoped>
.study-groups-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 32px 24px;
  font-family: Arial, sans-serif;
}

.study-groups-container > h2 {
  margin: 0;
  font-size: 32px;
}

.study-groups-container > h3 {
  margin-top: 24px;
}

.study-groups-container > h3:nth-of-type(1) {
  margin-top: 6px;
  color: #666;
  font-weight: normal;
}

.join-form,
.group-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 16px;
}

.join-form > div,
.group-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.join-form input,
.group-form input {
  padding: 10px 12px;
  border: 1px solid #ccc;
  border-radius: 6px;
  font: inherit;
}

.group-form {
  margin-top: 24px;
  padding: 20px;
  border: 1px solid #ddd;
  border-radius: 8px;
  background: #f8f9fa;
}

.group-form h3 {
  margin: 0 0 4px;
}

.group-form button {
  align-self: flex-start;
}

.groups-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 16px;
}

.study-group {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px;
  border: 1px solid #e1e5e9;
  border-radius: 8px;
  background: white;
}

.group-details-link {
  flex: 1;
  color: inherit;
  text-decoration: none;
}

.group-details-link:hover h4 {
  color: #378a40;
}

.study-group h4,
.study-group p {
  margin: 4px 0;
}

.study-group p {
  color: #666;
}

.add-group-button {
  margin-top: 20px;
  padding: 11px 18px;
  background: #4caf50;
  color: white;
  font-weight: bold;
}

.empty-state {
  margin-top: 16px;
  padding: 16px;
  border: 1px dashed #ccc;
}

.error-message {
  color: #8c1d18;
}

.success-message {
  color: #246b32;
}

button {
  border: 0;
  border-radius: 6px;
  padding: 9px 14px;
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
