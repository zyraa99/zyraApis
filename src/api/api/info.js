export default function(app) {

    

    app.use((req, res, next) => {
      
        next();
    });

    function runtime(seconds) {
        seconds = Number(seconds);
        const d = Math.floor(seconds / (3600 * 24));
        const h = Math.floor(seconds % (3600 * 24) / 3600);
        const m = Math.floor(seconds % 3600 / 60);
        const s = Math.floor(seconds % 60);
        return `${d}d ${h}h ${m}m ${s}s`;
    }

    function listRoutes() {
        if (!app._router) return 0;
        return app._router.stack.filter(layer => layer.route).length - 1;
    }

    app.get('/api/status', async (req, res) => {
        try {
            res.status(200).json({
                status: true,
                result: {
                    status: 'Aktif',
                    totalfitur: String(listRoutes()),
                    runtime: runtime(process.uptime()),
                    domain: req.hostname,
                    youtube: "https://www.youtube.com/@zyra422",
                    tiktok: "https://tiktok.com/@zyra224i"
                }
            });
        } catch (e) {
            res.status(500).json({ status: false, error: e.message });
        }
    });

}
