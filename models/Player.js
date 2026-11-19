/** Build a plain mock player; private activity metadata stays server-side. */
export function Player(playerId, now, profile = {}) {
  return {
    playerId, username: profile.username ?? `Player${playerId}`,
    language: profile.language ?? 'en',
    avatar: profile.avatar ?? `https://api.dicebear.com/9.x/shapes/svg?seed=degrid-${playerId}`,
    isConnected: true, lastSeen: now, exit: false,
  };
}
