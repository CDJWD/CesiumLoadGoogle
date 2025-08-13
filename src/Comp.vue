<script>
import MapDisplayComp from './components/MapDisplayComp.vue';

export default {
  components: {
    MapDisplayComp
  },
  methods: {
    goBack() {
      window.location.href = '/index.html';
    }
  }
}
</script>
<template>
  <div class="app-container">
    <MapDisplayComp />
    <div class="navigation-button">
      <button class="nav-btn back-btn" @click="goBack">
        <span class="btn-arrow">←</span>
        <span class="btn-text">返回主页</span>
        <span class="btn-icon">🏠</span>
      </button>
    </div>
  </div>
</template>

<style>
html, body {
    margin: 0;
    padding: 0;
    overflow: hidden;
}

.app-container {
    position: relative;
    width: 100vw;
    height: 100vh;
}

.navigation-button {
    position: fixed;
    top: 20px;
    left: 20px;
    z-index: 10000;
}

.nav-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 20px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    border-radius: 25px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.3s ease;
    box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    min-width: 140px;
    justify-content: center;
}

.nav-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
    background: linear-gradient(135deg, #764ba2 0%, #667eea 100%);
}

.nav-btn:active {
    transform: translateY(0);
}

.btn-icon {
    font-size: 16px;
}

.btn-text {
    white-space: nowrap;
}

.btn-arrow {
    font-size: 18px;
    transition: transform 0.3s ease;
}

.nav-btn:hover .btn-arrow {
    transform: translateX(-3px);
}

.back-btn:hover .btn-arrow {
    transform: translateX(-3px);
}

/* 响应式设计 */
@media (max-width: 768px) {
    .navigation-button {
        top: 15px;
        left: 15px;
    }
    
    .nav-btn {
        padding: 10px 16px;
        font-size: 12px;
        min-width: 120px;
    }
    
    .btn-text {
        display: none;
    }
    
    .nav-btn:hover .btn-text {
        display: inline;
    }
}

@media (max-width: 480px) {
    .navigation-button {
        top: 10px;
        left: 10px;
    }
    
    .nav-btn {
        padding: 8px 12px;
        border-radius: 20px;
    }
}
</style>
