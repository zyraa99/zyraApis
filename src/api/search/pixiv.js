/**
 * Pixiv API Endpoint (ESM)
 * Convert Endpoint by Zyraa ⚡
 * Termux Ready 🗿
 */

import https from 'https'
import http from 'http'

const PIXIV_BASE = 'www.pixiv.net'

const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Linux; Android 12) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36',
  Referer: 'https://www.pixiv.net/',
  Accept: 'application/json',
  'Accept-Language': 'en-US,en;q=0.9'
}

function fetchData(url) {

  return new Promise((resolve, reject) => {

    const lib =
      url.startsWith('https')
        ? https
        : http

    const req = lib.get(
      url,
      {
        headers: HEADERS
      },
      res => {

        if (
          res.statusCode >= 300 &&
          res.statusCode < 400 &&
          res.headers.location
        ) {

          return fetchData(
            res.headers.location
          )
            .then(resolve)
            .catch(reject)

        }

        if (res.statusCode !== 200) {

          return reject(
            new Error(
              `HTTP ${res.statusCode}`
            )
          )

        }

        let data = ''

        res.setEncoding('utf8')

        res.on(
          'data',
          chunk => (data += chunk)
        )

        res.on(
          'end',
          () => resolve(data)
        )

      }
    )

    req.on('error', reject)

    req.setTimeout(15000, () => {

      req.destroy()

      reject(
        new Error('Request timeout')
      )

    })

  })

}

async function searchPixiv(
  query,
  options = {}
) {

  const {
    lang = 'en',
    type = 'all',
    limit = 10,
    popular = false,
    related = false
  } = options

  const apiUrl =
    `https://${PIXIV_BASE}/touch/ajax/tag_portal?word=${encodeURIComponent(query)}&lang=${lang}`

  const raw =
    await fetchData(apiUrl)

  const json =
    JSON.parse(raw)

  if (json.error) {

    throw new Error(
      json.message
    )

  }

  const body = json.body

  let result = {}

  if (popular) {

    result.popular =
      (body.popularWorks || [])
        .slice(0, limit)

  }

  if (
    type === 'all' ||
    type === 'illust'
  ) {

    result.illustrations =
      (body.illusts || [])
        .slice(0, limit)

  }

  if (
    type === 'all' ||
    type === 'manga'
  ) {

    result.manga =
      (body.manga || [])
        .slice(0, limit)

  }

  if (
    type === 'all' ||
    type === 'novel'
  ) {

    result.novels =
      (body.novels || [])
        .slice(0, limit)

  }

  if (related) {

    result.related_tags =
      body.relatedTags || []

  }

  return {
    tag:
      body.tag,

    translated:
      body.translatedTag,

    total: {
      illustrations:
        body.illustsTotal || 0,

      manga:
        body.mangaTotal || 0,

      novels:
        body.novelsTotal || 0
    },

    result
  }

}

export default function(app) {

  app.get(
    '/search/pixiv',
    async (req, res) => {

      const {
        query,
        lang,
        type,
        limit,
        popular,
        related
      } = req.query

      if (!query) {

        return res
          .status(400)
          .json({
            status: false,
            error:
              'Query is required'
          })

      }

      try {

        const result =
          await searchPixiv(
            query,
            {
              lang,
              type,
              limit:
                Number(limit) || 10,

              popular:
                popular === 'true',

              related:
                related === 'true'
            }
          )

        res.status(200).json({
          status: true,
          creator: 'zyraa',
          result
        })

      } catch (e) {

        res.status(500).json({
          status: false,
          creator: 'zyraa',
          error: e.message
        })

      }

    }
  )

}