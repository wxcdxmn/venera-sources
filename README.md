# Venera 漫画源 · 自建合集

只维护两个源，越少越不容易坏。

| 源 | 站点 | 版本 | 特点 |
| --- | --- | --- | --- |
| **TOONTOP** | toontop.io | 1.3.2 | 接口 + 网页 SSR 双通道，首页 7 区块、72 项题材筛选、全量章节目录 |
| **MANGA18FX** | manga18fx.com | 1.0.3 | 纯网页解析，最近更新 + 热度榜、23 项题材、关键词搜索、正文大图 |

## 订阅

订阅索引（App 内「源仓库」添加这一条即可同时拿到两个源）：

```
https://cdn.jsdelivr.net/gh/wxcdxmn/venera-sources@v1.0.3/index.json
```

用固定 tag 而不是 `@main`：jsDelivr 对分支别名有最长 12 小时缓存，发布后一段时间内 `@main` 仍会返回旧文件
（本次实测 `cdn.jsdelivr.net/...@main/m18.js` 还在发 1.0.1，而 `@v1.0.3` 已是 1.0.3）。
代价是源不会自动跟随更新，需要换新 tag 才能升级；想自动跟随就改用：

```
https://fastly.jsdelivr.net/gh/wxcdxmn/venera-sources@main/index.json
```
（`fastly` / `testingcf` 两个节点本次实测是新鲜的，`cdn` 与 `gcore` 滞后。）

| 源 | 直链（固定 tag，绕开 CDN 缓存） |
| --- | --- |
| TOONTOP | `https://cdn.jsdelivr.net/gh/wxcdxmn/venera-sources@v1.0.3/toontop.js` |
| MANGA18FX | `https://cdn.jsdelivr.net/gh/wxcdxmn/venera-sources@v1.0.3/m18.js` |

也可以把 `@v1.0.3` 换成 `@main`，但 jsDelivr 对 `@main` 有最长 12 小时缓存，
刚改完代码时容易拿到旧文件（表现为 App 报 `type 'Null' is not a subtype of type 'Iterable<dynamic>'`）。
固定 tag 的地址在发布后即可取到正确内容，适合"添加源"时使用；装好之后源内部会跟 `@main` 走，正常更新不受影响。

备用域名（jsDelivr 抽风时，需要能直连 GitHub）：

```
https://raw.githubusercontent.com/wxcdxmn/venera-sources/main/index.json
```

## 配置包

VeneraX 只认 `.venera` 文件。**导入 .venera 是整体替换源目录**，所以按需选：

| 文件 | 源数 | 用途 |
| --- | --- | --- |
| `仅添加_原始包+TOONTOP+MANGA18FX_VeneraX（基于Next新版）.venera` | 54 → 56 | **推荐**。以原始 54 源包为底稿，只追加两个源，不动原有数据与 cookie |
| `仅添加_原始包+TOONTOP+MANGA18FX_Venera通用版.venera` | 54 → 56 | 同上，带 `manifest.json` |
| `venera-sources_VeneraX（基于Next新版）.venera` | 2 | 只要这两个源，**会清空其它源** |
| `venera-sources_Venera通用版.venera` | 2 | 同上 |

也能从 Release 下载同样内容：
`https://github.com/wxcdxmn/venera-sources/releases/latest`

## 更新

jsDelivr 对 `@main` 有最长 12 小时缓存，改完文件需要手动清：

```
https://purge.jsdelivr.net/gh/wxcdxmn/venera-sources@main/index.json
https://purge.jsdelivr.net/gh/wxcdxmn/venera-sources@main/toontop.js
https://purge.jsdelivr.net/gh/wxcdxmn/venera-sources@main/m18.js
# purge 返回 finished 不代表边缘已刷新，可用 fastly.jsdelivr.net 对照验证
```

版本号写在 `index.json` 与各 js 的 `version` 字段，两边要一起改，App 才会提示更新。

发版流程：

1. 改 `toontop/toontop.js` 或 `m18/m18.js` 并升 `version`
2. 同步到 `combined/`，改 `index.json` 的版本
3. `python venera_pkg/build_additive.py`、`python combined/build_combined.py`、`python venera_pkg/build_venera.py`、`python m18/build_pkg_m18.py` 重打包
4. 提交推送 + 打新 tag + 建 Release + purge jsDelivr

## 目录

```
index.json     两个源的索引（name / fileName / key / version / description）
toontop.js     TOONTOP 源
m18.js         MANGA18FX 源
*.venera       配置包（2 源 / 加法版），供 VeneraX 直接导入
```

## 说明

本项目仅做页面结构解析，不存储、不分发任何内容；图文版权归原站与原作者所有。
