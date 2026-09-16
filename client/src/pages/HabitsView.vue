<template>
  <div class="habits-container">
    <h2>Habits</h2>
    <h3>{{ date }}</h3>

    <h3>Today's progress:</h3>

    <div class="progress-container">
      <div
        class="progress-bar"
        :style="{ width: progress + '%' }"
      >
        {{ progress }}%
      </div>
    </div>

    <!-- Habit form -->
    <div v-if="showHabitForm" class="habit-form">
      <h3>{{ editingHabit ? 'Edit habit' : 'Add habit' }}</h3>

      <form @submit.prevent="saveHabit">
        <div>
          <label for="name">Name</label>
          <input
            id="name"
            v-model="habitForm.name"
            type="text"
            required
          >
        </div>

        <div>
          <label for="description">Description</label>
          <input
            id="description"
            v-model="habitForm.description"
            type="text"
          >
        </div>

        <div>
          <label for="category">Category</label>
          <select
            id="category"
            v-model="habitForm.category"
            required
          >
            <option value="Health">Health</option>
            <option value="Exercise">Exercise</option>
            <option value="Study">Study</option>
            <option value="Productivity">Productivity</option>
            <option value="Social">Social</option>
            <option value="Personal">Personal</option>
          </select>
        </div>

        <div>
          <p>Days</p>

          <label v-for="day in daysOfWeek" :key="day.value">
            <input
              type="checkbox"
              :value="day.value"
              v-model="habitForm.daysOfWeek"
            >
            {{ day.name }}
          </label>
        </div>

        <button type="submit">
          {{ editingHabit ? 'Save changes' : 'Create habit' }}
        </button>

        <button
          type="button"
          @click="closeHabitForm"
        >
          Cancel
        </button>
      </form>
    </div>

    <h3>Today's habits</h3>

    <div class="habits-list">
			<div
				v-for="habit in todaysHabits"
				:key="habit._id"
				class="habit"
			>
				<label>
					<input
						type="checkbox"
						:checked="habit.completed"
						@change="handleHabitToggle(habit)"
					>

					{{ habit.name }}

					<span v-if="habit.description">
						 - {{ habit.description }}
					</span>
					<span>
						 - {{ formatDaysOfWeek(habit.daysOfWeek) }}
					</span>
				</label>

				<button @click="openEditForm(habit)">
					Edit
				</button>

				<button @click="deleteHabit(habit)">
					Delete
				</button>
			</div>
    </div>


    <h3>Other habits</h3>

    <div class="habits-list">
			<div
				v-for="habit in otherHabits"
				:key="habit._id"
				class="habit"
			>
				<span>
					{{ habit.name }}

					<span v-if="habit.description">
						 - {{ habit.description }}
					</span>
					<span>
						 - {{ formatDaysOfWeek(habit.daysOfWeek) }}
					</span>
				</span>

				<button @click="openEditForm(habit)">
					Edit
				</button>

				<button @click="deleteHabit(habit)">
					Delete
				</button>
			</div>
    </div>
    <button @click="openCreateForm">Add habit</button>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { request } from '@/services/api.js'

const date = ref(new Date().toLocaleDateString('en-GB'))
const progress = computed(() => {
	if (todaysHabits.value.length === 0) {
		return 0
	}
	const completedHabitCount = todaysHabits.value.filter(
			habit => habit.completed
	).length
	return ((completedHabitCount / habits.value.length) * 100).toFixed(2)
})

onMounted(() => {
  console.log('HabitsVue.vue mounted')
  tryLoadHabits()
})

const habits = ref([])

const todaysHabits = computed(() => {
    return habits.value.filter(habit => habit.isToday)
})

const otherHabits = computed(() => {
    return habits.value.filter(habit => !habit.isToday)
})

const showHabitForm = ref(false)
const editingHabit = ref(null)

const habitForm = reactive({
  name: '',
  description: '',
  category: 'Health',
  daysOfWeek: []
})

const daysOfWeek = [
  { name: 'Mon', value: 1 },
  { name: 'Tue', value: 2 },
  { name: 'Wed', value: 3 },
  { name: 'Thu', value: 4 },
  { name: 'Fri', value: 5 },
  { name: 'Sat', value: 6 },
  { name: 'Sun', value: 7 }
]

function openCreateForm() {
  editingHabit.value = null

  habitForm.name = ''
  habitForm.description = ''
  habitForm.category = 'Health'
  habitForm.daysOfWeek = []

  showHabitForm.value = true
}
function openEditForm(habit) {
  editingHabit.value = habit

  habitForm.name = habit.name
  habitForm.description = habit.description ?? ''
  habitForm.category = habit.category
  habitForm.daysOfWeek = [...habit.daysOfWeek]

  showHabitForm.value = true
}
function closeHabitForm() {
  showHabitForm.value = false
  editingHabit.value = null
}
async function saveHabit() {
  try {
    if (editingHabit.value) { // Editing habit
      await request(`/habits/${editingHabit.value._id}`, {
        method: 'PATCH',
        body: JSON.stringify(habitForm)
      })
    } else { // Creating habit
      await request('/habits', {
        method: 'POST',
        body: JSON.stringify(habitForm)
      })
    }

    closeHabitForm()
    await tryLoadHabits()
  } catch (err) {
    console.error('Error saving habit: ', err)
  }
}
async function deleteHabit(habit) {
  const confirmed = confirm(
    `Are you sure you want to delete "${habit.name}"?`
  )

  if (!confirmed) {
    return
  }

  try {
    await request(`/habits/${habit._id}`, {
      method: 'DELETE'
    })

    await tryLoadHabits()
  } catch (err) {
    console.error('Error deleting habit: ', err)
  }
}

async function tryLoadHabits() {
  try {
    const currentDate = getTodaysDate()

    let data = await request(`/habits/date/${currentDate}`, {
      method: 'GET'
    })
    habits.value = data.habits
  } catch (err) {
    console.error('Error loading user habits: ', err)
  }
}

async function handleHabitToggle(habit) {
  const newCompletedState = !habit.completed
  try {
    const currentDate = getTodaysDate()
    if (newCompletedState) { // Create habit completion on server
      let data = await request(`/habits/${habit._id}/completions`, {
        method: 'POST',
        body: JSON.stringify({
          date: currentDate
        })
      })
    } else { // Delete habit completion on server
      let data = await request(`/habits/${habit._id}/completions/${currentDate}`, {
        method: 'DELETE'
      })
    }
    habit.completed = newCompletedState
    await tryLoadHabits()
  } catch (err) {
    console.error('Error handling habit toggle: ', err)
  }
}
function formatDaysOfWeek(daysOfWeek) {
	if (daysOfWeek.length == 0) {
		return 'Not scheduled'
	}
	const dayNames = [
		'Monday',
		'Tuesday',
		'Wednesday',
		'Thursday',
		'Friday',
		'Saturday',
		'Sunday'
	]
	
	return daysOfWeek
		.map(day => dayNames[day - 1])
		.join(', ')
}
function getTodaysDate() {
	const now = new Date()

	return [
		now.getFullYear(),
		String(now.getMonth() + 1).padStart(2, '0'),
		String(now.getDate()).padStart(2, '0')
	].join('-')
}
</script>

<style scoped>
.habits-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 32px 24px;
  font-family: Arial, sans-serif;
}

.habits-container > h2 {
  margin: 0;
  font-size: 32px;
}

.habits-container > h3 {
  color: #666;
  font-weight: normal;
  margin-top: 6px;
}

/* Progress */

.progress-section {
  margin: 24px 0;
}

.progress-container {
  width: 100%;
  height: 24px;
  background-color: #e5e7eb;
  border-radius: 12px;
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  min-width: 0;
  background-color: #4caf50;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-right: 8px;
  box-sizing: border-box;
  color: white;
  font-size: 13px;
  font-weight: bold;
  transition: width 0.3s ease;
}

/* Habits list */

.habits-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 24px;
}

.habit {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background-color: white;
  border: 1px solid #e1e5e9;
  border-radius: 10px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
}

.habit > label {
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 0;
  cursor: pointer;
}

.habit input[type="checkbox"] {
  width: 18px;
  height: 18px;
  margin-right: 12px;
  cursor: pointer;
}

.habit span {
  margin-left: 6px;
  color: #777;
}

/* Buttons */

button {
  border: none;
  border-radius: 7px;
  padding: 9px 14px;
  font-size: 14px;
  cursor: pointer;
  background-color: #eeeeee;
  transition: background-color 0.15s ease;
}

button:hover {
  background-color: #dddddd;
}

.habits-container > button {
  margin-top: 20px;
  padding: 11px 18px;
  background-color: #4caf50;
  color: white;
  font-weight: bold;
}

.habits-container > button:hover {
  background-color: #43a047;
}

/* Habit form */

.habit-form {
  margin-top: 24px;
  padding: 24px;
  background-color: #f8f9fa;
  border: 1px solid #e1e5e9;
  border-radius: 10px;
}

.habit-form h3 {
  margin-top: 0;
}

.habit-form form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.habit-form form > div {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.habit-form label {
  font-size: 14px;
  font-weight: 600;
}

.habit-form input[type="text"],
.habit-form select {
  padding: 10px 12px;
  border: 1px solid #ccc;
  border-radius: 6px;
  font-size: 15px;
  background-color: white;
  box-sizing: border-box;
}

.habit-form input[type="text"]:focus,
.habit-form select:focus {
  outline: none;
  border-color: #4caf50;
}

/* Days */

.habit-form form > div:has(input[type="checkbox"]) {
  display: block;
}

.habit-form p {
  margin: 0 0 8px;
  font-weight: 600;
}

.habit-form label:has(input[type="checkbox"]) {
  display: inline-flex;
  align-items: center;
  margin-right: 12px;
  margin-bottom: 8px;
  font-weight: normal;
  cursor: pointer;
}

.habit-form input[type="checkbox"] {
  margin-right: 5px;
}

/* Form buttons */

.habit-form form > button {
  width: fit-content;
}

.habit-form form > button[type="submit"] {
  background-color: #4caf50;
  color: white;
  font-weight: bold;
}

.habit-form form > button[type="submit"]:hover {
  background-color: #43a047;
}
</style>