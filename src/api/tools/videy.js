import multer from 'multer'

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 500 * 1024 * 1024 } // 500MB
})

export default function (app) {

  app.post('/tools/videy', upload.single('file'), async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ status: false, error: 'File video wajib diupload (field: file)' })
    }

    const { buffer, mimetype } = req.file

    if (!mimetype.startsWith('video/')) {
      return res.status(400).json({ status: false, error: 'File yang diupload bukan video' })
    }

    try {
      const ext = mimetype.split('/')[1] || 'mp4'

      const form = new FormData()
      form.append('file', new Blob([buffer], { type: mimetype }), `video.${ext}`)

      const videyRes = await fetch('https://videy.co/api/upload?visitorId=' + crypto.randomUUID(), {
        method: 'POST',
        headers: {
          'User-Agent': 'Mozilla/5.0',
          'Accept': 'application/json',
          'origin': 'https://videy.co',
          'referer': 'https://videy.co/'
        },
        body: form
      })

      const resCT = videyRes.headers.get('content-type') || ''

      if (!videyRes.ok || !resCT.includes('application/json')) {
        const errText = await videyRes.text().catch(() => 'Unknown error')
        let errMsg = errText
        try { errMsg = JSON.parse(errText)?.message || errText } catch {}
        return res.status(502).json({ status: false, error: `Videy error: ${errMsg}` })
      }

      const result = await videyRes.json()

      res.status(200).json({ status: true, creator: 'zyraa', result })

    } catch (e) {
      res.status(500).json({ status: false, error: e.message })
    }
  })

}
