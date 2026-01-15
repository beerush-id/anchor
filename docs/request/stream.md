---
head:
  - ['meta', { http-equiv: 'refresh', content: '0; url=/async/stream' }]
---
<script setup>
import { onMounted } from 'vue'
import { useRouter } from 'vitepress'

const router = useRouter()
onMounted(() => {
  if (typeof window !== 'undefined') {
    window.location.href = '/async/stream'
  }
})
</script>

# Redirecting...

If you are not redirected automatically, follow this [link](/async/stream).
