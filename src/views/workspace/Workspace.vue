<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import MainLayout from '@/components/layout/MainLayout.vue';
import FileList from './components/FileList.vue';
import PreviewArea from './components/PreviewArea.vue';
import ChatBox from './components/ChatBox.vue';

interface WorkspaceFile {
  id: string;
  file_name: string;
  file_type: string;
  file_url: string;
  thumbnail_url?: string;
  file_size?: number;
  created_at: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  message_type: 'text' | 'thinking' | 'file' | 'error';
  file_references?: Array<{
    id: string;
    file_name: string;
    thumbnail_url?: string;
    file_type: string;
  }>;
  created_at: string;
}

const route = useRoute();
const router = useRouter();

const files = ref<WorkspaceFile[]>([]);
const messages = ref<ChatMessage[]>([]);
const selectedFileId = ref<string>();
const isLoading = ref(false);
const projectTitle = ref('音乐节海报设计');

const selectedFile = computed(() => {
  return files.value.find(f => f.id === selectedFileId.value);
});

onMounted(() => {
  const projectId = route.params.projectId as string;
  
  if (!projectId) {
    router.push('/');
    return;
  }

  loadProject();
});

const loadProject = () => {
  // Sample data - in real app this would come from API
  const sampleMessages: ChatMessage[] = [
    {
      id: 'sample-1',
      role: 'user',
      content: '为音乐节制作一张包豪斯风格的海报。使用粉色、红色和奶油色的有限调色板。代表声波的抽象几何形状。极简垂直文本。',
      message_type: 'text',
      file_references: [{
        id: 'ref-1',
        file_name: 'ZeroCut Logo',
        file_type: 'image'
      }],
      created_at: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: 'sample-2',
      role: 'assistant',
      content: '我将创建一张包豪斯风格的音乐节海报，采用指定的配色和设计元素。',
      message_type: 'text',
      created_at: new Date(Date.now() - 86300000).toISOString(),
    },
    {
      id: 'sample-3',
      role: 'assistant',
      content: '完美！我已经创建了一张包豪斯风格的音乐节海报，展示了代表声波的抽象几何形状，采用粉色、红色和奶油色调色板，并配有极简垂直文本布局。',
      message_type: 'text',
      created_at: new Date(Date.now() - 86200000).toISOString(),
    },
  ];

  const sampleFiles: WorkspaceFile[] = [
    {
      id: 'sample-file-1',
      file_name: 'Bauhaus Music Festival Poster.jpg',
      file_type: 'image',
      file_url: 'https://images.pexels.com/photos/1563356/pexels-photo-1563356.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
      thumbnail_url: 'https://images.pexels.com/photos/1563356/pexels-photo-1563356.jpeg?auto=compress&cs=tinysrgb&w=400',
      file_size: 2456789,
      created_at: new Date(Date.now() - 86200000).toISOString(),
    },
    {
      id: 'sample-file-2',
      file_name: 'Abstract Geometric Design.jpg',
      file_type: 'image',
      file_url: 'https://images.pexels.com/photos/1389460/pexels-photo-1389460.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
      thumbnail_url: 'https://images.pexels.com/photos/1389460/pexels-photo-1389460.jpeg?auto=compress&cs=tinysrgb&w=400',
      file_size: 1834567,
      created_at: new Date(Date.now() - 172800000).toISOString(),
    },
    {
      id: 'sample-file-3',
      file_name: 'Festival Background Music.mp3',
      file_type: 'audio',
      file_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
      file_size: 5234567,
      created_at: new Date(Date.now() - 259200000).toISOString(),
    },
    {
      id: 'sample-file-4',
      file_name: 'Promotional Video Draft.mp4',
      file_type: 'video',
      file_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      thumbnail_url: 'https://images.pexels.com/photos/1181244/pexels-photo-1181244.jpeg?auto=compress&cs=tinysrgb&w=400',
      file_size: 15234567,
      created_at: new Date(Date.now() - 345600000).toISOString(),
    },
  ];

  messages.value = sampleMessages;
  files.value = sampleFiles;
  selectedFileId.value = sampleFiles[0].id;
};

const handleSendMessage = async (content: string) => {
  const userMessage: ChatMessage = {
    id: `user-${Date.now()}`,
    role: 'user',
    content,
    message_type: 'text',
    created_at: new Date().toISOString(),
  };

  messages.value.push(userMessage);
  isLoading.value = true;

  // Simulate thinking
  setTimeout(() => {
    const thinkingMessage: ChatMessage = {
      id: `thinking-${Date.now()}`,
      role: 'assistant',
      content: '正在思考如何帮你实现这个想法...',
      message_type: 'thinking',
      created_at: new Date().toISOString(),
    };

    messages.value.push(thinkingMessage);

    // Remove thinking message and add response
    setTimeout(() => {
      messages.value = messages.value.filter(m => m.message_type !== 'thinking');

      const responseMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: '我理解你的需求了。正在为你生成相关素材，请稍候...',
        message_type: 'text',
        created_at: new Date().toISOString(),
      };

      messages.value.push(responseMessage);
      isLoading.value = false;
    }, 1500);
  }, 500);
};

const handleFileSelect = (fileId: string) => {
  selectedFileId.value = fileId;
};

const handleProjectTitleChange = (newTitle: string) => {
  projectTitle.value = newTitle;
};

const handleFileUpload = (file: File) => {
  const fileType = file.type.startsWith('image/') ? 'image'
    : file.type.startsWith('video/') ? 'video'
    : file.type.startsWith('audio/') ? 'audio'
    : 'document';

  const newFile: WorkspaceFile = {
    id: `file-${Date.now()}`,
    file_name: file.name,
    file_type: fileType,
    file_url: URL.createObjectURL(file),
    file_size: file.size,
    created_at: new Date().toISOString(),
  };

  files.value.unshift(newFile);
  selectedFileId.value = newFile.id;
};

const handleDownloadAll = () => {
  files.value.forEach(file => {
    window.open(file.file_url, '_blank');
  });
};

const handleDownload = () => {
  if (selectedFile.value) {
    window.open(selectedFile.value.file_url, '_blank');
  }
};

const handleRegenerate = () => {
  console.log('Regenerate');
};

const handleModify = () => {
  console.log('Modify');
};

const handleShowPrompt = () => {
  console.log('Show prompt');
};
</script>

<template>
  <MainLayout :show-footer="false" :show-sidebar="false">
    <div class="flex h-[calc(100vh-64px)] overflow-hidden bg-white">
      <FileList
        :files="files"
        :selected-file-id="selectedFileId"
        :project-title="projectTitle"
        @file-select="handleFileSelect"
        @project-title-change="handleProjectTitleChange"
        @file-upload="handleFileUpload"
        @download-all="handleDownloadAll"
      />

      <PreviewArea
        :file-url="selectedFile?.file_url"
        :file-type="selectedFile?.file_type"
        :file-name="selectedFile?.file_name"
        @regenerate="handleRegenerate"
        @download="handleDownload"
        @modify="handleModify"
        @show-prompt="handleShowPrompt"
      />

      <ChatBox
        :messages="messages"
        :is-loading="isLoading"
        @send-message="handleSendMessage"
      />
    </div>
  </MainLayout>
</template>