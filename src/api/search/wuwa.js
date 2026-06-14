// save: src/routes/anime/wuwa.js

import axios from "axios";

const API =
  "https://wutheringwaves.fandom.com/api.php";

async function searchCharacter(query) {

  const { data } = await axios.get(API, {
    params: {
      action: "query",
      list: "search",
      srsearch: query,
      format: "json"
    }
  });

  return data?.query?.search || [];

}

async function getCharacter(title) {

  const { data } = await axios.get(API, {
    params: {
      action: "parse",
      page: title,
      prop: "text",
      format: "json"
    }
  });

  return data?.parse || null;

}

function strip(html = "") {

  return html
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();

}

function getImage(html = "") {

  const match =
    html.match(
      /<img[^>]+src="([^"]+)"/i
    );

  return match?.[1] || null;

}

function getInfo(html = "") {

  const info = {};

  const regex =
    /<h3[^>]*class="pi-data-label"[^>]*>(.*?)<\/h3>[\s\S]*?<div[^>]*class="pi-data-value"[^>]*>(.*?)<\/div>/gi;

  let match;

  while (
    (match = regex.exec(html))
  ) {

    const key =
      strip(match[1]);

    const value =
      strip(match[2]);

    if (key && value) {
      info[key] = value;
    }

  }

  return info;

}

function getStory(html = "") {

  const storyMatch =
    html.match(
      /<span[^>]*id="(?:Lore|Story|Background)"[^>]*><\/span>([\s\S]*?)(<h2|$)/i
    );

  if (!storyMatch)
    return null;

  return strip(
    storyMatch[1]
  ).slice(0, 3000);

}

export default function(app) {

  app.get(
    "/search/wuwa",
    async (req, res) => {

      try {

        const {
          query
        } = req.query;

        if (!query) {

          return res.status(400).json({
            status: false,
            error:
              "Query is required"
          });

        }

        const search =
          await searchCharacter(
            query
          );

        if (
          !search.length
        ) {

          return res.status(404).json({
            status: false,
            error:
              "Character not found"
          });

        }

        const title =
          search[0].title;

        const parsed =
          await getCharacter(
            title
          );

        if (!parsed) {

          return res.status(404).json({
            status: false,
            error:
              "Failed parsing character"
          });

        }

        const html =
          parsed.text["*"];

        const info =
          getInfo(html);

        res.status(200).json({

          status: true,

          result: {

            name: title,

            description:
              strip(html)
                .slice(0, 500),

            story:
              getStory(html),

            image:
              getImage(html),

            info,

            url:
              `https://wutheringwaves.fandom.com/wiki/${encodeURIComponent(title)}`,

            search_results:
              search.map(v => ({
                title:
                  v.title,
                snippet:
                  strip(
                    v.snippet
                  ),
                pageid:
                  v.pageid
              }))

          }

        });

      } catch (e) {

        res.status(500).json({

          status: false,

          error:
            e.message

        });

      }

    }
  );

}