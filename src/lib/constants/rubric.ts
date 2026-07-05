export const EVALUATION_CRITERIA = [
  {
    key: "innovation",
    name: "Innovation & Originality",
    description: "How creative and unique is the solution? Does it solve the problem in a novel way?",
    weight: 0.20,
    maxScore: 10,
  },
  {
    key: "technical",
    name: "Technical Complexity",
    description: "Architecture quality, engineering depth, code quality, and problem-solving approach.",
    weight: 0.25,
    maxScore: 10,
  },
  {
    key: "uiux",
    name: "UI/UX & Design",
    description: "User experience, interface design, accessibility, and overall visual quality.",
    weight: 0.20,
    maxScore: 10,
  },
  {
    key: "business",
    name: "Business Model & Viability",
    description: "Market potential, scalability, sustainability, and real-world applicability.",
    weight: 0.20,
    maxScore: 10,
  },
  {
    key: "presentation",
    name: "Presentation & Communication",
    description: "Clarity of documentation, demo quality, and ability to communicate the solution.",
    weight: 0.15,
    maxScore: 10,
  },
] as const;

export type CriteriaKey = (typeof EVALUATION_CRITERIA)[number]["key"];

export const TOTAL_WEIGHT = EVALUATION_CRITERIA.reduce((sum, c) => sum + c.weight, 0);
