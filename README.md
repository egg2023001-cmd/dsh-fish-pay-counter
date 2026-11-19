# 小鱼工资计数器

一个运行在 DeepSeek Harness 工作台里的悬浮小鱼。按住拖动，点开设置。小鱼按工作时段每秒估算当天的工资，鱼会在水里游动、眨眼和吐泡，跨过整数金额时会弹出金币和光圈。

- 设定月薪、每月计薪天数和上下班时间。
- 可自动跳过午休，也可手动暂停和继续。
- 刷新后保留设置及小鱼位置，支持系统的减少动态效果设置。
- 按上海时间和周一到周五估算。适合做工作日小挂件，实际薪资以工资单为准。

在 DSH 插件页面安装。插件加载后，工作台上会出现小鱼。点击小鱼，或从右侧栏新增「小鱼工资计数器」，即可填写设置。

月薪初始为空。设置、当天暂停记录和小鱼位置存放在工作台本地的浏览器存储中。插件运行无需网络服务、模型调用或账号凭据。

在 macOS 版 DSH 0.2.2-rc.3 上验证过加载。源码包含工作台运行文件，无构建步骤及运行依赖。

**English:** A draggable fish widget for the DeepSeek Harness workbench. It estimates the day's pay per second during work hours, supports pause and lunch breaks, and keeps settings locally.
