// Single source of truth for the event details shown in the portal and the PDF.
export const EVENT = {
  name: 'AIExplore 2026',
  date: '23 October 2026',
  venue: 'LAB 307',
  reportTime: '9:15 AM',
  startTime: '9:30 AM',
}

export const INSTRUCTIONS = [
  `Reach ${EVENT.venue} by ${EVENT.reportTime} on ${EVENT.date}.`,
  `The competition starts at ${EVENT.startTime} sharp.`,
  'Bring your own laptops — arrange them in advance.',
  'One team can select only ONE problem statement. Once locked, it cannot be changed.',
  'No other team can select a problem statement your team has already locked.',
  'Both members of the team work on the same locked problem statement.',
  'Attendance will be taken two times during the competition.',
  'Judgement will be conducted at the end of the competition.',
  'Final attendance will be taken from the judgement attendance sheet only — you must be present at the judgement round.',
]
