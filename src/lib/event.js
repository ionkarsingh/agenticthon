// Single source of truth for the event details shown in the portal and the PDF.
export const EVENT = {
  name: 'AIExplore 2026',
  date: '23 October 2026',
  venue: 'TBD',
  reportTime: '9:00 AM',
  startTime: 'TBD',
}

export const INSTRUCTIONS = [
  `Report by ${EVENT.reportTime} on ${EVENT.date}. Venue to be announced.`,
  `Competition start time to be announced.`,
  'Bring your own laptops — arrange them in advance.',
  'One team can select only ONE problem statement. Once locked, it cannot be changed.',
  'No other team can select a problem statement your team has already locked.',
  'Both members of the team work on the same locked problem statement.',
  'Attendance will be taken two times during the competition.',
  'Judgement will be conducted at the end of the competition.',
  'Final attendance will be taken from the judgement attendance sheet only — you must be present at the judgement round.',
]
