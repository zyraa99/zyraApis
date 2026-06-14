/**
 * Anime Scraper Routes
 * Scrape Anoboy Direct
 *
 * Original Credit:
 * Kayllano Aveline 👨‍💻
 * AliciaCode - Web Scraping Specialist
 * xalixia.biz.id
 *
 * Full ESM Version by Zyraa ⚡
 */

import axios from 'axios'
import * as cheerio from 'cheerio'

const BASE = 'https://anoboy.be'

const HEADERS = {
  'user-agent':
    'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 Chrome/148.0.0.0 Mobile Safari/537.36',
  referer: BASE
}

async function fetchHTML(url) {

  const { data } = await axios.get(url, {
    headers: HEADERS
  })

  return cheerio.load(data)

}

/* =========================
   SEARCH
========================= */

async function searchAnime(query) {

  const $ = await fetchHTML(
    `${BASE}/?s=${encodeURIComponent(query)}`
  )

  const results = []

  $('.listupd .bs').each((_, el) => {

    const item = $(el)

    results.push({
      title:
        item.find('.tt').text().trim(),

      url:
        item.find('a').attr('href'),

      thumbnail:
        item.find('img').attr('src'),

      status:
        item.find('.status').text().trim(),

      type:
        item.find('.typez').text().trim(),

      subtitle:
        item.find('.sb').text().trim(),

      episode:
        item.find('.epx').text().trim()
    })

  })

  return results

}

/* =========================
   DETAIL
========================= */

async function animeDetail(url) {

  const $ = await fetchHTML(url)

  const genres = []

  $('.genxed a').each((_, el) => {

    genres.push(
      $(el).text().trim()
    )

  })

  const characters = []

  $('.cvitem').each((_, el) => {

    characters.push({
      name:
        $(el)
          .find('.cvchar .charname')
          .first()
          .text()
          .trim(),

      role:
        $(el)
          .find('.cvchar .charrole')
          .first()
          .text()
          .trim(),

      voice_actor:
        $(el)
          .find('.cvactor .charname a')
          .first()
          .text()
          .trim()
    })

  })

  const episodes = []

  $('.eplister ul li').each((_, el) => {

    episodes.push({
      episode:
        $(el)
          .find('.epl-num')
          .text()
          .trim(),

      title:
        $(el)
          .find('.epl-title')
          .text()
          .trim(),

      url:
        $(el)
          .find('a')
          .attr('href'),

      release_date:
        $(el)
          .find('.epl-date')
          .text()
          .trim()
    })

  })

  const recommendations = []

  $('.listupd .bs').each((i, el) => {

    if (i < 10) {

      recommendations.push({
        title:
          $(el)
            .find('.tt')
            .text()
            .trim(),

        url:
          $(el)
            .find('a')
            .attr('href'),

        thumbnail:
          $(el)
            .find('img')
            .attr('src'),

        type:
          $(el)
            .find('.typez')
            .text()
            .trim(),

        status:
          $(el)
            .find('.status')
            .text()
            .trim()
      })

    }

  })

  const info = {}

  $('.spe span').each((_, el) => {

    const txt =
      $(el).text().trim()

    const split =
      txt.split(':')

    if (split.length >= 2) {

      const key =
        split.shift().trim()

      const value =
        split.join(':').trim()

      info[key] = value

    }

  })

  return {
    title:
      $('.entry-title').text().trim(),

    thumbnail:
      $('.thumb img').attr('src') ||
      $('.thumbook .thumb img').attr('src'),

    rating:
      $('.rating strong').text().trim(),

    rating_percent:
      $('.rtb span')
        .attr('style')
        ?.match(/\d+/)?.[0] || null,

    japanese:
      info['Japanese'] || null,

    status:
      info['Status'] || null,

    type:
      info['Type'] || null,

    studio:
      info['Studio'] || null,

    producer:
      info['Producers'] || null,

    released:
      info['Released'] || null,

    duration:
      info['Duration'] || null,

    total_episode:
      info['Episodes'] ||
      episodes.length,

    genres,

    synopsis:
      $('.entry-content p')
        .map((_, el) =>
          $(el).text().trim()
        )
        .get()
        .join('\n\n'),

    characters,

    latest_episode:
      episodes[0] || null,

    first_episode:
      episodes[
        episodes.length - 1
      ] || null,

    episode_list:
      episodes,

    recommendations
  }

}

/* =========================
   EPISODE
========================= */

async function episodeDetail(url) {

  const $ = await fetchHTML(url)

  const downloads = []

  $('.dlbox ul li').each((_, el) => {

    const quality =
      $(el)
        .find('strong')
        .text()
        .trim()

    $(el)
      .find('a')
      .each((__, a) => {

        downloads.push({
          quality,

          server:
            $(a)
              .text()
              .trim(),

          url:
            $(a)
              .attr('href')
        })

      })

  })

  return {
    title:
      $('.entry-title')
        .text()
        .trim(),

    iframe:
      $('iframe')
        .first()
        .attr('src'),

    downloads
  }

}

/* =========================
   HOME
========================= */

async function animeHome() {

  const $ = await fetchHTML(BASE)

  const ongoing = []
  const completed = []

  $('.venz .listupd .bs').each((_, el) => {

    ongoing.push({
      title:
        $(el)
          .find('.tt')
          .text()
          .trim(),

      url:
        $(el)
          .find('a')
          .attr('href'),

      thumbnail:
        $(el)
          .find('img')
          .attr('src'),

      episode:
        $(el)
          .find('.epx')
          .text()
          .trim()
    })

  })

  $('.listupd .bs').each((_, el) => {

    completed.push({
      title:
        $(el)
          .find('.tt')
          .text()
          .trim(),

      url:
        $(el)
          .find('a')
          .attr('href'),

      thumbnail:
        $(el)
          .find('img')
          .attr('src')
    })

  })

  return {
    ongoing,
    completed
  }

}

/* =========================
   ONGOING
========================= */

async function ongoingAnime(page = 1) {

  const $ = await fetchHTML(
    `${BASE}/anime-terbaru/page/${page}`
  )

  const results = []

  $('.listupd .bs').each((_, el) => {

    results.push({
      title:
        $(el)
          .find('.tt')
          .text()
          .trim(),

      url:
        $(el)
          .find('a')
          .attr('href'),

      thumbnail:
        $(el)
          .find('img')
          .attr('src'),

      episode:
        $(el)
          .find('.epx')
          .text()
          .trim()
    })

  })

  return results

}

/* =========================
   COMPLETED
========================= */

async function completedAnime(page = 1) {

  const $ = await fetchHTML(
    `${BASE}/anime-completed/page/${page}`
  )

  const results = []

  $('.listupd .bs').each((_, el) => {

    results.push({
      title:
        $(el)
          .find('.tt')
          .text()
          .trim(),

      url:
        $(el)
          .find('a')
          .attr('href'),

      thumbnail:
        $(el)
          .find('img')
          .attr('src')
    })

  })

  return results

}

/* =========================
   ROUTES
========================= */

export default function(app) {

  app.get('/anime/home', async (_, res) => {

    try {

      const result =
        await animeHome()

      res.json({
        status: true,
        creator: 'zyraa',
        result
      })

    } catch (e) {

      res.status(500).json({
        status: false,
        error: e.message
      })

    }

  })

  app.get('/anime/search', async (req, res) => {

    const { query } =
      req.query

    if (!query) {

      return res.status(400).json({
        status: false,
        error: 'Query is required'
      })

    }

    try {

      const result =
        await searchAnime(query)

      res.json({
        status: true,
        creator: 'zyraa',
        result
      })

    } catch (e) {

      res.status(500).json({
        status: false,
        error: e.message
      })

    }

  })

  app.get('/anime/detail', async (req, res) => {

    const { url } =
      req.query

    if (!url) {

      return res.status(400).json({
        status: false,
        error: 'Url is required'
      })

    }

    try {

      const result =
        await animeDetail(url)

      res.json({
        status: true,
        creator: 'zyraa',
        result
      })

    } catch (e) {

      res.status(500).json({
        status: false,
        error: e.message
      })

    }

  })

  app.get('/anime/episode', async (req, res) => {

    const { url } =
      req.query

    if (!url) {

      return res.status(400).json({
        status: false,
        error: 'Url is required'
      })

    }

    try {

      const result =
        await episodeDetail(url)

      res.json({
        status: true,
        creator: 'zyraa',
        result
      })

    } catch (e) {

      res.status(500).json({
        status: false,
        error: e.message
      })

    }

  })

  app.get('/anime/ongoing', async (req, res) => {

    try {

      const result =
        await ongoingAnime(
          req.query.page || 1
        )

      res.json({
        status: true,
        creator: 'zyraa',
        result
      })

    } catch (e) {

      res.status(500).json({
        status: false,
        error: e.message
      })

    }

  })

  app.get('/anime/completed', async (req, res) => {

    try {

      const result =
        await completedAnime(
          req.query.page || 1
        )

      res.json({
        status: true,
        creator: 'zyraa',
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