# 一起往工位底下扔点东西

[写一件渔获](https://github.com/egg2023001-cmd/dsh-fish-pay-counter/issues/new?template=fish-catch.md)、[投一句台词](https://github.com/egg2023001-cmd/dsh-fish-pay-counter/issues/new?template=fish-line.md)，或[给鱼画一套衣服](https://github.com/egg2023001-cmd/dsh-fish-pay-counter/issues/new?template=fish-look.md)。一行文字、一张原创草图都欢迎。已经在展示帖留过言，那里就可以继续聊。

## 第一次改一件渔获

1. 在 [client.js](client.js) 找到 `const tackle`。三个列表分别装日常打捞、稀奇货和闪光宝物。选第一个列表，仿照旁边的一行，加上图标、名字和两句轮流出现的吐槽。例如：

   ```js
   ['🔘', '周一撤回键', '按了三次，怎么还在加载周日？', '再按一次试试，鱼替你挡着日历。'],
   ```

2. 在本地运行 `node --check client.js`。要看它在游戏里的样子，在测试用 DSH 工作台「插件 → 添加插件」选择本地仓库目录。右键鱼 → 小游戏 → 大肥鱼捞班味。渔获随机出场。
3. 提交一个 Pull Request，写明改了哪件物品、怎么验过。纯文案只改对应的一行即可。画鱼装也欢迎先提草图讨论，附上素材来源。

采用的渔获随正式版进入游戏，采用的每日台词通过公开词库分发。请提交原创或可按项目 [MIT 许可](LICENSE)分发的内容。
