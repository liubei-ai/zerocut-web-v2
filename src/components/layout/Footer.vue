<script setup lang="ts">
</script>

<template>
  <footer class="border-t border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900">
    <div class="container mx-auto px-4 py-12">
      <div class="grid gap-8 md:grid-cols-3">
        <!-- Brand Section -->
        <div class="space-y-4">
          <img src="/src/assets/logo-liubei.png" alt="企业微信二维码" class="h-10" />
          <p class="text-sm text-slate-600 dark:text-slate-400">
            北京六北科技有限公司，专注于人工智能视频应用，<br />
            致力于打造AI视频落地的"最后一公里"。
          </p>
          <div class="space-y-2">
            <img src="/src/assets/qrcode.jpg" alt="企业微信二维码" class="h-24 w-24" />
            <p class="text-xs text-slate-600 dark:text-slate-400">扫码添加企业微信</p>
          </div>
        </div>

        <!-- Services Section -->
        <div class="space-y-4">
          <h3 class="text-sm font-semibold text-slate-900 dark:text-slate-50">我们的服务</h3>
          <ul class="space-y-2">
            <li>
              <a href="#"
                class="text-sm text-slate-600 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-50">
                AI视频制作
              </a>
            </li>
            <li>
              <a href="#"
                class="text-sm text-slate-600 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-50">
                AI视频培训
              </a>
            </li>
            <li>
              <a href="#"
                class="text-sm text-slate-600 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-50">
                AI视频解决方案
              </a>
            </li>
          </ul>
        </div>

        <!-- Contact Section -->
        <div class="space-y-4">
          <h3 class="text-sm font-semibold text-slate-900 dark:text-slate-50">联系方式</h3>
          <ul class="space-y-2">
            <li class="text-sm text-slate-600 dark:text-slate-400">
              hezuo@liubeai.com
            </li>
            <li class="text-sm text-slate-600 dark:text-slate-400">
              手机&微信: 18210193560
            </li>
            <li class="text-sm text-slate-600 dark:text-slate-400">
              北京市海淀区北大科技园B座
            </li>
          </ul>
        </div>
      </div>

      <!-- Bottom Bar -->
      <div class="mt-12 border-t border-slate-200 pt-8 dark:border-slate-800">
        <p class="text-center text-sm text-slate-600 dark:text-slate-400">
          © 2026 北京六北科技有限公司. 保留所有权利.<br />
          京ICP备2025122444号-3
        </p>
      </div>
    </div>
  </footer>
</template>
