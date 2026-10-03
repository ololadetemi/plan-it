// Written once, gender-neutral, shared by all five themes. No em dashes.
export const QUOTES = [
  "You are allowed to outgrow the version of you that survived.",
  "Rest is part of the work, not a reward for finishing it.",
  "Slow growth is still growth. Roots don't rush.",
  "You can be gentle with yourself and still be serious about your dreams.",
  "What you practise quietly becomes who you are loudly.",
  "Discipline is a love letter to the person you're becoming.",
  "Not every season is for blooming. Some are for roots.",
  "Build the life that feels like peace, not the one that only looks impressive.",
  "Your pace is not a problem to be solved.",
  "Small promises kept to yourself add up to self-trust.",
  "You don't have to see the whole staircase. Just take the next step.",
  "A full calendar is not the same as a full life.",
  "Speak as if the room needs what you know, because it might.",
  "Becoming takes time. Let it.",
  "Soft mornings, strong schedule.",
  "Tick one thing, feel a little sparkle.",
  "Hydrate, hustle gently, repeat.",
  "Today's dress code: unbothered and on time.",
  "Main character energy, minimal drama.",
  "Make it pretty, make it happen.",
  "A tidy list and a cup of tea can fix a lot.",
  "Do it dressed up. Do it in pyjamas. Just do it.",
  "You planned, you showed up, you got it done.",
  "Be the reason your future self says thank you.",
  "Little bows on big goals.",
  "Stitch by stitch, day by day.",
  "Read a page. Write a line. Walk a little. That's a good day.",
  "Grace and grit can share a to-do list.",
  "Be kind, be sharp, be finished by six.",
  "Confidence looks good on you.",];

// Little cheers that appear when you tick a task off.
export const ENCOURAGE = [
  "One down. You're doing beautifully.",
  "Look at you getting things done.",
  "That counts. Every tick counts.",
  "Proud of you already.",
  "Yes! Keep that gentle momentum.",
  "Little wins, big glow.",
  "You make this look easy.",
  "Tiny step, real progress.",
  "Well done. That one is finished.",
  "Steady and strong. Keep going.",
];

// When the whole day's list is finished.
export const ENCOURAGE_ALL = [
  "Every single one. Go rest, you've earned it.",
  "A whole list, finished. You're incredible.",
  "All done. Be proud of today.",
];

export const STREAK_LINES: Record<number, [string, string]> = {
  4: ["Four days. You're building something.", "A little rhythm is forming. Keep it going."],
  7: ["A full week. That's a real habit now.", "Seven days of showing up for yourself."],
  12: ["Twelve days strong.", "This is becoming part of who you are."],
  20: ["Twenty days. Remarkable.", "Look how far this quiet consistency has taken you."],
};
export const STREAK_MILESTONES = [4, 7, 12, 20];

export const COUNT_LINES: Record<number, [string, string]> = {
  1: ["Your very first one.", "Every streak starts with a single task. Welcome in."],
  3: ["Three tasks down.", "A little rhythm is forming already."],
  5: ["Five tasks completed.", "You're settling into this."],
  10: ["Ten tasks done.", "That's a real stretch of follow-through."],
};
// Close together at first, then further apart; every 100 after 100.
const COUNT_LIST = [1, 3, 5, 10, 20, 35, 50, 75, 100];
export const isCountMilestone = (n: number) => COUNT_LIST.includes(n) || (n > 100 && n % 100 === 0);

export const THEME_META: Record<string, { label: string; icon: string; checkIcon: string | null; checkGlyph: string; spark: string }> = {
  pink: { label: "Pink & bow", icon: "bow", checkIcon: null, checkGlyph: "♥", spark: "♡ ˚ ⋆ ˚ ♡" },
  blue: { label: "Blue & tie", icon: "tie", checkIcon: "peace", checkGlyph: "", spark: "TODAY" },
  amber: { label: "Amber & star", icon: "star", checkIcon: "spark", checkGlyph: "", spark: "✦ ⋆ ✦" },
  green: { label: "Green & star", icon: "star", checkIcon: "spark", checkGlyph: "", spark: "✦ ⋆ ✦" },
  mono: { label: "Mono ✨", icon: "diamond", checkIcon: null, checkGlyph: "✨", spark: "✧ · ✧" },
};
export const THEMES = ["pink", "blue", "amber", "green", "mono"];
