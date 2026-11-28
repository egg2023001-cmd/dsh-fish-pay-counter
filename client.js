window.__ModuleLoader__.load({
  id: 'dsh-fish-pay-counter',

  factory(require) {
    const { createElement: h, Fragment, useEffect, useId, useRef, useState } = require('react');
    const id = 'dsh-fish-pay-counter';
    const title = '摸鱼发薪局';
    const storageKey = id + ':v1';
    const changed = id + ':changed';
    const positionKey = id + ':position';
    const widgetWidth = 176;
    const widgetHeight = 128;
    const defaults = { pay: '', days: '21', start: '09:00', end: '18:00', lunch: true };
    const currency = new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' });
    const shanghai = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
    });

    function currentTime(now) {
      const parts = Object.fromEntries(shanghai.formatToParts(now).map(({ type, value }) => [type, value]));
      const date = [parts.year, parts.month, parts.day].join('-');
      const weekday = new Date(date + 'T00:00:00Z').getUTCDay();
      const second = Number(parts.hour) * 3600 + Number(parts.minute) * 60 + Number(parts.second);
      return { date, second, workday: weekday >= 1 && weekday <= 5 };
    }

    function seconds(time) {
      const [hours, minutes] = time.split(':').map(Number);
      return hours * 3600 + minutes * 60;
    }

    function workingPeriods(settings) {
      const start = seconds(settings.start);
      const end = seconds(settings.end);
      if (!settings.lunch) return [[start, end]];
      return [[start, Math.min(end, 43200)], [Math.max(start, 46800), end]]
        .filter(([from, to]) => from < to);
    }

    function validate(settings) {
      if (typeof settings?.pay !== 'string' || !/^\d{1,9}(?:\.\d{1,2})?$/.test(settings.pay) || Number(settings.pay) <= 0) {
        return '请填入大于 0 的月薪，最多保留两位小数。';
      }
      if (typeof settings.days !== 'string' || !/^\d{1,2}$/.test(settings.days) || Number(settings.days) < 1 || Number(settings.days) > 31) {
        return '每月计薪日须为 1 至 31 天。';
      }
      const timePattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
      if (!timePattern.test(settings.start) || !timePattern.test(settings.end) ||
          seconds(settings.start) >= seconds(settings.end) || !workingPeriods(settings).length) {
        return '请设置同一天内有效的上下班时间。';
      }
      return '';
    }

    function pauseForDay(pause, date) {
      return pause?.date === date ? pause : { date, spans: [], since: null };
    }

    function calculate(settings, clock, storedPause) {
      const periods = workingPeriods(settings);
      const pause = pauseForDay(storedPause, clock.date);
      const overlap = ([start, end], [from, to]) => Math.max(0, Math.min(end, to) - Math.max(start, from));
      const dailySeconds = periods.reduce((total, [from, to]) => total + to - from, 0);
      const pauses = pause.since === null ? pause.spans : [...pause.spans, [pause.since, clock.second]];
      let elapsed = 0;
      if (clock.workday) {
        for (const period of periods) {
          const worked = overlap(period, [0, clock.second]);
          const paused = pauses.reduce((total, span) => total + overlap(period, span), 0);
          elapsed += Math.max(0, worked - paused);
        }
      }
      const dayPay = Number(settings.pay) / Number(settings.days);
      const perSecond = dayPay / dailySeconds;
      const working = periods.some(([from, to]) => from <= clock.second && clock.second < to);
      let state = 'working';
      if (!clock.workday) state = 'weekend';
      else if (clock.second >= periods.at(-1)[1]) state = 'finished';
      else if (clock.second < periods[0][0]) state = 'early';
      else if (pause.since !== null) state = 'paused';
      else if (!working) state = 'lunch';
      return { amount: elapsed * perSecond, perSecond, state };
    }

    function readState() {
      try {
        const state = JSON.parse(window.localStorage.getItem(storageKey) ?? '{}');
        return { settings: !validate(state.settings) ? state.settings : null, pause: state.pause ?? null };
      } catch {
        return { settings: null, pause: null };
      }
    }

    function useClock() {
      const [time, setTime] = useState(() => currentTime(new Date()));
      useEffect(() => {
        const tick = () => setTime(currentTime(new Date()));
        const timer = window.setInterval(tick, 1000);
        document.addEventListener('visibilitychange', tick);
        return () => {
          window.clearInterval(timer);
          document.removeEventListener('visibilitychange', tick);
        };
      }, []);
      return [time, setTime];
    }

    function useYuanBubble(result, { date, second }) {
      const [bubble, setBubble] = useState(null);
      const previous = useRef(null);
      const yuan = result ? Math.floor(result.amount) : null;
      const state = result?.state;
      useEffect(() => {
        const prior = previous.current;
        previous.current = yuan === null ? null : { date, second, yuan, state };
        const elapsed = second - (prior?.second ?? second);
        if (prior?.date !== date || state !== 'working' || prior.state !== 'working' ||
            elapsed < 1 || elapsed > 2 || yuan <= prior.yuan) {
          setBubble(null);
          return;
        }
        setBubble({ key: date + ':' + second, delta: yuan - prior.yuan });
        const timer = window.setTimeout(() => setBubble(null), 920);
        return () => window.clearTimeout(timer);
      }, [yuan, date, second, state]);
      return bubble;
    }

    const messages = {
      working: '你等 AI，我替你看数字。',
      paused: '鱼先遛个弯，数字等你回来。',
      lunch: '饭点到了，鱼先扒两口。',
      early: '鱼还在被窝里，开工再叫它。',
      finished: '工牌一摘，今天的班到这儿。',
      weekend: '周末不上班，鱼也不上。',
    };

    function FishIllustration({ night = false }) {
      const artId = id + useId();
      const paint = (name) => 'url(#' + artId + '-' + name + ')';
      return h('span', { className: night ? 'fish-pay-free fish-pay-night' : 'fish-pay-free', 'aria-hidden': true },
        h('span', { className: 'fish-pay-air fish-pay-air-one' }),
        h('span', { className: 'fish-pay-air fish-pay-air-two' }),
        h('span', { className: 'fish-pay-air fish-pay-air-three' }),
        h('svg', { className: 'fish-pay-swim', viewBox: '0 0 152 120', focusable: false },
          h('defs', null,
            h('radialGradient', { id: artId + '-belly', cx: '.37', cy: '.22', r: '.83' },
              h('stop', { offset: '0%', stopColor: '#fff5ad' }),
              h('stop', { offset: '37%', stopColor: '#ffc479' }),
              h('stop', { offset: '72%', stopColor: '#ff9b67' }),
              h('stop', { offset: '100%', stopColor: '#e95464' })),
            h('linearGradient', { id: artId + '-fin', x1: '0', y1: '0', x2: '.85', y2: '1' },
              h('stop', { offset: '0%', stopColor: '#ffbe88' }),
              h('stop', { offset: '50%', stopColor: '#f57983' }),
              h('stop', { offset: '100%', stopColor: '#cb466f' })),
            h('linearGradient', { id: artId + '-hat', x1: '0', y1: '0', x2: '.7', y2: '1' },
              h('stop', { offset: '0%', stopColor: '#fff5a8' }),
              h('stop', { offset: '52%', stopColor: '#ffce60' }),
              h('stop', { offset: '100%', stopColor: '#ee8a32' }))),
          h('g', { strokeLinejoin: 'round', strokeLinecap: 'round' },
            h('g', { className: 'fish-pay-tail' },
              h('path', { d: 'M48 76C32 59 16 49 8 58c-6 7 3 19 13 23C9 87 8 99 16 102c12 4 27-8 37-20Z',
                fill: paint('fin'), stroke: '#983d60', strokeWidth: 2.4 }),
              h('path', { d: 'M17 64c12 3 21 10 27 15m-23 15c9-3 17-8 23-14',
                fill: 'none', stroke: '#ffe8ba', strokeWidth: 2, opacity: .65 })),
            h('path', { d: 'M48 66c3-13 9-25 19-28 5 3 6 9 4 16M70 101c2 9 7 13 15 14 7 0 9-6 12-10',
              fill: paint('fin'), stroke: '#a94a60', strokeWidth: 2.2 }),
            h('path', { className: 'fish-pay-body',
              d: 'M42 78c0-24 26-44 54-43 25 1 43 15 45 39 2 24-17 36-49 36-28 0-50-10-50-32Z',
              fill: paint('belly'), stroke: '#9e4852', strokeWidth: 2.7 }),
            h('path', { d: 'M48 86c8 16 26 21 46 21 19 0 34-5 42-17-4 13-22 19-44 19-23 0-39-7-44-23Z',
              fill: '#db5765', opacity: .52 }),
            h('path', { d: 'M54 65c6-10 17-17 27-20m6-2 4-.5',
              fill: 'none', stroke: '#fffbd6', strokeWidth: 3.1, opacity: .75 }),
            h('path', { d: 'M63 68q5-4 10 0m-16 8q4-3 8 0m14-13q4-4 9-1',
              fill: 'none', stroke: '#d97558', strokeWidth: 1.7, opacity: .42 }),
            h('g', { className: 'fish-pay-flipper' },
              h('path', { d: 'M83 81c-5 11-18 17-23 11-5-6 8-14 19-16 4 0 6 2 4 5Z',
                fill: paint('fin'), stroke: '#bc5463', strokeWidth: 1.7 }),
              h('path', { d: 'M64 88q7-6 14-8', fill: 'none', stroke: '#ffdbad', strokeWidth: 1.7 })),
            h('g', { className: 'fish-pay-eye' },
              h('ellipse', { cx: 108, cy: 71.5, rx: 10, ry: 12, fill: '#fff4da' }),
              h('ellipse', { cx: 110, cy: 72.5, rx: 7, ry: 9, fill: '#352033' }),
              h('circle', { cx: 112, cy: 69, r: 2.5, fill: '#fffbed' }),
              h('circle', { cx: 107, cy: 76, r: 1.1, fill: '#c88495' })),
            h('path', { d: 'M103 55q6-3 11 1m7 21q6 5 11 0',
              fill: 'none', stroke: '#9e4852', strokeWidth: 2.1 }),
            h('ellipse', { cx: 100, cy: 86, rx: 8.5, ry: 4.5, fill: '#ec667a', opacity: .64 }),
            h('g', { className: 'fish-pay-hat' },
              night && h('g', { fill: '#ffc972', stroke: '#76518e', strokeWidth: 1.5 },
              h('path', { d: 'M82 20 73 5Q72 2 77 4L95 14ZM104 17 115 3Q118 1 117 6L114 25Z' })),
              h('path', { d: 'M68 41c-2-13 6-25 20-29 15-4 30 5 33 20l-1 6Z',
                fill: paint('hat'), stroke: '#aa5837', strokeWidth: 2.4 }),
              h('path', { d: 'M86 34c-1-11 4-19 10-22m8 21c1-9-1-16-5-21',
                fill: 'none', stroke: '#ffe99a', strokeWidth: 2.8, opacity: .87 }),
              h('path', { d: 'M65 40c12-4 38-10 60-8 5 0 7 3 6 6-2 4-12 5-27 7-17 2-34 5-40 2-4-2-3-5 1-7Z',
                fill: paint('hat'), stroke: '#aa5837', strokeWidth: 2.3 }),
              night && h('path', { d: 'm101 16 1.7 4.1 4.5.4-3.4 2.9 1.1 4.3-3.9-2.3-3.8 2.3 1-4.3-3.4-2.9 4.5-.4Z', fill: '#fff6a5' }),
              h('path', { d: 'M69 42c9-3 18-4 25-5', fill: 'none', stroke: '#fff3b1', strokeWidth: 2 })))));
    }

    const fishReactions = {
      pet: [
        '鱼生第一次被选中，居然是单选题。',
        '存档点到了。刚才那句尴尬的话可以读档。',
        '谁把我的工帽画进立绘了？睡衣版呢？',
        '鱼鳍这么短，居然也能接到联机邀请。',
        '刚才路过的那个泡泡，是我的替身。',
        '鱼塘开麦。喂？怎么全是我自己的咕噜声。',
        '这段等加载的时间，片头曲都唱到副歌了。',
        '本集经费全花在你刚点的那朵烟花上了。',
        '导演，说好给我特写，怎么只拍到肚皮？',
        '魔法少女变身！等下，工牌忘摘了。',
        '给尾巴画了条速度线。看起来下班快多了。',
        '片尾名单就俩人。你负责点，我负责演。',
        '这段能重来吗？我刚才只摆出了半个帅脸。',
        '耳机漏音了？没事，我只会跟着低音摆尾。',
        '我在水底捡到一拍。谁的歌刚才慢了？',
        '你说去看海。我打开鱼缸盖，算露天场。',
        '今日隐藏掉落：工帽里最后一片虾饼。',
        '刚才谁点的暴击？头顶那颗星还没掉下来。',
        '好消息，钓到宝箱。坏消息，里面是我。',
        '队伍缺奶妈吗？我会给泡面加奶酪。',
        '这把我打辅助。你走神，我放风。',
        '面前两个按钮。我赌你还会点鱼。',
        '潜行大成功。除了你，整间屋没人发现我。',
        '鱼塘频道：那颗金泡泡谁捡了？分我瞅眼。',
        '复活点怎么又在工位。地图是不是画错了？',
        '过场动画跳不了？那我给你游个倍速的。',
        '刚把工牌翻过来，背面写着路人甲。',
        '你来得正好，帮我看看刘海是不是分叉了。',
        '水草借我当围巾，开春再还它。',
        '这是什么绝美侧脸。哦，是水壶里的倒影。',
        '今天的穿搭叫奶油橘。胡萝卜听了很紧张。',
        '摆个拍立得姿势。三、二……你点早啦。',
        '我的痛包只挂一粒鱼粮，饿了直接拆周边。',
        '小鱼巡演首站：你的鼠标垫。前排还空着。',
        '弹幕少刷点哈哈哈，我在缸里笑得漏气。',
        '这口鱼粮有锅气。哦，是工位风扇吹热的。',
        '不许截我闭眼。刚那张……发我一份。',
        '鱼在假装忙。麻烦把水草递过来当文件。',
        '下午三点的太阳，把我晒成一块橘子糖。',
        '鱼缸也有物业吗？我的气泡电梯又坏了。',
        '同事问我在哪层。我说在千层蛋糕的奶油层。',
        '刚想叹气，嘴里冒了颗爱心。怪尴尬的。',
        '申请把这三秒剪下来，塞进周一当糖吃。',
        '等等，先把下巴松一松。我替你咬这口空气。',
        '鱼缸给你留了个靠窗位。窗外是你的桌面。',
        '今天不想接话也行。咱俩并排吐泡泡。',
        '不太想营业。把帽檐压低一点，偷偷陪你。',
        '你慢慢来，我游两圈还是这个坐标。',
        '刚刚顺着你的手指游，差点进了回收站。',
        '我把今天最好看的一片鳞翻给你了。就一秒。',
        '借你一小截尾风，回去点那个难点的按钮。',
        '散场别急着走，鱼还有一个彩蛋没游完。',
      ],
      feed: [
        '这颗鱼粮，我替你吃了。',
        '嚼嚼嚼。刚刚说到哪了？',
        '收到加餐。鱼宣布今天伙食不错。',
        '嘴上说不要，腮帮子先答应了。',
        '这一颗好脆。能给打饭师傅加根鱼鳍吗？',
        '我咬一小口。诶，怎么没了？',
        '手里的那颗，鱼看见了。',
        '请问是上班口味，还是下班口味？',
        '别记账。鱼今天已经努力摆尾了。',
        '等我嚼完。这个泡泡带饼干味。',
        '加餐到手，今天的火气消了一半。',
        '鱼嘴太小。这么好吃得分两口。',
      ],
    };
    const feedKey = id + ':daily-feed';
    const cacheKey = id + ':daily-cache';
    const skinKey = id + ':skin';
    const feedUrl = 'https://raw.githubusercontent.com/egg2023001-cmd/dsh-fish-pay-counter/main/community/lines.json';

    function readPreference(key) {
      try { return window.localStorage.getItem(key); } catch { return null; }
    }

    function storePreference(key, value) {
      try { window.localStorage.setItem(key, value); } catch { /* Available for this session. */ }
    }

    function cleanEditions(input) {
      if (!Array.isArray(input)) return [];
      return input.slice(-90).filter(issue => issue && /^\d{4}-\d{2}-\d{2}$/.test(issue.day)
        && Array.isArray(issue.lines) && issue.lines.length > 0 && issue.lines.length <= 6
        && issue.lines.every(line => typeof line === 'string' && line.trim() === line
          && line.length > 0 && [...line].length <= 32 && !/[<>\r\n]/u.test(line)));
    }

    function cachedEditions() {
      try { return cleanEditions(JSON.parse(readPreference(cacheKey))); } catch { return []; }
    }

    function shuffled(lines) {
      const deck = [...new Set(lines)];
      for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
      }
      return deck;
    }

    const fireworkSparks = [
      [-122, -33, '#f29451'], [-92, -55, '#c578cf'], [-48, -62, '#f4bf45'],
      [-5, -51, '#67c5b0'], [49, -62, '#f17fa0'], [97, -45, '#a08ae6'],
      [124, -22, '#f5ab55'], [103, 28, '#55b9a3'], [56, 39, '#ee86b5'],
      [4, 37, '#ebaa54'], [-54, 39, '#9c87e8'], [-108, 26, '#ed79a0'],
    ];
    const bubbleSeconds = 15;
    const bubbleSpots = [[.22, .28], [.50, .28], [.78, .28], [.22, .66], [.50, .66], [.78, .66]];

    function bubblePosition(spot) {
      const [x, y] = bubbleSpots[spot];
      return { left: window.innerWidth * x, top: window.innerHeight * y };
    }

    function nextBubbleSpot(position, previous, chance) {
      const otherSpots = bubbleSpots.map((_, index) => index).filter(index => index !== previous);
      const clear = otherSpots.filter(index => {
        const { left, top } = bubblePosition(index);
        return left < position.x - 32 || left > position.x + widgetWidth + 32
          || top < position.y - 42 || top > position.y + widgetHeight + 32;
      });
      const choices = clear.length > 0 ? clear : otherSpots;
      return choices[Math.floor(chance * choices.length)];
    }

    function CounterPanel() {
      const [data, setData] = useState(readState);
      const [draft, setDraft] = useState(() => data.settings ?? defaults);
      const [edit, setEdit] = useState(!data.settings);
      const [error, setError] = useState('');
      const [time, setTime] = useClock();
      const result = data.settings ? calculate(data.settings, time, data.pause) : null;

      function persist(next) {
        try {
          window.localStorage.setItem(storageKey, JSON.stringify(next));
          setData(next);
          window.dispatchEvent(new Event(changed));
          setError('');
          return true;
        } catch {
          setError('工作台暂时无法保存本地设置。');
          return false;
        }
      }

      function save(event) {
        event.preventDefault();
        const settings = { ...draft, pay: draft.pay.trim(), days: draft.days.trim() };
        const invalid = validate(settings);
        if (invalid) {
          setError(invalid);
          return;
        }
        if (persist({ ...data, settings })) setEdit(false);
      }

      function togglePause() {
        const clock = currentTime(new Date());
        const pause = pauseForDay(data.pause, clock.date);
        const next = pause.since === null
          ? { ...pause, since: clock.second }
          : { ...pause, since: null, spans: [...pause.spans, [pause.since, clock.second]] };
        if (persist({ ...data, pause: next })) setTime(clock);
      }

      function field(label, key, props) {
        return h('label', { className: 'fish-pay-field' },
          label,
          h('input', { ...props, required: true, value: draft[key],
            onChange: (event) => setDraft({ ...draft, [key]: event.target.value }) }));
      }

      return h('div', { className: 'fish-pay-panel' },
        h('div', { className: 'fish-pay-heading' },
          h('h2', null, title),
          h('p', { className: 'fish-pay-muted fish-pay-subtitle' }, '一条陪你等 AI 的上班鱼')),
        result && h('section', { className: 'fish-pay-total', 'aria-label': '今日工资估算' },
          h('span', { className: 'fish-pay-muted' }, result.state === 'finished' ? '今日结算估算' : '今日累计估算'),
          h('div', { className: 'fish-pay-number' }, currency.format(result.amount)),
          h('p', null, messages[result.state]),
          h('div', { className: 'fish-pay-muted' }, '每秒 ¥' + result.perSecond.toFixed(4))),
        !result && h('p', { className: 'fish-pay-onboard' }, '给鱼填个班表，它就开始帮你记今天的工资估算。'),
        !edit && h('div', { className: 'fish-pay-actions' },
          h('button', { type: 'button', onClick: togglePause, disabled: !['working', 'paused'].includes(result.state) },
            result.state === 'paused' ? '继续计数' : '暂停计数'),
          h('button', { type: 'button', onClick: () => { setDraft(data.settings); setEdit(true); } }, '设置')),
        edit && h('form', { className: 'fish-pay-form', onSubmit: save, autoComplete: 'off' },
          field('月薪（¥）', 'pay', { type: 'text', inputMode: 'decimal', placeholder: '只保存在这台设备' }),
          field('每月计薪日', 'days', { type: 'number', min: 1, max: 31 }),
          h('div', { className: 'fish-pay-shift' },
            field('上班', 'start', { type: 'time' }),
            field('下班', 'end', { type: 'time' })),
          h('label', { className: 'fish-pay-lunch' },
            h('input', { type: 'checkbox', checked: draft.lunch,
              onChange: (event) => setDraft({ ...draft, lunch: event.target.checked }) }),
            '午休 12:00–13:00 暂停'),
          h('div', { className: 'fish-pay-actions' },
            h('button', { type: 'submit', className: 'fish-pay-primary' }, '保存'),
            data.settings && h('button', { type: 'button', onClick: () => { setError(''); setEdit(false); } }, '取消'))),
        error && h('p', { role: 'alert', className: 'fish-pay-error' }, error),
        h('p', { className: 'fish-pay-muted' }, '按上海时间和周一至周五估算。设置仅保存在此工作台。'));
    }

    function place(position, width = widgetWidth, height = widgetHeight) {
      const edge = 8;
      const maxX = Math.max(edge, window.innerWidth - width - edge);
      const maxY = Math.max(edge, window.innerHeight - height - edge);
      const x = Number.isFinite(position?.x) ? position.x : maxX - 210;
      const y = Number.isFinite(position?.y) ? position.y : maxY - 220;
      return {
        x: Math.max(edge, Math.min(maxX, x)),
        y: Math.max(edge, Math.min(maxY, y)),
      };
    }

    function initialPosition() {
      try {
        return place(JSON.parse(window.localStorage.getItem(positionKey) ?? 'null'));
      } catch {
        return place(null);
      }
    }

    function FloatingCounter({ open }) {
      const [data, setData] = useState(readState);
      const [time, setTime] = useClock();
      const [position, setPosition] = useState(initialPosition);
      const [dragging, setDragging] = useState(false);
      const [menu, setMenu] = useState(false);
      const [reaction, setReaction] = useState(null);
      const [round, setRound] = useState(null);
      const widget = useRef(null);
      const button = useRef(null);
      const menuItems = useRef(null);
      const target = useRef(null);
      const scoreButton = useRef(null);
      const [daily, setDaily] = useState(() => readPreference(feedKey) === 'on');
      const [night, setNight] = useState(() => readPreference(skinKey) === 'night');
      const [editions, setEditions] = useState(cachedEditions);
      const deck = useRef({ key: null, lines: [], last: null });
      const reactions = useRef({ pet: 0, feed: 0 });
      const drag = useRef(null);
      const skipClick = useRef(false);
      const active = (round?.seconds ?? 0) > 0;
      const deadline = active ? round.deadline : null;
      const gold = active && (round.hits + 1) % 4 === 0;
      const result = data.settings ? calculate(data.settings, time, data.pause) : null;
      const bubble = useYuanBubble(result, time);
      const status = result ? {
        working: '上班摸鱼中', paused: '已暂停', lunch: '午休扒饭',
        early: '还没打卡', finished: '今日收工', weekend: '周末放鱼',
      }[result.state] : '点我填班表';
      const note = round && !active && (round.score
        ? '拿下 ' + round.score + ' 分！鱼给你鼓掌。' : '泡泡都溜了，下次再抓。');
      const flareWidth = Math.max(1, Math.min(300, window.innerWidth - 20));
      const flareLeft = Math.max(10, Math.min(window.innerWidth - flareWidth - 10,
        position.x + widgetWidth / 2 - flareWidth / 2)) - position.x;
      const preferredFlareTop = position.y >= 118
        ? position.y - (active ? 126 : 82)
        : position.y + widgetHeight + (active ? 38 : 6);
      const flareTop = Math.max(8, Math.min(window.innerHeight - 86, preferredFlareTop)) - position.y;
      const flyoutWidth = 152;
      const flyoutHeight = 166;
      const flyoutLeft = position.x + widgetWidth + flyoutWidth + 8 <= window.innerWidth
        ? widgetWidth : position.x >= flyoutWidth + 12 ? -flyoutWidth - 4 : 0;
      const flyoutOffset = flyoutLeft !== 0 ? 24 : position.y >= flyoutHeight + 8 ? -flyoutHeight : widgetHeight + 5;
      const flyoutTop = Math.max(8, Math.min(window.innerHeight - flyoutHeight - 8, position.y + flyoutOffset)) - position.y;

      useEffect(() => {
        const read = () => {
          setData(readState());
          setTime(currentTime(new Date()));
        };
        const resize = () => setPosition((current) => place(current, button.current?.offsetWidth, button.current?.offsetHeight));
        window.addEventListener(changed, read);
        window.addEventListener('storage', read);
        window.addEventListener('resize', resize);
        return () => {
          window.removeEventListener(changed, read);
          window.removeEventListener('storage', read);
          window.removeEventListener('resize', resize);
        };
      }, []);

      useEffect(() => {
        if (!menu) return;
        const closeOutside = (event) => {
          if (!widget.current?.contains(event.target)) setMenu(false);
        };
        menuItems.current?.querySelector('button')?.focus();
        window.addEventListener('pointerdown', closeOutside, true);
        return () => window.removeEventListener('pointerdown', closeOutside, true);
      }, [menu]);

      useEffect(() => {
        if (!reaction) return;
        const timer = window.setTimeout(() => setReaction(null), 5200);
        return () => window.clearTimeout(timer);
      }, [reaction]);

      useEffect(() => {
        if (deadline === null) return;
        const timer = window.setInterval(() => {
          const seconds = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
          if (seconds === 0 && [target.current, scoreButton.current].includes(document.activeElement)) {
            button.current?.focus();
          }
          setRound(current => current?.deadline === deadline && current.seconds !== seconds
            ? { ...current, seconds } : current);
        }, 100);
        return () => window.clearInterval(timer);
      }, [deadline]);

      useEffect(() => {
        if (!round || active) return;
        const timer = window.setTimeout(() => setRound(null), 4200);
        return () => window.clearTimeout(timer);
      }, [round, active]);

      useEffect(() => {
        if (!daily) return;
        const controller = new AbortController();
        let busy = false;
        async function refresh() {
          if (busy) return;
          busy = true;
          const timeout = AbortSignal.timeout(12000);
          try {
            const response = await fetch(feedUrl, { credentials: 'omit', referrerPolicy: 'no-referrer',
              cache: 'no-cache', signal: AbortSignal.any([controller.signal, timeout]) });
            if (!response.ok) return;
            const latest = cleanEditions(await response.json());
            if (latest.length && !controller.signal.aborted) {
              storePreference(cacheKey, JSON.stringify(latest));
              setEditions(latest);
            }
          } catch { /* The cached edition and offline deck still work. */ }
          finally { busy = false; }
        }
        refresh();
        const interval = window.setInterval(refresh, 60 * 60 * 1000);
        return () => { controller.abort(); window.clearInterval(interval); };
      }, [daily]);

      function nextQuip() {
        const issues = daily ? editions : [];
        const key = issues.at(-1)?.day ?? 'offline';
        const current = deck.current;
        if (current.key !== key || !current.lines.length) {
          const fresh = shuffled(issues.at(-1)?.lines ?? []);
          const pool = shuffled([...fishReactions.pet, ...issues.flatMap(issue => issue.lines)]);
          const list = current.key !== key ? [...fresh, ...pool.filter(line => !fresh.includes(line))] : pool;
          if (list.length > 1 && list[0] === current.last) [list[0], list[1]] = [list[1], list[0]];
          current.lines = list;
          current.key = key;
        }
        current.last = current.lines.shift();
        return current.last;
      }

      function react(type) {
        const count = reactions.current[type]++;
        const lines = fishReactions[type];
        if (round && !active) setRound(null);
        setReaction({ type, key: type + count, text: type === 'pet' ? nextQuip() : lines[count % lines.length] });
      }

      function stopGame() {
        setReaction(null);
        setRound(current => ({ ...current, seconds: 0 }));
        button.current?.focus();
      }

      function toggleGame() {
        setMenu(false);
        if (active) {
          stopGame();
          return;
        }
        setReaction(null);
        setRound({ deadline: Date.now() + bubbleSeconds * 1000, seconds: bubbleSeconds,
          hits: 0, score: 0, spot: nextBubbleSpot(position, -1, Math.random()), poppedSpot: null });
        button.current?.focus();
      }

      function pop() {
        const now = Date.now();
        const chance = Math.random();
        setRound(current => {
          if (!current || current.seconds === 0 || current.deadline <= now) return current;
          const hits = current.hits + 1;
          return { ...current, hits, score: current.score + (hits % 4 === 0 ? 2 : 1),
            poppedSpot: current.spot, spot: nextBubbleSpot(position, current.spot, chance) };
        });
      }

      function openPanel() {
        setMenu(false);
        open();
      }

      function onFishKeys(event) {
        if (event.key === 'Escape' && (menu || active)) {
          event.preventDefault();
          event.stopPropagation();
          if (menu) {
            setMenu(false);
            button.current?.focus();
          } else stopGame();
        } else if (event.target === button.current &&
          (event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10'))) {
          event.preventDefault();
          setMenu(value => !value);
        }
      }

      function start(event) {
        if (event.button !== 0 || drag.current) return;
        const target = event.currentTarget;
        const rect = target.getBoundingClientRect();
        skipClick.current = false;
        drag.current = {
          id: event.pointerId, startX: event.clientX, startY: event.clientY,
          x: rect.x, y: rect.y, width: rect.width, height: rect.height, moved: false, last: null,
        };
        target.setPointerCapture(event.pointerId);
      }

      function move(event) {
        const gesture = drag.current;
        if (gesture?.id !== event.pointerId) return;
        const dx = event.clientX - gesture.startX;
        const dy = event.clientY - gesture.startY;
        if (!gesture.moved && Math.hypot(dx, dy) < 5) return;
        if (!gesture.moved) {
          setDragging(true);
          setMenu(false);
        }
        gesture.moved = true;
        gesture.last = place({ x: gesture.x + dx, y: gesture.y + dy }, gesture.width, gesture.height);
        setPosition(gesture.last);
      }

      function finish(event) {
        const gesture = drag.current;
        if (gesture?.id !== event.pointerId) return;
        drag.current = null;
        skipClick.current = gesture.moved;
        setDragging(false);
        if (gesture.last) {
          try {
            window.localStorage.setItem(positionKey, JSON.stringify(gesture.last));
          } catch { /* The current position remains usable. */ }
        }
      }

      function click(event) {
        if (skipClick.current && event.detail > 0) {
          skipClick.current = false;
          return;
        }
        setMenu(false);
        react('pet');
      }

      return h(Fragment, null,
        h('div', {
          ref: widget,
          className: 'fish-pay-widget' + (dragging ? ' fish-pay-dragging' : ''),
          'data-fish-state': result?.state ?? 'early',
          style: { left: position.x, top: position.y },
          onKeyDown: onFishKeys,
        },
        h('button', {
          ref: button, type: 'button', className: 'fish-pay-fish-button',
          title: '点我摸鱼 · 右键玩 · 按住拖动', 'aria-label': '摸摸鱼', 'aria-expanded': menu,
          onPointerDown: start, onPointerMove: move, onPointerUp: finish,
          onPointerCancel: finish, onLostPointerCapture: finish, onClick: click,
          onContextMenu: (event) => { event.preventDefault(); setMenu(value => !value); },
        }, h(FishIllustration, { night })),
        bubble !== null && h('span', { className: 'fish-pay-burst', key: bubble.key, 'aria-hidden': true },
          h('span', { className: 'fish-pay-sparks' }),
          h('span', { className: 'fish-pay-bubble' }, '+¥' + bubble.delta)),
        h('button', { type: 'button', className: 'fish-pay-readout', title: '打开工资面板',
          'aria-label': title + '，打开工资面板', onClick: openPanel },
          h('span', { className: 'fish-pay-widget-value' }, result ? currency.format(result.amount) : title),
          h('span', { className: 'fish-pay-widget-state' }, status)),
        reaction && h('span', { key: reaction.key, 'aria-hidden': true,
          className: reaction.type === 'pet' ? 'fish-pay-heart' : 'fish-pay-food' },
          reaction.type === 'pet' ? '♥' : '✦'),
        reaction && h('div', {
          key: 'firework-' + reaction.key, className: 'fish-pay-flare',
          style: { top: flareTop, left: flareLeft, width: flareWidth },
        },
        h('div', { className: 'fish-pay-firework', 'aria-hidden': true },
          fireworkSparks.map(([x, y, color], index) => h('span', { key: index, style: {
            '--flare-x': x + 'px', '--flare-y': y + 'px', '--flare-color': color,
            '--flare-angle': Math.atan2(y, x) + 'rad', '--flare-delay': (index % 3) * 45 + 'ms',
          } }))),
        h('span', { className: 'fish-pay-flare-line', role: 'status' }, reaction.text)),
        (note || active) && h('div', { className: 'fish-pay-float-notes',
          style: position.y >= 70 ? { bottom: widgetHeight + 3 } : { top: widgetHeight + 3 } },
          active && h('button', { type: 'button', className: 'fish-pay-float-chip fish-pay-score',
            ref: scoreButton, title: '结束这局', 'aria-label': '结束这局', onClick: stopGame },
            round.seconds + ' 秒 · ' + round.score + ' 分', h('span', { 'aria-hidden': true }, '×')),
          note && h('span', { className: 'fish-pay-float-chip fish-pay-note', role: 'status' }, note)),
        menu && h('div', { ref: menuItems, className: 'fish-pay-flyout', role: 'group', 'aria-label': '小鱼互动',
          style: { left: flyoutLeft, top: flyoutTop } },
          h('button', { type: 'button', className: 'fish-pay-float-chip', onClick: () => {
            setMenu(false);
            button.current?.focus();
            react('feed');
          } }, '✦ 投喂鱼粮'),
          h('button', { type: 'button', className: 'fish-pay-float-chip', onClick: toggleGame },
            active ? '× 结束这局' : '○ 戳泡泡'),
          h('button', { type: 'button', className: 'fish-pay-float-chip', onClick: () => {
            setNight(!night);
            storePreference(skinKey, night ? 'gold' : 'night');
            setMenu(false);
            button.current?.focus();
          } }, night ? '换装 · 橘子工头' : '换装 · 星夜巡游'),
          h('button', { type: 'button', className: 'fish-pay-float-chip', 'aria-pressed': daily,
            title: '从 GitHub 读取公开台词，工资和班表只在本机', onClick: () => {
              setDaily(!daily);
              storePreference(feedKey, daily ? 'off' : 'on');
              setMenu(false);
              button.current?.focus();
            } }, daily ? '关闭每日新梗' : '订阅每日新梗'),
          h('button', { type: 'button', className: 'fish-pay-float-chip', onClick: openPanel }, '工资面板'))),
        active && h('div', { className: 'fish-pay-air-game' },
          round.poppedSpot !== null && h('span', { key: round.hits, className: 'fish-pay-pop',
            style: bubblePosition(round.poppedSpot), 'aria-hidden': true }, round.hits % 4 === 0 ? '+2' : '+1'),
          h('button', { type: 'button', key: 'target', ref: target,
            className: 'fish-pay-target' + (gold ? ' fish-pay-target-gold' : ''),
            style: bubblePosition(round.spot), 'aria-label': gold ? '戳金泡泡，加两分' : '戳泡泡，加一分',
            onClick: pop, onKeyDown: (event) => {
              if (event.repeat && (event.key === 'Enter' || event.key === ' ')) event.preventDefault();
              onFishKeys(event);
            } }, gold ? '★' : null)));
    }

    const css = `
    .fish-pay-panel, .fish-pay-widget {
      --fish-ink: light-dark(#2f1f35,#fff0d5);
      --fish-paper: light-dark(#fff2d9,#30263c);
      --fish-soft: light-dark(#fff9ed,#292134);
      --fish-rule: light-dark(#c4a184,#695574);
      --fish-muted: light-dark(#665164,#d7bdd6);
      color: var(--fish-ink);
      font-family: ui-rounded, "PingFang SC", system-ui, sans-serif;
    }
    .fish-pay-night .fish-pay-swim { filter: hue-rotate(218deg) saturate(.88); }
    .fish-pay-panel { margin: 0 auto; max-width: 30rem; padding: 16px; }
    .fish-pay-heading { margin-bottom: 14px; }
    .fish-pay-heading h2 { margin: 0; font-size: 21px; line-height: 1.18; font-weight: 820; letter-spacing: -.04em; }
    .fish-pay-subtitle { margin: 4px 0 0; }
    .fish-pay-heart, .fish-pay-food {
      position: absolute; z-index: 2; pointer-events: none; font: 800 23px/1 system-ui;
    }
    .fish-pay-heart {
      left: 54px; top: 34px; color: #ed618a; text-shadow: 1px 1px #5a2a44;
      animation: fish-pay-heart-rise .8s ease-out both;
    }
    .fish-pay-food {
      left: 131px; top: 79px; color: #ffd367; text-shadow: 0 1px #73432c;
      animation: fish-pay-feed .65s ease-in both;
    }
    .fish-pay-flyout, .fish-pay-float-notes {
      position: absolute; display: grid; justify-items: start; gap: 4px; pointer-events: none;
    }
    .fish-pay-flyout { width: 152px; z-index: 3; }
    .fish-pay-float-notes { inset-inline: 0; }
    .fish-pay-float-chip {
      display: inline-flex; align-items: center; gap: 7px; max-width: 100%;
      padding: 4px 9px; border: 1px solid var(--fish-rule); border-radius: 999px;
      color: var(--fish-ink); background: var(--fish-paper);
      box-shadow: 0 2px 7px #35233830; font: 650 12px/1.45 system-ui,sans-serif;
    }
    button.fish-pay-float-chip, .fish-pay-readout { pointer-events: auto; cursor: pointer; appearance: none; }
    button.fish-pay-float-chip:hover { background: light-dark(#ffe3c3,#513747); }
    .fish-pay-score { font-variant-numeric: tabular-nums; white-space: nowrap; }
    .fish-pay-score span { opacity: .7; }
    .fish-pay-note { box-sizing: border-box; background: light-dark(#fff5f5,#382638); }
    .fish-pay-flare { position: absolute; z-index: 4; display: grid; justify-items: center; pointer-events: none; }
    .fish-pay-flare-line {
      z-index: 1; box-sizing: border-box; max-width: 100%; padding: 7px 14px 8px; border-radius: 24px;
      color: light-dark(#502337,#fff0e6); text-align: center; overflow-wrap: anywhere;
      background: light-dark(linear-gradient(130deg,#fff7e1,#ffe9f3),linear-gradient(130deg,#40253a,#3b2c51));
      box-shadow: 0 4px 19px #c275a249, 0 0 6px #ffeadc54;
      font: 820 clamp(18px,3vw,22px)/1.36 ui-rounded,"PingFang SC",system-ui,sans-serif;
      text-wrap: balance; animation: fish-pay-flare-in .74s cubic-bezier(.17,.72,.28,1) both;
    }
    .fish-pay-firework { position: absolute; left: 50%; top: 50%; }
    .fish-pay-firework::before {
      content: ''; position: absolute; inset: -18px; width: 36px; height: 36px;
      border: 2px solid #f2ac91; border-radius: 50%;
      animation: fish-pay-flare-ring .76s ease-out both;
    }
    .fish-pay-firework span {
      position: absolute; width: 9px; height: 9px; background: var(--flare-color); border-radius: 50%;
      animation: fish-pay-firework .92s cubic-bezier(.12,.6,.29,1) var(--flare-delay) both;
    }
    .fish-pay-firework span:nth-child(3n + 1) {
      width: 16px; height: 16px;
      clip-path: polygon(50% 0%,61% 37%,100% 50%,61% 63%,50% 100%,39% 63%,0% 50%,39% 37%);
    }
    .fish-pay-firework span:nth-child(3n + 2) { width: 16px; height: 5px; border-radius: 9px; }
    @keyframes fish-pay-flare-in {
      0% { opacity: 0; transform: translateY(19px) scale(.25); }
      39% { opacity: 1; transform: translateY(-6px) scale(1.08); }
      72% { transform: translateY(1px) scale(.99); }
      100% { opacity: 1; transform: none; }
    }
    @keyframes fish-pay-firework {
      0% { opacity: 0; transform: rotate(var(--flare-angle)) scale(.2); }
      21%, 56% { opacity: 1; }
      100% { opacity: 0; transform: translate(var(--flare-x),var(--flare-y)) rotate(var(--flare-angle)) scale(.5); }
    }
    @keyframes fish-pay-flare-ring {
      from { opacity: .95; transform: scale(.35); }
      to { opacity: 0; transform: scale(4.5); }
    }
    .fish-pay-air-game { position: fixed; inset: 0; z-index: 42; pointer-events: none; }
    .fish-pay-target, .fish-pay-pop {
      position: absolute; translate: -50% -50%; box-sizing: border-box; width: 44px; height: 44px;
      display: grid; place-items: center; border-radius: 50%;
    }
    .fish-pay-target {
      z-index: 1; padding: 0; pointer-events: auto; cursor: pointer; appearance: none;
      border: 1px solid #8f83cb; color: #55332e; font: 700 18px/1 system-ui;
      background: radial-gradient(circle at 31% 27%,#fffdfa 0 7%,transparent 10%),
        radial-gradient(circle at 38% 28%,#d7fbff,#a3bee7 49%,#8983da 73%,#d3a7e5);
      box-shadow: 0 2px 8px #1f182e50, inset -2px -3px 7px #b5adf5;
      animation: fish-pay-target-float 1.7s ease-in-out infinite alternate;
    }
    .fish-pay-target:hover { animation-play-state: paused; }
    .fish-pay-target-gold {
      border-color: #c98134; background: radial-gradient(circle at 35% 24%,#ffeaa0,#f8af55 70%,#d97c48);
      box-shadow: 0 0 9px #ffdd6f80, inset 0 -3px 4px #ed8c55;
    }
    .fish-pay-target:focus-visible, .fish-pay-float-chip:focus-visible, .fish-pay-readout:focus-visible {
      outline: 2px solid light-dark(#8b3255,#ffb4ce); outline-offset: 2px;
    }
    .fish-pay-pop {
      border: 1px dashed #b878a9; color: light-dark(#843569,#ffe4ac); font: 800 16px/1 system-ui;
      animation: fish-pay-pop .42s ease-out both;
    }
    .fish-pay-total {
      padding: 14px 14px 12px; border: 1px solid var(--fish-rule); border-radius: 11px;
      margin-bottom: 13px; background: var(--fish-paper); box-shadow: 0 3px 0 var(--fish-rule);
    }
    .fish-pay-total > span:first-child { font-weight: 720; }
    .fish-pay-number {
      font: 800 clamp(26px,9cqi,42px)/1.25 ui-monospace, "SF Mono", monospace;
      letter-spacing: -.065em; font-variant-numeric: tabular-nums; overflow-wrap: anywhere;
    }
    .fish-pay-total p { font-size: 13px; line-height: 1.45; margin: 6px 0 7px; }
    .fish-pay-muted { color: var(--fish-muted); font-size: 12px; line-height: 1.5; }
    .fish-pay-onboard { color: var(--fish-muted); font-size: 13px; line-height: 1.55; margin: 0 0 12px; }
    .fish-pay-form, .fish-pay-field { display: grid; gap: 5px; }
    .fish-pay-field { font-size: 13px; font-weight: 650; }
    .fish-pay-form { gap: 10px; }
    .fish-pay-shift { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 7px; }
    .fish-pay-field input, .fish-pay-actions button {
      min-height: 32px; font: inherit; color: inherit; border: 1px solid var(--fish-rule);
      border-radius: 7px; padding: 5px 8px; background: var(--fish-soft);
    }
    .fish-pay-field input { min-width: 0; }
    .fish-pay-actions { display: flex; flex-wrap: wrap; gap: 7px; align-items: center; font-size: 13px; }
    .fish-pay-actions button { cursor: pointer; font-weight: 650; }
    .fish-pay-actions button:disabled { opacity: .55; cursor: default; }
    .fish-pay-actions .fish-pay-primary { background: #ffc68c; color: #2f1f35; border-color: #b8734b; }
    .fish-pay-lunch { display: flex; gap: 7px; align-items: center; font-size: 13px; }
    .fish-pay-lunch input { accent-color: #a34665; }
    .fish-pay-error { color: light-dark(#9c2418,#ffb2a6); }
    .fish-pay-widget {
      position: fixed; z-index: 42; pointer-events: none; box-sizing: border-box;
      width: ${widgetWidth}px; height: ${widgetHeight}px; user-select: none;
    }
    .fish-pay-fish-button, .fish-pay-free { position: absolute; inset: 0; pointer-events: none; }
    .fish-pay-fish-button {
      padding: 0; border: 0; background: transparent; touch-action: none; cursor: grab; appearance: none;
    }
    .fish-pay-fish-button:focus-visible { outline: 0; }
    .fish-pay-fish-button:focus-visible .fish-pay-swim {
      filter: drop-shadow(0 0 2px #bb5587) drop-shadow(0 0 4px #e48db8);
    }
    .fish-pay-free .fish-pay-body, .fish-pay-free .fish-pay-tail, .fish-pay-free .fish-pay-hat {
      pointer-events: visiblePainted;
    }
    .fish-pay-widget.fish-pay-dragging .fish-pay-fish-button { cursor: grabbing; }
    .fish-pay-widget.fish-pay-dragging .fish-pay-swim { animation-play-state: paused; }
    .fish-pay-air {
      position: absolute; bottom: 2px; border-radius: 50%; border: 1px solid #e6a4ac; background: #ffd9df46;
      opacity: 0; animation: fish-pay-float var(--time) linear infinite var(--delay);
    }
    .fish-pay-air-one { left: 119px; bottom: 42px; width: 5px; height: 5px; --time: 2.8s; --delay: -.5s; --sway: 3px; }
    .fish-pay-air-two { left: 132px; bottom: 51px; width: 3px; height: 3px; --time: 3.4s; --delay: -2s; --sway: -5px; }
    .fish-pay-air-three { left: 113px; bottom: 48px; width: 3px; height: 3px; --time: 4.1s; --delay: -2.6s; --sway: 7px; }
    .fish-pay-swim {
      position: absolute; top: 25px; left: 1px; width: 132px; height: 104px;
      filter: drop-shadow(1px 3px 3px #69334255); animation: fish-pay-swim 3.2s ease-in-out infinite;
    }
    .fish-pay-eye, .fish-pay-tail, .fish-pay-flipper { transform-box: fill-box; }
    .fish-pay-eye { transform-origin: center; animation: fish-pay-blink 5.1s ease-in-out infinite; }
    .fish-pay-flipper { transform-origin: 86% 25%; animation: fish-pay-flap 820ms ease-in-out infinite alternate; }
    .fish-pay-tail { transform-origin: 90% 50%; animation: fish-pay-tail 640ms ease-in-out infinite alternate; }
    .fish-pay-widget[data-fish-state="paused"] .fish-pay-swim,
    .fish-pay-widget[data-fish-state="lunch"] .fish-pay-swim,
    .fish-pay-widget[data-fish-state="finished"] .fish-pay-swim { animation-duration: 7s; }
    .fish-pay-widget[data-fish-state="paused"] .fish-pay-tail,
    .fish-pay-widget[data-fish-state="lunch"] .fish-pay-tail,
    .fish-pay-widget[data-fish-state="finished"] .fish-pay-tail { animation-duration: 1.4s; }
    .fish-pay-burst { position: absolute; inset: 0; pointer-events: none; }
    .fish-pay-bubble { position: absolute; left: 5px; top: 24px; z-index: 1; border-radius: 8px;
      padding: 2px 6px; color: #422331; background: #ffd27c; border: 1px solid #b67654;
      box-shadow: 0 1px 9px #e9a53468; font: 750 11px/16px system-ui,sans-serif;
      animation: fish-pay-coin-rise 920ms cubic-bezier(.17,.77,.29,1) both; }
    .fish-pay-sparks { position: absolute; left: 22px; top: 26px; width: 3px; height: 3px; border-radius: 50%;
      background: #fff0b4; box-shadow: 11px 6px #f6be4e,-9px 0 #47d7a9,0 -7px #fff4d0;
      animation: fish-pay-spark 760ms ease-out both; }
    .fish-pay-readout {
      position: absolute; top: 1px; right: 0; display: grid; gap: 1px; min-width: 57px; max-width: 126px;
      box-sizing: border-box; padding: 5px 9px 6px; border: 1px solid var(--fish-rule);
      border-radius: 22px; color: var(--fish-ink); background: var(--fish-paper);
      box-shadow: 0 3px 9px #2f1f3523; text-align: center;
    }
    .fish-pay-readout::after {
      content: ''; position: absolute; pointer-events: none; bottom: -6px; left: 14px; width: 8px; height: 8px;
      transform: rotate(45deg); border-right: 1px solid var(--fish-rule); border-bottom: 1px solid var(--fish-rule);
      background: var(--fish-paper);
    }
    .fish-pay-widget-value { overflow: hidden; white-space: nowrap; text-overflow: ellipsis;
      font: 800 15px/1.2 ui-monospace, system-ui; font-variant-numeric: tabular-nums; letter-spacing: -.035em; }
    .fish-pay-widget-state { color: var(--fish-muted); font: 680 11px/1.2 system-ui, sans-serif; }
    @keyframes fish-pay-swim { 0%,100% { transform: translateY(2px) rotate(-3deg); }
      50% { transform: translate(2px, -3px) rotate(3deg); } }
    @keyframes fish-pay-tail { from { transform: rotate(-8deg) scaleX(.88); }
      to { transform: rotate(9deg); } }
    @keyframes fish-pay-blink { 0%,88%,94%,100% { transform: scaleY(1); } 91% { transform: scaleY(.12); } }
    @keyframes fish-pay-flap { from { transform: rotate(3deg); } to { transform: rotate(-16deg); } }
    @keyframes fish-pay-heart-rise {
      0% { opacity: 1; transform: translateY(0) scale(.8); }
      40% { opacity: 1; transform: translateY(-7px) scale(1.1); }
      100% { opacity: 0; transform: translateY(-16px) scale(.9); }
    }
    @keyframes fish-pay-feed {
      0% { opacity: 1; transform: translate(5px,-19px); }
      65% { opacity: 1; transform: translate(-12px,-2px) scale(.8); }
      100% { opacity: 0; transform: translate(-18px,2px) scale(.15); }
    }
    @keyframes fish-pay-target-float { to { transform: translateY(-8px); } }
    @keyframes fish-pay-pop {
      from { opacity: 1; transform: scale(.7); }
      to { opacity: 0; transform: translateY(-8px) scale(1.4); }
    }
    @keyframes fish-pay-float { 0% { opacity: 0; transform: translateY(0) scale(.75); }
      18%,70% { opacity: .8; } 100% { opacity: 0; transform: translate(var(--sway),-38px) scale(1.15); } }
    @keyframes fish-pay-coin-rise { 0% { opacity: 0; transform: translateY(0) scale(.62); }
      20% { opacity: 1; transform: translateY(-11px) scale(1.1); }
      62% { opacity: 1; transform: translateY(-17px) scale(1); }
      100% { opacity: 0; transform: translateY(-25px) scale(.97); } }
    @keyframes fish-pay-spark { from { opacity: 1; transform: translateY(0) scale(.65); }
      to { opacity: 0; transform: translateY(-19px) scale(1.75); } }
    @media (prefers-reduced-motion: reduce) {
      .fish-pay-swim, .fish-pay-tail, .fish-pay-flipper, .fish-pay-eye, .fish-pay-bubble, .fish-pay-target { animation: none; }
      .fish-pay-flare-line { animation: none; }
      .fish-pay-firework, .fish-pay-air, .fish-pay-sparks, .fish-pay-heart, .fish-pay-food, .fish-pay-pop { display: none; }
    }`;

    function apply(ctx) {
      const style = document.createElement('style');
      style.textContent = css;
      document.head.append(style);
      ctx.effect(() => () => style.remove());
      ctx.effect(() => ctx.sidebarRightTabs.register({
        id,
        kind: id,
        priority: 'extension',
        title: () => title,
        guide: [{ id, order: 430, title: () => title, description: () => '领一条上班鱼，等 AI 时看今日工资估算',
          icon: () => h('span', { 'aria-hidden': true }, '🐟') }],
      }));
      ctx.slots.inject('sidebar.right.pane.tab', function* () {
        yield ctx.slots.register({ name: 'sidebar.right.pane.tab', key: id, order: 110 }, CounterPanel);
      });
      ctx.slots.inject('shell.overlay', function* () {
        yield ctx.slots.register({ name: 'shell.overlay', id, order: 105 },
          () => h(FloatingCounter, { open: () => ctx.sidebarRight.openTab(id) }));
      });
    }

    return { name: id, inject: ['slots', 'sidebarRightTabs', 'sidebarRight'], apply };
  },
});
