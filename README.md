# Zerocut Web V2

## 关于workspace项目的说明

1. 会员管理是membership-plan表，要和线上同步，需要把线上数据导入到本地。但是本地的数据你还不能删完。
所以我现在手动制造了一条id为20的数据。导入前删除20以外的数据即可。

2. 开发环境生成视频前，agent会去本地数据库检查用户积分。用户积分在accounts表的credits_balance字段中。

## zerocut-agent修改数据库字段

直接把src/service/database-manager.ts 中 synchronize: process.env.DB_SYNCHRONIZE === 'true',
改为 synchronize: true,
然后重新run dev就行

## TODO

[ ] prompt参考图匹配有问题，prompt的中的图片1会匹配到图片10-图片19

## API
https://sd2mfo025ni4n75n9r5p0.apigateway-cn-beijing.volceapi.com/models 模型列表
https://sd2mfo025ni4n75n9r5p0.apigateway-cn-beijing.volceapi.com/models/pricing?model=zerocut3.0&duration=10&resolution=1080p 模型价格