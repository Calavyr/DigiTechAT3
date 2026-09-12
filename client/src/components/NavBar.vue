<template>
  <nav id="navBar">
    <div class="nav-container">
      <!-- router-link tags replace standard divs for SPA pathing -->
      <router-link to="/dashboard" class="nav-item">Home</router-link>
      <router-link to="/habits" class="nav-item">Habits</router-link>
      <router-link to="/study" class="nav-item">Study</router-link>
      <router-link to="/goals" class="nav-item">Goals</router-link>
      <router-link to="/profile" class="nav-item">Profile</router-link>
    </div>
  </nav>
</template>

<style scoped>
#navBar {
  background-color: #ffffff;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  position: sticky;
  top: 0;
  left: 0;
  width: 100%;
  z-index: 1000;
  border-bottom: 1px solid #f0f0f0;
}

.nav-container {
  display: flex;
  justify-content: space-around;
  max-width: 800px;
  margin: 0 auto;
  padding: 0 10px;
}

.nav-item {
  color: #666666;
  text-decoration: none;
  font-weight: 500;
  font-size: 0.95rem;
  padding: 18px 36px;
  position: relative;
  transition: color 0.2s ease;
  cursor: pointer;
}

.nav-item:hover {
  color: #42b983;
}

.nav-item.router-link-active {
  color: #42b983;
  font-weight: 600;
}

.nav-item.router-link-active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 12px;
  right: 12px;
  height: 3px;
  background-color: #42b983;
  border-radius: 3px 3px 0 0;
}

@media (max-width: 480px) {
  .nav-item {
    font-size: 0.85rem;
    padding: 14px 8px;
  }
  .nav-item.router-link-active::after {
    left: 8px;
    right: 8px;
    height: 2px;
  }
}
</style>