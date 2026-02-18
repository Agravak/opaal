/**
 * Kid-friendly tooltip explanations for all configuration fields.
 * Written to be understandable by a 9-year-old.
 * Format: "Title\nExplanation text..."
 */

export const AGENT_FIELD_INFO = {
  name:
    'Agent Name\nThis is your helper\'s name! Pick something cool so you know who\'s who in your team.',

  role:
    'Agent Role\nThis is like picking a job for your helper. An Architect plans things out, a Developer builds code, a Reviewer checks for mistakes, and so on!',

  description:
    'What It Does\nTell your helper what its job is. Like writing a short job description — the more detail you give, the better it knows what to do!',

  output:
    'What It Makes\nWhat should this helper create when it\'s done? Maybe a file, a report, or some code. This tells the next helper in line what to expect.',

  instructions:
    'Detailed Instructions\nThink of this as the secret recipe for your helper. Step-by-step directions for exactly how it should do its job!',

  agentType:
    'Helper Type\nThis tells Claude what kind of helper to be! \'Explore\' is like a detective that looks through your code. \'Plan\' draws up blueprints. \'Bash\' runs terminal commands. \'General Purpose\' can do a bit of everything!',

  model:
    'Brain Power\nPick how smart your helper should be! \'Haiku\' is super fast like a rabbit. \'Sonnet\' is a great balance — smart AND fast. \'Opus\' is the biggest brain but takes a bit longer. \'Auto\' lets Claude pick!',

  allowedTools:
    'Tool Belt\nThese are the tools your helper can use. Green means ON, gray means OFF. \'Read\' peeks at files, \'Write\' creates new ones, \'Edit\' changes existing ones, \'Bash\' runs terminal commands, and the rest help search and browse.',

  onFailure:
    'Backup Plan\nWhat happens if your helper gets stuck? \'Retry\' tries again, \'Skip\' moves on to the next step, \'Ask User\' asks you for help, and \'Use Default\' fills in a placeholder answer.',

  contextNotes:
    'Extra Info\nGive your helper some extra context — like telling a friend the backstory before asking for help. This could be about your project, coding style, or anything useful!',

  equippedSkills:
    'Special Abilities\nSkills are like power-ups for your helper! Each skill teaches it something new — like how to write documents, create presentations, or search the web.',
} as const

export const CONNECTION_FIELD_INFO = {
  flowType:
    'When It Flows\n\'Always\' means data always passes through. \'Conditional\' only when something is true. \'Approval Gate\' waits for you to say OK. \'Loop\' keeps repeating until a goal is reached!',

  dataDescription:
    'What\'s Being Sent\nDescribe what information travels along this wire. It\'s like labeling a pipe so everyone knows what\'s flowing through it!',

  condition:
    'The Rule\nWrite the rule that decides if data should flow this way. Like: \'If the code review finds bugs...\' Only matching data takes this path.',

  edgeLabel:
    'Short Label\nA tiny label that shows up on the wire in the canvas. Keep it short — like \'passes\' or \'has errors\'.',

  elseBranch:
    'The Other Path\nCheck this if this wire is the \'otherwise\' path — the one taken when the condition is NOT true.',

  approvalPrompt:
    'Question to Ask\nWhat should the app ask you when it pauses here? Like: \'Does this plan look good to you?\'',

  loopConfiguration:
    'When to Stop\nTell the loop when it should stop repeating. Like: \'Keep going until all tests pass!\' Without this, it could loop forever.',

  maxIterations:
    'Safety Limit\nThe maximum number of times the loop can repeat. This is a safety net so it doesn\'t go on forever!',

  handoffFormat:
    'Packaging Style\nHow should the data be wrapped up before sending? \'Summary\' is a quick recap. \'JSON\' is organized data. \'File Reference\' points to files. \'Full Output\' sends everything as-is.',
} as const
