import { defineStore } from 'pinia';

interface DemoState {
  welcomeMessage: string;
  isDarkMode: boolean;
}

export const useDemoStore = defineStore('demo', {
  state: (): DemoState => ({
    welcomeMessage: 'Welcome to the Modernized Vue 3 Application',
    isDarkMode: false,
  }),
  getters: {
    greeting(state): string {
      return state.welcomeMessage;
    },
  },
  actions: {
    toggleDarkMode() {
      this.isDarkMode = !this.isDarkMode;
    },
    updateWelcomeMessage(message: string) {
      this.welcomeMessage = message;
    },
  },
});
