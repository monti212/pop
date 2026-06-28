/**
 * Uhuru Companion — public prototype (/health)
 *
 * Faithful React port of the "Uhuru Companion.dc.html" Claude Design handoff
 * (project 5990a3dd-3f95-46dc-aeeb-44a7b74f275b). A self-contained, fully
 * interactive phone mockup of Uhuru — a gentle mental-health companion for
 * students. No app chrome, no auth: a standalone "show me the finished product"
 * prototype. All styling is inline/scoped so it stays isolated from the app's
 * Tailwind layer and renders pixel-faithful to the design.
 */
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';

// ---------------------------------------------------------------------------
// css(): parse a design style string into a React style object so the
// handoff's inline styles can be ported nearly verbatim.
// ---------------------------------------------------------------------------
function css(s: string): CSSProperties {
  const out: Record<string, string> = {};
  for (const decl of s.split(';')) {
    const i = decl.indexOf(':');
    if (i === -1) continue;
    const prop = decl.slice(0, i).trim();
    const val = decl.slice(i + 1).trim();
    if (!prop) continue;
    out[prop.replace(/-([a-z])/g, (_m, c: string) => c.toUpperCase())] = val;
  }
  return out as CSSProperties;
}

// ---------------------------------------------------------------------------
// Icons — exact paths from the design's buildIcons(). 1em / currentColor so
// the wrapping span controls size and colour.
// ---------------------------------------------------------------------------
const SW = {
  viewBox: '0 0 24 24',
  width: '1em',
  height: '1em',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  style: { display: 'block' } as CSSProperties,
};

const I: Record<string, ReactNode> = {
  home: (<svg {...SW}><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><path d="M9 22V12h6v10" /></svg>),
  chat: (<svg {...SW}><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22z" /></svg>),
  heart: (<svg {...SW}><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" /></svg>),
  leaf: (<svg {...SW}><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.5 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z" /><path d="M2 21c0-3 1.85-5.36 5.08-6" /></svg>),
  memory: (<svg {...SW}><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-2.5 2.5 2.5 2.5 0 0 1-2.5-2.5V18a2 2 0 0 1-2-2 2 2 0 0 1-1-3.7A2 2 0 0 1 4 9a2.5 2.5 0 0 1 1-4.5A2.5 2.5 0 0 1 7 2.5 2.5 2.5 0 0 1 9.5 2z" /><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 2.5 2.5 2.5 2.5 0 0 0 2.5-2.5V18a2 2 0 0 0 2-2 2 2 0 0 0 1-3.7A2 2 0 0 0 20 9a2.5 2.5 0 0 0-1-4.5A2.5 2.5 0 0 0 17 2.5 2.5 2.5 0 0 0 14.5 2z" /></svg>),
  mic: (<svg {...SW}><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1={12} y1={19} x2={12} y2={22} /></svg>),
  send: (<svg {...SW}><path d="m5 12 7-7 7 7" /><line x1={12} y1={19} x2={12} y2={5} /></svg>),
  sparkle: (<svg {...SW}><path d="M12 3l1.9 5.8L20 10l-6.1 1.2L12 17l-1.9-5.8L4 10l6.1-1.2z" /><path d="M19 15l.7 2.1L22 18l-2.3.9L19 21l-.7-2.1L16 18l2.3-.9z" /></svg>),
  check: (<svg {...SW}><path d="M20 6 9 17l-5-5" /></svg>),
  plus: (<svg {...SW}><line x1={12} y1={5} x2={12} y2={19} /><line x1={5} y1={12} x2={19} y2={12} /></svg>),
  x: (<svg {...SW}><line x1={18} y1={6} x2={6} y2={18} /><line x1={6} y1={6} x2={18} y2={18} /></svg>),
  chevron: (<svg {...SW}><path d="m9 18 6-6-6-6" /></svg>),
  pencil: (<svg {...SW}><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></svg>),
  book: (<svg {...SW}><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></svg>),
  users: (<svg {...SW}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx={9} cy={7} r={4} /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>),
  star: (<svg {...SW}><path d="M12 2l3 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.9 21l1.2-6.8-5-4.9 6.9-1z" /></svg>),
  spark: (<svg {...SW}><path d="M12 3v6" /><path d="M12 15v6" /><path d="M3 12h6" /><path d="M15 12h6" /><path d="M5.6 5.6l4.2 4.2" /><path d="M14.2 14.2l4.2 4.2" /><path d="M18.4 5.6l-4.2 4.2" /><path d="M9.8 14.2l-4.2 4.2" /></svg>),
};

// ---------------------------------------------------------------------------
// Types & seed data
// ---------------------------------------------------------------------------
type Mood = 'great' | 'good' | 'okay' | 'low' | 'rough';
type Screen = 'home' | 'chat' | 'mood' | 'goals' | 'me';
type VoiceStage = 'listening' | 'heard' | 'thinking' | 'speaking';

interface Msg { from: 'uhuru' | 'me'; text: string }
interface Goal { id: string; title: string; note: string; icon: 'spark' | 'leaf' | 'star'; progress: number; steps: number; doneSteps: number }
interface Fact { id: string; text: string; source: string }
interface Section { id: string; title: string; icon: string; facts: Fact[] }
interface Learn { text: string; sectionId: string }

const navy = '#212754';
const ink = '#9a8f7f';

const moodColors: Record<Mood, string> = { great: '#7FB89A', good: '#8FC1D9', okay: '#E8C97C', low: '#E0A87C', rough: '#C99CC4' };
const moodOrbs: Record<Mood, string> = {
  great: 'radial-gradient(circle at 35% 30%, #BBE3CA, #7FB89A 70%)',
  good: 'radial-gradient(circle at 35% 30%, #CDE6F4, #8FC1D9 70%)',
  okay: 'radial-gradient(circle at 35% 30%, #BBD7EB, #C9C2E8 55%, #F4C9A8)',
  low: 'radial-gradient(circle at 35% 30%, #F6DAC2, #E0A87C 72%)',
  rough: 'radial-gradient(circle at 35% 30%, #E4CCE2, #C99CC4 72%)',
};

const SEED_GOALS: Goal[] = [
  { id: 'g1', title: 'Speak up once in class', note: 'Your idea — you’ve got this', icon: 'spark', progress: 60, steps: 3, doneSteps: 2 },
  { id: 'g2', title: 'Draw something every day', note: '12-day streak going strong', icon: 'leaf', progress: 80, steps: 7, doneSteps: 6 },
  { id: 'g3', title: 'Get through Friday’s maths test', note: 'One small step at a time', icon: 'star', progress: 30, steps: 4, doneSteps: 1 },
];

const SEED_ABOUT: Section[] = [
  { id: 'academic', title: 'School & learning', icon: 'book', facts: [
    { id: 'a1', text: 'Loves art and English', source: 'you told me' },
    { id: 'a2', text: 'Finds maths stressful, especially tests', source: 'I noticed' },
    { id: 'a3', text: 'Standard 8 at Kanye Secondary', source: 'you told me' },
  ] },
  { id: 'emotional', title: 'How you feel', icon: 'heart', facts: [
    { id: 'e1', text: 'Feels calmer after drawing', source: 'I noticed' },
    { id: 'e2', text: 'Gets anxious the night before a test', source: 'I noticed' },
  ] },
  { id: 'social', title: 'Your people', icon: 'users', facts: [
    { id: 's1', text: 'Best friend is Lesedi', source: 'you told me' },
    { id: 's2', text: 'Started at this school this year', source: 'you told me' },
  ] },
  { id: 'strengths', title: 'Your strengths', icon: 'spark', facts: [
    { id: 'st1', text: 'Really kind to your friends', source: 'I noticed' },
    { id: 'st2', text: 'A brilliant storyteller', source: 'you told me' },
  ] },
];

const SEED_WEEK: { day: string; mood: Mood }[] = [
  { day: 'M', mood: 'good' }, { day: 'T', mood: 'okay' }, { day: 'W', mood: 'low' },
  { day: 'T', mood: 'okay' }, { day: 'F', mood: 'rough' }, { day: 'S', mood: 'good' }, { day: 'S', mood: 'okay' },
];

function replyFor(msg: string, mood: Mood): { reply: string; learn?: Learn } {
  const m = msg.toLowerCase();
  if (m.includes('test') || m.includes('exam') || m.includes('nervous')) {
    return { reply: 'Okay, a test on Friday — and feeling nervous makes total sense. You don’t have to carry that alone. Want to break it into three tiny steps together, or just talk it out first?', learn: { text: 'Has a maths test on Friday — feels nervous before tests', sectionId: 'emotional' } };
  }
  if (m.includes('passed') || m.includes('won') || m.includes('good news') || m.includes('happy')) {
    return { reply: 'Wait — that’s amazing! I’m genuinely proud of you. Tell me everything, I want the whole story.' };
  }
  if (m.includes('lesedi') || m.includes('friend')) {
    return { reply: 'It sounds like that friendship really matters to you. Friends are everything. What happened?', learn: { text: 'Friendships matter a lot to you', sectionId: 'social' } };
  }
  if (m.includes('tired') || m.includes('sleep')) {
    return { reply: 'Being tired makes everything heavier. Let’s slow it right down. What time did you get to bed last night?' };
  }
  if (m.includes('sad') || m.includes('lonely') || m.includes('alone') || m.includes('down')) {
    return { reply: 'I’m really glad you told me. You’re not alone in this — I’m right here, and we can sit with it for as long as you need.' };
  }
  if (m.includes('draw') || m.includes('art')) {
    return { reply: 'Your art always seems to settle you. Have you drawn anything today? I’d love to hear about it.' };
  }
  if (mood === 'low' || mood === 'rough') {
    return { reply: 'Thank you for sharing that with me. I’m listening — take all the time you need, there’s no rush here.' };
  }
  return { reply: 'I hear you. Tell me a bit more — what’s that been like for you?' };
}

const FONT_AND_KEYFRAMES = `
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap');
.uhuru-health-root *{box-sizing:border-box}
.uhuru-health-root ::-webkit-scrollbar{width:0;height:0}
@keyframes uFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}
@keyframes uPulse{0%{transform:scale(1);opacity:.5}70%{opacity:0}100%{transform:scale(1.5);opacity:0}}
@keyframes uFade{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
@keyframes uDot{0%,60%,100%{transform:translateY(0);opacity:.4}30%{transform:translateY(-5px);opacity:1}}
@keyframes uRing{0%{transform:scale(0.55);opacity:.75}100%{transform:scale(2.3);opacity:0}}
@keyframes uBar{0%,100%{transform:scaleY(0.32)}50%{transform:scaleY(1)}}
@keyframes uBreathe{0%,100%{transform:scale(1)}50%{transform:scale(1.07)}}
`;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function HealthCompanionPage() {
  const [screen, setScreen] = useState<Screen>('home');
  const [mood, setMood] = useState<Mood>('okay');
  const [streak] = useState(12);
  const [messages, setMessages] = useState<Msg[]>([
    { from: 'uhuru', text: 'Hey Amara. I’m really glad you’re here. How’s your evening going?' },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatTyping, setChatTyping] = useState(false);
  const [editingFactId, setEditingFactId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [toastMsg, setToastMsg] = useState('');
  const [voiceOn, setVoiceOn] = useState(false);
  const [voiceStage, setVoiceStage] = useState<VoiceStage>('listening');
  const [voiceCaption, setVoiceCaption] = useState('');
  const [goals, setGoals] = useState<Goal[]>(SEED_GOALS);
  const [about, setAbout] = useState<Section[]>(SEED_ABOUT);

  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const track = (t: ReturnType<typeof setTimeout>) => { timers.current.push(t); return t; };

  useEffect(() => () => {
    timers.current.forEach(clearTimeout);
    if (toastTimer.current) clearTimeout(toastTimer.current);
  }, []);

  const flashToast = (msg: string) => {
    setToastMsg(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(''), 2600);
  };

  const moodResponse = (id: Mood) => ({
    great: 'Love that energy. Let’s keep it going.',
    good: 'That’s good to hear.',
    okay: 'Okay is okay. I’m here.',
    low: 'Thanks for telling me. I’ve got you.',
    rough: 'That sounds hard. I’m right here with you.',
  }[id]);

  const pickMood = (id: Mood) => { setMood(id); flashToast(moodResponse(id)); };

  const send = (text?: string) => {
    const msg = (text ?? chatInput).trim();
    if (!msg) return;
    const res = replyFor(msg, mood);
    setMessages((cur) => cur.concat([{ from: 'me', text: msg }]));
    setChatInput('');
    setChatTyping(true);
    track(setTimeout(() => {
      setMessages((cur) => cur.concat([{ from: 'uhuru', text: res.reply }]));
      setChatTyping(false);
      if (res.learn) {
        setAbout((cur) => cur.map((sec) => {
          if (sec.id !== res.learn!.sectionId) return sec;
          if (sec.facts.some((f) => f.text === res.learn!.text)) return sec;
          return { ...sec, facts: sec.facts.concat([{ id: 'n' + Date.now(), text: res.learn!.text, source: 'Uhuru noticed' }]) };
        }));
      }
    }, 1100));
  };

  const startEdit = (factId: string, text: string) => { setEditingFactId(factId); setEditDraft(text); };
  const saveEdit = (sectionId: string, factId: string) => {
    const draft = editDraft.trim();
    setAbout((cur) => cur.map((sec) => sec.id !== sectionId ? sec : {
      ...sec, facts: sec.facts.map((f) => f.id === factId ? { ...f, text: draft || f.text, source: 'you edited' } : f),
    }));
    setEditingFactId(null);
    setEditDraft('');
    flashToast('Updated');
  };
  const forgetFact = (sectionId: string, factId: string) => {
    setAbout((cur) => cur.map((sec) => sec.id !== sectionId ? sec : { ...sec, facts: sec.facts.filter((f) => f.id !== factId) }));
    flashToast('Forgotten');
  };
  const addFact = (sectionId: string) => {
    const id = 'n' + Date.now();
    setAbout((cur) => cur.map((sec) => sec.id !== sectionId ? sec : { ...sec, facts: sec.facts.concat([{ id, text: 'Something new about me', source: 'you added' }]) }));
    setEditingFactId(id);
    setEditDraft('Something new about me');
  };

  const stepGoal = (id: string) => {
    setGoals((cur) => cur.map((g) => {
      if (g.id !== id) return g;
      const doneSteps = Math.min(g.steps, g.doneSteps + 1);
      return { ...g, doneSteps, progress: Math.round((doneSteps / g.steps) * 100) };
    }));
    flashToast('One step closer — proud of you');
  };
  const addGoal = () => {
    setGoals((cur) => cur.concat([{ id: 'g' + Date.now(), title: 'A new little goal', note: 'Your pace, always', icon: 'spark', progress: 0, steps: 4, doneSteps: 0 }]));
    flashToast('New goal added');
  };

  const newChat = () => {
    setMessages([{ from: 'uhuru', text: "Fresh page. I'm still me — and I still remember what matters to you. What's on your mind?" }]);
    setChatInput('');
    flashToast('New chat started');
  };

  const openVoice = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setVoiceOn(true);
    setVoiceStage('listening');
    setVoiceCaption("I'm here. Talk to me whenever you're ready.");
    track(setTimeout(() => { setVoiceStage('heard'); setVoiceCaption('“I’m a bit nervous about Friday’s test.”'); }, 2600));
    track(setTimeout(() => { setVoiceStage('thinking'); setVoiceCaption(''); }, 4300));
    track(setTimeout(() => {
      setVoiceStage('speaking');
      setVoiceCaption("Okay — nervous makes sense. We've got two evenings. Want to take one small step tonight, together?");
      setMessages((cur) => cur.concat([
        { from: 'me', text: "I'm a bit nervous about Friday's test" },
        { from: 'uhuru', text: "Okay — nervous makes sense, and you said tests are your tough days. We've got two evenings. Want to take one small step tonight, together?" },
      ]));
      setAbout((cur) => cur.map((sec) => {
        if (sec.id !== 'emotional') return sec;
        const t = "Nervous about Friday's maths test";
        if (sec.facts.some((f) => f.text === t)) return sec;
        return { ...sec, facts: sec.facts.concat([{ id: 'v' + Date.now(), text: t, source: 'Uhuru noticed' }]) };
      }));
    }, 5300));
  };
  const closeVoice = () => { timers.current.forEach(clearTimeout); timers.current = []; setVoiceOn(false); };
  const connectEngine = () => flashToast('GreyEd Engine — weaving in your learning profile');
  const openSuggest = (msg: string) => { setScreen('chat'); track(setTimeout(() => send(msg), 80)); };

  // ---- derived values (mirrors the design's renderVals) ----
  const moodOrb = moodOrbs[mood];
  const moodGlow = moodColors[mood];
  const orbGlowStyle: CSSProperties = { position: 'absolute', inset: '8px', borderRadius: '50%', background: moodGlow, animation: 'uPulse 3.4s ease-out infinite', display: 'block' };
  const orbStyle: CSSProperties = { position: 'relative', width: '112px', height: '112px', borderRadius: '50%', background: moodOrb, boxShadow: '0 16px 36px -12px rgba(33,39,84,0.4), inset 0 -8px 20px rgba(255,255,255,0.35)', animation: 'uFloat 5s ease-in-out infinite', display: 'block' };

  const moodList: { id: Mood; label: string }[] = [
    { id: 'great', label: 'Great' }, { id: 'good', label: 'Good' }, { id: 'okay', label: 'Okay' }, { id: 'low', label: 'Low' }, { id: 'rough', label: 'Rough' },
  ];

  const checkMap: Record<Mood, { t: string; s: string }> = {
    great: { t: 'You’re glowing today', s: 'I love seeing you like this. What made today good?' },
    good: { t: 'Glad you’re doing okay', s: 'Want to tell me about your day?' },
    okay: { t: 'How are you, really?', s: 'Tap how you’re feeling — there’s no wrong answer.' },
    low: { t: 'I’m here for the low days too', s: 'We don’t have to fix anything. Let’s just talk.' },
    rough: { t: 'Rough day? I’ve got you', s: 'Take a breath. I’m right here whenever you’re ready.' },
  };
  const ck = checkMap[mood];

  const nudgeDefault = { text: 'You’ve got a maths test on Friday. Want to make a tiny, no-pressure plan together — or just chat?', cta: 'Let’s talk' };
  const nudgeOverrides: Partial<Record<Mood, { text: string; cta: string }>> = {
    rough: { text: 'Friday’s test is sitting heavy, isn’t it? We don’t have to think about all of it — just the very next tiny step. Want to try?', cta: 'Talk it through' },
    low: { text: 'You mentioned drawing helps you feel calmer. Maybe a few minutes with your sketchbook tonight? I’ll be here after.', cta: 'Tell Uhuru' },
  };
  const nd = nudgeOverrides[mood] ?? nudgeDefault;

  const toneMap: Record<Mood, string> = { great: 'right beside you, hyped', good: 'here and listening', okay: 'here, no rush', low: 'gently with you', rough: 'quiet and close' };
  const toneLabel = toneMap[mood];

  const chatChips = [
    { label: 'I’m a bit nervous about Friday', msg: 'I’m a bit nervous about my maths test on Friday' },
    { label: 'Something good happened', msg: 'Something good happened today — I think I made a new friend' },
    { label: 'I just need to talk', msg: 'I just need to talk, today felt like a lot' },
  ];

  const weekHeights: Record<Mood, number> = { great: 92, good: 74, okay: 56, low: 38, rough: 24 };
  const moodPattern = 'Your week dipped around Wednesday and Friday — both test days. You tend to bounce back over the weekend. That’s worth knowing about yourself.';
  const whatHelps = ['Drawing', 'Talking to Lesedi', 'Music', 'A good night’s sleep'];

  const goalIcons: Record<Goal['icon'], ReactNode> = { spark: I.spark, leaf: I.leaf, star: I.star };
  const goalIconBg: Record<Goal['icon'], string> = { spark: '#F3F0FA', leaf: '#E6F2EA', star: '#FBF1DD' };

  const aboutIcons: Record<string, ReactNode> = { academic: I.book, emotional: I.heart, social: I.users, strengths: I.spark };
  const aboutIconBg: Record<string, string> = { academic: '#EAF2F9', emotional: '#FBE9E6', social: '#E6F2EA', strengths: '#F3F0FA' };
  const sourceColor = (src: string) => (src === 'I noticed' || src === 'Uhuru noticed') ? '#8B7FC9' : src === 'you edited' ? '#9a8f7f' : '#1f7a52';
  const entryCount = about.reduce((n, s) => n + s.facts.length, 0);

  const suggSeed = [
    { title: '5 minutes with your sketchbook', why: 'Drawing lifted your mood 3 times this week', icon: I.spark, bg: '#F3F0FA', msg: "I think I'll draw for a bit — you said it helps me" },
    { title: 'Message Lesedi', why: 'You feel lighter after talking to your best friend', icon: I.heart, bg: '#FBE9E6', msg: "Maybe I'll message Lesedi tonight" },
    { title: 'One slow breath before Friday', why: "Tests are your tough days — let's get ahead of it", icon: I.leaf, bg: '#E6F2EA', msg: 'Can we do a quick calming exercise for Friday?' },
  ];

  const navItem = (on: boolean): { icon: CSSProperties; label: CSSProperties } => ({
    icon: { color: on ? navy : ink, fontSize: '21px', display: 'flex' },
    label: { color: on ? navy : ink, fontWeight: 600, fontSize: '10.5px', display: 'block', marginTop: '1px' },
  });
  const voiceStatusMap: Record<VoiceStage, string> = { listening: 'Listening…', heard: 'I hear you', thinking: 'Thinking with you…', speaking: 'Uhuru is speaking' };
  const vbarDur = [0.7, 0.9, 0.6, 1.0, 0.65, 0.85, 0.75];

  return (
    <div
      className="uhuru-health-root"
      style={css("min-height:100vh;display:flex;flex-direction:column;align-items:center;padding:26px 20px 40px;background:#E8E2D8;background-image:radial-gradient(800px 400px at 50% -8%, rgba(201,194,232,0.5), transparent), radial-gradient(700px 360px at 90% 10%, rgba(244,201,168,0.35), transparent);font-family:'Inter',system-ui,sans-serif")}
    >
      <style>{FONT_AND_KEYFRAMES}</style>

      {/* HEADER */}
      <div style={css('text-align:center;max-width:560px;margin-bottom:24px')}>
        <div style={css('display:inline-flex;align-items:center;gap:9px;background:#fff;border:1px solid rgba(33,39,84,0.08);padding:7px 15px 7px 9px;border-radius:999px;box-shadow:0 2px 10px -4px rgba(33,39,84,0.2)')}>
          <span style={css('width:26px;height:26px;border-radius:50%;background:radial-gradient(circle at 35% 30%, #BBD7EB, #C9C2E8 55%, #F4C9A8);display:block')} />
          <span style={css("font:700 14px 'Space Grotesk';color:#212754;letter-spacing:-0.01em")}>Uhuru</span>
          <span style={css('font-size:12px;color:#9a8f7f')}>· your companion</span>
        </div>
        <h1 style={css("font:600 30px 'Space Grotesk';color:#212754;margin:18px 0 0;letter-spacing:-0.02em;line-height:1.12")}>A friend who grows with you.</h1>
        <p style={css('font-size:15px;color:#5b5750;line-height:1.6;margin:12px auto 0;max-width:440px')}>A best friend and gentle companion for students. Uhuru remembers what matters to you, learns as you talk, and is always in your corner. You can see and edit everything it knows.</p>
      </div>

      {/* PHONE */}
      <div style={css('width:392px;flex:none')}>
        <div style={css('position:relative;width:392px;height:812px;background:#0c1024;border-radius:50px;padding:13px;box-shadow:0 44px 90px -34px rgba(12,16,36,0.6), 0 0 0 2px rgba(255,255,255,0.04) inset')}>
          <div style={css('position:relative;width:100%;height:100%;border-radius:38px;overflow:hidden;display:flex;flex-direction:column;background:#F6F1EA')}>

            {/* notch */}
            <div style={css('position:absolute;top:0;left:50%;transform:translateX(-50%);width:118px;height:25px;background:#0c1024;border-radius:0 0 16px 16px;z-index:30')} />

            {/* status bar */}
            <div style={css("height:48px;flex:none;display:flex;align-items:center;justify-content:space-between;padding:0 24px;color:#212754;font:600 13px 'Inter';z-index:20")}>
              <span>20:14</span>
              <div style={css('display:flex;align-items:center;gap:7px')}>
                <div style={css('display:flex;align-items:flex-end;gap:1.5px;height:11px')}>
                  <span style={css('width:3px;height:5px;background:#212754;border-radius:1px')} />
                  <span style={css('width:3px;height:7px;background:#212754;border-radius:1px')} />
                  <span style={css('width:3px;height:9px;background:#212754;border-radius:1px')} />
                  <span style={css('width:3px;height:11px;background:#212754;border-radius:1px')} />
                </div>
                <div style={css('width:23px;height:11px;border:1.5px solid #212754;border-radius:3px;padding:1px')}>
                  <span style={css('display:block;width:75%;height:100%;background:#212754;border-radius:1px')} />
                </div>
              </div>
            </div>

            {/* MAIN */}
            <div style={css('flex:1;overflow-y:auto;position:relative')}>

              {/* ════ HOME ════ */}
              {screen === 'home' && (
                <div style={css('padding:8px 22px 30px;animation:uFade .3s ease')}>
                  <div style={css('display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:22px')}>
                    <div>
                      <div style={css("font:700 10.5px 'Inter';letter-spacing:.15em;text-transform:uppercase;color:#9a8f7f")}>Good evening</div>
                      <h2 style={css("margin:7px 0 0;font:600 25px 'Space Grotesk';color:#212754;letter-spacing:-0.01em")}>Hey Amara</h2>
                    </div>
                    <div style={css('display:flex;align-items:center;gap:6px;background:#fff;border:1px solid rgba(33,39,84,0.07);border-radius:999px;padding:7px 12px;box-shadow:0 1px 4px rgba(33,39,84,0.05)')}>
                      <span style={css('font-size:14px;display:flex;color:#7FB89A')}>{I.leaf}</span>
                      <span style={css("font:700 13px 'Space Grotesk';color:#212754")}>{streak}</span>
                      <span style={css('font-size:11px;color:#9a8f7f')}>days</span>
                    </div>
                  </div>

                  {/* Uhuru presence + prompt */}
                  <div style={css('display:flex;flex-direction:column;align-items:center;text-align:center;margin-bottom:8px')}>
                    <button onClick={openVoice} style={css('background:none;border:none;cursor:pointer;padding:0;display:flex;flex-direction:column;align-items:center')}>
                      <div style={css('position:relative;width:132px;height:132px;display:flex;align-items:center;justify-content:center;margin-bottom:14px')}>
                        <span style={orbGlowStyle} />
                        <span style={orbStyle} />
                        <span style={css('position:absolute;bottom:-4px;background:#fff;border:1px solid rgba(33,39,84,0.1);border-radius:999px;padding:5px 12px;display:inline-flex;align-items:center;gap:6px;box-shadow:0 6px 14px -5px rgba(33,39,84,0.35)')}>
                          <span style={css('font-size:13px;display:flex;color:#212754')}>{I.mic}</span>
                          <span style={css("font:600 11.5px 'Inter';color:#212754")}>Talk out loud</span>
                        </span>
                      </div>
                    </button>
                    <div style={css("font:600 18px 'Space Grotesk';color:#212754;letter-spacing:-0.01em")}>{ck.t}</div>
                    <div style={css('font-size:14px;color:#5b5750;margin-top:5px;max-width:240px;line-height:1.5')}>{ck.s}</div>
                  </div>

                  {/* mood picker */}
                  <div style={css('display:flex;justify-content:space-between;gap:7px;margin:20px 2px 0')}>
                    {moodList.map((mo) => {
                      const on = mood === mo.id;
                      return (
                        <button
                          key={mo.id}
                          onClick={() => pickMood(mo.id)}
                          style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '7px', background: on ? '#fff' : 'transparent', border: on ? '1px solid rgba(33,39,84,0.12)' : '1px solid transparent', borderRadius: '16px', padding: '11px 4px', cursor: 'pointer', boxShadow: on ? '0 6px 16px -10px rgba(33,39,84,0.4)' : 'none' }}
                        >
                          <span style={{ width: '26px', height: '26px', borderRadius: '50%', background: moodColors[mo.id], display: 'block', boxShadow: on ? '0 0 0 4px ' + moodColors[mo.id] + '33' : 'none' }} />
                          <span style={{ font: "600 11.5px 'Inter'", color: on ? navy : '#9a8f7f' }}>{mo.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* today's nudge */}
                  <div style={css('margin-top:22px;background:#fff;border:1px solid rgba(33,39,84,0.07);border-radius:20px;padding:18px;box-shadow:0 6px 20px -12px rgba(33,39,84,0.25)')}>
                    <div style={css('display:flex;align-items:center;gap:8px;margin-bottom:9px')}>
                      <span style={css('width:28px;height:28px;border-radius:9px;background:#EAF2F9;color:#212754;display:flex;align-items:center;justify-content:center;font-size:15px')}>{I.sparkle}</span>
                      <span style={css("font:700 10.5px 'Inter';letter-spacing:.12em;text-transform:uppercase;color:#9a8f7f")}>From Uhuru, for you</span>
                    </div>
                    <div style={css('font-size:15px;color:#292828;line-height:1.55')}>{nd.text}</div>
                    <div style={css('display:flex;gap:9px;margin-top:14px')}>
                      <button onClick={() => setScreen('chat')} style={css("flex:1;display:inline-flex;align-items:center;justify-content:center;gap:7px;padding:12px;border-radius:13px;border:none;background:#212754;color:#fff;font:600 14px 'Inter';cursor:pointer")}>
                        <span style={css('font-size:16px;display:flex')}>{I.chat}</span>{nd.cta}
                      </button>
                    </div>
                  </div>

                  {/* talk entry */}
                  <button onClick={() => setScreen('chat')} style={css('width:100%;margin-top:13px;display:flex;align-items:center;gap:12px;background:#fff;border:1px solid rgba(33,39,84,0.07);border-radius:18px;padding:15px 16px;cursor:pointer;text-align:left;box-shadow:0 2px 10px -6px rgba(33,39,84,0.2)')}>
                    <span style={css('width:40px;height:40px;border-radius:50%;background:radial-gradient(circle at 35% 30%, #BBD7EB, #C9C2E8 55%, #F4C9A8);flex:none;display:block')} />
                    <span style={css('flex:1')}>
                      <span style={css("display:block;font:600 14.5px 'Space Grotesk';color:#212754")}>Talk to Uhuru</span>
                      <span style={css('display:block;font-size:12.5px;color:#9a8f7f;margin-top:1px')}>Anything on your mind — big or small</span>
                    </span>
                    <span style={css('color:#b9b4ad;font-size:17px;display:flex')}>{I.chevron}</span>
                  </button>
                </div>
              )}

              {/* ════ CHAT ════ */}
              {screen === 'chat' && (
                <div style={css('display:flex;flex-direction:column;height:100%;animation:uFade .3s ease')}>
                  <div style={css('flex:none;display:flex;align-items:center;gap:11px;padding:6px 18px 12px;border-bottom:1px solid rgba(33,39,84,0.06)')}>
                    <span style={css('width:40px;height:40px;border-radius:50%;background:radial-gradient(circle at 35% 30%, #BBD7EB, #C9C2E8 55%, #F4C9A8);flex:none;display:block')} />
                    <div style={css('flex:1')}>
                      <div style={css("font:600 16px 'Space Grotesk';color:#212754;line-height:1")}>Uhuru</div>
                      <div style={css('font-size:11.5px;color:#7FB89A;margin-top:3px;display:flex;align-items:center;gap:5px')}>
                        <span style={css('width:6px;height:6px;border-radius:50%;background:#7FB89A;display:block')} />{toneLabel}
                      </div>
                    </div>
                    <button onClick={newChat} aria-label="New chat" style={css('width:36px;height:36px;border-radius:11px;border:1px solid rgba(33,39,84,0.1);background:#fff;color:#212754;font-size:18px;display:flex;align-items:center;justify-content:center;cursor:pointer')}>{I.plus}</button>
                    <button onClick={() => setScreen('me')} aria-label="What Uhuru knows" style={css('width:36px;height:36px;border-radius:11px;border:1px solid rgba(33,39,84,0.1);background:#fff;color:#212754;font-size:17px;display:flex;align-items:center;justify-content:center;cursor:pointer')}>{I.memory}</button>
                  </div>

                  <div style={css('flex:1;overflow-y:auto;padding:16px 16px 8px')}>
                    {messages.map((m, idx) => {
                      const isU = m.from === 'uhuru';
                      return (
                        <div key={idx} style={{ display: 'flex', justifyContent: isU ? 'flex-start' : 'flex-end', marginBottom: '13px' }}>
                          <div style={isU
                            ? { background: '#fff', color: '#292828', border: '1px solid rgba(33,39,84,0.07)', borderRadius: '4px 18px 18px 18px', padding: '13px 16px', maxWidth: '84%', boxShadow: '0 2px 8px -4px rgba(33,39,84,0.15)', fontSize: '14.5px', lineHeight: 1.55 }
                            : { background: navy, color: '#fff', borderRadius: '18px 4px 18px 18px', padding: '13px 16px', maxWidth: '84%', fontSize: '14.5px', lineHeight: 1.55 }}>{m.text}</div>
                        </div>
                      );
                    })}
                    {chatTyping && (
                      <div style={css('display:flex;gap:4px;padding:8px 6px')}>
                        <span style={css('width:7px;height:7px;border-radius:50%;background:#c0b7c9;animation:uDot 1.2s infinite')} />
                        <span style={css('width:7px;height:7px;border-radius:50%;background:#c0b7c9;animation:uDot 1.2s infinite .2s')} />
                        <span style={css('width:7px;height:7px;border-radius:50%;background:#c0b7c9;animation:uDot 1.2s infinite .4s')} />
                      </div>
                    )}
                  </div>

                  <div style={css('flex:none;padding:8px 14px 14px;border-top:1px solid rgba(33,39,84,0.06);background:#F6F1EA')}>
                    <div style={css('display:flex;gap:8px;overflow-x:auto;padding-bottom:10px')}>
                      {chatChips.map((ch, idx) => (
                        <button key={idx} onClick={() => send(ch.msg)} style={css("white-space:nowrap;flex:none;background:#fff;border:1px solid rgba(33,39,84,0.1);border-radius:999px;padding:8px 13px;font:500 12.5px 'Inter';color:#292828;cursor:pointer")}>{ch.label}</button>
                      ))}
                    </div>
                    <div style={css('display:flex;gap:8px;align-items:center;background:#fff;border:1.5px solid rgba(33,39,84,0.1);border-radius:16px;padding:6px 6px 6px 15px')}>
                      <input
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') send(); }}
                        placeholder="Tell Uhuru anything…"
                        style={css("flex:1;border:none;outline:none;background:transparent;font:500 14.5px 'Inter';color:#292828")}
                      />
                      <button onClick={openVoice} aria-label="Talk out loud" style={css('width:38px;height:38px;border-radius:11px;border:none;background:#EAF2F9;color:#212754;font-size:18px;display:flex;align-items:center;justify-content:center;cursor:pointer;flex:none')}>{I.mic}</button>
                      <button onClick={() => send()} aria-label="Send" style={css('width:40px;height:40px;border-radius:12px;border:none;background:#212754;color:#fff;font-size:18px;display:flex;align-items:center;justify-content:center;cursor:pointer;flex:none')}>{I.send}</button>
                    </div>
                  </div>
                </div>
              )}

              {/* ════ MOOD ════ */}
              {screen === 'mood' && (
                <div style={css('padding:8px 22px 30px;animation:uFade .3s ease')}>
                  <h2 style={css("margin:0 0 4px;font:600 23px 'Space Grotesk';color:#212754")}>Your moods</h2>
                  <div style={css('font-size:13.5px;color:#9a8f7f;margin-bottom:18px')}>Checking in helps Uhuru understand your patterns — and helps you too.</div>

                  <div style={css('display:flex;align-items:center;gap:7px;margin-bottom:11px')}>
                    <span style={css('font-size:15px;display:flex;color:#8B7FC9')}>{I.sparkle}</span>
                    <span style={css("font:700 10.5px 'Inter';letter-spacing:.12em;text-transform:uppercase;color:#9a8f7f")}>For you, from how you’ve been</span>
                  </div>
                  <div style={css('display:flex;flex-direction:column;gap:10px;margin-bottom:22px')}>
                    {suggSeed.map((s2, idx) => (
                      <button key={idx} onClick={() => openSuggest(s2.msg)} style={css('display:flex;align-items:center;gap:13px;background:#fff;border:1px solid rgba(33,39,84,0.07);border-radius:16px;padding:14px;cursor:pointer;text-align:left;box-shadow:0 4px 14px -10px rgba(33,39,84,0.25)')}>
                        <span style={{ width: '38px', height: '38px', borderRadius: '11px', background: s2.bg, color: navy, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flex: 'none' }}>{s2.icon}</span>
                        <span style={css('flex:1')}>
                          <span style={css("display:block;font:600 14.5px 'Space Grotesk';color:#212754")}>{s2.title}</span>
                          <span style={css('display:block;font-size:12px;color:#9a8f7f;margin-top:2px;line-height:1.4')}>{s2.why}</span>
                        </span>
                        <span style={css('color:#b9b4ad;font-size:16px;display:flex')}>{I.chevron}</span>
                      </button>
                    ))}
                  </div>

                  <div style={css('background:#fff;border:1px solid rgba(33,39,84,0.07);border-radius:20px;padding:18px;box-shadow:0 6px 20px -12px rgba(33,39,84,0.25);margin-bottom:16px')}>
                    <div style={css("font:700 10.5px 'Inter';letter-spacing:.12em;text-transform:uppercase;color:#9a8f7f;margin-bottom:14px")}>This week</div>
                    <div style={css('display:flex;justify-content:space-between;align-items:flex-end;height:96px')}>
                      {SEED_WEEK.map((d, idx) => (
                        <div key={idx} style={css('display:flex;flex-direction:column;align-items:center;gap:8px;flex:1')}>
                          <div style={{ width: '100%', maxWidth: '20px', height: (weekHeights[d.mood] ?? 40) + '%', borderRadius: '999px', background: moodColors[d.mood], display: 'block' }} />
                          <span style={css('font-size:11px;color:#9a8f7f;font-weight:600')}>{d.day}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={css('background:#fff;border:1px solid rgba(33,39,84,0.07);border-radius:20px;padding:18px;box-shadow:0 6px 20px -12px rgba(33,39,84,0.25);margin-bottom:16px')}>
                    <div style={css('display:flex;align-items:center;gap:8px;margin-bottom:10px')}>
                      <span style={css('font-size:16px;display:flex;color:#8B7FC9')}>{I.sparkle}</span>
                      <span style={css("font:700 10.5px 'Inter';letter-spacing:.12em;text-transform:uppercase;color:#9a8f7f")}>A pattern Uhuru noticed</span>
                    </div>
                    <div style={css('font-size:14.5px;color:#292828;line-height:1.55')}>{moodPattern}</div>
                  </div>

                  <div style={css("font:700 10.5px 'Inter';letter-spacing:.13em;text-transform:uppercase;color:#9a8f7f;margin:6px 0 11px")}>What helps you feel better</div>
                  <div style={css('display:flex;flex-wrap:wrap;gap:9px')}>
                    {whatHelps.map((h, idx) => (
                      <span key={idx} style={css("display:inline-flex;align-items:center;gap:7px;background:#fff;border:1px solid rgba(33,39,84,0.1);border-radius:999px;padding:9px 14px;font:500 13.5px 'Inter';color:#292828")}>
                        <span style={css('font-size:14px;display:flex;color:#7FB89A')}>{I.heart}</span>{h}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* ════ GOALS ════ */}
              {screen === 'goals' && (
                <div style={css('padding:8px 22px 30px;animation:uFade .3s ease')}>
                  <h2 style={css("margin:0 0 4px;font:600 23px 'Space Grotesk';color:#212754")}>Growing with you</h2>
                  <div style={css('font-size:13.5px;color:#9a8f7f;margin-bottom:20px')}>Small steps, your pace. Uhuru cheers you on, never pushes.</div>

                  {goals.map((g) => (
                    <div key={g.id} style={css('background:#fff;border:1px solid rgba(33,39,84,0.07);border-radius:20px;padding:18px;box-shadow:0 6px 20px -12px rgba(33,39,84,0.25);margin-bottom:13px')}>
                      <div style={css('display:flex;align-items:flex-start;gap:12px')}>
                        <span style={{ width: '40px', height: '40px', borderRadius: '12px', background: goalIconBg[g.icon], color: navy, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flex: 'none' }}>{goalIcons[g.icon]}</span>
                        <div style={css('flex:1')}>
                          <div style={css("font:600 16px 'Space Grotesk';color:#212754;line-height:1.3")}>{g.title}</div>
                          <div style={css('font-size:12.5px;color:#9a8f7f;margin-top:3px')}>{g.note}</div>
                        </div>
                      </div>
                      <div style={css('height:9px;border-radius:999px;background:#EFEAE4;margin-top:14px;overflow:hidden')}>
                        <span style={{ display: 'block', height: '100%', width: g.progress + '%', borderRadius: '999px', background: 'linear-gradient(90deg,#8FC1D9,#7FB89A)' }} />
                      </div>
                      <div style={css('display:flex;justify-content:space-between;align-items:center;margin-top:9px')}>
                        <span style={css('font-size:12px;color:#9a8f7f')}>{g.doneSteps} of {g.steps} steps</span>
                        <button onClick={() => stepGoal(g.id)} style={css("display:inline-flex;align-items:center;gap:6px;padding:7px 13px;border-radius:999px;border:1px solid rgba(33,39,84,0.12);background:#fff;color:#212754;font:600 12.5px 'Inter';cursor:pointer")}>
                          <span style={css('font-size:14px;display:flex')}>{I.plus}</span>{g.doneSteps >= g.steps ? 'Done' : 'I did this'}
                        </button>
                      </div>
                    </div>
                  ))}

                  <button onClick={addGoal} style={css("width:100%;display:flex;align-items:center;justify-content:center;gap:8px;background:transparent;border:2px dashed rgba(33,39,84,0.18);border-radius:18px;padding:15px;cursor:pointer;color:#212754;font:600 14px 'Inter';margin-top:4px")}>
                    <span style={css('font-size:17px;display:flex')}>{I.plus}</span>Add a tiny goal
                  </button>
                </div>
              )}

              {/* ════ ME / ABOUT ════ */}
              {screen === 'me' && (
                <div style={css('padding:8px 22px 30px;animation:uFade .3s ease')}>
                  {/* COVER */}
                  <div style={css('background:linear-gradient(160deg,#2A2F5C,#13203F);border-radius:22px;padding:22px;color:#fff;position:relative;overflow:hidden;margin-bottom:16px')}>
                    <div style={css('display:flex;justify-content:space-between;align-items:flex-start;position:relative;z-index:1')}>
                      <div style={css("font:700 10px 'Inter';letter-spacing:.16em;text-transform:uppercase;opacity:.6")}>Kept by Uhuru</div>
                      <span style={css("font:600 10.5px 'Inter';background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.18);padding:4px 9px;border-radius:7px")}>about-you.md</span>
                    </div>
                    <span style={css('position:relative;z-index:1;width:60px;height:60px;border-radius:50%;background:radial-gradient(circle at 35% 30%, #BBD7EB, #C9C2E8 55%, #F4C9A8);display:block;margin:18px 0 14px;box-shadow:0 10px 24px -8px rgba(0,0,0,0.4)')} />
                    <h2 style={css("font:600 27px 'Space Grotesk';margin:0;letter-spacing:-0.02em;position:relative;z-index:1")}>About You</h2>
                    <div style={css('font-size:13.5px;opacity:.78;margin-top:7px;line-height:1.5;max-width:250px;position:relative;z-index:1')}>A living book Uhuru keeps as it learns who you are. Yours to read, edit, or rewrite — always.</div>
                    <div style={css('display:flex;gap:18px;margin-top:18px;position:relative;z-index:1')}>
                      <div><div style={css("font:700 18px 'Space Grotesk'")}>{entryCount}</div><div style={css('font-size:11px;opacity:.6')}>notes</div></div>
                      <div><div style={css("font:700 18px 'Space Grotesk'")}>{about.length}</div><div style={css('font-size:11px;opacity:.6')}>chapters</div></div>
                      <div><div style={css("font:700 18px 'Space Grotesk'")}>Today</div><div style={css('font-size:11px;opacity:.6')}>updated</div></div>
                    </div>
                    <span style={css('position:absolute;bottom:-50px;right:-30px;width:150px;height:150px;border-radius:50%;background:rgba(187,215,235,0.1)')} />
                  </div>

                  {/* TABLE OF CONTENTS */}
                  <div style={css('background:#fff;border:1px solid rgba(33,39,84,0.07);border-radius:18px;padding:18px 20px;margin-bottom:18px;box-shadow:0 4px 16px -10px rgba(33,39,84,0.2)')}>
                    <div style={css("font:700 10.5px 'Inter';letter-spacing:.13em;text-transform:uppercase;color:#9a8f7f;margin-bottom:13px")}>Contents</div>
                    {about.map((sec, i) => (
                      <div key={sec.id} style={css('display:flex;align-items:baseline;gap:8px;padding:7px 0')}>
                        <span style={css("font:600 13.5px 'Inter';color:#212754;flex:none")}>{i + 1}.</span>
                        <span style={css("font:500 14px 'Inter';color:#292828;flex:none")}>{sec.title}</span>
                        <span style={css('flex:1;border-bottom:1px dotted #c9c2b8;transform:translateY(-3px)')} />
                        <span style={css("font:600 12.5px 'Inter';color:#9a8f7f;flex:none")}>p.{i + 2}</span>
                      </div>
                    ))}
                  </div>

                  {about.map((sec, i) => (
                    <div key={sec.id} style={css('background:#fff;border:1px solid rgba(33,39,84,0.07);border-radius:18px;padding:20px 20px 12px;margin-bottom:14px;box-shadow:0 4px 16px -10px rgba(33,39,84,0.2)')}>
                      <div style={css('display:flex;align-items:center;gap:11px')}>
                        <span style={{ width: '36px', height: '36px', borderRadius: '11px', background: aboutIconBg[sec.id] ?? '#EAF2F9', color: navy, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flex: 'none' }}>{aboutIcons[sec.id] ?? I.spark}</span>
                        <div>
                          <div style={css("font:700 9.5px 'Inter';letter-spacing:.13em;text-transform:uppercase;color:#9a8f7f")}>Chapter {i + 1}</div>
                          <div style={css("font:600 16px 'Space Grotesk';color:#212754;letter-spacing:-0.01em")}>{sec.title}</div>
                        </div>
                      </div>
                      <div style={css('border-top:1px solid #f0ece4;margin:13px 0 2px')} />
                      {sec.facts.map((f) => {
                        const editing = editingFactId === f.id;
                        return (
                          <div key={f.id} style={css('display:flex;align-items:flex-start;gap:10px;padding:9px 0')}>
                            <span style={css('color:#C9C2E8;font-size:16px;line-height:1.4;flex:none')}>•</span>
                            {editing ? (
                              <>
                                <input value={editDraft} onChange={(e) => setEditDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(sec.id, f.id); }} style={css("flex:1;border:none;border-bottom:1.5px solid #c9c2b8;outline:none;background:transparent;font:500 14.5px 'Inter';color:#292828;padding-bottom:3px")} />
                                <button onClick={() => saveEdit(sec.id, f.id)} aria-label="Save" style={css('width:30px;height:30px;border-radius:8px;border:none;background:#212754;color:#fff;font-size:13px;display:flex;align-items:center;justify-content:center;cursor:pointer;flex:none')}>{I.check}</button>
                              </>
                            ) : (
                              <>
                                <span style={css("flex:1;font:500 14.5px 'Inter';color:#292828;line-height:1.45")}>{f.text}<span style={{ font: "600 10.5px 'Inter'", color: sourceColor(f.source), marginLeft: '7px', whiteSpace: 'nowrap' }}>· {f.source}</span></span>
                                <button onClick={() => startEdit(f.id, f.text)} aria-label="Edit" style={css('width:28px;height:28px;border-radius:7px;border:none;background:transparent;color:#b9b4ad;font-size:13px;display:flex;align-items:center;justify-content:center;cursor:pointer;flex:none')}>{I.pencil}</button>
                                <button onClick={() => forgetFact(sec.id, f.id)} aria-label="Forget" style={css('width:28px;height:28px;border-radius:7px;border:none;background:transparent;color:#d6a8a2;font-size:13px;display:flex;align-items:center;justify-content:center;cursor:pointer;flex:none')}>{I.x}</button>
                              </>
                            )}
                          </div>
                        );
                      })}
                      <button onClick={() => addFact(sec.id)} style={css("display:inline-flex;align-items:center;gap:6px;background:none;border:none;color:#8B7FC9;font:600 12.5px 'Inter';cursor:pointer;padding:6px 2px")}>
                        <span style={css('font-size:14px;display:flex')}>{I.plus}</span>Add a line
                      </button>
                      <div style={css("text-align:center;font:600 11px 'Inter';color:#c4bdb2;letter-spacing:.1em;margin-top:6px;padding-top:8px;border-top:1px solid #f4f1ea")}>— {i + 2} —</div>
                    </div>
                  ))}

                  <div style={css('background:linear-gradient(150deg,#212754,#3B2F6E);border-radius:20px;padding:22px;color:#fff;position:relative;overflow:hidden;margin-top:6px')}>
                    <div style={css("position:relative;z-index:1;font:700 9.5px 'Inter';letter-spacing:.14em;text-transform:uppercase;color:#C9C2E8")}>Go deeper</div>
                    <div style={css("position:relative;z-index:1;font:600 19px 'Space Grotesk';margin-top:8px;letter-spacing:-0.01em;max-width:255px;line-height:1.25")}>Increase personalisation with GreyEd’s own IP engine</div>
                    <div style={css('position:relative;z-index:1;font-size:13px;opacity:.82;margin-top:9px;line-height:1.55;max-width:265px')}>Connect Uhuru to GreyEd’s Hyper-Personalisation Engine — your learning style, pace and strengths, woven in. Privately, only with your consent.</div>
                    <button onClick={connectEngine} style={css("position:relative;z-index:1;margin-top:16px;display:inline-flex;align-items:center;gap:8px;padding:12px 18px;border-radius:13px;border:none;background:#fff;color:#212754;font:600 14px 'Inter';cursor:pointer")}>Connect the engine<span style={css('font-size:15px;display:flex')}>{I.chevron}</span></button>
                    <span style={css('position:absolute;top:-40px;right:-30px;width:130px;height:130px;border-radius:50%;background:radial-gradient(circle at 40% 40%, rgba(201,194,232,0.4), transparent)')} />
                  </div>
                </div>
              )}

            </div>

            {/* BOTTOM NAV */}
            <div style={css('flex:none;display:flex;border-top:1px solid rgba(33,39,84,0.07);background:#fff;padding:6px 4px 10px')}>
              {([
                { key: 'home', label: 'Home', icon: I.home, go: () => setScreen('home') },
                { key: 'chat', label: 'Chat', icon: I.chat, go: () => setScreen('chat') },
                { key: 'mood', label: 'Mood', icon: I.heart, go: () => setScreen('mood') },
                { key: 'goals', label: 'Grow', icon: I.leaf, go: () => setScreen('goals') },
                { key: 'me', label: 'Me', icon: I.memory, go: () => setScreen('me') },
              ] as const).map((item) => {
                const ni = navItem(screen === item.key);
                return (
                  <button key={item.key} onClick={item.go} style={css('flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;background:none;border:none;cursor:pointer;padding:7px 0')}>
                    <span style={ni.icon}>{item.icon}</span>
                    <span style={ni.label}>{item.label}</span>
                  </button>
                );
              })}
            </div>

            {/* VOICE MODE */}
            {voiceOn && (
              <div style={css('position:absolute;inset:0;z-index:50;background:linear-gradient(170deg,#1B2046,#0A0F22);display:flex;flex-direction:column;align-items:center;justify-content:space-between;padding:56px 28px 32px;animation:uFade .3s ease')}>
                <div style={css('display:flex;flex-direction:column;align-items:center;gap:7px')}>
                  <div style={css('display:inline-flex;align-items:center;gap:8px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.14);padding:6px 13px;border-radius:999px')}>
                    <span style={css('width:7px;height:7px;border-radius:50%;background:#7FB89A;display:block')} />
                    <span style={css("font:600 12px 'Inter';color:#fff")}>Uhuru Voice</span>
                    <span style={css("font:700 9px 'Inter';letter-spacing:.1em;color:rgba(255,255,255,0.5)")}>UV1</span>
                  </div>
                  <div style={css('font-size:11px;color:rgba(255,255,255,0.4)')}>Mental health by Uhuru Health &amp; GreyEd</div>
                </div>

                <div style={css('display:flex;flex-direction:column;align-items:center')}>
                  <div style={css('position:relative;width:210px;height:210px;display:flex;align-items:center;justify-content:center')}>
                    <span style={css('position:absolute;width:200px;height:200px;border-radius:50%;border:1.5px solid rgba(187,215,235,0.32);animation:uRing 3s ease-out infinite')} />
                    <span style={css('position:absolute;width:200px;height:200px;border-radius:50%;border:1.5px solid rgba(201,194,232,0.26);animation:uRing 3s ease-out infinite 1s')} />
                    <span style={css('position:absolute;width:200px;height:200px;border-radius:50%;border:1.5px solid rgba(244,201,168,0.2);animation:uRing 3s ease-out infinite 2s')} />
                    <span style={css('width:130px;height:130px;border-radius:50%;background:radial-gradient(circle at 35% 30%, #BBD7EB, #C9C2E8 55%, #F4C9A8);box-shadow:0 0 70px -8px rgba(201,194,232,0.7);animation:uBreathe 3.4s ease-in-out infinite')} />
                  </div>
                  <div style={css('display:flex;align-items:center;gap:5px;height:48px;margin-top:26px')}>
                    {vbarDur.map((dur, i) => (
                      <span key={i} style={{ width: '5px', height: '46px', borderRadius: '999px', background: 'linear-gradient(180deg,#BBD7EB,#C9C2E8)', transformOrigin: 'center', animation: `uBar ${dur}s ease-in-out infinite`, animationDelay: `${i * 0.12}s`, display: 'block' }} />
                    ))}
                  </div>
                  <div style={css("font:500 19px 'Space Grotesk';color:#fff;text-align:center;max-width:290px;line-height:1.45;margin-top:24px;min-height:56px")}>{voiceCaption}</div>
                  <div style={css('font-size:12.5px;color:rgba(255,255,255,0.45);margin-top:6px')}>{voiceStatusMap[voiceStage]}</div>
                </div>

                <button onClick={closeVoice} style={css('width:64px;height:64px;border-radius:50%;border:none;background:#E0594B;color:#fff;font-size:24px;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 12px 30px -8px rgba(224,89,75,0.6)')}>{I.x}</button>
              </div>
            )}

            {/* TOAST */}
            {toastMsg && (
              <div style={css("position:absolute;left:50%;bottom:88px;transform:translateX(-50%);background:#212754;color:#fff;padding:11px 18px;border-radius:999px;display:flex;align-items:center;gap:8px;font:600 13px 'Inter';box-shadow:0 14px 32px -8px rgba(0,0,0,0.45);z-index:40;white-space:nowrap;animation:uFade .25s")}>
                <span style={css('color:#C9C2E8;font-size:16px;display:flex')}>{I.sparkle}</span>{toastMsg}
              </div>
            )}

          </div>
        </div>
        <div style={css('text-align:center;margin-top:14px;font-size:12.5px;color:#7c7773;max-width:392px')}>Try it — pick a mood, talk to Uhuru, and watch it learn. Everything it remembers lives in <b style={css('color:#212754')}>Me</b>, fully editable.</div>
      </div>
    </div>
  );
}
