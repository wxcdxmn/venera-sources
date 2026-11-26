/** @type {import('./_venera_.js')} */
class ToonTop extends ComicSource {
  name = "TOONTOP";
  key = "toontop";
  version = "1.3.1";
  minAppVersion = "1.6.0";
  // 发布到仓库后的 js 直链，用于跟随 index.json 版本更新
  // 用 jsDelivr CDN 而非 raw.githubusercontent：实测 raw 在本机/国内直连超时，jsDelivr 四个镜像均 200
  url = "https://cdn.jsdelivr.net/gh/wxcdxmn/venera-sources@main/toontop.js";
  site = "https://toontop.io";
  api = "https://api.toontop.io";
  pageSize = 24;

  // 双通道：接口优先，接口不可用时回落到网页 SSR（两套数据都实测可取全量）
  _slugCache = {};
  _chapterCache = {};
  _chapterSource = {};

  headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Accept": "application/json,text/html,application/xhtml+xml,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://toontop.io/",
  };

  imageHeaders() {
    return {
      "User-Agent": this.headers["User-Agent"],
      "Referer": "https://toontop.io/",
      "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
    };
  }

  absUrl(u) {
    const v = String(u === null || u === undefined ? "" : u).trim();
    if (!v) return "";
    if (v.indexOf("//") === 0) return "https:" + v;
    if (v.indexOf("http") === 0) return v;
    if (v.charAt(0) === "/") return this.site + v;
    return this.site + "/" + v;
  }

  _buildUrl(base, params) {
    let url = base;
    if (!params) return url;
    const query = Object.keys(params)
      .filter((k) => params[k] !== undefined && params[k] !== null && String(params[k]) !== "")
      .map((k) => k + "=" + encodeURIComponent(String(params[k])))
      .join("&");
    if (query) url += (url.indexOf("?") >= 0 ? "&" : "?") + query;
    return url;
  }

  async _request(url, retries) {
    const max = retries === undefined ? 2 : retries;
    let lastError = null;
    for (let i = 0; i <= max; i++) {
      try {
        const res = await Network.get(url, this.headers);
        if (Number(res.status) !== 200) throw "HTTP " + res.status;
        return res.body;
      } catch (e) {
        lastError = e;
        if (i < max) await new Promise((r) => setTimeout(r, 600 * (i + 1)));
      }
    }
    throw "请求失败 " + lastError + " : " + url;
  }

  async apiGet(path, params) {
    const body = await this._request(this._buildUrl(this.api + path, params));
    let payload = null;
    try {
      payload = JSON.parse(body);
    } catch (e) {
      throw "接口返回非 JSON";
    }
    if (!payload || payload.success === false || !payload.data) throw "接口数据为空";
    return payload.data;
  }

  extractNextData(html) {
    if (!html) return null;
    const anchor = html.indexOf('id="__NEXT_DATA__"');
    if (anchor < 0) return null;
    const start = html.indexOf(">", anchor);
    if (start < 0) return null;
    const end = html.indexOf("</script>", start);
    if (end < 0) return null;
    try {
      return JSON.parse(html.substring(start + 1, end));
    } catch (e) {
      return null;
    }
  }

  async pageGet(path) {
    const html = await this._request(this.absUrl(path));
    const json = this.extractNextData(html);
    if (!json || !json.props || !json.props.pageProps) throw "页面数据解析失败 : " + path;
    return json.props.pageProps;
  }

  statusText(s) {
    const v = String(s === null || s === undefined ? "" : s).toLowerCase();
    if (v === "ongoing") return "连载中";
    if (v === "completed" || v === "finished") return "已完结";
    return String(s === null || s === undefined ? "" : s);
  }

  dateOnly(v) {
    const s = String(v === null || v === undefined ? "" : v);
    return s.length >= 10 && s.charAt(4) === "-" ? s.substring(0, 10) : s;
  }

  normSort(v) {
    const s = String(v === null || v === undefined ? "" : v).trim();
    return ["latest", "popular", "rating", "views"].indexOf(s) >= 0 ? s : "";
  }

  normStatus(v) {
    const s = String(v === null || v === undefined ? "" : v).trim();
    return ["ongoing", "completed"].indexOf(s) >= 0 ? s : "";
  }

  pickItems(v) {
    if (!v) return [];
    if (Array.isArray(v)) return v;
    if (Array.isArray(v.items)) return v.items;
    return [];
  }

  parseComic(item, fromPage) {
    if (!item || (!item.id && !item.slug)) return null;
    if (item.id && item.slug) this._slugCache[String(item.id)] = String(item.slug);
    const id = fromPage ? String(item.slug || item.id) : String(item.id || item.slug);
    const tags = this.pickItems(item.genres)
      .map((g) => (g && g.name ? String(g.name) : ""))
      .filter((g) => g)
      .slice(0, 4);
    const sub = [];
    const st = this.statusText(item.status);
    if (st) sub.push(st);
    const count = item.stats && item.stats.chapters_count ? item.stats.chapters_count : 0;
    if (count) sub.push(count + " 话");
    const up = this.dateOnly(item.updated_at || item.updatedAt);
    if (up) sub.push(up);
    return new Comic({
      id,
      title: String(item.name || ""),
      cover: this.absUrl(item.cover),
      subTitle: sub.join(" · "),
      tags,
      description: item.summary || "",
      sourceKey: this.key,
    });
  }

  mapList(items, fromPage) {
    const out = [];
    for (const item of items || []) {
      const c = this.parseComic(item, fromPage);
      if (c) out.push(c);
    }
    return out;
  }

  maxPageOf(pager, page) {
    const total = pager && pager.total_pages ? Number(pager.total_pages) : 0;
    return total > 0 ? total : page;
  }

  explore = [
    {
      title: "TOONTOP",
      type: "singlePageWithMultiPart",
      load: async () => {
        let data = null;
        let fromPage = false;
        try {
          data = await this.apiGet("/titles/home");
        } catch (e) {
          data = await this.pageGet("/home");
          fromPage = true;
        }
        const result = {};
        // 接口与网页 SSR 的区块键名不同：接口是 popular/new_manga…，网页是 popularItems/newMangaItems…
        const sections = [
          ["最近更新", ["latest", "latest"]],
          ["热门", ["popular", "popularItems"]],
          ["今日趋势", ["trending", "trendingItems"]],
          ["新上架", ["new_manga", "newMangaItems"]],
          ["上升最快", ["rising", "risingItems"]],
          ["高分更新", ["top_update", "topUpdateItems"]],
          ["精选", ["hero", "heroItems"]],
        ];
        for (const pair of sections) {
          let items = this.pickItems(data[pair[1][0]]);
          if (!items.length) items = this.pickItems(data[pair[1][1]]);
          if (items.length) {
            result[pair[0]] = this.mapList(
              pair[0] === "精选" ? items.slice(0, 40) : items,
              fromPage
            );
          }
        }
        return result;
      },
    },
  ];

  category = {
    title: "TOONTOP",
    parts: [
      {
        name: "题材",
        type: "fixed",
        categories: ["全部", "Action", "Adult", "Adventure", "Age Gap", "All Ages", "BDSM", "BL", "Campus", "Comedy", "Comics", "Cooking", "Crime", "Demons", "Doujins- Original Series", "Doujinshi", "Drama", "Ecchi", "Family", "Fantasy", "Female Friend", "Fetish", "Gender Bender", "Girls Lacrosse Club", "GL", "Gossip", "Harem", "Hentai", "Hentai Manga", "Historical", "Horror", "Incest", "Isekai", "Josei", "Kimi no na wa", "Magic", "Manga", "Manhwa", "Manhwa Hentai", "Martial Arts", "Mature", "Milf", "Military", "Monster Girls", "Mystery", "NTR", "Office", "Office Workers", "Original Work", "Psychological", "Rape", "Raw", "Reincarnation", "Revenge", "Romance", "School life", "Sci-Fi", "Secret Relationship", "Seinen", "Shoujo", "Shounen", "Slice of Life", "Smut", "Sports", "Supernatural", "Thriller", "Tragedy", "Uncensored", "Vanilla", "Webtoon", "Yaoi", "Yuri"],
        categoryParams: ["", "action", "adult", "adventure", "age-gap", "all-ages", "bdsm", "bl", "campus", "comedy", "comics", "cooking", "crime", "demons", "doujins-original-series", "doujinshi", "drama", "ecchi", "family", "fantasy", "female-friend", "fetish", "gender-bender", "girls-lacrosse-club", "gl", "gossip", "harem", "hentai", "hentai-manga", "historical", "horror", "incest", "isekai", "josei", "kimi-no-na-wa", "magic", "manga", "manhwa", "manhwa-hentai", "martial-arts", "mature", "milf", "military", "monster-girls", "mystery", "ntr", "office", "office-workers", "original-work", "psychological", "rape", "raw", "reincarnation", "revenge", "romance", "school-life", "sci-fi", "secret-relationship", "seinen", "shoujo", "shounen", "slice-of-life", "smut", "sports", "supernatural", "thriller", "tragedy", "uncensored", "vanilla", "webtoon", "yaoi", "yuri"],
        itemType: "category",
      },
    ],
    enableRankingPage: false,
  };

  categoryComics = {
    load: async (category, param, options, page) => {
      const sort = this.normSort(options && options[0]);
      const status = this.normStatus(options && options[1]);
      try {
        const data = await this.apiGet("/titles/search", {
          genres: param || "",
          sort,
          status,
          page,
          limit: this.pageSize,
        });
        return {
          comics: this.mapList(data.items, false),
          maxPage: this.maxPageOf(data.pagination, page),
        };
      } catch (e) {
        if (!param) throw e;
        const pp = await this.pageGet(
          this._buildUrl("/genres/" + encodeURIComponent(param), { page, sort })
        );
        return {
          comics: this.mapList(pp.items, true),
          maxPage: this.maxPageOf(pp.pagination, page),
        };
      }
    },
    optionList: [
      { label: "排序", options: ["latest-最新更新", "popular-最热门", "rating-评分最高", "views-浏览最多"] },
      { label: "状态", options: ["-全部", "ongoing-连载中", "completed-已完结"] },
    ],
  };

  search = {
    load: async (keyword, options, page) => {
      const sort = this.normSort(options && options[0]);
      const status = this.normStatus(options && options[1]);
      try {
        const data = await this.apiGet("/titles/search", {
          q: keyword,
          sort,
          status,
          page,
          limit: this.pageSize,
        });
        return {
          comics: this.mapList(data.items, false),
          maxPage: this.maxPageOf(data.pagination, page),
        };
      } catch (e) {
        const pp = await this.pageGet(this._buildUrl("/search", { q: keyword, page, sort }));
        return {
          comics: this.mapList(pp.ssrItems, true),
          maxPage: this.maxPageOf(pp.ssrPagination, page),
        };
      }
    },
    optionList: [
      { type: "select", label: "排序", options: ["relevance-相关度", "latest-最新更新", "popular-最热门", "rating-评分最高", "views-浏览最多"] },
      { type: "select", label: "状态", options: ["-全部", "ongoing-连载中", "completed-已完结"] },
    ],
  };

  // 作品目录：接口全量（74/158 话实测），接口不可用时回落详情页 SSR（最多 50 话）
  async getChapters(comicId) {
    const key = String(comicId);
    if (this._chapterCache[key]) return this._chapterCache[key];
    let list = null;
    let source = "api";
    try {
      const data = await this.apiGet("/titles/" + encodeURIComponent(key) + "/chapters");
      list = this.pickItems(data.chapters);
    } catch (e) {
      source = "page";
      const slug = this._slugCache[key] || key;
      const pp = await this.pageGet("/" + encodeURIComponent(slug));
      const manga = pp.initialManga || {};
      if (manga.slug) this._slugCache[key] = String(manga.slug);
      list = this.pickItems(manga.chapters);
    }
    if (!Array.isArray(list)) list = [];
    this._chapterCache[key] = list;
    this._chapterSource[key] = source;
    return list;
  }

  comic = {
    loadInfo: async (id) => {
      const cid = String(id === null || id === undefined ? "" : id).trim();
      if (!cid) throw "作品 ID 为空";
      let t = null;
      let fromPage = false;
      try {
        const data = await this.apiGet("/titles/" + encodeURIComponent(cid));
        t = data.title;
      } catch (e) {
        const slug = this._slugCache[cid] || cid;
        const pp = await this.pageGet("/" + encodeURIComponent(slug));
        t = pp.initialManga;
        fromPage = true;
      }
      if (!t) throw "作品详情为空";
      if (t.id && t.slug) this._slugCache[String(t.id)] = String(t.slug);
      if (t.slug) this._slugCache[cid] = String(t.slug);

      let list = [];
      try {
        list = await this.getChapters(cid);
      } catch (e) {
        list = this.pickItems(t.chapters);
      }

      const chapters = new Map();
      for (const c of list) {
        if (!c || !c.id) continue;
        chapters.set(String(c.id), String(c.name || "Chapter " + (c.number || "")));
      }

      const genres = this.pickItems(t.genres)
        .map((g) => (g && g.name ? String(g.name) : ""))
        .filter((g) => g);
      const authors = this.pickItems(t.authors)
        .map((a) => (a && a.name ? String(a.name) : ""))
        .filter((a) => a);
      const tags = {};
      if (genres.length) tags["题材"] = genres;
      if (authors.length) tags["作者"] = authors;
      const st = this.statusText(t.status);
      if (st) tags["状态"] = [st];

      return new ComicDetails({
        title: String(t.name || ""),
        subTitle: authors.join(", "),
        cover: this.absUrl(t.cover),
        description: t.summary || "",
        tags,
        chapters,
        url: this.absUrl(t.url),
        updateTime: this.dateOnly(t.updated_at || t.updatedAt),
        stars: t.rating && Number(t.rating) > 0 ? Number(t.rating) : null,
        sourceKey: this.key,
        comic: new Comic({
          id: fromPage ? String(t.slug || cid) : cid,
          title: String(t.name || ""),
          cover: this.absUrl(t.cover),
          subTitle: st,
          tags: genres.slice(0, 4),
          sourceKey: this.key,
        }),
      });
    },

    loadEp: async (comicId, epId) => {
      const target = await this.resolveChapterUrl(comicId, epId);
      if (!target) return { images: [], headers: this.imageHeaders() };
      const html = await this._request(target);
      const json = this.extractNextData(html);
      const pp = json && json.props && json.props.pageProps ? json.props.pageProps : null;
      const chapter = pp && pp.initialChapter ? pp.initialChapter : null;
      let images = chapter && Array.isArray(chapter.images) ? chapter.images : [];
      if (!images.length && comicId && chapter && chapter.id) {
        images = await this.previewImages(comicId, chapter.id);
      }
      const out = [];
      const seen = {};
      for (const raw of images) {
        const u = this.absUrl(raw);
        if (!u || u.indexOf("http") !== 0 || seen[u]) continue;
        seen[u] = true;
        out.push(u);
      }
      return { images: out, headers: this.imageHeaders() };
    },

    onImageLoad: (url, comicId, epId) => {
      return { url, headers: this.imageHeaders() };
    },

    onThumbnailLoad: (url) => {
      return { url, headers: this.imageHeaders() };
    },
  };

  async resolveChapterUrl(comicId, epId) {
    const s = String(epId === null || epId === undefined ? "" : epId).trim();
    if (!s) return null;
    if (s.indexOf("http://") === 0 || s.indexOf("https://") === 0) {
      return s.indexOf(this.site) === 0 ? s : null;
    }
    if (s.indexOf("/") >= 0) return this.site + "/" + s.replace(/^\/+/, "");
    if (!comicId) return null;
    try {
      const list = await this.getChapters(String(comicId));
      for (const c of list) {
        if (!c) continue;
        if (String(c.id) === s || String(c.slug) === s || String(c.number) === s) {
          if (c.url) return this.site + "/" + String(c.url).replace(/^\/+/, "");
          if (c.slug) {
            const slug = this._slugCache[String(comicId)];
            if (slug) return this.site + "/" + slug + "/" + c.slug;
          }
        }
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  // 公开图片接口对匿名只返回 3 张预览，仅作 SSR 解析失败兜底
  async previewImages(comicId, chapterId) {
    try {
      const data = await this.apiGet(
        "/titles/" + encodeURIComponent(String(comicId)) + "/chapters/" + encodeURIComponent(String(chapterId)) + "/images"
      );
      return Array.isArray(data.images) ? data.images : [];
    } catch (e) {
      return [];
    }
  }
}
