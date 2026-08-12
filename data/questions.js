// CCS Student Government Jeopardy: question bank
// Sourced from "CCS SG Jeopardy Full Question Set" (all categories, $100-$500).
// Each category holds 5 clues at $100/$200/$300/$400/$500.
// "Committees" has no drafted content in the current question set, so its
// cells are flagged `empty: true` so the host board can visibly skip/grey
// them out instead of silently pretending there's content.

export const CATEGORIES = [
  {
    name: 'How We\nWork',
    clues: [
      {
        value: 100,
        question: 'Representatives must hold this many department-wide meetings each semester.',
        answer: 'What is at least one department-wide meeting per semester?',
      },
      {
        value: 200,
        question: 'Representatives must meet with their Department Chair this often to discuss student concerns and share department feedback.',
        answer: 'What is at least once every other month?',
      },
      {
        value: 300,
        question: 'When a department\'s Voting Representative is absent, this member may vote on the department\'s behalf.',
        answer: 'Who is the Alternate Representative?',
      },
      {
        value: 400,
        question: 'When a Representative needs help with a department concern, the Constitution\'s usual support path starts with the department\'s Representatives and Alternates, then moves to the Executive Board, and reaches this person if the Executive Board needs additional guidance.',
        answer: 'Who is the Student Government Advisor?',
      },
      {
        value: 500,
        question: 'These are the Student Government meetings and assemblies members are expected to attend as part of their role.',
        answer: 'What are regular Student Government meetings, committee meetings, Student Assembly, and applicable special meetings?',
      },
    ],
  },
  {
    name: 'Reps &\nAlternates',
    clues: [
      {
        value: 100,
        question: 'This many absences in one semester results in automatic attendance dismissal.',
        answer: 'What is four (4)?',
      },
      {
        value: 200,
        question: 'This is the Alternate Representative\'s specific voting responsibility when the department\'s primary Voting Representative is absent.',
        answer: 'What is voting on behalf of the department?',
      },
      {
        value: 300,
        question: 'Both Representatives and Alternates help carry out Student Government\'s work by serving on one of these four standing groups.',
        answer: 'What is a Student Government committee?',
      },
      {
        value: 400,
        question: 'Name one type of required obligation that may count as an excused Student Government absence.',
        answer: 'What is required Student Government business, a mandatory department-wide meeting, or a department-organized academic trip?',
      },
      {
        value: 500,
        question: 'If a Rep gets dismissed, this is who takes over their seat first, before any new election happens.',
        answer: 'What is an Alternate from that same department?',
      },
    ],
  },
  {
    name: 'Executive\nBoard',
    clues: [
      {
        value: 100,
        question: 'These are the five Executive Board positions.',
        answer: 'What are President, Vice President, Treasurer, Secretary, and Outreach Manager?',
      },
      {
        value: 200,
        question: 'This officer is responsible for tracking attendance and following up with Reps who miss meetings.',
        answer: 'Who is the Vice President?',
      },
      {
        value: 300,
        question: 'This Executive Board member leads Student Government communications and engagement, manages its Instagram and Peacock Pride presence, promotes initiatives, and helps students learn how to get involved.',
        answer: 'Who is the Outreach Manager?',
      },
      {
        value: 400,
        question: 'If the President is lost to graduation, resignation, or dismissal, this is what happens: no election required.',
        answer: 'What is the Vice President automatically takes over?',
      },
      {
        value: 500,
        question: 'Every Executive Board member is also secretly doing this second job the whole time.',
        answer: 'What is serving as a voting Representative for their own department?',
      },
    ],
  },
  {
    name: 'Committees',
    // No clues drafted in the current question set; flagged so the board
    // renders these tiles as empty/unavailable instead of inventing content.
    // Fill in `clues` with 5 { value, question, answer } objects once
    // content lands.
    empty: true,
    clues: [
      { value: 100, empty: true },
      { value: 200, empty: true },
      { value: 300, empty: true },
      { value: 400, empty: true },
      { value: 500, empty: true },
    ],
  },
  {
    name: 'Money &\nMotions',
    clues: [
      {
        value: 100,
        question: 'This many Representatives must be present for Student Government to legally conduct business.',
        answer: 'What is a quorum of thirteen (13)?',
      },
      {
        value: 200,
        question: 'This is what happens to unused Student Government funds at the end of the academic year.',
        answer: 'What is roll over to the next academic year?',
      },
      {
        value: 300,
        question: 'The Treasurer gives the budget update at this specific point in the meeting relative to funding proposals, and for a specific reason.',
        answer: 'What is after proposals, once the proposing students have left the room (so the budget\'s status doesn\'t influence the proposal itself)?',
      },
      {
        value: 400,
        question: 'Within one month of receiving funding approval, students or RSOs submit itemized receipts to this person and copy Student Government so the award can be tracked.',
        answer: 'Who is their Program Manager or Advisor, with studentgov@ccsdetroit.edu copied?',
      },
      {
        value: 500,
        question: 'Once a constitutional amendment passes by 3/4 vote, this is how long it\'s protected before it can be touched again.',
        answer: 'What is two academic years (four semesters)?',
      },
    ],
  },
  {
    name: 'Funding in\nPractice',
    clues: [
      {
        value: 100,
        question: 'In addition to individual students and groups of students, these recognized campus groups may apply for Student Government project funding.',
        answer: 'What are Registered Student Organizations, or RSOs, in good standing?',
      },
      {
        value: 200,
        question: 'This is the maximum length of the applicant\'s funding proposal presentation before the five-minute question-and-answer period.',
        answer: 'What is five minutes?',
      },
      {
        value: 300,
        question: 'Representatives use this tool to guide discussion about a participant\'s preparation, budget, proposal, previous work, and need, but not to calculate a numerical score.',
        answer: 'What is the funding rubric?',
      },
      {
        value: 400,
        question: 'Even when Student Government approves a proposal, the award may be this instead of the full amount requested.',
        answer: 'What is partial funding?',
      },
      {
        value: 500,
        question: 'Under the ranked-choice funding process, this is the formula used to determine how many proposed funding amounts each Voting Representative may select.',
        answer: 'What is half the number of proposed funding amounts, rounded up? (For example, five proposed amounts give each Voting Representative three selections.)',
      },
    ],
  },
];

if (typeof module !== 'undefined' && module.exports) {
  module.exports = CATEGORIES;
}
