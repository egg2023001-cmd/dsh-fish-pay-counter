# 摸鱼发薪局

[![开放插件市场](https://img.shields.io/endpoint?url=https%3A%2F%2Fdshopen.org%2Fbadge%2Fdsh-fish-pay-counter.json)](https://dshopen.org/zh/plugins/dsh-fish-pay-counter/)

**等 AI 干活，点鱼放朵烟花。** 一条可以拖着游的 DSH 胖金鱼，随手摸一下、喂一颗，或者花 15 秒追泡泡。

- **左键点鱼**：颜色各异的星火炸开，台词放大定格。52 句摸鱼台词轮着说。
- **右键喂鱼**：看鱼粮飞到嘴边，听它换着说 12 句加餐吐槽。
- **右键戳泡泡**：泡泡直接浮在 DSH 工作台各处。普通泡泡 1 分，金泡泡 2 分，点鱼旁的计分提示可以提前结束。
- **拖鱼和计薪**：按住鱼拖动。点鱼下方的工资读数（或右键菜单里的「工资面板」）打开班表，按工作时段估算工资，支持跳过午休及手动暂停。

![直接点鱼后弹出烟花台词](market-assets/fish-pay-fireworks-1.5.1.png)

点完鱼的那一下：烟花炸开，台词定格。鱼下面是今天的工资读数，金额是示意用的虚构数据。

![泡泡直接浮在 DSH 工作台上](market-assets/fish-pay-bubbles-1.5.1.png)

戳泡泡进行中的一局：带 ★ 的金色泡泡是金泡泡，戳中加 2 分；「15 秒 · 3 分」是剩余时间和得分，点 × 或按 Esc 提前结束。

## 安装

需要 DeepSeek Harness `>=0.2.2-rc.3`（低于 `0.3.0`）。装法由省事到费事：

1. **应用内直接装**：「插件」页点「添加插件」，填 `dsh-fish-pay-counter`，回车。包从 npm 取；默认设置下，官方源连不上、超时或还没同步时，应用会自动改问国内镜像，也可以在同一个窗口的「安装源」里直接选「中国大陆镜像源」。装完没看到的话，完全退出 DSH 再打开一次。
2. **一行命令**：`dsh plugin --profile desktop add dsh-fish-pay-counter`（`desktop` 换成你的 profile 名）。
3. **开放市场标签**：运行 `dsh plugin --profile desktop add dsh-open-market`（`desktop` 换成你的 profile 名），重启 DSH 后在「插件」页的「开放市场」里搜「摸鱼发薪局」，点安装，以后也能在这里更新。
4. **GitHub 来源**（npm 上取不到时用）：「添加插件」里填 `github:egg2023001-cmd/dsh-fish-pay-counter`，命令行是 `dsh plugin --profile desktop add github:egg2023001-cmd/dsh-fish-pay-counter`。需要本机装有 git 且能访问 GitHub。
5. **索引源**：「插件 → 实验性插件 → 自定义插件市场」，在「发现 → 添加索引源」粘贴 `https://dshopen.org/index.json`，再到「发现」里搜 `dsh-fish-pay-counter`。
6. **本地目录**：克隆本仓库，在「插件」页点「添加插件」，填入仓库文件夹的绝对路径。

开源包名为 `dsh-fish-pay-counter`，原名「小鱼工资计数器」。已有安装可沿用本机班表和位置。

## 装完以后

装完没看到鱼的话，完全退出 DSH 再打开一次。鱼默认停在窗口右下方，离右边缘、下边缘各约 220 像素；按住能拖走，位置会记住。

1. **先点一下鱼**：烟花和台词马上就有，不用任何设置。
2. **想数工资**：还没填月薪时，鱼下面写着「摸鱼发薪局」，再往下一行是「点我填班表」。点它打开班表，填月薪、每月计薪日和上下班时间，读数就开始走。午休 12:00–13:00 默认不计入，可以关掉。
3. **想逗它**：右键点鱼，只有三个选项：投喂鱼粮、戳泡泡、工资面板。戳泡泡一局 15 秒，一次只出一个泡泡，每戳中第四个是金泡泡。

游戏开箱即玩。月薪默认留空，按中国标准时间和周一至周五估算，实际金额以工资单为准。班表、暂停记录和小鱼位置保存在当前工作台。插件无需账号、网络请求或模型调用。上图金额均为虚构。

在 macOS 的 DeepSeek Harness 0.2.2-rc.5 上验证。支持系统的减少动态效果设置。MIT License。

**English** — A draggable goldfish for your DSH workbench. Click the fish for one of 52 firework quips. Right-click to feed it or pop bubbles anywhere in the workbench during a 15-second round. The optional pay estimate uses your schedule and stays on your device. After a full quit and reopen, the fish waits near the bottom-right of the window: click it right away, click the readout under it to enter your salary schedule, or right-click it to feed it or start a bubble round. Install it from the Plugins page: choose Add plugin and enter `dsh-fish-pay-counter`. It is the npm package, and the same name works with `dsh plugin --profile <profile> add dsh-fish-pay-counter`. If npm is out of reach, enter `github:egg2023001-cmd/dsh-fish-pay-counter` instead, or use the Open Plugin Market tab (search for 摸鱼发薪局) or the cloned repository directory.

玩得开心的话，欢迎点个 star，并到[开放插件市场页面](https://dshopen.org/zh/plugins/dsh-fish-pay-counter/)点个赞——小插件被人看见，主要靠这两样。
