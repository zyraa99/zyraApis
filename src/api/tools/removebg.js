export default function (app) {

  app.get('/tools/removebg', async (req, res) => {
    const { url } = req.query

    if (!url?.trim()) {
      return res.status(400).json({ status: false, error: 'Parameter "url" wajib diisi' })
    }

    // Validasi url harus http/https
    let parsedUrl
    try {
      parsedUrl = new URL(url.trim())
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) throw new Error()
    } catch {
      return res.status(400).json({ status: false, error: 'URL tidak valid' })
    }

    try {
      // 1. Fetch gambar dari URL
      const imgRes = await fetch(parsedUrl.href, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'image/*,*/*'
        }
      })

      if (!imgRes.ok) {
        return res.status(400).json({ status: false, error: `Gagal fetch gambar: HTTP ${imgRes.status}` })
      }

      const rawCT = imgRes.headers.get('content-type') || 'image/jpeg'
      if (!rawCT.startsWith('image/')) {
        return res.status(400).json({ status: false, error: 'URL bukan gambar yang valid' })
      }

      const imgBuffer = await imgRes.arrayBuffer()

      // 2. Kirim ke Pixelcut
      const form = new FormData()
      form.append('image', new Blob([imgBuffer], { type: rawCT }), 'image.jpg')
      form.append('format', 'png')
      form.append('model', 'v1')

      const pixRes = await fetch('https://api2.pixelcut.app/image/matte/v1', {
        method: 'POST',
        headers: {
          'User-Agent':         'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36',
          'Accept':             'application/json, text/plain, */*',
          'sec-ch-ua':          '"Chromium";v="139", "Not;A=Brand";v="99"',
          'x-locale':           'en',
          'x-client-version':   'web:pixa.com:4a5b0af2',
          'sec-ch-ua-mobile':   '?1',
          'sec-ch-ua-platform': '"Android"',
          'origin':             'https://www.pixa.com',
          'sec-fetch-site':     'cross-site',
          'sec-fetch-mode':     'cors',
          'sec-fetch-dest':     'empty',
          'referer':            'https://www.pixa.com/',
          'accept-language':    'id-ID,id;q=0.9,en-AU;q=0.8,en;q=0.7,en-US;q=0.6'
        },
        body: form
      })

      // Cek content-type response Pixelcut
      const resCT = pixRes.headers.get('content-type') || ''

      if (!pixRes.ok || !resCT.startsWith('image/')) {
        // Pixelcut kembaliin error JSON
        const errText = await pixRes.text().catch(() => 'Unknown error')
        let errMsg = errText
        try { errMsg = JSON.parse(errText)?.message || errText } catch {}
        return res.status(502).json({ status: false, error: `Pixelcut error: ${errMsg}` })
      }

      const result = Buffer.from(await pixRes.arrayBuffer())

      res.setHeader('Content-Type', 'image/png')
      res.setHeader('Content-Disposition', 'inline; filename="removebg.png"')
      res.setHeader('Content-Length', result.length)
      res.status(200).send(result)

    } catch (e) {
      res.status(500).json({ status: false, error: e.message })
    }
  })

}
