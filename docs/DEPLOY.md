# 发布到朋友自己的 GitHub 账号

当前交付是独立本地项目，没有远程地址，没有推送到旧项目或任何朋友账号。

## 1. 准备正确的账号与仓库

让朋友在自己有权操作的账号下新建公开仓库，例如 `wengao-box`。确认用户名、仓库路径与发布授权。不要在聊天中发送密码或令牌，也不要误用其他人的已缓存凭据。

源码包不含 `.git`、`node_modules`、账号凭据或机器绝对路径配置。解压后可以用 GitHub Desktop，或在正确身份下初始化并上传。建议使用 Git 客户端，不要只上传网页构建结果作为源码。

## 2. GitHub Pages

1. 源码上传到仓库默认分支。
2. 仓库 **Settings（设置）→ Pages（页面）→ Build and deployment（构建与部署）→ Source（来源）** 选择 **GitHub Actions**。
3. 打开 **Actions（操作）→ Deploy Pages → Run workflow（运行工作流）**。
4. 等待构建与部署成功，在 Pages 设置页复制实际展示的网址。不要在成功前声称网站已上线。
5. 未登录窗口访问网页并试用下载，确认公开访问正常。

发布工作流只有手动触发，不会因普通提交自动发布。如果使用其他默认分支，请确认 Pages 环境允许该分支。`Test` 工作流会在推送与 PR 时测试，但部署目前只重复单元测试和构建，不代替浏览器验收。

该步骤依据 GitHub 官方 Pages 自定义工作流文档核对：
- https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site
- https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages

## 3. 其他静态托管

执行 `npm ci` 和 `npm run build`，将 **dist 目录内部的所有文件** 上传到静态主机。不需要服务器密钥或数据库。构建产物包含本地依赖与许可声明。

也可以使用交付的静态站点 ZIP；这是已构建成品，不是项目源码。需通过 HTTP(S) 访问，不建议直接双击 HTML。

## 4. 上线后再做的事

- 将真实在线地址添加到 README 与 GitHub About。
- 简介建议：**把 Markdown / AI 回答转成可编辑 Word，中文排版，正文不上传。**
- Topics 可用：`markdown`、`docx`、`word`、`local-first`、`chinese`。
- 用真实示例录制“粘贴 → 选择模板 → 下载 → 修改 Word”的短演示。
- 请熟人实际试用并反馈；在允许分享项目的社区介绍用途，不刷星、不批量骚扰、不虚构用户量。

公开仓库可以被其他人访问，但搜索引擎收录与推荐不是立即发生，也不保证获得多少 Stars。
