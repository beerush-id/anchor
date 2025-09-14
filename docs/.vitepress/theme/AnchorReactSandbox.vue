<!-- MySandbox.vue -->
<template>
  <!-- 'code-options' is a build-in prop, do not edit it -->
  <Sandbox :rtl="rtl" :template="'react-ts'" :light-theme="'aquaBlue'" :dark-theme="'atomDark'" :options="{
    ...props, // do not forget it
    coderHeight: props.coderHeight ?? 400,
  }" :custom-setup="{
    ...props, // do not forget it
    deps: {
      react: '^19.1.1',
      'react-dom': '^19.1.1',
      '@anchorlib/react': 'latest'
    },
  }" :code-options="codeOptions">
    <slot />
  </Sandbox>
</template>

<script setup lang="ts">
import { Sandbox, sandboxProps } from 'vitepress-plugin-sandpack';

const props = defineProps(sandboxProps);
</script>
