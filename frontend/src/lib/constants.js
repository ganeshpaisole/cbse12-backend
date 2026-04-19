export const SUBJECTS = {
  Physics: [
    'Electric Charges and Fields', 'Electrostatic Potential and Capacitance',
    'Current Electricity', 'Moving Charges and Magnetism', 'Magnetism and Matter',
    'Electromagnetic Induction', 'Alternating Current', 'Electromagnetic Waves',
    'Ray Optics and Optical Instruments', 'Wave Optics',
    'Dual Nature of Radiation and Matter', 'Atoms', 'Nuclei',
    'Semiconductor Electronics',
  ],
  Chemistry: [
    'The Solid State', 'Solutions', 'Electrochemistry', 'Chemical Kinetics',
    'Surface Chemistry', 'General Principles and Processes of Isolation of Elements',
    'The p-Block Elements', 'The d-and f-Block Elements', 'Coordination Compounds',
    'Haloalkanes and Haloarenes', 'Alcohols, Phenols and Ethers',
    'Aldehydes, Ketones and Carboxylic Acids', 'Amines', 'Biomolecules',
    'Polymers', 'Chemistry in Everyday Life',
  ],
  Mathematics: [
    'Relations and Functions', 'Inverse Trigonometric Functions', 'Matrices',
    'Determinants', 'Continuity and Differentiability', 'Application of Derivatives',
    'Integrals', 'Application of Integrals', 'Differential Equations',
    'Vector Algebra', 'Three Dimensional Geometry', 'Linear Programming', 'Probability',
  ],
  Biology: [
    'Reproduction in Organisms', 'Sexual Reproduction in Flowering Plants',
    'Human Reproduction', 'Reproductive Health',
    'Principles of Inheritance and Variation', 'Molecular Basis of Inheritance',
    'Evolution', 'Human Health and Disease',
    'Strategies for Enhancement in Food Production',
    'Microbes in Human Welfare', 'Biotechnology: Principles and Processes',
    'Biotechnology and its Applications', 'Organisms and Populations',
    'Ecosystem', 'Biodiversity and Conservation', 'Environmental Issues',
  ],
  'Computer Science': [
    'Python Fundamentals', 'Working with Functions', 'Using Python Libraries',
    'Reading and Writing Files', 'Database Management', 'SQL',
    'Computer Networks', 'Cybersafety',
  ],
  Economics: [
    'Introduction to Microeconomics', 'Consumer Equilibrium and Demand',
    'Producer Behaviour and Supply', 'Forms of Market and Price Determination',
    'National Income Accounting', 'Money and Banking',
    'Government Budget and Economy', 'Balance of Payments',
  ],
}

export const QUESTION_TYPES = [
  { value: 'mcq', label: 'MCQ', desc: 'Multiple Choice (4 options)' },
  { value: 'short', label: 'Short Answer', desc: '2 marks' },
  { value: 'long', label: 'Long Answer', desc: '5 marks' },
  { value: 'hots', label: 'HOTS', desc: 'Higher Order Thinking' },
  { value: 'fill', label: 'Fill in the Blank', desc: 'Completion type' },
  { value: 'assertion', label: 'Assertion-Reason', desc: 'Logic based' },
  { value: 'formula', label: 'Formula', desc: 'Physics/Chemistry' },
]

export const DIFFICULTIES = [
  { value: 'easy', label: 'Easy', color: 'text-success' },
  { value: 'medium', label: 'Medium', color: 'text-warning' },
  { value: 'hard', label: 'Hard', color: 'text-danger' },
  { value: 'mixed', label: 'Mixed', color: 'text-primary-light' },
]

export const EXAM_MODES = {
  cbse12: 'CBSE Class 12',
  jee_main: 'JEE Main',
  jee_adv: 'JEE Advanced',
  neet: 'NEET UG',
  mht_cet: 'MHT-CET',
  cuet: 'CUET',
  bitsat: 'BITSAT',
  iiser: 'IISER IAT',
}

export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
export const TIME_SLOTS = [
  '08:00', '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00', '17:00', '18:00',
]
