# 摸鱼发薪局

[![开放插件市场](https://img.shields.io/endpoint?url=https%3A%2F%2Fdshopen.org%2Fbadge%2Fdsh-fish-pay-counter.json)](https://dshopen.org/zh/plugins/dsh-fish-pay-counter/)

**等 AI 的工夫，去工位底下钓个周五。** 右击金鱼，选「小游戏 → 大肥鱼捞班味」。一竿捞到「最终版的最终版」，下一竿，说不定钓上「准点下班许可证」。

![回钩碰到宝物后，浮漂变成金星](market-assets/gold-fishing.png)

点鱼甩竿。收线时左右移动鼠标，把钩子带向你想捞的东西。浮漂先抖、再变金星，看到金星就点漂、点鱼，或在鱼有焦点时按空格。慢半拍也能收下已经咬钩的那一件。金漂提得准，还有六种额外彩蛋轮流出场。

## 安装

在 DSH 工作台打开「插件 → 添加插件」，粘贴下面这行就能装到有钓鱼的 **1.7.0**。需要 Git 和可访问 GitHub 的网络。

```text
github:egg2023001-cmd/dsh-fish-pay-counter#v1.7.0
```

[下载发行包](https://github.com/egg2023001-cmd/dsh-fish-pay-counter/releases/tag/v1.7.0) · [去开放市场点赞](https://dshopen.org/zh/plugins/dsh-fish-pay-counter/)。市场搜索「摸鱼发薪局」可以查看当前收录版本。

## 摸摸这条鱼

![五指小手抚过鱼背，小鱼眯起眼](market-assets/petting.png)

- **轻点鱼背**，小手顺着鱼背抚过去，鱼眯眼，烟花里冒出一句吐槽。按住拖动可以给它换个位置。
- **右键 → 小游戏 → 戳泡泡**，15 秒内追泡泡，带星的金泡泡值两分。按 Esc 收摊。
- **右键 → 投喂鱼粮**，听它换着说 12 句加餐吐槽。
- **右键 → 装扮与设置 → 工资面板**，按自己的班表估算今天的工资。也可以直接点鱼下面的读数。

## 鱼缸共创

主线新玩法：右键「装扮与设置」可切换「橘子工头」和长着星耳的「星夜巡游」。想听今天的新词，在同一菜单点「订阅每日新梗」。新一期的四句会优先出现；断网时照常点鱼。有个梗想让所有人的鱼说出来？直接投一句。只会画草图？给鱼添件衣服也行。

- [投一句台词](https://github.com/egg2023001-cmd/dsh-fish-pay-counter/issues/new?template=fish-line.md) · [投一个鱼造型](https://github.com/egg2023001-cmd/dsh-fish-pay-counter/issues/new?template=fish-look.md)
- 喜欢别人的提案可以在对应议题点 👍。被采用的台词进入[公开词库](community/lines.json)，造型随插件更新。也欢迎直接提交改动。代码和内置原创素材采用 [MIT 许可](LICENSE)。


## 安装环境与隐私

适配 DeepSeek Harness `>=0.2.2-rc.3 <0.3.0`。如果安装后没看到小鱼，重新打开工作台。游戏默认离线，月薪、班表和位置都留在本机。每天的新梗由你选择订阅，订阅后只读取公开词库。工资按中国标准时间、周一至周五估算，可跳过午休或暂停。支持系统的减少动态效果。

**English** — Pet the workbench goldfish to see it squint and pop a firework quip. Cast a line, steer toward office oddities, and strike the gold float for a bonus catch. Includes bubble popping, outfits and an optional daily quip feed.
