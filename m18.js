/** @type {import('./_venera_.js')} */
class Manga18fx extends ComicSource {
  name = "MANGA18FX";
  key = "manga18fx";
  version = "1.0.3";
  minAppVersion = "1.6.0";
  // 发布到仓库后的 js 直链，用于跟随 index.json 版本更新
  url = "https://cdn.jsdelivr.net/gh/wxcdxmn/venera-sources@main/m18.js";
  site = "https://manga18fx.com";
  pageSize = 24;

  headers = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://manga18fx.com/",
  };

  // 题材 slug 全部取自站点真实链接（首页/详情页），不臆造
  genres = {
    action: "Action",
    adventure: "Adventure",
    comedy: "Comedy",
    drama: "Drama",
    ecchi: "Ecchi",
    fantasy: "Fantasy",
    harem: "Harem",
    isekai: "Isekai",
    manhua: "Manhua",
    manhwa: "Manhwa",
    mature: "Mature",
    mystery: "Mystery",
    psychological: "Psychological",
    reincarnation: "Reincarnation",
    romance: "Romance",
    "school-life": "School Life",
    seinen: "Seinen",
    shoujo: "Shoujo",
    shounen: "Shounen",
    supernatural: "Supernatural",
    thriller: "Thriller",
    tragedy: "Tragedy",
    "uncensored-manhwa": "Uncensored Manhwa",
  };

  // ---------------- 基础工具 ----------------

  imageHeaders() {
    return {
      "User-Agent": this.headers["User-Agent"],
      "Referer": "https://manga18fx.com/",
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

  decode(s) {
    let v = String(s === null || s === undefined ? "" : s);
    v = v.replace(/<[^>]*>/g, " ");
    v = v
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&quot;/gi, '"')
      .replace(/&#0?39;|&apos;/gi, "'")
      .replace(/&#8217;/g, "\u2019")
      .replace(/&#8211;/g, "\u2013")
      .replace(/&#(\d+);/g, (m, d) => String.fromCharCode(Number(d)));
    return v.replace(/\s+/g, " ").trim();
  }

  pick(re, s) {
    const m = String(s === null || s === undefined ? "" : s).match(re);
    return m && m[1] !== undefined ? m[1] : "";
  }

  buildUrl(base, params) {
    let url = base;
    if (!params) return url;
    const q = Object.keys(params)
      .filter((k) => params[k] !== undefined && params[k] !== null && String(params[k]) !== "")
      .map((k) => k + "=" + encodeURIComponent(String(params[k])))
      .join("&");
    if (q) url += (url.indexOf("?") >= 0 ? "&" : "?") + q;
    return url;
  }

  async fetch(url, retries) {
    const max = retries === undefined ? 3 : retries;
    let last = null;
    for (let i = 0; i <= max; i++) {
      try {
        const res = await Network.get(url, this.headers);
        const status = Number(res.status);
        if (status === 200 && res.body) return res.body;
        if (status === 404) throw "页面不存在";
        last = "HTTP " + status;
      } catch (e) {
        last = e;
      }
      if (i < max) await new Promise((r) => setTimeout(r, 800 * (i + 1)));
    }
    throw "请求失败 " + last + " : " + url;
  }

  slugOf(href) {
    const m = String(href || "").match(/\/manga\/([^\/?#]+)/);
    return m ? m[1] : "";
  }

  // ---------------- 列表卡片解析 ----------------
  // 卡片：<div class="page-item"> … thumb-manga a[href] img[data-src] … h3.tt a … .chapter-item a + .post-on
  parseCards(html) {
    const text = String(html === null || html === undefined ? "" : html);
    const out = [];
    const seen = {};
    const chunks = text.split('class="page-item"');
    for (let i = 1; i < chunks.length; i++) {
      const c = chunks[i];
      const thumb = this.pick(/<div class="thumb-manga">[\s\S]*?<a[^>]*href="([^"]+)"/i, c);
      const href = thumb || this.pick(/<h3 class="tt[^"]*">\s*<a[^>]*href="([^"]+)"/i, c);
      const slug = this.slugOf(href);
      if (!slug || seen[slug]) continue;
      const title =
        this.decode(this.pick(/<h3 class="tt[^"]*">\s*<a[^>]*>([\s\S]*?)<\/a>/i, c)) ||
        this.decode(this.pick(/<img[^>]*alt="([^"]*)"/i, c));
      if (!title) continue;
      const cover = this.absUrl(
        this.pick(/<img[^>]*data-src="([^"]+)"/i, c) || this.pick(/<img[^>]*src="([^"]+)"/i, c)
      );
      const chHref = this.pick(/<div class="chapter-item">[\s\S]*?<a[^>]*href="([^"]+)"/i, c);
      const chName = this.decode(
        this.pick(/<div class="chapter-item">[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/i, c)
      );
      const chDate = this.decode(this.pick(/<span class="post-on">\s*([^<]*)/i, c));
      const rate = this.pick(/data-rating="([\d.]+)"/i, c);

      const sub = [];
      if (chName) sub.push(chName);
      if (chDate) sub.push(chDate);
      const tags = [];
      if (rate && Number(rate) > 0) tags.push("★ " + rate);

      seen[slug] = true;
      out.push(
        new Comic({
          id: slug,
          title,
          cover,
          subTitle: sub.join(" · "),
          tags,
          description: "",
          sourceKey: this.key,
        })
      );
    }
    return out;
  }

  // 兜底解析：部分列表页（如搜索无结果模板）使用 .bs 卡片
  parseBsCards(html) {
    const text = String(html === null || html === undefined ? "" : html);
    const out = [];
    const seen = {};
    const chunks = text.split('class="bs"');
    for (let i = 1; i < chunks.length; i++) {
      const c = chunks[i].substring(0, 1200);
      const href = this.pick(/<a[^>]*href="([^"]*\/manga\/[^"]+)"/i, c);
      const slug = this.slugOf(href);
      if (!slug || seen[slug]) continue;
      const title =
        this.decode(this.pick(/<h4[^>]*>([\s\S]*?)<\/h4>/i, c)) ||
        this.decode(this.pick(/<img[^>]*alt="([^"]*)"/i, c));
      if (!title) continue;
      const cover = this.absUrl(
        this.pick(/<img[^>]*data-src="([^"]+)"/i, c) || this.pick(/<img[^>]*src="([^"]+)"/i, c)
      );
      const chName = this.decode(this.pick(/class="epxs"[^>]*>([\s\S]*?)<\/div>/i, c));
      seen[slug] = true;
      out.push(
        new Comic({
          id: slug,
          title,
          cover,
          subTitle: chName,
          tags: [],
          description: "",
          sourceKey: this.key,
        })
      );
    }
    return out;
  }

  comicsOf(html) {
    const list = this.parseCards(html);
    return list.length ? list : this.parseBsCards(html);
  }

  // 分页只给窗口（1..5），末页没有 li.next，据此递增
  maxPageOf(html, page) {
    const text = String(html || "");
    let max = page;
    const re = /[?&]page=(\d+)/g;
    let m;
    while ((m = re.exec(text)) !== null) {
      const n = Number(m[1]);
      if (n > max) max = n;
    }
    const hasNext = /<li class="next">/i.test(text) || /rel="next"/i.test(text);
    if (hasNext && max < page + 1) max = page + 1;
    return max;
  }

  // ---------------- 探索 ----------------

  explore = [
    {
      title: "MANGA18FX · 最近更新",
      type: "singlePageWithMultiPart",
      load: async () => {
        const html = await this.fetch(this.site + "/");
        const comics = this.comicsOf(html);
        if (!comics.length) throw "页面结构解析失败";
        return { "最近更新": comics };
      },
    },
    {
      title: "MANGA18FX · 热度榜",
      type: "singlePageWithMultiPart",
      load: async () => {
        const html = await this.fetch(this.site + "/hot-manga");
        const comics = this.comicsOf(html);
        if (!comics.length) throw "页面结构解析失败";
        return { "热门连载": comics };
      },
    },
  ];

  // ---------------- 分类 ----------------

  // 分类结构必须用 parts（App 端 parser 会遍历 category.parts，缺失直接抛异常导致整源被丢弃）
  category = {
    title: "MANGA18FX",
    parts: [
      {
        name: "题材",
        type: "fixed",
        categories: [
          "全部", "Action", "Adventure", "Comedy", "Drama", "Ecchi", "Fantasy",
          "Harem", "Isekai", "Manhua", "Manhwa", "Mature", "Mystery",
          "Psychological", "Reincarnation", "Romance", "School Life", "Seinen",
          "Shoujo", "Shounen", "Supernatural", "Thriller", "Tragedy",
          "Uncensored Manhwa",
        ],
        categoryParams: [
          "", "action", "adventure", "comedy", "drama", "ecchi", "fantasy",
          "harem", "isekai", "manhua", "manhwa", "mature", "mystery",
          "psychological", "reincarnation", "romance", "school-life", "seinen",
          "shoujo", "shounen", "supernatural", "thriller", "tragedy",
          "uncensored-manhwa",
        ],
        itemType: "category",
      },
      {
        name: "榜单",
        type: "fixed",
        categories: ["热度榜", "最近更新"],
        categoryParams: ["hot", "latest"],
        itemType: "category",
      },
    ],
    enableRankingPage: false,
  };

  // 分类内容加载器：App 端只认 categoryComics.load(category, param, options, page)
  categoryComics = {
    load: async (category, param, options, page) => {
      const p = Math.max(1, Number(page) || 1);
      const tag = String(param === null || param === undefined ? "" : param).trim();
      let url = "";
      if (String(category) === "榜单") {
        url = tag === "latest"
          ? this.buildUrl(this.site + "/", { page: p })
          : this.buildUrl(this.site + "/hot-manga", { page: p });
      } else if (!tag) {
        url = this.buildUrl(this.site + "/", { page: p });
      } else {
        url = this.buildUrl(this.site + "/manga-genre/" + encodeURIComponent(tag), { page: p });
      }
      const html = await this.fetch(url);
      return {
        comics: this.comicsOf(html),
        maxPage: this.maxPageOf(html, p),
      };
    },
  };

  // ---------------- 搜索 ----------------

  search = {
    // 站点搜索表单：<form action="/search" method="get"><input name="q">
    load: async (keyword, options, page) => {
      const kw = String(keyword === null || keyword === undefined ? "" : keyword).trim();
      if (!kw) return { comics: [], maxPage: 1 };
      const p = Math.max(1, Number(page) || 1);
      const url = this.buildUrl(this.site + "/search", { q: kw, page: p });
      const html = await this.fetch(url);
      return {
        comics: this.comicsOf(html),
        maxPage: this.maxPageOf(html, p),
      };
    },
  };

  // ---------------- 详情 ----------------

  parseDetail(html, slug) {
    const text = String(html || "");
    const title = this.decode(
      this.pick(/<div class="post-title">[\s\S]*?<h1[^>]*>([\s\S]*?)<\/h1>/i, text) ||
        this.pick(/<h1[^>]*>([\s\S]*?)<\/h1>/i, text)
    );
    const cover = this.absUrl(
      this.pick(/<div class="summary_image">[\s\S]*?<img[^>]*data-src="([^"]+)"/i, text) ||
        this.pick(/<div class="summary_image">[\s\S]*?<img[^>]*src="([^"]+)"/i, text)
    );

    const author = this.decode(this.pick(/<div class="author-content">([\s\S]*?)<\/div>/i, text));
    const artist = this.decode(
      this.pick(/<div class="artist-content">([\s\S]*?)<\/div>/i, text)
    );

    // Release / Status 在 .post-status 的 .post-content_item 里，标题在 h5
    let status = "";
    let release = "";
    const items = text.split('class="post-content_item"');
    for (let i = 1; i < items.length; i++) {
      const c = items[i].substring(0, 600);
      const head = this.decode(this.pick(/<h5[^>]*>([\s\S]*?)<\/h5>/i, c));
      const val = this.decode(this.pick(/<div class="summary-content"[^>]*>([\s\S]*?)<\/div>/i, c));
      if (/status/i.test(head)) status = val;
      else if (/release/i.test(head)) release = val;
    }

    const genreList = [];
    const gBlock = this.pick(/<div class="genres-content">([\s\S]*?)<\/div>/i, text);
    const gRe = /<a[^>]*>([\s\S]*?)<\/a>/gi;
    let gm;
    while ((gm = gRe.exec(gBlock)) !== null) {
      const name = this.decode(gm[1]);
      if (name) genreList.push(name);
    }

    let desc = this.pick(/<div class="panel-story-description">[\s\S]*?<div class="dsct">([\s\S]*?)<\/div>/i, text);
    if (!desc) desc = this.pick(/<meta name="description" content="([^"]*)"/i, text);
    desc = this.decode(desc);

    // 评分是 microdata: <span property="ratingValue" id="averagerate"> 4.13</span>
    const rating = Number(
      this.pick(/property="ratingValue"[^>]*>\s*([\d.]+)/i, text) ||
        this.pick(/"ratingValue"\s*:\s*"?([\d.]+)/i, text) ||
        this.pick(/^\s*([\d.]+)\s*$/i, this.pick(/id="averagerate"[^>]*>([^<]*)/i, text))
    );
    const updated = this.pick(/"dateModified"\s*:\s*"([^"]+)"/i, text);

    // 章节目录：#chapterlist ul.row-content-chapter li.a-h > a.chapter-name + span.chapter-time
    const chapters = new Map();
    let ci = text.indexOf('id="chapterlist"');
    if (ci < 0) ci = 0;
    const chBlock = text.substring(ci);
    const lis = chBlock.split('class="a-h"');
    for (let i = 1; i < lis.length; i++) {
      const c = lis[i].substring(0, 900);
      const href = this.pick(/<a[^>]*class="chapter-name[^"]*"[^>]*href="([^"]+)"/i, c) ||
        this.pick(/<a[^>]*href="([^"]+)"[^>]*class="chapter-name/i, c);
      if (!href) continue;
      const epId = href.charAt(0) === "/" ? href : "/" + href.replace(/^https?:\/\/[^\/]+\//, "");
      const name = this.decode(this.pick(/class="chapter-name[^"]*"[^>]*>([\s\S]*?)<\/a>/i, c));
      if (!epId || chapters.has(epId)) continue;
      chapters.set(epId, name || "Chapter");
    }

    return {
      title,
      cover,
      author,
      artist,
      status,
      release,
      genres: genreList,
      desc,
      rating,
      updated,
      chapters,
      slug,
    };
  }

  comic = {
    loadInfo: async (id) => {
      const slug = String(id === null || id === undefined ? "" : id).trim();
      if (!slug) throw "作品 ID 为空";
      const html = await this.fetch(this.site + "/manga/" + encodeURIComponent(slug));
      const d = this.parseDetail(html, slug);
      if (!d.title) throw "详情解析失败";

      const tags = {};
      if (d.genres.length) tags["题材"] = d.genres;
      if (d.author) tags["作者"] = [d.author];
      if (d.artist && d.artist !== d.author) tags["画师"] = [d.artist];
      if (d.status) tags["状态"] = [d.status];
      if (d.release) tags["年份"] = [d.release];

      const sub = [];
      if (d.status) sub.push(d.status);
      if (d.chapters.size) sub.push(d.chapters.size + " 话");

      return new ComicDetails({
        title: d.title,
        subTitle: sub.join(" · "),
        cover: d.cover,
        description: d.desc,
        tags,
        chapters: d.chapters,
        url: this.site + "/manga/" + encodeURIComponent(slug),
        updateTime: d.updated ? String(d.updated).substring(0, 10) : "",
        stars: d.rating > 0 ? d.rating : null,
        sourceKey: this.key,
        comic: new Comic({
          id: slug,
          title: d.title,
          cover: d.cover,
          subTitle: sub.join(" · "),
          tags: d.genres.slice(0, 4),
          sourceKey: this.key,
        }),
      });
    },

    loadEp: async (comicId, epId) => {
      const ep = String(epId === null || epId === undefined ? "" : epId).trim();
      if (!ep) return { images: [], headers: this.imageHeaders() };
      let url = "";
      if (ep.indexOf("http") === 0) url = ep;
      else if (ep.charAt(0) === "/") url = this.site + ep;
      else if (ep.indexOf("/manga/") >= 0) url = this.site + "/" + ep.replace(/^\/+/, "");
      else url = this.site + "/manga/" + encodeURIComponent(String(comicId)) + "/" + ep;

      const html = await this.fetch(url);
      const images = [];
      const seen = {};
      // 正文每页：<div class="page-break"><img data-src="...">
      const blocks = String(html).split('class="page-break"');
      for (let i = 1; i < blocks.length; i++) {
        const c = blocks[i].substring(0, 900);
        const raw =
          this.pick(/<img[^>]*data-src="([^"]+)"/i, c) || this.pick(/<img[^>]*src="([^"]+)"/i, c);
        const u = this.absUrl(raw);
        if (!u || u.indexOf("http") !== 0) continue;
        if (/loading\.gif|placeholder|blank\./i.test(u)) continue;
        if (seen[u]) continue;
        seen[u] = true;
        images.push(u);
      }
      return { images, headers: this.imageHeaders() };
    },
  };
}
