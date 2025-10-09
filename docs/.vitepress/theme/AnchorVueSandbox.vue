<template>
  <Sandbox
    :rtl="rtl"
    :template="'vue3-ts'"
    :light-theme="'githubLight'"
    :dark-theme="'atomDark'"
    :options="{
      ...props, // do not forget it
      showLineNumbers: true,
      coderHeight: props.coderHeight ?? 400,
    }"
    :custom-setup="{
      ...props, // do not forget it
      deps: {
        '@anchorlib/vue': 'latest',
        '@tailwindcss/browser': '^4.0.0',
      },
    }"
    :code-options="codeOptions">
    <slot />
  </Sandbox>
</template>

<script setup lang="ts">
import { Sandbox, sandboxProps } from 'vitepress-plugin-sandpack';

const props = defineProps(sandboxProps);
</script>
