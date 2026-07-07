// CCS Student Government Jeopardy: question bank
// Sourced from CCS_SG_Jeopardy_Questions_Draft1.md.
// Each category holds 5 clues at $100/$200/$300/$400/$500.
// "Points of Order" has no drafted content yet, so cells are flagged
// `empty: true` so the host board can visibly skip/grey them out
// instead of silently pretending there's content.

export const CATEGORIES = [
  {
    name: 'Elections &\nNominations',
    clues: [
      {
        value: 100,
        question: 'This many days nominees get to accept or decline their Department Representative nomination.',
        answer: 'What is two (2) full days?',
      },
      {
        value: 200,
        question: 'This is the one thing every Letter of Intent has to include besides your name, pronouns, department, and year.',
        answer: 'What is why you\'re running / your relevant experience / your goals? (any of the three counts)',
      },
      {
        value: 300,
        question: 'If a Department Representative election ends in a tie, this happens before anyone revotes.',
        answer: 'What is a one-week postponement for more campaigning?',
      },
      {
        value: 400,
        question: 'Unlike Department Rep elections, Executive Board candidates have to do this in front of everyone on Election Day before the ballot even opens.',
        answer: 'What is give a short speech?',
      },
      {
        value: 500,
        question: 'This is who actually votes for the Executive Board, not the whole student body.',
        answer: 'What is the existing/outgoing Student Government Representatives?',
      },
    ],
  },
  {
    name: 'Reps &\nAlternates',
    clues: [
      {
        value: 100,
        question: 'This many meetings missed in a semester gets a Representative automatically dismissed.',
        answer: 'What is four (4)?',
      },
      {
        value: 200,
        question: 'This is the difference between what a Representative and an Alternate owe their department, day to day.',
        answer: 'What is: nothing, really; an Alternate has the same duty to represent department interests and must step into the Rep\'s tasks in their absence?',
      },
      {
        value: 300,
        question: 'Every Rep and Alternate has to do this "outlined in Article IX" whether they like it or not.',
        answer: 'What is join a committee?',
      },
      {
        value: 400,
        question: 'Name one of the three narrow situations where missing a Student Government meeting actually counts as excused.',
        answer: 'What is a conflicting department-wide meeting, a required academic trip, or a qualifying multi-day department trip? (any one counts)',
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
        question: 'This officer runs the Instagram, the Peacock Pride page, and checks posters for mistakes before they go up.',
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
    clues: [
      {
        value: 100,
        question: 'This is the number of standing committees Student Government runs.',
        answer: 'What is four (4)?',
      },
      {
        value: 200,
        question: 'Dining, sustainability, building maintenance, and studio/lab access all live under this committee.',
        answer: 'What is Facilities?',
      },
      {
        value: 300,
        question: 'This committee handles ADA/Title IX referrals, accessibility for working students, and support for international and parent students.',
        answer: 'What is Diversity, Equity, and Inclusion?',
      },
      {
        value: 400,
        question: 'Alternates can join a committee, but they cannot run for this specific role within one.',
        answer: 'What is Committee Head?',
      },
      {
        value: 500,
        question: 'A Committee Head can be forced to resign the same way a Representative can: name the vote threshold.',
        answer: 'What is a 3/4 vote?',
      },
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
        question: 'Historically, this is roughly how much per student the Student Government budget draws from tuition, up to a cap.',
        answer: 'What is $5 per student, up to $18,000?',
      },
      {
        value: 300,
        question: 'The Treasurer gives the budget update at this specific point in the meeting relative to funding proposals, and for a specific reason.',
        answer: 'What is after proposals, once the proposing students have left the room (so the budget\'s status doesn\'t influence the proposal itself)?',
      },
      {
        value: 400,
        question: 'This is how many Representatives it takes to call a special meeting through the President.',
        answer: 'What is three (3)?',
      },
      {
        value: 500,
        question: 'Once a constitutional amendment passes by 3/4 vote, this is how long it\'s protected before it can be touched again.',
        answer: 'What is two academic years (four semesters)?',
      },
    ],
  },
  {
    name: 'Points\nof Order',
    // No clues drafted yet; flagged so the board renders these tiles as
    // empty/unavailable instead of inventing content. Fill in `clues`
    // with 5 { value, question, answer } objects once content lands.
    empty: true,
    clues: [
      { value: 100, empty: true },
      { value: 200, empty: true },
      { value: 300, empty: true },
      { value: 400, empty: true },
      { value: 500, empty: true },
    ],
  },
];

if (typeof module !== 'undefined' && module.exports) {
  module.exports = CATEGORIES;
}
