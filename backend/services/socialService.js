const pool = require('../db/pool');
const seasonService = require('./seasonService');
const raceEngine = require('./raceEngine');
const xpService = require('./xpService');
const cacheService = require('./cacheService');

function httpError(status, message) {
    const err = new Error(message);
    err.status = status;
    return err;
}

async function followUser(followerId, followingId) {
    if (followerId === followingId) {
        throw httpError(400, 'You cannot follow yourself');
    }
    const targetResult = await pool.query(`SELECT id FROM users WHERE id = $1`, [followingId]);
    if (!targetResult.rows[0]) throw httpError(404, 'User not found');

    await pool.query(
        `INSERT INTO followers (follower_id, following_id)
         VALUES ($1, $2)
         ON CONFLICT (follower_id, following_id) DO NOTHING`,
        [followerId, followingId]
    );
    await invalidateFollowSideEffects(followerId, followingId);
}

async function unfollowUser(followerId, followingId) {
    await pool.query(`DELETE FROM followers WHERE follower_id = $1 AND following_id = $2`, [
        followerId,
        followingId
    ]);
    await invalidateFollowSideEffects(followerId, followingId);
}

// A follow/unfollow changes both users' follower/following lists AND their
// cached profile (followersCount/followingCount live there too).
async function invalidateFollowSideEffects(followerId, followingId) {
    await Promise.all([
        cacheService.invalidateFollowerLists(followerId),
        cacheService.invalidateFollowerLists(followingId),
        cacheService.invalidateUserProfile(followerId),
        cacheService.invalidateUserProfile(followingId)
    ]);
}

async function fetchFollowers(userId) {
    const result = await pool.query(
        `SELECT users.id, users.username, followers.created_at AS followed_at
         FROM followers
         JOIN users ON users.id = followers.follower_id
         WHERE followers.following_id = $1
         ORDER BY followers.created_at DESC`,
        [userId]
    );
    return result.rows;
}

async function fetchFollowing(userId) {
    const result = await pool.query(
        `SELECT users.id, users.username, followers.created_at AS followed_at
         FROM followers
         JOIN users ON users.id = followers.following_id
         WHERE followers.follower_id = $1
         ORDER BY followers.created_at DESC`,
        [userId]
    );
    return result.rows;
}

async function getFollowers(userId) {
    return cacheService.getFollowerList(userId, 'followers', () => fetchFollowers(userId));
}

async function getFollowing(userId) {
    return cacheService.getFollowerList(userId, 'following', () => fetchFollowing(userId));
}

async function isFollowing(userId1, userId2) {
    const result = await pool.query(
        `SELECT 1 FROM followers WHERE follower_id = $1 AND following_id = $2`,
        [userId1, userId2]
    );
    return result.rows.length > 0;
}

async function getFollowingCounts(userId) {
    const result = await pool.query(
        `SELECT
             (SELECT COUNT(*)::int FROM followers WHERE following_id = $1) AS followers_count,
             (SELECT COUNT(*)::int FROM followers WHERE follower_id = $1) AS following_count`,
        [userId]
    );
    return result.rows[0];
}

/**
 * Leaderboard of the people userId follows, ranked by this season's XP.
 * Each row is annotated with the followed user's actual global season rank
 * (their leaderboard position among all players, not just this list) and
 * their last match ("recent activity").
 */
async function getFollowingFeed(userId) {
    const seasonNumber = await seasonService.getCurrentSeason();

    const result = await pool.query(
        `SELECT u.id AS user_id, u.username,
                COALESCE(x.total_xp, 0) AS total_xp,
                COALESCE(x.wins, 0) AS wins,
                COALESCE(x.losses, 0) AS losses
         FROM followers f
         JOIN users u ON u.id = f.following_id
         LEFT JOIN user_xp x ON x.user_id = u.id AND x.season_number = $2
         WHERE f.follower_id = $1
         ORDER BY total_xp DESC, wins DESC`,
        [userId, seasonNumber]
    );

    const feed = await Promise.all(
        result.rows.map(async (row) => {
            const [seasonStats, lastMatch] = await Promise.all([
                xpService.getUserSeasonStats(row.user_id, seasonNumber),
                raceEngine.getLastMatchResultForUser(row.user_id)
            ]);
            return { ...row, rank: seasonStats.rank, lastMatch };
        })
    );
    return feed;
}

module.exports = {
    followUser,
    unfollowUser,
    getFollowers,
    getFollowing,
    isFollowing,
    getFollowingCounts,
    getFollowingFeed
};
