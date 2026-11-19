window.__ModuleLoader__.load({
  id: 'dsh-fish-pay-counter',

  factory(require) {
    const { createElement: h, useEffect, useRef, useState } = require('react');
    const id = 'dsh-fish-pay-counter';
    const title = '小鱼工资计数器';
    const storageKey = id + ':v1';
    const changed = id + ':changed';
    const positionKey = id + ':position';
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
      working: '钱在涨，鱼在看，谁也别装忙。',
      paused: '鱼歇一会儿，数字先停在这儿。',
      lunch: '鱼去午休了，下午继续涨。',
      early: '鱼还没上班，别替它急。',
      finished: '今天收工。含摸鱼时段，摸鱼不扣钱。',
      weekend: '鱼休班，钱也休班。',
    };

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
          h('span', { className: 'fish-pay-fish', 'aria-hidden': true }, '🐟'),
          h('h2', null, title)),
        result && h('section', { className: 'fish-pay-total', 'aria-label': '今日工资估算' },
          h('span', { className: 'fish-pay-muted' }, result.state === 'finished' ? '今日结算估算' : '今日累计估算'),
          h('div', { className: 'fish-pay-number' }, currency.format(result.amount)),
          h('p', null, messages[result.state]),
          h('div', { className: 'fish-pay-muted' }, '每秒 ¥' + result.perSecond.toFixed(4))),
        !edit && h('div', { className: 'fish-pay-actions' },
          h('button', { type: 'button', onClick: togglePause, disabled: !['working', 'paused'].includes(result.state) },
            result.state === 'paused' ? '继续计数' : '暂停计数'),
          h('button', { type: 'button', onClick: () => { setDraft(data.settings); setEdit(true); } }, '设置')),
        edit && h('form', { className: 'fish-pay-form', onSubmit: save, autoComplete: 'off' },
          field('月薪（¥）', 'pay', { type: 'text', inputMode: 'decimal', placeholder: '在这台 Mac 上填写' }),
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

    function place(position, width = 156, height = 58) {
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
      const button = useRef(null);
      const drag = useRef(null);
      const skipClick = useRef(false);
      const result = data.settings ? calculate(data.settings, time, data.pause) : null;
      const bubble = useYuanBubble(result, time);
      const status = result ? {
        working: '正在计数', paused: '已暂停', lunch: '午休',
        early: '还没开工', finished: '今日收工', weekend: '休班',
      }[result.state] : '点我设置';

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
        if (!gesture.moved) setDragging(true);
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
        open();
      }

      return h('button', {
        ref: button,
        type: 'button',
        className: 'fish-pay-widget' + (dragging ? ' fish-pay-dragging' : ''),
        'data-fish-state': result?.state ?? 'early',
        style: { left: position.x, top: position.y },
        title: '点开工资计数器，按住拖动',
        'aria-label': '小鱼工资计数器，点开面板',
        onPointerDown: start, onPointerMove: move, onPointerUp: finish,
        onPointerCancel: finish, onLostPointerCapture: finish,
        onClick: click,
        onContextMenu: (event) => { event.preventDefault(); open(); },
      },
      h('span', { className: 'fish-pay-tank', 'aria-hidden': true },
        h('span', { className: 'fish-pay-water' }),
        h('span', { className: 'fish-pay-air fish-pay-air-one' }),
        h('span', { className: 'fish-pay-air fish-pay-air-two' }),
        h('span', { className: 'fish-pay-air fish-pay-air-three' }),
        h('span', { className: 'fish-pay-swim' },
          h('span', { className: 'fish-pay-tail' }),
          h('span', { className: 'fish-pay-fins' }),
          h('span', { className: 'fish-pay-body' },
            h('span', { className: 'fish-pay-eye' }),
            h('span', { className: 'fish-pay-flipper' })))),
      bubble !== null && h('span', { className: 'fish-pay-burst', key: bubble.key, 'aria-hidden': true },
        h('span', { className: 'fish-pay-ripple' }),
        h('span', { className: 'fish-pay-sparks' }),
        h('span', { className: 'fish-pay-bubble' }, '+¥' + bubble.delta)),
      h('span', { className: 'fish-pay-readout' },
        h('span', { className: 'fish-pay-widget-value' }, result ? currency.format(result.amount) : '工资计数'),
        h('span', { className: 'fish-pay-widget-state' }, status)));
    }

    const css = `
    .fish-pay-panel { margin: 0 auto; max-width: 30rem; padding: 18px 16px; }
    .fish-pay-heading { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; }
    .fish-pay-heading h2 { margin: 0; font-size: 16px; font-weight: 650; }
    .fish-pay-fish { position: relative; display: grid; place-items: center; width: 38px; height: 38px;
      border-radius: 50%; background: light-dark(#d8f4ef,#193d39); font-size: 22px; }
    .fish-pay-total { padding: 15px; border-radius: 13px; background: light-dark(#edf9f5,#172d2a);
      border: 1px solid light-dark(#d5ede6,#294940); margin-block: 0 12px; }
    .fish-pay-number { color: light-dark(#00695c,#91e4d4); font-size: clamp(24px, 8cqi, 36px);
      font-weight: 700; font-variant-numeric: tabular-nums; overflow-wrap: anywhere; }
    .fish-pay-total p { margin: 3px 0 5px; }
    .fish-pay-muted { color: light-dark(#546662,#b3c6c1); font-size: 12px; line-height: 1.5; }
    .fish-pay-form, .fish-pay-field { display: grid; gap: 6px; }
    .fish-pay-form { gap: 12px; }
    .fish-pay-shift { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
    .fish-pay-field input, .fish-pay-actions button { font: inherit; color: inherit;
      border: 1px solid light-dark(#b6c9c4,#526862); border-radius: 7px; padding: 6px 9px; }
    .fish-pay-field input { min-width: 0; background: light-dark(#fff,#222e2c); }
    .fish-pay-actions { display: flex; gap: 8px; align-items: center; }
    .fish-pay-actions button { cursor: pointer; }
    .fish-pay-actions button:disabled { opacity: .55; cursor: default; }
    .fish-pay-actions .fish-pay-primary { background: #007568; color: white; border-color: #007568; }
    .fish-pay-lunch { display: flex; gap: 8px; align-items: center; }
    .fish-pay-error { color: light-dark(#9c2418,#ffb2a6); }

    .fish-pay-widget { position: fixed; z-index: 42; pointer-events: auto; box-sizing: border-box;
      display: flex; align-items: center; gap: 9px; width: 156px; height: 58px; padding: 6px 8px;
      border: 1px solid light-dark(#a8e1d8,#3e706b); border-radius: 16px;
      color: light-dark(#103e43,#d3fff3);
      background: linear-gradient(140deg,light-dark(#f9fffe,#26454b),light-dark(#dbf9f2,#132e35));
      box-shadow: 0 6px 24px #0d5b6233, inset 0 1px #ffffff62;
      text-align: left; touch-action: none; user-select: none; cursor: grab; appearance: none;
      transition: border-color .2s, box-shadow .25s; }
    .fish-pay-widget:hover { border-color: light-dark(#66a99a,#7db7a9); }
    .fish-pay-widget:focus-visible { outline: 2px solid #54a9a0; outline-offset: 2px; }
    .fish-pay-widget.fish-pay-dragging { cursor: grabbing; box-shadow: 0 12px 32px #0d5b6255, inset 0 1px #ffffff75; }
    .fish-pay-tank { position: relative; display: block; flex: 0 0 45px; height: 43px; overflow: hidden;
      border-radius: 12px; isolation: isolate; box-shadow: inset 0 0 0 1px #abffef9c;
      background: radial-gradient(ellipse at 22% 10%,#a8fff1 0%,#38bdad 48%,#155e69 100%); }
    .fish-pay-water { position: absolute; inset: -9px;
      background: repeating-conic-gradient(from 220deg at 5% 9%,transparent 0deg 14deg,#edffff24 19deg 30deg,transparent 38deg 55deg);
      animation: fish-pay-water 4.8s ease-in-out infinite alternate; }
    .fish-pay-air { position: absolute; bottom: 1px; border: 1px solid #e9fff5d9; border-radius: 50%;
      background: radial-gradient(circle at 28% 25%,#fff9 0 16%,transparent 25%),#c7fff52e;
      opacity: 0; animation: fish-pay-float var(--time) linear infinite var(--delay); }
    .fish-pay-air-one { left: 31px; width: 6px; height: 6px; --time: 3.1s; --delay: -.4s; --sway: 5px; }
    .fish-pay-air-two { left: 36px; width: 4px; height: 4px; --time: 3.8s; --delay: -2s; --sway: -5px; }
    .fish-pay-air-three { left: 9px; width: 3px; height: 3px; --time: 4.2s; --delay: -2.6s; --sway: 7px; }
    .fish-pay-swim { position: absolute; width: 37px; height: 29px; left: 3px; top: 8px;
      filter: drop-shadow(0 4px 4px #1639435e); animation: fish-pay-swim 3.6s ease-in-out infinite; }
    .fish-pay-body { position: absolute; inset: 6px auto auto 9px; width: 26px; height: 20px;
      border-radius: 58% 50% 50% 57%;
      background: radial-gradient(ellipse at 58% 14%,#fff8c28f,transparent 46%),
        linear-gradient(155deg,#ffda7c 6%,#ff9b55 56%,#e35c45); }
    .fish-pay-body::after { content: ''; position: absolute; right: 2px; top: 12px;
      width: 6px; height: 3px; border-radius: 50%; background: #e1535cd0; }
    .fish-pay-eye { position: absolute; right: 5px; top: 5px; width: 6px; height: 6px;
      border-radius: 50%; background: radial-gradient(circle at 66% 28%,#fff 0 13%,#302432 20%);
      animation: fish-pay-blink 5.1s linear infinite; }
    .fish-pay-flipper { position: absolute; left: 7px; bottom: 3px; width: 9px; height: 6px;
      border-radius: 40% 75% 60% 32%; background: #ffe2a2; transform-origin: left center;
      animation: fish-pay-flap 900ms ease-in-out infinite alternate; }
    .fish-pay-tail { position: absolute; left: 1px; top: 9px; width: 16px; height: 16px;
      transform-origin: right center; background: linear-gradient(110deg,#ffd0a0,#ff876a 68%);
      clip-path: polygon(0 0,24% 0,100% 44%,100% 56%,24% 100%,0 100%,16% 50%);
      animation: fish-pay-tail 510ms ease-in-out infinite alternate; }
    .fish-pay-fins { position: absolute; left: 13px; top: 2px; width: 12px; height: 10px;
      border-radius: 80% 70% 0 0; background: #ffaf73; transform: rotate(-14deg); }
    .fish-pay-widget[data-fish-state="paused"] .fish-pay-swim,
    .fish-pay-widget[data-fish-state="lunch"] .fish-pay-swim,
    .fish-pay-widget[data-fish-state="finished"] .fish-pay-swim { animation-duration: 7s; }
    .fish-pay-widget[data-fish-state="paused"] .fish-pay-tail,
    .fish-pay-widget[data-fish-state="lunch"] .fish-pay-tail,
    .fish-pay-widget[data-fish-state="finished"] .fish-pay-tail { animation-duration: 1.4s; }
    .fish-pay-burst { position: absolute; inset: 0; pointer-events: none; }
    .fish-pay-bubble { position: absolute; right: 8px; top: 1px; z-index: 1; border-radius: 11px;
      padding: 2px 7px; color: #4c290b; background: linear-gradient(135deg,#fff7bd,#ffc65e 75%);
      box-shadow: 0 1px 9px #e9a53468; font: 750 11px/16px system-ui,sans-serif;
      animation: fish-pay-coin-rise 920ms cubic-bezier(.17,.77,.29,1) both; }
    .fish-pay-ripple { position: absolute; inset: 0; border-radius: 16px;
      border: 1px solid #31d8ae; box-shadow: 0 0 12px #39dfbf77;
      animation: fish-pay-ripple 720ms ease-out both; }
    .fish-pay-sparks { position: absolute; right: 24px; top: 3px; width: 3px; height: 3px; border-radius: 50%;
      background: #fff0b4; box-shadow: 11px 6px #f6be4e,-9px 0 #47d7a9,0 -7px #fff4d0;
      animation: fish-pay-spark 760ms ease-out both; }
    .fish-pay-readout { display: grid; gap: 3px; min-width: 0; }
    .fish-pay-widget-value { overflow: hidden; white-space: nowrap; text-overflow: ellipsis;
      font: 700 15px/1.2 system-ui, sans-serif; font-variant-numeric: tabular-nums; }
    .fish-pay-widget-state { color: light-dark(#3f6f65,#add0c6); font: 500 11px/1.2 system-ui, sans-serif; }
    @keyframes fish-pay-swim { 0%,100% { transform: translate(-3px, 2px) rotate(-7deg); }
      28% { transform: translate(1px, -2px) rotate(-4deg); }
      52% { transform: translate(5px, -1px) rotate(6deg); }
      80% { transform: translate(1px, 3px) rotate(3deg); } }
    @keyframes fish-pay-tail { from { transform: rotate(-18deg) scaleX(.73); }
      to { transform: rotate(14deg) scaleX(1.05); } }
    @keyframes fish-pay-blink { 0%,88%,94%,100% { transform: scaleY(1); } 91% { transform: scaleY(.12); } }
    @keyframes fish-pay-flap { from { transform: rotate(-18deg); } to { transform: rotate(-40deg); } }
    @keyframes fish-pay-water { from { transform: rotate(-4deg) translateX(-3px); }
      to { transform: rotate(8deg) translateX(3px); } }
    @keyframes fish-pay-float { 0% { opacity: 0; transform: translateY(0) scale(.75); }
      18%,70% { opacity: .8; } 100% { opacity: 0; transform: translate(var(--sway),-38px) scale(1.15); } }
    @keyframes fish-pay-coin-rise { 0% { opacity: 0; transform: translateY(0) scale(.62); }
      20% { opacity: 1; transform: translateY(-11px) scale(1.1); }
      62% { opacity: 1; transform: translateY(-17px) scale(1); }
      100% { opacity: 0; transform: translateY(-25px) scale(.97); } }
    @keyframes fish-pay-ripple { from { opacity: .85; transform: scale(.99); }
      to { opacity: 0; transform: scale(1.1,1.2); } }
    @keyframes fish-pay-spark { from { opacity: 1; transform: translateY(0) scale(.65); }
      to { opacity: 0; transform: translateY(-19px) scale(1.75); } }
    @media (prefers-reduced-motion: reduce) {
      .fish-pay-widget { transition: none; }
      .fish-pay-widget .fish-pay-swim, .fish-pay-widget .fish-pay-tail, .fish-pay-widget .fish-pay-flipper,
      .fish-pay-widget .fish-pay-eye, .fish-pay-widget .fish-pay-water, .fish-pay-widget .fish-pay-bubble { animation: none; }
      .fish-pay-air, .fish-pay-ripple, .fish-pay-sparks { display: none; }
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
        guide: [{ id, order: 430, title: () => title, description: () => '按你的上班时间每秒估算工资',
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
