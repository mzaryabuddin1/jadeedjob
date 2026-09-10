type JsonRecord = Record<string, any>;

function publisher(input: JsonRecord | null | undefined) {
  if (!input) return null;
  return {
    type: input.type === 'company' ? 'company' : 'user',
    id: String(input.id || ''),
    name: String(input.name || 'JobsLoot member'),
    handle: String(input.handle || ''),
    avatarUri: input.avatarUri || null,
    verified: Boolean(input.verified),
  };
}

function stats(input: JsonRecord | null | undefined) {
  return {
    likes: Math.max(0, Number(input?.likes || 0)),
    comments: Math.max(0, Number(input?.comments || 0)),
    shares: Math.max(0, Number(input?.shares || 0)),
  };
}

function media(input: JsonRecord | null | undefined) {
  if (!input || (input.type !== 'image' && input.type !== 'video')) return null;
  return {
    type: input.type,
    assetId: input.assetId || null,
    url: input.url || null,
    thumbnailAssetId: input.thumbnailAssetId || null,
    thumbnailUrl: input.thumbnailUrl || null,
    durationSeconds: input.durationSeconds
      ? Number(input.durationSeconds)
      : null,
  };
}

export function projectPublicPost(input: JsonRecord) {
  return {
    id: String(input.id),
    publisher: publisher(input.publisher),
    body: String(input.body || ''),
    media: media(input.media),
    linkedJob: input.linkedJob
      ? {
          id: String(input.linkedJob.id),
          title: String(input.linkedJob.title || 'Job'),
          companyName: String(input.linkedJob.companyName || 'Employer'),
        }
      : null,
    stats: stats(input.stats),
    allowComments: input.allowComments !== false,
    createdAt: input.createdAt,
  };
}

export function projectPublicReel(input: JsonRecord) {
  return {
    id: String(input.id),
    publisher: publisher(input.publisher || input.author),
    caption: String(input.caption || ''),
    category: String(input.category || 'community'),
    audioTitle: String(input.audioTitle || 'Original audio'),
    media: media(input.media) || {
      type: 'video',
      assetId: input.videoAssetId || null,
      url: input.videoUrl || null,
      thumbnailAssetId: null,
      thumbnailUrl: null,
      durationSeconds: null,
    },
    linkedJobId: input.linkedJobId ? String(input.linkedJobId) : null,
    stats: stats(input.stats),
    allowComments: input.allowComments !== false,
    allowSharing: input.allowSharing !== false,
    createdAt: input.createdAt,
    publishedAt: input.publishedAt,
  };
}

export function projectPublicComment(input: JsonRecord) {
  return {
    id: String(input.id),
    author: publisher(input.author),
    text: String(input.text || ''),
    createdAt: input.createdAt,
  };
}

export function projectPublicProfile(input: JsonRecord) {
  const profile = input.profile || input;
  const socialLinks = profile.socialLinks || {};
  return {
    profile: {
      type: profile.type === 'company' ? 'company' : 'user',
      id: String(profile.id || ''),
      name: String(profile.name || 'JobsLoot member'),
      handle: String(profile.handle || ''),
      avatarUri: profile.avatarUri || null,
      verified: Boolean(profile.verified),
      subtitle: profile.subtitle || null,
      location: profile.location || null,
      bio: profile.bio || null,
      rating: {
        average: Math.max(0, Number(profile.rating?.average || 0)),
        count: Math.max(0, Number(profile.rating?.count || 0)),
      },
      followersCount: Math.max(0, Number(profile.followersCount || 0)),
      skills: Array.isArray(profile.skills) ? profile.skills : [],
      locations: Array.isArray(profile.locations) ? profile.locations : [],
      website: profile.website || null,
      socialLinks: Object.fromEntries(
        Object.entries(socialLinks).filter(
          ([, value]) => value === null || typeof value === 'string',
        ),
      ),
    },
  };
}
