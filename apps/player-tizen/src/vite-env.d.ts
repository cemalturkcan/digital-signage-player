declare module '*.vue' {
  import type { DefineComponent } from 'vue'

  const component: DefineComponent<object, object, unknown>
  export default component
}

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string
  readonly VITE_MQTT_BROKER_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
