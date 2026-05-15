# 画布feature

本feature主要实现两个大功能

1. 使用vueflow库实现所有素材在画布上的展示


2. 实现对oss列表中某个素材的生成参数展示以及增加重新编辑、再次生成按钮


oss列表的数据结构请参考：

```json
[
    {
        "ossKey": "zerocut/n25t7vi6gb/materials/图片1.jpeg",
        "ossUrl": "https://resource.zerocut.cn/zerocut/n25t7vi6gb/materials/图片1.jpeg",
        "source": "manual",
        "fileSize": 61741,
        "fileType": "image",
        "localFile": "materials/图片1.jpeg",
        "uploadTime": "2026-05-14T07:21:49.039Z",
        "prompt": null,
        "model": null,
        "inputParams": null
    },
    {
        "ossKey": "zerocut/qouhjpvfrf/materials/图片2.jpeg",
        "ossUrl": "https://resource.zerocut.cn/zerocut/qouhjpvfrf/materials/图片2.jpeg",
        "source": "manual",
        "fileSize": 97753,
        "fileType": "image",
        "localFile": "materials/图片2.jpeg",
        "uploadTime": "2026-05-15T02:05:35.217Z",
        "prompt": null,
        "model": null,
        "inputParams": null
    },
    {
        "ossKey": "zerocut/64kez3tz9l/materials/图片3.jpeg",
        "ossUrl": "https://resource.zerocut.cn/zerocut/64kez3tz9l/materials/图片3.jpeg",
        "source": "manual",
        "fileSize": 97753,
        "fileType": "image",
        "localFile": "materials/图片3.jpeg",
        "uploadTime": "2026-05-15T02:05:56.674Z",
        "prompt": null,
        "model": null,
        "inputParams": null
    },
    {
        "ossKey": "cerevox/vefaas-4sxyo8st-hp2pfkgxfm-d837v1g3bsupj62pvn6g-sandbox/8dad77eb-20d2-43b8-bb08-9800931ad194/mp4-8332552f-eca9-4f2d-bae9-99f688e5432a.mp4",
        "ossUrl": "https://resource.zerocut.cn/cerevox/vefaas-4sxyo8st-hp2pfkgxfm-d837v1g3bsupj62pvn6g-sandbox/8dad77eb-20d2-43b8-bb08-9800931ad194/mp4-8332552f-eca9-4f2d-bae9-99f688e5432a.mp4",
        "source": "omni",
        "fileSize": 0,
        "fileType": "video",
        "localFile": "materials/omni-video-29-1.mp4",
        "uploadTime": "2026-05-15T02:08:39.023Z",
        "prompt": "参考图片2 生成唱歌的视频",
        "model": "zerocut3.0-turbo",
        "inputParams": {
            "images": [
                {
                    "url": "https://resource.zerocut.cn/zerocut/qouhjpvfrf/materials/%E5%9B%BE%E7%89%872.jpeg",
                    "name": "图片2",
                    "type": "reference"
                }
            ],
            "duration": 5,
            "projectId": 106,
            "resolution": "720p",
            "aspect_ratio": "9:16"
        },
        "status": "SUCCESS",
        "workflowRef": "video_workflow:29"
    },
    {
        "ossKey": "zerocut/e8x6jikzw9/materials/图片4.jpg",
        "ossUrl": "https://resource.zerocut.cn/zerocut/e8x6jikzw9/materials/图片4.jpg",
        "source": "manual",
        "fileSize": 55863,
        "fileType": "image",
        "localFile": "materials/图片4.jpg",
        "uploadTime": "2026-05-15T02:11:32.640Z",
        "prompt": null,
        "model": null,
        "inputParams": null
    },
    {
        "ossKey": "zerocut/vk0rw37d36/materials/图片5.jpg",
        "ossUrl": "https://resource.zerocut.cn/zerocut/vk0rw37d36/materials/图片5.jpg",
        "source": "manual",
        "fileSize": 55863,
        "fileType": "image",
        "localFile": "materials/图片5.jpg",
        "uploadTime": "2026-05-15T02:12:02.368Z",
        "prompt": null,
        "model": null,
        "inputParams": null
    },
    {
        "ossKey": "cerevox/vefaas-4sxyo8st-hp2pfkgxfm-d8381sg3rt8n0sarjf0g-sandbox/160abbcb-6c10-4fc8-8687-ab265e316a1c/mp4-686972ed-7943-47e0-b269-21a617795f97.mp4",
        "ossUrl": "https://resource.zerocut.cn/cerevox/vefaas-4sxyo8st-hp2pfkgxfm-d8381sg3rt8n0sarjf0g-sandbox/160abbcb-6c10-4fc8-8687-ab265e316a1c/mp4-686972ed-7943-47e0-b269-21a617795f97.mp4",
        "source": "omni",
        "fileSize": 0,
        "fileType": "video",
        "localFile": "materials/omni-video-30-1.mp4",
        "uploadTime": "2026-05-15T02:14:41.895Z",
        "prompt": "参考图片4 生成跳舞视频",
        "model": "zerocut3.0-turbo",
        "inputParams": {
            "images": [
                {
                    "url": "https://resource.zerocut.cn/zerocut/e8x6jikzw9/materials/%E5%9B%BE%E7%89%874.jpg",
                    "name": "图片4",
                    "type": "reference"
                }
            ],
            "duration": 5,
            "projectId": 106,
            "resolution": "720p",
            "aspect_ratio": "9:16"
        },
        "status": "SUCCESS",
        "workflowRef": "video_workflow:30"
    },
    {
        "ossKey": "zerocut/s3y7g5awwe/materials/图片6.jpg",
        "ossUrl": "https://resource.zerocut.cn/zerocut/s3y7g5awwe/materials/图片6.jpg",
        "source": "manual",
        "fileSize": 30573,
        "fileType": "image",
        "localFile": "materials/图片6.jpg",
        "uploadTime": "2026-05-15T02:19:33.584Z",
        "prompt": null,
        "model": null,
        "inputParams": null
    },
    {
        "ossKey": "zerocut/e1zanqnide/materials/图片7.jpeg",
        "ossUrl": "https://resource.zerocut.cn/zerocut/e1zanqnide/materials/图片7.jpeg",
        "source": "manual",
        "fileSize": 61741,
        "fileType": "image",
        "localFile": "materials/图片7.jpeg",
        "uploadTime": "2026-05-15T02:44:37.377Z",
        "prompt": null,
        "model": null,
        "inputParams": null
    },
    {
        "ossKey": "cerevox/vefaas-4sxyo8st-xiz5t4pb7w-d838h9g3rt8n0sartk3g-sandbox/a1bae734-650e-4b23-924f-6b2ba72adde8/mp4-503f9c0d-b275-4c5f-8f77-b12012acfa03.mp4",
        "ossUrl": "https://resource.zerocut.cn/cerevox/vefaas-4sxyo8st-xiz5t4pb7w-d838h9g3rt8n0sartk3g-sandbox/a1bae734-650e-4b23-924f-6b2ba72adde8/mp4-503f9c0d-b275-4c5f-8f77-b12012acfa03.mp4",
        "source": "omni",
        "fileSize": 0,
        "fileType": "video",
        "localFile": "materials/omni-video-31-1.mp4",
        "uploadTime": "2026-05-15T02:48:42.436Z",
        "prompt": "生成图片7 跳舞的视频",
        "model": "zerocut3.0-turbo",
        "inputParams": {
            "images": [
                {
                    "url": "https://resource.zerocut.cn/zerocut/e1zanqnide/materials/%E5%9B%BE%E7%89%877.jpeg",
                    "name": "图片7",
                    "type": "reference"
                }
            ],
            "duration": 5,
            "projectId": 106,
            "resolution": "720p",
            "aspect_ratio": "9:16"
        },
        "status": "SUCCESS",
        "workflowRef": "video_workflow:31"
    },
    {
        "ossKey": "zerocut/zwq2ndgp4s/materials/图片8.jpg",
        "ossUrl": "https://resource.zerocut.cn/zerocut/zwq2ndgp4s/materials/图片8.jpg",
        "source": "manual",
        "fileSize": 30573,
        "fileType": "image",
        "localFile": "materials/图片8.jpg",
        "uploadTime": "2026-05-15T03:21:24.248Z",
        "prompt": null,
        "model": null,
        "inputParams": null
    },
    {
        "ossKey": "zerocut/th8fmhtj9r/materials/图片9.jpg",
        "ossUrl": "https://resource.zerocut.cn/zerocut/th8fmhtj9r/materials/图片9.jpg",
        "source": "manual",
        "fileSize": 76135,
        "fileType": "image",
        "localFile": "materials/图片9.jpg",
        "uploadTime": "2026-05-15T03:22:40.972Z",
        "prompt": null,
        "model": null,
        "inputParams": null
    },
    {
        "ossKey": "cerevox/vefaas-4sxyo8st-xiz5t4pb7w-d83933o3bsupj62qnvs0-sandbox/10d58f85-c1d7-4d19-8edc-42a6c055e30f/mp4-42f7abf6-601d-4dae-aa52-1afd1e8873ec.mp4",
        "ossUrl": "https://resource.zerocut.cn/cerevox/vefaas-4sxyo8st-xiz5t4pb7w-d83933o3bsupj62qnvs0-sandbox/10d58f85-c1d7-4d19-8edc-42a6c055e30f/mp4-42f7abf6-601d-4dae-aa52-1afd1e8873ec.mp4",
        "source": "omni",
        "fileSize": 0,
        "fileType": "video",
        "localFile": "materials/omni-video-32-1.mp4",
        "uploadTime": "2026-05-15T03:25:58.798Z",
        "prompt": "生成图片9 跳舞的视频",
        "model": "zerocut3.0-turbo",
        "inputParams": {
            "images": [
                {
                    "url": "https://resource.zerocut.cn/zerocut/th8fmhtj9r/materials/%E5%9B%BE%E7%89%879.jpg",
                    "name": "图片9",
                    "type": "reference"
                }
            ],
            "duration": 5,
            "projectId": 106,
            "resolution": "720p",
            "aspect_ratio": "9:16"
        },
        "status": "SUCCESS",
        "workflowRef": "video_workflow:32"
    },
    {
        "ossKey": "zerocut/2urort04z8/materials/图片10.jpeg",
        "ossUrl": "https://resource.zerocut.cn/zerocut/2urort04z8/materials/图片10.jpeg",
        "source": "manual",
        "fileSize": 244534,
        "fileType": "image",
        "localFile": "materials/图片10.jpeg",
        "uploadTime": "2026-05-15T04:02:23.855Z",
        "prompt": null,
        "model": null,
        "inputParams": null
    },
    {
        "ossKey": "cerevox/vefaas-4sxyo8st-xiz5t4pb7w-d839lo030akniu2oin60-sandbox/7802ec98-7e60-43fd-8a0a-b17bdd04a507/mp4-412564b3-ad1f-4e34-bf8e-96c62cbe97ac.mp4",
        "ossUrl": "https://resource.zerocut.cn/cerevox/vefaas-4sxyo8st-xiz5t4pb7w-d839lo030akniu2oin60-sandbox/7802ec98-7e60-43fd-8a0a-b17bdd04a507/mp4-412564b3-ad1f-4e34-bf8e-96c62cbe97ac.mp4",
        "source": "omni",
        "fileSize": 0,
        "fileType": "video",
        "localFile": "materials/omni-video-33-1.mp4",
        "uploadTime": "2026-05-15T04:08:16.686Z",
        "prompt": "生成图片10 唱歌的视频",
        "model": "zerocut3.0-pro-fast",
        "inputParams": {
            "images": [
                {
                    "url": "https://resource.zerocut.cn/zerocut/2urort04z8/materials/%E5%9B%BE%E7%89%8710.jpeg",
                    "name": "图片10",
                    "type": "reference"
                }
            ],
            "duration": 5,
            "projectId": 106,
            "resolution": "720p",
            "aspect_ratio": "9:16"
        },
        "status": "SUCCESS",
        "workflowRef": "video_workflow:33"
    },
    {
        "ossKey": "cerevox/vefaas-4sxyo8st-xiz5t4pb7w-d83a25o329rtdlqp5heg-sandbox/59c04450-e9ab-4c78-ad25-7f85f99dcad0/mp4-bdf5e1e2-ee74-4820-aabd-384eb448b31c.mp4",
        "ossUrl": "https://resource.zerocut.cn/cerevox/vefaas-4sxyo8st-xiz5t4pb7w-d83a25o329rtdlqp5heg-sandbox/59c04450-e9ab-4c78-ad25-7f85f99dcad0/mp4-bdf5e1e2-ee74-4820-aabd-384eb448b31c.mp4",
        "source": "omni",
        "fileSize": 0,
        "fileType": "video",
        "localFile": "materials/omni-video-37-1.mp4",
        "uploadTime": "2026-05-15T04:35:55.031Z",
        "prompt": "参考omni-video-33-1 ，延长视频到15秒",
        "model": "zerocut3.0-pro-fast",
        "inputParams": {
            "videos": [
                {
                    "url": "https://resource.zerocut.cn/cerevox/vefaas-4sxyo8st-xiz5t4pb7w-d839lo030akniu2oin60-sandbox/7802ec98-7e60-43fd-8a0a-b17bdd04a507/mp4-412564b3-ad1f-4e34-bf8e-96c62cbe97ac.mp4",
                    "name": "omni-video-33-1",
                    "type": "ref"
                }
            ],
            "duration": 15,
            "projectId": 106,
            "resolution": "720p",
            "aspect_ratio": "9:16"
        },
        "status": "SUCCESS",
        "workflowRef": "video_workflow:37"
    },
    {
        "localFile": null,
        "ossUrl": null,
        "fileType": "video",
        "source": "omni",
        "prompt": "参考omni-video-33-1 ，延长视频到15秒",
        "model": "seedance-2.0-fast",
        "inputParams": {
            "videos": [
                {
                    "url": "https://resource.zerocut.cn/cerevox/vefaas-4sxyo8st-xiz5t4pb7w-d839lo030akniu2oin60-sandbox/7802ec98-7e60-43fd-8a0a-b17bdd04a507/mp4-412564b3-ad1f-4e34-bf8e-96c62cbe97ac.mp4",
                    "name": "omni-video-33-1",
                    "type": "ref"
                }
            ],
            "duration": 15,
            "projectId": 106,
            "resolution": "720p",
            "aspect_ratio": "9:16"
        },
        "status": "FAILED",
        "workflowRef": "video_workflow:36"
    },
    {
        "localFile": null,
        "ossUrl": null,
        "fileType": "video",
        "source": "omni",
        "prompt": "参考omni-video-33-1 ，延长视频到15秒",
        "model": "zerocut3.0-turbo",
        "inputParams": {
            "videos": [
                {
                    "url": "https://resource.zerocut.cn/cerevox/vefaas-4sxyo8st-xiz5t4pb7w-d839lo030akniu2oin60-sandbox/7802ec98-7e60-43fd-8a0a-b17bdd04a507/mp4-412564b3-ad1f-4e34-bf8e-96c62cbe97ac.mp4",
                    "name": "omni-video-33-1",
                    "type": "ref"
                }
            ],
            "duration": 15,
            "projectId": 106,
            "resolution": "720p",
            "aspect_ratio": "9:16"
        },
        "status": "FAILED",
        "workflowRef": "video_workflow:35"
    },
    {
        "localFile": null,
        "ossUrl": null,
        "fileType": "video",
        "source": "omni",
        "prompt": "参考omni-video-33-1 ，延长视频到15s",
        "model": "zerocut3.0-turbo",
        "inputParams": {
            "videos": [
                {
                    "url": "https://resource.zerocut.cn/cerevox/vefaas-4sxyo8st-xiz5t4pb7w-d839lo030akniu2oin60-sandbox/7802ec98-7e60-43fd-8a0a-b17bdd04a507/mp4-412564b3-ad1f-4e34-bf8e-96c62cbe97ac.mp4",
                    "name": "omni-video-33-1",
                    "type": "ref"
                }
            ],
            "duration": 15,
            "projectId": 106,
            "resolution": "720p",
            "aspect_ratio": "9:16"
        },
        "status": "FAILED",
        "workflowRef": "video_workflow:34"
    }
]

## feature1:实现所有素材在画布上的展示

使用vue-flow库，把我们oss列表中的所有素材通过节点的形式展示在画布上。

你需要研读oss列表的数据结构，里面可以推理出某个素材是通过哪些参考素材生成的，然后用vue-flow把这个关系用节点和连线的方式形象的展现出来。

对于孤立的素材，直接展示为一个孤立的节点即可，它不需要和其他节点进行连线。

你需要保证每个节点都有漂亮的ui。

使用合理的库对vue-flow的节点进行布局，确保节点展示效果理想美观。

仅修改桌面端浏览器为使用vue-flow库展现oss列表，对于移动端保持现有逻辑。

## feature2:实现对oss列表中某个素材的生成参数展示以及增加重新编辑、再次生成按钮

本feature是对feature1的扩展。

对于画布上的节点，如果这个素材是被生成的（它具prompt字段不为null），那么我们就需要在这个素材节点上展现prompt。如果它具有inputParams字段，那么我们就需要在这个素材节点上展现inputParams。
对于视频素材，我们还需要在这个素材节点下方展示重新编辑和重新生成的按钮，点击后我们需要参考当前workspace页面的视频生成tab页的逻辑进行重新编辑和重新生成。

