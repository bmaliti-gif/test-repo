import type { ListingStatus } from './database.types';

/** How each listing status looks on the landlord dashboard. */
export const LISTING_STATUS: Record<ListingStatus, { label: string; tag: string; hint: string }> = {
  draft: { label: 'Draft', tag: 'tag-neutral', hint: 'Not public yet. Add photos and publish.' },
  in_review: { label: 'In review', tag: 'tag-outline', hint: 'The BoardZM team is checking it, usually within a day.' },
  live: { label: 'Live', tag: 'tag-accent', hint: 'Tenants can find and reserve it.' },
  reserved: { label: 'Reserved', tag: 'tag-accent', hint: "A tenant's deposit is held." },
  let: { label: 'Let', tag: 'tag-neutral', hint: 'The tenant moved in. Relist it when the room is free again.' },
  rejected: { label: 'Rejected', tag: 'tag-outline', hint: 'Fix the reasons below, then relist it for review.' },
  archived: { label: 'Archived', tag: 'tag-neutral', hint: 'Hidden from tenants. Relist it any time.' },
};
