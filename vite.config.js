import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // 기본값(localhost)은 환경에 따라 IPv6(::1)에만 열려서, IPv6를 쓰지 않는 브라우저 설정이나
  // 127.0.0.1 주소로는 접속이 거부된다. IPv4 루프백에 열면 localhost와 127.0.0.1 모두 접속된다.
  server: { host: '127.0.0.1' },
  preview: { host: '127.0.0.1' },
})
