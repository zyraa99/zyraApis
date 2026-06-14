import axios from 'axios';

const TikTokSearch = {
    _api: 'https://tikwm.com/api/feed/search',

    search: async (keywords, count = 12) => {
        if (!keywords) return { success: false, message: 'KEYWORDS_REQUIRED' };

        try {
            const payload = new URLSearchParams({
                keywords: keywords,
                count: count,
                cursor: 0,
                HD: 1
            });

            const { data } = await axios({
                method: 'POST',
                url: TikTokSearch._api,
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Cookie': 'current_language=en'
                },
                data: payload.toString()
            });

            const videos = data?.data?.videos;
            if (!videos || videos.length === 0) {
                return { success: false, message: 'NO_VIDEOS_FOUND' };
            }

            const fixUrl = (url) => {
                if (!url) return '';
                if (url.startsWith('http')) return url;
                return `https://tikwm.com${url}`;
            };

            const results = videos.map(v => ({
                id: v.video_id,
                region: v.region,
                title: v.title || 'No Title',
                cover: fixUrl(v.cover),
                duration: v.duration,
                media: {
                    no_watermark: fixUrl(v.play),
                    watermark: fixUrl(v.wmplay),
                    hd_video: fixUrl(v.hdplay),
                    music: fixUrl(v.music)
                },
                stats: {
                    play_count: v.play_count,
                    digg_count: v.digg_count,
                    comment_count: v.comment_count,
                    share_count: v.share_count
                },
                author: {
                    id: v.author.id,
                    unique_id: v.author.unique_id,
                    nickname: v.author.nickname,
                    avatar: fixUrl(v.author.avatar)
                }
            }));

            return {
                status: 200,
                success: true,
                total: results.length,
                query: keywords,
                payload: results
            };

        } catch (err) {
            return { status: 500, success: false, message: err.message };
        }
    }
};

export default function(app) {

    app.get('/search/tiktok', async (req, res) => {
        const { q, count = 12 } = req.query;
        if (!q) return res.status(400).json({ status: false, error: 'Query is required' });
        try {
            const result = await TikTokSearch.search(q, count);
            if (!result.success) return res.status(404).json({ status: false, error: result.message });
            res.status(200).json({ status: true, result });
        } catch (e) {
            res.status(500).json({ status: false, error: e.message });
        }
    });

              }
              
