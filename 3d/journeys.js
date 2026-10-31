/** Finite editorial routes. Reasons are reading prompts, not quotations or claims of influence. */
const ROUTES = [
  {
    id: 'systems', title: 'How a world holds together',
    description: 'Move from feedback and emergence to an imagined ecology and an impossible library. Four different ways to ask how parts become a whole.',
    stops: [
      ['nonfiction', 'Thinking in Systems', 'Donella H. Meadows', 'Begin with the catalogue’s introduction to stocks, flows, feedback and delays.'],
      ['nonfiction', 'Complexity: A Guided Tour', 'Melanie Mitchell', 'Widen the question to emergence, networks, evolution and adaptation.'],
      ['science', 'Dune', 'Frank Herbert', 'Take those questions into fiction: examine ecology, resources and power on Arrakis.'],
      ['shortforms', 'The Library of Babel', 'Jorge Luis Borges', 'Finish with a thought experiment: does total possibility create meaning, or make it harder to find?']
    ]
  },
  {
    id: 'history', title: 'A life inside history',
    description: 'A journey between public events and private experience, ending with an author’s longer reading path.',
    stops: [
      ['world', 'War and Peace', 'Leo Tolstoy', 'Begin where the original note places family lives against the forces of war and history.'],
      ['world', 'Beloved', 'Toni Morrison', 'Shift attention to the catalogue’s themes of trauma, memory and survival.'],
      ['novellas', 'The Death of Ivan Ilyich', 'Leo Tolstoy', 'Narrow the frame from historical events to a single person confronting the meaning of a life.'],
      ['authors', 'Leo Tolstoy', 'Leo Tolstoy', 'Continue at Tolstoy’s desk with the original Atlas reading sequence.']
    ]
  },
  {
    id: 'futures', title: 'What could a society become?',
    description: 'Follow four imagined worlds, then bring their questions back to your own. This is an editorial route, not a claim that the works share one answer.',
    stops: [
      ['science', 'Frankenstein', 'Mary Shelley', 'Start with the responsibility of a creator toward a created being.'],
      ['science', 'The Left Hand of Darkness', 'Ursula K. Le Guin', 'Ask how unfamiliar assumptions can change the way trust and political loyalty are understood.'],
      ['science', 'The Dispossessed', 'Ursula K. Le Guin', 'Compare the promises and difficulties of the two societies described in the catalogue.'],
      ['shortforms', 'The Ones Who Walk Away from Omelas', 'Ursula K. Le Guin', 'End with a shorter question about the conditions on which a society’s happiness rests.']
    ]
  },
  {
    id: 'worlds', title: 'Four windows onto the world',
    description: 'Visit four country shelves through four distinct works. These are individual literary encounters, not summaries of whole countries.',
    stops: [
      ['world', 'Snow Country', 'Yasunari Kawabata', 'Begin at the Japan shelf; read its original introduction before entering this novel.', 'Japan'],
      ['world', 'Things Fall Apart', 'Chinua Achebe', 'Move to the Nigeria shelf and the catalogue’s account of Okonkwo, tradition and the arrival of missionaries.', 'Nigeria'],
      ['world', 'One Hundred Years of Solitude', 'Gabriel Garcia Marquez', 'Travel to the Colombia shelf and the family saga centred on Macondo.', 'Colombia'],
      ['world', 'Ficciones', 'Jorge Luis Borges', 'Finish in Argentina with stories of libraries, paradox and possible worlds.', 'Argentina']
    ]
  },
  {
    id: 'le-guin', title: 'An afternoon with Ursula Le Guin',
    description: 'Meet one writer across an essay, a novel, a book about craft and her existing author path. Four stops on four floors.',
    stops: [
      ['shortforms', 'The Carrier Bag Theory of Fiction', 'Ursula K. Le Guin', 'Begin with the essay’s alternative organising image for storytelling.'],
      ['science', 'The Dispossessed', 'Ursula K. Le Guin', 'Move into a novel and keep the question of how stories organise a world in mind.'],
      ['nonfiction', 'Steering the Craft', 'Ursula K. Le Guin', 'Turn toward the craft itself: sound, rhythm, point of view and narrative movement.'],
      ['authors', 'Ursula K. Le Guin', 'Ursula K. Le Guin', 'Open her author desk to continue through the original reading path and track your progress.']
    ]
  }
];

export function buildJourneys(atlas) {
  return ROUTES.map(route => ({
    id: route.id, title: route.title, description: route.description,
    stops: route.stops.map(([collection, title, author, reason, country]) => {
      const matches = atlas.books.filter(book => book.collection === collection && book.title === title && book.author === author && (!country || book.group?.country === country));
      if (matches.length !== 1) throw new Error(`Reading journey ${route.id}: expected one catalogue entry for ${title}, found ${matches.length}.`);
      return {uid: matches[0].uid, reason};
    })
  }));
}
