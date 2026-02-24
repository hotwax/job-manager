import { useAuthStore } from "@/store/auth";
import { client, hasError } from "@common";
import { ref } from "vue";

interface LoginOption {
  loginAuthType?: string,
  maargInstanceUrl?: string,
  loginAuthUrl?: string
}

export function useAuth() {
  const authStore = useAuthStore();
  const loginOption = ref<LoginOption>({})

  const fetchLoginOptions = async() => {
    loginOption.value = {}
    try {
      const resp = await client({
        url: "checkLoginOptions",
        method: "GET",
        baseURL: authStore.getOmsUrl
      });
      if (!hasError(resp)) {
        loginOption.value = resp.data
        await authStore.setMaargInstance(resp.data.maargInstanceUrl)
      }
    } catch (error) {
      console.error(error)
    }
  };

  return {
    // Variables
    loginOption,
    // Functions
    fetchLoginOptions
  }
}