# Zer0cut Web V2

## 关于workspace项目的说明

1. 会员管理是membership-plan表，要和线上同步，需要把线上数据导入到本地。但是本地的数据你还不能删完。
所以我现在手动制造了一条id为20的数据。导入前删除20以外的数据即可。

2. 开发环境生成视频前，agent会去本地数据库检查用户积分。用户积分在accounts表的credits_balance字段中。