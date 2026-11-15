// Pure: the "Why it works?" note shown beside a playbook post's caption. One or two plain sentences per beat.

const WHY: Record<string, string> = {
  'just_listed.coming_soon': 'A teaser makes people curious before the home is even live. "Guess the price" gets comments, and comments push the post to more people.',
  'just_listed.editorial': 'A voiced tour feels like a real showing from the couch. People watch longer, and long watch time is what the apps reward.',
  'just_listed.room_by_room': 'One room per slide makes people swipe to the end to see it all. Every swipe tells the app the post is worth showing.',
  'just_listed.rate': '"Rate it 1 to 10" is an easy question everyone has an opinion on. Lots of quick comments put the home in front of new buyers.',
  'just_listed.neighborhood': 'Buyers pick a life, not just a house. Showing what is nearby answers their next question before they ask it.',
  'just_listed.buyers_miss': 'Useful tips get saved and shared, even by people who are not buying this home. You look like the expert, not just the seller.',
  'just_listed.status': 'A last call creates a little urgency. The comment keyword turns quiet watchers into leads you can message.',
  'market_update.stats': 'Real local numbers are hard to find and easy to trust. People save them and come back to the agent who posts them every week.',
  'market_update.stats_2': 'Real local numbers are hard to find and easy to trust. People save them and come back to the agent who posts them every week.',
  'market_update.stats_3': 'Real local numbers are hard to find and easy to trust. People save them and come back to the agent who posts them every week.',
  'market_update.state': 'The bigger picture helps people understand their own city. Posting it on a schedule makes you the go-to source.',
  'open_house.editorial': 'A tour before the open house gives people a reason to come see it in person. The RSVP keyword tells you who is coming.',
  'open_house.tips': 'A checklist is useful at any open house, so it gets saved. It also reminds people that yours is coming up.',
  'open_house.today': 'Posting on the day catches people with a free afternoon. Clear hours and address make it easy to just show up.',
  'price_drop.editorial': 'A new price is news. A fresh tour gives buyers who passed before a reason to look again.',
  'price_drop.new_price': 'Old price next to new price makes the deal clear in one second. Clear deals get shared with friends who are looking.',
  'price_drop.rate': 'Asking "worth it now?" invites people to judge the new price. Their comments spread the post to more buyers.',
  'just_sold.sold': 'A sold post is proof you get results. Sellers watching are thinking "could they sell mine?"',
  'just_sold.value': 'Right after a sale, neighbors wonder what their home is worth. The VALUE keyword turns that question into a seller lead.',
  'evergreen.buyer_myth': 'Busting a myth stops the scroll because people want to know if they were wrong. Myth posts get shared a lot.',
  'evergreen.seller_myth': 'Busting a myth stops the scroll because people want to know if they were wrong. Future sellers remember who set them straight.',
  'evergreen.first_time': 'First-time buyers are nervous and search for this. Helping them early makes you the agent they call.',
  'evergreen.seller_prep': 'Cheap, clear to-dos are easy to act on, so people save them. It shows sellers you know how to get top dollar.',
  'evergreen.closing_costs': 'Closing costs confuse almost every buyer. A simple answer builds trust before they ever meet you.',
  'evergreen.offer_tips': 'Everyone wants to win without overpaying. Practical moves get saved and sent to friends who are house hunting.',
  'evergreen.hire_agent': 'Teaching people what to ask an agent shows you have nothing to hide. That honesty makes them pick you.',
  'evergreen.day_in_life': 'Showing your real day builds a personal connection. People hire agents they feel they already know.',
  'evergreen.spotlight': 'Local spots are useful to buyers and locals alike. They show you know the area better than anyone.',
};

/** The "Why it works?" note for a playbook beat key, or null for posts outside the playbooks. */
export const whyOfBeat = (beatKey: string | null | undefined): string | null => (beatKey ? (WHY[beatKey] ?? null) : null);
