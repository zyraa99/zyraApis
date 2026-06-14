import axios from 'axios'

import * as cheerio from 'cheerio'

const HEADERS = {

  'User-Agent':

    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36'

}

async function getAppDetails(url) {

  const { data } = await axios.get(url, {

    headers: HEADERS,

    timeout: 30000

  })

  const $ = cheerio.load(data)

  const text = $('body').text()

  return {

    title: $('h1').first().text().trim() || null,

    version: text.match(/Version:\s*([^\n]+)/i)?.[1]?.trim() || null,

    android: text.match(/Android\s+([0-9.]+\s*\+?)/i)?.[1] || null,

    size: text.match(/(\d+(?:\.\d+)?(?:Mb|MB|Gb|GB|Kb|KB))/)?.[1] || null,

    updated:

      text.match(/Updated\s+([A-Za-z]+\s+\d{1,2},\s+\d{4})/)?.[1] || null,

    installs:

      text.match(/Installs\s+([0-9\s,+]+)/)?.[1]?.trim() || null,

    url

  }

}

async function searchAN1(query) {

  const searchUrl =

    `https://an1.com/?do=search&subaction=search&story=${encodeURIComponent(query)}`

  const { data } = await axios.get(searchUrl, {

    headers: HEADERS,

    timeout: 30000

  })

  const $ = cheerio.load(data)

  const links = []

  const seen = new Set()

  $('a[href]').each((_, el) => {

    const title = $(el).text().trim()

    let href = $(el).attr('href')

    if (!title) return

    if (!title.toLowerCase().includes(query.toLowerCase())) return

    if (href.startsWith('/')) {

      href = `https://an1.com${href}`

    }

    if (!href.endsWith('.html')) return

    if (seen.has(href)) return

    seen.add(href)

    links.push(href)

  })

  const results = await Promise.allSettled(

    links.map(getAppDetails)

  )

  return results

    .filter(v => v.status === 'fulfilled')

    .map(v => v.value)

}

export default function (app) {

  app.get('/search/an1', async (req, res) => {

    const { query } = req.query

    if (!query?.trim()) {

      return res.status(400).json({

        status: false,

        error: 'Parameter "query" wajib diisi'

      })

    }

    try {

      const result = await searchAN1(query)

      res.json({

        status: true,

        creator: 'zyraa',

        total: result.length,

        result

      })

    } catch (e) {

      res.status(500).json({

        status: false,

        error: e.message

      })

    }

  })

}