import axios from "axios";

const API =
  "https://genshin-impact.fandom.com/api.php";

function clean(text = "") {

  return text
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();

}

async function searchCharacter(query) {

  const { data } =
    await axios.get(API, {
      params: {
        action: "query",
        list: "search",
        srsearch: query,
        format: "json"
      },
      headers: {
        "User-Agent":
          "Mozilla/5.0"
      }
    });

  return (
    data?.query?.search || []
  );

}

async function getCharacter(title) {

  const { data } =
    await axios.get(API, {
      params: {
        action: "parse",
        page: title,
        prop:
          "text|images",
        format: "json"
      },
      headers: {
        "User-Agent":
          "Mozilla/5.0"
      }
    });

  return (
    data?.parse || null
  );

}

function getImage(html = "") {

  const match =
    html.match(
      /<img[^>]+src="([^"]+)"/i
    );

  return (
    match?.[1] || null
  );

}

function getInfo(html = "") {

  const info = {};

  const regex =
    /<h3[^>]*class="pi-data-label"[^>]*>(.*?)<\/h3>[\s\S]*?<div[^>]*class="pi-data-value"[^>]*>(.*?)<\/div>/gi;

  let match;

  while (
    (match =
      regex.exec(html))
  ) {

    const key =
      clean(match[1]);

    const value =
      clean(match[2]);

    if (
      key &&
      value
    ) {

      info[key] =
        value;

    }

  }

  return info;

}

function getStory(html = "") {

  const match =
    html.match(
      /<span[^>]*id="Lore"[^>]*><\/span>([\s\S]*?)(<h2|$)/i
    ) ||

    html.match(
      /<span[^>]*id="Story"[^>]*><\/span>([\s\S]*?)(<h2|$)/i
    );

  if (!match)
    return null;

  return clean(
    match[1]
  ).slice(0, 3000);

}

async function genshin(query) {

  const search =
    await searchCharacter(
      query
    );

  if (
    !search.length
  ) {

    return {
      status: false,
      error:
        "Character not found"
    };

  }

  const first =
    search[0];

  const parsed =
    await getCharacter(
      first.title
    );

  if (!parsed) {

    return {
      status: false,
      error:
        "Failed parsing character"
    };

  }

  const html =
    parsed.text["*"];

  return {

    status: true,

    creator: "zyraa",

    result: {

      name:
        first.title,

      description:
        clean(html)
          .slice(0, 500),

      story:
        getStory(html),

      image:
        getImage(html),

      info:
        getInfo(html),

      url:
        `https://genshin-impact.fandom.com/wiki/${encodeURIComponent(first.title)}`,

      search_results:
        search.map(v => ({

          title:
            v.title,

          snippet:
            clean(
              v.snippet
            ),

          pageid:
            v.pageid

        }))

    }

  };

}

export default function(app) {

  app.get(
    "/search/genshin",
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

        const result =
          await genshin(
            query
          );

        res.status(200).json(
          result
        );

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