import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import './styles/tokens.css';
import './styles/global.css';
import './styles/animations.css';

createApp(App).use(createPinia()).mount('#app');
