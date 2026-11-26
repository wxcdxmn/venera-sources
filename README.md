# Venera 漫画源 · 自建合集

只维护两个源，越少越不容易坏。

| 源 | 站点 | 特点 |
| --- | --- | --- |
| **TOONTOP** | toontop.io | 接口 + 网页 SSR 双通道，首页 7 区块、72 项题材筛选、全量章节目录 |
| **MANGA18FX** | manga18fx.com | 纯网页解析，最近更新 + 热度榜、23 项题材、关键词搜索、正文大图 |

## 订阅

索引（推荐，App 内「源仓库」添加这一条即可同时拿到两个源）：

```
https://cdn.jsdelivr.net/gh/wxcdxmn/venera-sources@main/index.json
```

| 源 | 直链 |
| --- | --- |
| TOONTOP | `https://cdn.jsdelivr.net/gh/wxcdxmn/venera-sources@main/toontop.js` |
| MANGA18FX | `https://cdn.jsdelivr.net/gh/wxcdxmn/venera-sources@main/m18.js` |

备用域名（jsDelivr 抽风时）：

```
https://raw.githubusercontent.com/wxcdxmn/venera-sources/main/index.json
```

VeneraX 只认 `.venera` 文件，用仓库里的整合包导入：

- `venera-sources_VeneraX（基于Next新版）.venera`
- `venera-sources_Venera通用版.venera`

导入后全库只有这两个源：探索页 `TOONTOP`、`MANGA18FX · 最近更新`、`MANGA18FX · 热度榜`；
分类页 `TOONTOP`、`MANGA18FX`；搜索源两个。

## 更新

jsDelivr 对 `@main` 有最长 12 小时缓存，改完文件需要手动清：

```
https://purge.jsdelivr.net/gh/wxcdxmn/venera-sources@main/index.json
https://purge.jsdelivr.net/gh/wxcdxmn/venera-sources@main/toontop.js
https://purge.jsdelivr.net/gh/wxcdxmn/venera-sources@main/m18.js
```

版本号写在 `index.json` 与各 js 的 `version` 字段，两边要一起改，App 才会提示更新。

## 目录

```
index.json     两个源的索引（name / fileName / key / version / description）
toontop.js     TOONTOP 源
m18.js         MANGA18FX 源
*.venera       整合好的配置包，供 VeneraX 直接导入
```

## 说明

本项目仅做页面结构解析，不存储、不分发任何内容；图文版权归原站与原作者所有。
